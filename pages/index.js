import { useState, useRef } from "react";
import Head from "next/head";
import * as XLSX from "xlsx";
import { VERDICTS_META, QT_USE_CASES } from "../lib/taxonomy";

// ─── Constants ───────────────────────────────────────────────────────────────
const BATCH_SIZE = 20;
const PHASES = [
  "Parsing & normalising source file",
  "Detecting tool type (Narrow / Broad-suite / GPAA)",
  "Running 4-gate validation per tool",
  "Scoring 5 dimensions (positioning · depth · persona · output · evidence)",
  "Assigning mapping roles & enforcing public caps",
  "Running New-UC cluster detection",
  "Building output",
];

const SOURCES = [
  { id: "auto",      label: "Auto-detect" },
  { id: "taaft",     label: "TAAFT" },
  { id: "aixploria", label: "AIxploria" },
  { id: "toolify",   label: "Toolify" },
  { id: "custom",    label: "Custom" },
];

const ENHANCEMENTS = [
  { key: "sourceAware",  label: "Source-aware confidence",   desc: "Adjusts evidence score based on source quality (TAAFT vs AIxploria vs custom)." },
  { key: "conflict",     label: "Conflict detection",         desc: "Flags duplicate tool names in your source file before mapping starts." },
  { key: "newUC",        label: "New-UC detection",           desc: "After mapping, finds clusters needing a new QT use case." },
  { key: "liveness",     label: "Discontinued tool flagging", desc: "Marks tools with no/very short descriptions as Review Needed." },
  { key: "rationale",    label: "Broad-suite rationale log",  desc: "Logs dominant workflow reasoning for Canva/HubSpot/Jasper-type tools." },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function parseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let rows = [], cols = [];
        if (file.name.toLowerCase().endsWith(".csv")) {
          const text = e.target.result;
          const lines = text.split(/\r?\n/).filter(l => l.trim());
          cols = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
          for (let i = 1; i < lines.length; i++) {
            const vals = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ""));
            const obj = {};
            cols.forEach((c, j) => { obj[c] = vals[j] || ""; });
            rows.push(obj);
          }
        } else {
          const wb = XLSX.read(e.target.result, { type: "binary" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
          cols = rows.length ? Object.keys(rows[0]) : [];
        }
        resolve({ rows, cols });
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    if (file.name.toLowerCase().endsWith(".csv")) reader.readAsText(file);
    else reader.readAsBinaryString(file);
  });
}

function guessColumns(cols) {
  const nameCol = cols.find(c => /tool.?name|name|title/i.test(c)) || cols[0] || "";
  const descCol = cols.find(c => /desc|tagline|summary|about|sc_desc|list_desc/i.test(c)) || cols[1] || "";
  const urlCol  = cols.find(c => /url|website|link|web/i.test(c)) || "";
  return { nameCol, descCol, urlCol };
}

function downloadExcel(results, newUCSuggestions, mode, source) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Main results
  const main = [
    ["Tool Name","Website URL","QT Primary Use Case","QT Category","Tool Type","Verdict","Score (0-100)","Suggested Use Case","Dominant Workflow Rationale","Validator Notes","Delta Status"],
    ...results.map(r => [
      r.tool_name||"", r._url||"", r.qt_use_case||"", r.qt_category||"",
      r.tool_type||"", r.verdict||"", r.score||0,
      r.suggested_uc||"", r.dominant_workflow_rationale||"",
      r.notes||"", r._delta||""
    ])
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(main), "QT Mapping Results");

  // Sheet 2: Review queue (non-Correct / non-Refine)
  const flagged = results.filter(r => !["Correct","Refine"].includes(r.verdict));
  const reviewSheet = [
    ["Tool Name","Current QT Use Case","Verdict","Suggested Correct UC","Notes"],
    ...flagged.map(r => [r.tool_name||"", r.qt_use_case||"—", r.verdict||"", r.suggested_uc||"", r.notes||""])
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(reviewSheet), "Review Queue");

  // Sheet 3: New UC suggestions
  if (newUCSuggestions.length > 0) {
    const ucSheet = [
      ["Suggested Use Case","Parent Category","Why Needed","Example Tools"],
      ...newUCSuggestions.map(s => [s.use_case_name||"", s.suggested_category||"", s.reason||"", s.example_tools||""])
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ucSheet), "New UC Suggestions");
  }

  // Sheet 4: Broad-suite log
  const bsRows = results.filter(r => r.tool_type === "Broad-suite" && r.dominant_workflow_rationale);
  if (bsRows.length > 0) {
    const bsSheet = [
      ["Tool Name","Primary UC","Category","Dominant Workflow Rationale"],
      ...bsRows.map(r => [r.tool_name||"", r.qt_use_case||"", r.qt_category||"", r.dominant_workflow_rationale||""])
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(bsSheet), "Broad-Suite Log");
  }

  // Sheet 5: Summary
  const counts = {};
  results.forEach(r => { counts[r.verdict] = (counts[r.verdict]||0)+1; });
  const summarySheet = [
    ["Metric","Value"],
    ["Total Processed", results.length],
    ["Mode", mode], ["Source", source],
    ["Run Date", new Date().toLocaleDateString()], ["",""],
    ["Verdict","Count"],
    ...Object.entries(counts).map(([k,v]) => [k,v])
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summarySheet), "Run Summary");

  const date = new Date().toISOString().split("T")[0];
  XLSX.writeFile(wb, `QT_Mapping_${mode}_${date}.xlsx`);
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function Home() {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState("full");
  const [source, setSource] = useState("auto");
  const [enhs, setEnhs] = useState({ sourceAware:true, conflict:true, newUC:true, liveness:true, rationale:true });
  const [fileRows, setFileRows] = useState([]);
  const [fileCols, setFileCols] = useState([]);
  const [nameCol, setNameCol] = useState("");
  const [descCol, setDescCol] = useState("");
  const [urlCol,  setUrlCol]  = useState("");
  const [fileName, setFileName] = useState("");
  const [existingRows, setExistingRows] = useState([]);
  const [existingFileName, setExistingFileName] = useState("");
  const [results, setResults] = useState([]);
  const [newUCSuggestions, setNewUCSuggestions] = useState([]);
  const [progress, setProgress] = useState({ done:0, total:0, batch:0, correct:0, flagged:0 });
  const [phase, setPhase] = useState(-1);
  const [log, setLog] = useState([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const fileInputRef = useRef();
  const existingFileRef = useRef();

  const addLog = (msg) => setLog(prev => [...prev.slice(-30), msg]);

  // ── File handling ──────────────────────────────────────────────────────────
  async function handleFile(file) {
    try {
      const { rows, cols } = await parseFile(file);
      setFileRows(rows); setFileCols(cols); setFileName(file.name);
      const guess = guessColumns(cols);
      setNameCol(guess.nameCol); setDescCol(guess.descCol); setUrlCol(guess.urlCol);
    } catch (e) { setError("Could not read file: " + e.message); }
  }

  async function handleExistingFile(file) {
    try {
      const { rows } = await parseFile(file);
      setExistingRows(rows); setExistingFileName(file.name);
    } catch (e) { setError("Could not read existing file: " + e.message); }
  }

  // ── Main run ───────────────────────────────────────────────────────────────
  async function runMapping() {
    setError(""); setLog([]); setResults([]); setNewUCSuggestions([]);
    setStep(3); setPhase(0);

    // Build tool list
    let tools = fileRows
      .map(r => ({ name: String(r[nameCol]||"").trim(), description: String(r[descCol]||"").trim(), url: urlCol ? String(r[urlCol]||"").trim() : "", _raw: r }))
      .filter(t => t.name);

    // Delta mode: remove already-mapped tools
    if (mode === "delta" && existingRows.length > 0) {
      const existingNames = new Set(existingRows.map(r => String(r["Tool Name"]||r["tool_name"]||"").toLowerCase().trim()));
      const before = tools.length;
      tools = tools.filter(t => !existingNames.has(t.name.toLowerCase()));
      addLog(`Delta: ${before} total → ${tools.length} new/changed tools`);
      tools = tools.map(t => ({ ...t, _delta: "New" }));
    }

    // Calibration mode: first 25 only
    if (mode === "calibrate") {
      tools = tools.slice(0, 25);
      addLog(`Calibration mode: processing first 25 tools`);
    }

    // Conflict detection
    if (enhs.conflict) {
      const nc = {}; tools.forEach(t => { nc[t.name.toLowerCase()] = (nc[t.name.toLowerCase()]||0)+1; });
      const conflicts = Object.entries(nc).filter(([,n])=>n>1).map(([k])=>k);
      if (conflicts.length > 0) addLog(`⚠ ${conflicts.length} duplicate tool names detected: ${conflicts.slice(0,3).join(", ")}${conflicts.length>3?" ...":""}`);
    }

    // Liveness flagging
    let livenessFlagged = 0;
    if (enhs.liveness) {
      livenessFlagged = tools.filter(t => !t.description || t.description.length < 15).length;
      if (livenessFlagged > 0) addLog(`⚠ ${livenessFlagged} tools have no/short description → will be flagged Review Needed`);
    }

    setProgress({ done:0, total:tools.length, batch:0, correct:0, flagged:0 });
    setPhase(1);

    const allResults = [];
    const totalBatches = Math.ceil(tools.length / BATCH_SIZE);

    for (let i = 0; i < tools.length; i += BATCH_SIZE) {
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const batch = tools.slice(i, i + BATCH_SIZE);
      setProgress(p => ({ ...p, batch: batchNum }));
      setPhase(2);
      addLog(`Batch ${batchNum}/${totalBatches}: mapping tools ${i+1}–${Math.min(i+BATCH_SIZE, tools.length)}...`);

      try {
        setPhase(3);
        const res = await fetch("/api/map", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tools: batch, source, enhancements: enhs, mode }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }

        const data = await res.json();
        const batchResults = (data.results || []).map((r, j) => ({
          ...r,
          _url: batch[j]?._url || batch[j]?.url || "",
          _delta: batch[j]?._delta || "",
        }));

        allResults.push(...batchResults);
        setPhase(4);

        const correct = allResults.filter(r => r.verdict === "Correct").length;
        const flagged = allResults.filter(r => !["Correct","Refine"].includes(r.verdict)).length;
        setProgress(p => ({ ...p, done: allResults.length, correct, flagged }));
        setResults([...allResults]);
        addLog(`✓ Batch ${batchNum}: ${batchResults.filter(r=>r.verdict==="Correct").length} Correct, ${batchResults.filter(r=>r.verdict==="Incorrect").length} Incorrect`);
        setPhase(5);

        if (i + BATCH_SIZE < tools.length) await sleep(800);
      } catch (err) {
        addLog(`❌ Batch ${batchNum} error: ${err.message}`);
        // Mark batch as Review Needed and continue
        batch.forEach((t, j) => {
          allResults.push({ tool_name: t.name, qt_use_case: "", qt_category: "", tool_type: "", verdict: "Review Needed", score: 0, suggested_uc: "", dominant_workflow_rationale: "", notes: `API error: ${err.message}`, _url: t.url||"", _delta: t._delta||"" });
        });
        setResults([...allResults]);
      }
    }

    // New-UC detection
    setPhase(5);
    if (enhs.newUC) {
      const reviewRows = allResults.filter(r => ["Review Needed","Out of Taxonomy"].includes(r.verdict));
      if (reviewRows.length >= 3) {
        addLog(`Running New-UC detection on ${reviewRows.length} Review Needed/Out of Taxonomy tools...`);
        try {
          const res = await fetch("/api/detect-new-uc", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reviewRows }),
          });
          const data = await res.json();
          if (data.suggestions?.length > 0) {
            setNewUCSuggestions(data.suggestions);
            addLog(`💡 ${data.suggestions.length} new use case(s) suggested`);
          }
        } catch (e) { addLog("New-UC detection skipped (non-critical error)"); }
      }
    }

    // Append existing rows for delta mode
    if (mode === "delta" && existingRows.length > 0) {
      const existingFormatted = existingRows.map(r => ({
        tool_name: String(r["Tool Name"]||""),
        qt_use_case: String(r["QT Primary Use Case"]||""),
        qt_category: String(r["QT Category"]||r["QT Primary Category"]||""),
        tool_type: String(r["Tool Type"]||""),
        verdict: String(r["Verdict"]||"Correct"),
        score: Number(r["Score (0-100)"]||0),
        suggested_uc: String(r["Suggested Use Case"]||""),
        dominant_workflow_rationale: String(r["Dominant Workflow Rationale"]||""),
        notes: String(r["Validator Notes"]||""),
        _url: String(r["Website URL"]||""),
        _delta: "Existing",
      }));
      allResults.push(...existingFormatted);
      setResults([...allResults]);
    }

    setPhase(6);
    await sleep(300);
    setStep(4);
    addLog(`✅ Complete: ${allResults.filter(r=>r.verdict==="Correct").length} Correct out of ${allResults.length} tools`);
  }

  // ── Filtered results ───────────────────────────────────────────────────────
  const filtered = results.filter(r => {
    const matchV = filter === "all" || r.verdict === filter;
    const matchS = !search || r.tool_name?.toLowerCase().includes(search.toLowerCase());
    return matchV && matchS;
  });

  const stats = {
    Correct: results.filter(r => r.verdict === "Correct").length,
    Refine:  results.filter(r => r.verdict === "Refine").length,
    "Partial/Incorrect": results.filter(r => ["Partial","Incorrect"].includes(r.verdict)).length,
    "Review Needed": results.filter(r => r.verdict === "Review Needed").length,
    "Out of Taxonomy": results.filter(r => r.verdict === "Out of Taxonomy").length,
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Head>
        <title>QT Mapping Agent — QuantumThought</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #F8FAFF; color: #0F172A; min-height: 100vh; }
        h1,h2,h3 { font-family: 'Bricolage Grotesque', sans-serif; }
        input, select, button { font-family: inherit; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
      `}</style>

      {/* NAV */}
      <nav style={{ background:"#1A1A2E", height:56, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 32px", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontFamily:"Bricolage Grotesque", fontWeight:800, fontSize:18, color:"#fff" }}>
            Quantum<span style={{ color:"#2563EB" }}>Thought</span>
          </span>
          <span className="mono" style={{ fontSize:10, background:"rgba(37,99,235,.25)", color:"#93c5fd", padding:"3px 8px", borderRadius:4, letterSpacing:".04em" }}>MAPPING AGENT</span>
        </div>
        <span className="mono" style={{ fontSize:11, color:"rgba(255,255,255,.35)" }}>v3 Taxonomy · v2.1 Guidelines</span>
      </nav>

      {/* STEP BAR */}
      <div style={{ display:"flex", borderBottom:"1px solid #e2e8f0", background:"#fff" }}>
        {["Settings","Upload File","Running","Results"].map((label, i) => {
          const n = i + 1;
          const isActive = step === n;
          const isDone = step > n;
          return (
            <div key={n} style={{ flex:1, padding:"14px 16px", display:"flex", alignItems:"center", gap:10, borderRight:"1px solid #e2e8f0", background: isActive?"#1A1A2E":"#fff", cursor: isDone?"pointer":"default" }} onClick={() => isDone && setStep(n)}>
              <div style={{ width:24, height:24, borderRadius:"50%", background: isActive?"#2563EB":isDone?"#16a34a":"#e2e8f0", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:500, color: (isActive||isDone)?"#fff":"#64748B", flexShrink:0, fontFamily:"JetBrains Mono" }}>{isDone?"✓":n}</div>
              <div style={{ fontSize:12, fontWeight:600, color: isActive?"#fff":isDone?"#16a34a":"#64748B", lineHeight:1.3 }}>{label}</div>
            </div>
          );
        })}
      </div>

      <div style={{ maxWidth:1080, margin:"0 auto", padding:"32px 24px" }}>

        {/* ── PANEL 1: SETTINGS ── */}
        {step === 1 && (
          <div>
            {/* Mode */}
            <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:16, padding:"28px 32px", marginBottom:20, boxShadow:"0 1px 3px rgba(0,0,0,.06)" }}>
              <div className="mono" style={{ fontSize:10, color:"#2563EB", letterSpacing:".1em", textTransform:"uppercase", marginBottom:8, display:"flex", alignItems:"center", gap:8 }}><span style={{width:16,height:1.5,background:"#2563EB",display:"inline-block"}}></span>Step 1 of 4</div>
              <h2 style={{ fontSize:20, fontWeight:700, color:"#1A1A2E", marginBottom:6, letterSpacing:"-.02em" }}>Choose mapping mode</h2>
              <p style={{ fontSize:13, color:"#64748B", marginBottom:20 }}>Pick what you want to do. All 5 quality enhancements are on by default.</p>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:20 }}>
                {[
                  { id:"full",      icon:"🗺️", name:"Full Mapping Run",     desc:"Map a fresh batch of tools against QT taxonomy from scratch." },
                  { id:"delta",     icon:"⚡", name:"Delta / Incremental",  desc:"Upload new batch + existing mapped file. Only new/changed tools get processed." },
                  { id:"calibrate", icon:"🎯", name:"Calibration Run",      desc:"Run only the first 25 tools to validate scoring thresholds before a full run." },
                ].map(m => (
                  <div key={m.id} onClick={() => setMode(m.id)} style={{ padding:"14px 16px", border:`1.5px solid ${mode===m.id?"#2563EB":"#e2e8f0"}`, borderRadius:10, cursor:"pointer", background:mode===m.id?"#eff6ff":"#fff", position:"relative", transition:"all .15s" }}>
                    {mode===m.id && <span style={{ position:"absolute", top:8, right:10, color:"#2563EB", fontWeight:700, fontSize:13 }}>✓</span>}
                    <div style={{ fontSize:18, marginBottom:6 }}>{m.icon}</div>
                    <div style={{ fontSize:12, fontWeight:700, color:"#1A1A2E" }}>{m.name}</div>
                    <div style={{ fontSize:11, color:"#64748B", marginTop:2, lineHeight:1.5 }}>{m.desc}</div>
                  </div>
                ))}
              </div>
              {mode === "delta" && (
                <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:8, padding:"10px 14px", fontSize:12, color:"#1e40af", marginBottom:16, lineHeight:1.6 }}>
                  Delta mode: also upload your existing mapped Excel below so only new tools are processed.
                  <div style={{ marginTop:8 }}>
                    <label style={{ display:"inline-flex", alignItems:"center", gap:8, fontSize:12, cursor:"pointer", padding:"6px 12px", border:"1.5px dashed #93c5fd", borderRadius:8, color:"#1e40af" }}>
                      <input type="file" accept=".xlsx,.xls,.csv" style={{ display:"none" }} ref={existingFileRef} onChange={e=>e.target.files[0]&&handleExistingFile(e.target.files[0])} />
                      📂 Upload existing mapped file
                    </label>
                    {existingFileName && <span style={{ fontSize:12, color:"#16a34a", marginLeft:10, fontFamily:"JetBrains Mono" }}>✓ {existingFileName}</span>}
                  </div>
                </div>
              )}
            </div>

            {/* Enhancements */}
            <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:16, padding:"28px 32px", marginBottom:20, boxShadow:"0 1px 3px rgba(0,0,0,.06)" }}>
              <h2 style={{ fontSize:18, fontWeight:700, color:"#1A1A2E", marginBottom:6, letterSpacing:"-.02em" }}>Quality enhancements</h2>
              <p style={{ fontSize:13, color:"#64748B", marginBottom:18 }}>All 5 are on by default. Turn any off for a faster run.</p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {ENHANCEMENTS.map(e => (
                  <div key={e.key} onClick={() => setEnhs(prev => ({ ...prev, [e.key]: !prev[e.key] }))} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"12px 14px", border:`1.5px solid ${enhs[e.key]?"#2563EB":"#e2e8f0"}`, borderRadius:10, cursor:"pointer", background:enhs[e.key]?"#eff6ff":"#fff", transition:"all .15s" }}>
                    <div style={{ width:18, height:18, borderRadius:4, border:`2px solid ${enhs[e.key]?"#2563EB":"#d1d5db"}`, flexShrink:0, marginTop:1, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, background:enhs[e.key]?"#2563EB":"transparent", color:"#fff" }}>{enhs[e.key]?"✓":""}</div>
                    <div><div style={{ fontSize:12, fontWeight:700, color:"#1A1A2E" }}>{e.label}</div><div style={{ fontSize:11, color:"#64748B", marginTop:2, lineHeight:1.5 }}>{e.desc}</div></div>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => setStep(2)} style={{ width:"100%", padding:16, border:"none", borderRadius:12, background:"linear-gradient(135deg,#1A1A2E,#2563EB)", color:"#fff", fontFamily:"Bricolage Grotesque", fontWeight:700, fontSize:16, cursor:"pointer", letterSpacing:"-.01em" }}>
              Continue to Upload File →
            </button>
          </div>
        )}

        {/* ── PANEL 2: UPLOAD ── */}
        {step === 2 && (
          <div>
            <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:16, padding:"28px 32px", marginBottom:20, boxShadow:"0 1px 3px rgba(0,0,0,.06)" }}>
              <div className="mono" style={{ fontSize:10, color:"#2563EB", letterSpacing:".1em", textTransform:"uppercase", marginBottom:8, display:"flex", alignItems:"center", gap:8 }}><span style={{width:16,height:1.5,background:"#2563EB",display:"inline-block"}}></span>Step 2 of 4</div>
              <h2 style={{ fontSize:20, fontWeight:700, color:"#1A1A2E", marginBottom:6 }}>Upload your tool file</h2>
              <p style={{ fontSize:13, color:"#64748B", marginBottom:18 }}>Any CSV or Excel from TAAFT, Toolify, AIxploria, or your own list. The agent auto-detects columns.</p>

              {/* Source selector */}
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:18 }}>
                {SOURCES.map(s => (
                  <div key={s.id} onClick={() => setSource(s.id)} style={{ padding:"6px 14px", border:`1.5px solid ${source===s.id?"#1A1A2E":"#e2e8f0"}`, borderRadius:20, fontSize:12, fontWeight:600, cursor:"pointer", background:source===s.id?"#1A1A2E":"#fff", color:source===s.id?"#fff":"#64748B", transition:"all .15s" }}>{s.label}</div>
                ))}
              </div>

              {/* Drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor="#2563EB"; e.currentTarget.style.background="#eff6ff"; }}
                onDragLeave={e => { e.currentTarget.style.borderColor="#e2e8f0"; e.currentTarget.style.background=fileRows.length?"#f0fdf4":"#F8FAFF"; }}
                onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor=fileRows.length?"#16a34a":"#e2e8f0"; e.currentTarget.style.background=fileRows.length?"#f0fdf4":"#F8FAFF"; if(e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
                style={{ border:`2px dashed ${fileRows.length?"#16a34a":"#e2e8f0"}`, borderRadius:12, padding:32, textAlign:"center", cursor:"pointer", background:fileRows.length?"#f0fdf4":"#F8FAFF", transition:"all .2s" }}>
                <div style={{ fontSize:32, marginBottom:10 }}>📂</div>
                <div style={{ fontSize:14, fontWeight:600, color:"#1A1A2E", marginBottom:4 }}>Click to upload or drag & drop</div>
                <div style={{ fontSize:12, color:"#64748B" }}>Supports .xlsx, .xls, .csv — any column order</div>
                {fileName && <div className="mono" style={{ fontSize:12, color:"#16a34a", marginTop:8, fontWeight:500 }}>✓ {fileName} ({fileRows.length} rows)</div>}
              </div>
              <input type="file" accept=".xlsx,.xls,.csv" style={{ display:"none" }} ref={fileInputRef} onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />

              {/* Column selectors */}
              {fileRows.length > 0 && (
                <div style={{ marginTop:16 }}>
                  <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:8, padding:"10px 14px", fontSize:12, color:"#1e40af", marginBottom:14, lineHeight:1.6 }}>
                    ✓ Loaded {fileRows.length} rows. Preview: {fileRows.slice(0,2).map(r=>`${r[nameCol]||"?"}: ${String(r[descCol]||"").slice(0,50)}`).join(" | ")}
                  </div>
                  <div style={{ display:"flex", gap:12, flexWrap:"wrap", alignItems:"center" }}>
                    {[["Name column", nameCol, setNameCol], ["Description column", descCol, setDescCol], ["URL column (optional)", urlCol, setUrlCol]].map(([label, val, setter]) => (
                      <label key={label} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"#64748B", fontWeight:600 }}>
                        {label}:
                        <select value={val} onChange={e=>setter(e.target.value)} style={{ padding:"5px 8px", border:"1.5px solid #e2e8f0", borderRadius:6, fontSize:12, outline:"none" }}>
                          <option value="">-- select --</option>
                          {fileCols.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {error && <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, padding:"10px 14px", fontSize:12, color:"#dc2626", marginTop:12 }}>❌ {error}</div>}
            </div>

            <button onClick={runMapping} disabled={!fileRows.length || !nameCol || !descCol} style={{ width:"100%", padding:16, border:"none", borderRadius:12, background:"linear-gradient(135deg,#1A1A2E,#2563EB)", color:"#fff", fontFamily:"Bricolage Grotesque", fontWeight:700, fontSize:16, cursor: (!fileRows.length||!nameCol||!descCol)?"not-allowed":"pointer", opacity: (!fileRows.length||!nameCol||!descCol)?0.45:1, letterSpacing:"-.01em" }}>
              Start Mapping Run →
            </button>
          </div>
        )}

        {/* ── PANEL 3: RUNNING ── */}
        {step === 3 && (
          <div style={{ background:"#1A1A2E", borderRadius:16, padding:"28px 32px" }}>
            <h2 style={{ fontFamily:"Bricolage Grotesque", fontWeight:700, fontSize:18, color:"#fff", marginBottom:18 }}>🤖 Mapping Agent Running...</h2>
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:20 }}>
              {PHASES.map((p, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background: i<phase?"#4ade80":i===phase?"#60a5fa":"rgba(255,255,255,.2)", flexShrink:0, boxShadow:i===phase?"0 0 8px #3b82f6":"none", transition:"all .3s" }}></div>
                  <div style={{ fontSize:13, color: i<phase?"#4ade80":i===phase?"#fff":"rgba(255,255,255,.45)", fontWeight:i===phase?600:400, transition:"all .3s" }}>{p}</div>
                </div>
              ))}
            </div>
            <div style={{ background:"rgba(255,255,255,.1)", borderRadius:8, height:8, overflow:"hidden", marginBottom:12 }}>
              <div style={{ height:"100%", background:"linear-gradient(90deg,#3b82f6,#60a5fa)", borderRadius:8, width:`${progress.total?Math.round((progress.done/progress.total)*100):0}%`, transition:"width .4s ease" }}></div>
            </div>
            <div style={{ display:"flex", gap:20, marginBottom:14 }}>
              {[["Tools", progress.total], ["Processed", progress.done], ["Correct", progress.correct], ["Flagged", progress.flagged], ["Batch", progress.batch]].map(([l,v]) => (
                <div key={l} style={{ textAlign:"center" }}>
                  <div className="mono" style={{ fontSize:22, fontWeight:500, color:"#fff" }}>{v}</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,.45)", marginTop:2 }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ background:"rgba(0,0,0,.2)", borderRadius:8, padding:"10px 12px", fontFamily:"JetBrains Mono", fontSize:11, color:"rgba(255,255,255,.65)", maxHeight:120, overflowY:"auto", lineHeight:1.7 }}>
              {log.map((l,i) => <div key={i}>› {l}</div>)}
            </div>
          </div>
        )}

        {/* ── PANEL 4: RESULTS ── */}
        {step === 4 && (
          <div>
            {/* Header */}
            <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:16, padding:"18px 32px", marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12, boxShadow:"0 1px 3px rgba(0,0,0,.06)" }}>
              <div>
                <div className="mono" style={{ fontSize:10, color:"#2563EB", letterSpacing:".1em", textTransform:"uppercase", marginBottom:4, display:"flex", alignItems:"center", gap:8 }}><span style={{width:16,height:1.5,background:"#2563EB",display:"inline-block"}}></span>Complete</div>
                <h2 style={{ fontSize:20, fontWeight:700, color:"#1A1A2E", letterSpacing:"-.02em" }}>Mapping Results</h2>
              </div>
              <button onClick={() => downloadExcel(results, newUCSuggestions, mode, source)} style={{ padding:"10px 22px", background:"#16a34a", color:"#fff", border:"none", borderRadius:10, fontFamily:"Bricolage Grotesque", fontWeight:700, fontSize:14, cursor:"pointer" }}>
                ⬇ Download Excel
              </button>
            </div>

            {/* Stats bar */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10, marginBottom:20 }}>
              {[
                { label:"✅ Correct",          val:stats["Correct"],          color:"#16a34a" },
                { label:"🔵 Refine",            val:stats["Refine"],            color:"#2563EB" },
                { label:"⚠️ Partial/Incorrect", val:stats["Partial/Incorrect"],color:"#d97706" },
                { label:"🔍 Review",            val:stats["Review Needed"],     color:"#0891b2" },
                { label:"⬛ Excluded",          val:stats["Out of Taxonomy"],   color:"#6b7280" },
              ].map(s => (
                <div key={s.label} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, padding:16, textAlign:"center", boxShadow:"0 1px 3px rgba(0,0,0,.06)" }}>
                  <div style={{ fontFamily:"Bricolage Grotesque", fontWeight:800, fontSize:28, color:s.color, marginBottom:2 }}>{s.val}</div>
                  <div style={{ fontSize:11, color:"#64748B", fontWeight:500 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* New UC suggestions */}
            {newUCSuggestions.length > 0 && (
              <div style={{ background:"#fffbeb", border:"1.5px solid #fcd34d", borderRadius:12, padding:"18px 24px", marginBottom:20 }}>
                <div style={{ fontFamily:"Bricolage Grotesque", fontWeight:700, fontSize:16, color:"#92400e", marginBottom:12 }}>💡 New Use Case Suggestions from this batch</div>
                {newUCSuggestions.map((s, i) => (
                  <div key={i} style={{ background:"#fff", border:"1px solid #fde68a", borderRadius:8, padding:"10px 14px", marginBottom:8 }}>
                    <div style={{ fontWeight:700, fontSize:13, color:"#1A1A2E" }}>{s.use_case_name} <span style={{ fontSize:11, color:"#64748B", fontWeight:400 }}>→ {s.suggested_category}</span></div>
                    <div style={{ fontSize:12, color:"#64748B", marginTop:3 }}>{s.reason} | Examples: {s.example_tools}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Filter + table */}
            <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,.06)" }}>
              <div style={{ padding:"14px 20px 10px", borderBottom:"1px solid #e2e8f0", display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                {[
                  ["all","All"],["Correct","✅ Correct"],["Refine","🔵 Refine"],
                  ["Partial","⚠️ Partial"],["Incorrect","❌ Incorrect"],
                  ["Out of Taxonomy","⬛ Excluded"],["Review Needed","🔍 Review"]
                ].map(([val,label]) => (
                  <div key={val} onClick={() => setFilter(val)} style={{ padding:"5px 12px", border:`1.5px solid ${filter===val?"#1A1A2E":"#e2e8f0"}`, borderRadius:20, fontSize:11, fontWeight:600, cursor:"pointer", background:filter===val?"#1A1A2E":"#fff", color:filter===val?"#fff":"#64748B", transition:"all .15s" }}>{label}</div>
                ))}
                <input placeholder="Search tool name..." value={search} onChange={e=>setSearch(e.target.value)} style={{ marginLeft:"auto", padding:"6px 12px", border:"1.5px solid #e2e8f0", borderRadius:8, fontSize:12, outline:"none", width:200 }} />
              </div>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                  <thead>
                    <tr>{["#","TOOL NAME","QT USE CASE","CATEGORY","VERDICT","TYPE","SCORE","SUGGESTED UC","NOTES"].map(h => (
                      <th key={h} style={{ background:"#1A1A2E", color:"#fff", padding:"9px 12px", textAlign:"left", fontWeight:600, fontSize:10, whiteSpace:"nowrap", fontFamily:"JetBrains Mono", letterSpacing:".04em" }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => {
                      const vm = VERDICTS_META[r.verdict] || { color:"#000", bg:"#fff" };
                      return (
                        <tr key={i} style={{ borderBottom:"1px solid #f1f5f9" }}>
                          <td style={{ padding:"8px 12px", color:"#94a3b8", fontFamily:"JetBrains Mono", fontSize:10 }}>{i+1}</td>
                          <td style={{ padding:"8px 12px" }}>
                            <div style={{ fontWeight:700, color:"#1A1A2E", fontSize:12 }}>{r.tool_name}</div>
                            {r._url && <a href={r._url} target="_blank" rel="noreferrer" style={{ fontSize:10, color:"#2563EB" }}>↗ site</a>}
                            {r._delta && <span className="mono" style={{ fontSize:9, background:"#f0fdf4", color:"#16a34a", padding:"1px 5px", borderRadius:3, marginLeft:4 }}>{r._delta}</span>}
                          </td>
                          <td style={{ padding:"8px 12px", color:"#2563EB", fontWeight:600, fontSize:11 }}>{r.qt_use_case||"—"}</td>
                          <td style={{ padding:"8px 12px", color:"#64748B", fontSize:11 }}>{r.qt_category||"—"}</td>
                          <td style={{ padding:"8px 12px" }}>
                            <span style={{ display:"inline-block", padding:"3px 8px", borderRadius:6, fontSize:10, fontWeight:700, fontFamily:"JetBrains Mono", background:vm.bg, color:vm.color, whiteSpace:"nowrap" }}>{r.verdict}</span>
                          </td>
                          <td style={{ padding:"8px 12px", color:"#64748B", fontSize:10, fontFamily:"JetBrains Mono" }}>{r.tool_type?.split("/")?.[0] || "—"}</td>
                          <td style={{ padding:"8px 12px", textAlign:"center" }}>
                            <span style={{ fontFamily:"JetBrains Mono", fontSize:12, fontWeight:600, color:r.score>=75?"#16a34a":r.score>=50?"#d97706":r.score>0?"#dc2626":"#94a3b8" }}>{r.score>0?r.score:"—"}</span>
                          </td>
                          <td style={{ padding:"8px 12px", color:"#d97706", fontSize:11, fontWeight:600 }}>{r.suggested_uc||""}</td>
                          <td style={{ padding:"8px 12px", color:"#64748B", fontSize:11, maxWidth:260 }}>{r.notes||""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filtered.length === 0 && <div style={{ padding:40, textAlign:"center", color:"#64748B", fontSize:13 }}>No results match this filter.</div>}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
