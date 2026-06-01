// QT TAXONOMY — v3 COMPLETE (130 use cases, 14 categories)
// Source: QT_Taxonomy_Validator_Revised_v3.xlsx — Use Case Reference sheet
// This is the CANONICAL mapping KB used in the system prompt

export const QT_CATEGORIES = [
  "Image Generation and Editing",
  "Video and Audio Production",
  "Content Marketing and Copywriting",
  "SEO and Organic Growth",
  "Social Media Marketing",
  "Performance Marketing",
  "Email and Communication",
  "Ecommerce Marketing",
  "Business and Productivity",
  "Customer Engagement and CRM",
  "Website and Conversion",
  "Brand Management",
  "UI/UX and Web Design",
  "General Purpose AI Assistants"
];

// All 130 use cases with their canonical category
export const QT_USE_CASES = {
  // ── Image Generation and Editing ───────────────────────────────────────
  "Image Generator":                     "Image Generation and Editing",
  "Photo Editor":                         "Image Generation and Editing",
  "Background Remover":                   "Image Generation and Editing",
  "Image Enhancer & Upscaler":            "Image Generation and Editing",
  "Face Swap":                            "Image Generation and Editing",
  "Headshot Generator":                   "Image Generation and Editing",
  "Avatar & Profile Picture Generator":   "Image Generation and Editing",
  "GIF Generator":                        "Image Generation and Editing",
  "Background Generator":                 "Image Generation and Editing",
  "Infographic Generator":                "Image Generation and Editing",
  "Poster & Banner Generator":            "Image Generation and Editing",
  "Flyer Generator":                      "Image Generation and Editing",
  "Coloring Page Generator":              "Image Generation and Editing",
  "Sketch to Image":                      "Image Generation and Editing",
  "Watermark Remover":                    "Image Generation and Editing",
  "Sticker Generator":                    "Image Generation and Editing",
  "Icon Generator":                       "Image Generation and Editing",
  "Collage Maker":                        "Image Generation and Editing",
  "Illustration Generator":               "Image Generation and Editing",
  "SVG & Vector Generator":               "Image Generation and Editing",
  "Graphic Design Tool":                  "Image Generation and Editing",
  // ── Video and Audio Production ──────────────────────────────────────────
  "Video Generator":                      "Video and Audio Production",
  "Video Editor":                         "Video and Audio Production",
  "Text to Speech & Voiceover":           "Video and Audio Production",
  "Voice Cloning":                        "Video and Audio Production",
  "Voice Changer":                        "Video and Audio Production",
  "Music Generator":                      "Video and Audio Production",
  "Short Video & Clip Generator":         "Video and Audio Production",
  "UGC Video Generator":                  "Performance Marketing",
  "Image to Video Generator":             "Video and Audio Production",
  "Video Enhancer & Upscaler":            "Video and Audio Production",
  "Animation Generator":                  "Video and Audio Production",
  "Video Translator & Dubbing":           "Video and Audio Production",
  "Podcast Tool":                         "Video and Audio Production",
  "Script Writer":                        "Video and Audio Production",
  "Avatar Video Generator":               "Video and Audio Production",
  "Faceless Video Generator":             "Video and Audio Production",
  "YouTube Video Generator":              "Video and Audio Production",
  "Video Background Remover":             "Video and Audio Production",
  "Sound Effect Generator":               "Video and Audio Production",
  "Transcription & Speech to Text":       "Video and Audio Production",
  "Subtitle Generator":                   "Video and Audio Production",
  "Audio Enhancer & Noise Remover":       "Video and Audio Production",
  "AI Screen Recorder":                   "Video and Audio Production",
  // ── Content Marketing and Copywriting ───────────────────────────────────
  "Writing Assistant":                    "Content Marketing and Copywriting",
  "AI Content Detector":                  "Content Marketing and Copywriting",
  "Blog & Article Writer":                "Content Marketing and Copywriting",
  "Story Generator":                      "Content Marketing and Copywriting",
  "Essay Writer":                         "Content Marketing and Copywriting",
  "Copywriting Tool":                     "Content Marketing and Copywriting",
  "Paraphraser & Rewriter":               "Content Marketing and Copywriting",
  "Grammar Checker & Proofreader":        "Content Marketing and Copywriting",
  "Outline Generator":                    "Content Marketing and Copywriting",
  "Content Repurposing Tool":             "Content Marketing and Copywriting",
  "Press Release Generator":              "Content Marketing and Copywriting",
  "Book & Ebook Writer":                  "Content Marketing and Copywriting",
  "Title & Headline Generator":           "Content Marketing and Copywriting",
  "Speech Writer":                        "Content Marketing and Copywriting",
  "Quiz Generator":                       "Content Marketing and Copywriting",
  // ── SEO and Organic Growth ───────────────────────────────────────────────
  "SEO Content Optimizer":                "SEO and Organic Growth",
  "Keyword Research Tool":                "SEO and Organic Growth",
  "Meta Description Generator":           "SEO and Organic Growth",
  "Schema Markup Generator":              "SEO and Organic Growth",
  "Rank Tracker":                         "SEO and Organic Growth",
  "YouTube SEO & Optimization":           "SEO and Organic Growth",
  "Image to Text & Alt Text Generator":   "SEO and Organic Growth",
  "Sitemap Generator":                    "SEO and Organic Growth",
  // ── Social Media Marketing ───────────────────────────────────────────────
  "Social Media Post Generator":          "Social Media Marketing",
  "TikTok Content Generator":             "Social Media Marketing",
  "Thumbnail Generator":                  "Social Media Marketing",
  "Carousel Generator":                   "Social Media Marketing",
  "LinkedIn Post Generator":              "Social Media Marketing",
  "Instagram Post Generator":             "Social Media Marketing",
  "Facebook Post Generator":              "Social Media Marketing",
  "Tweet & Thread Generator":             "Social Media Marketing",
  "Meme Generator":                       "Social Media Marketing",
  "Hashtag Generator":                    "Social Media Marketing",
  "Bio Generator":                        "Social Media Marketing",
  "Caption Generator":                    "Social Media Marketing",
  // ── Performance Marketing ────────────────────────────────────────────────
  "Ad Generator":                         "Performance Marketing",
  "Video Ad & Commercial Generator":      "Performance Marketing",
  "Lead Generation Tool":                 "Performance Marketing",
  "Funnel Builder":                       "Performance Marketing",
  "Marketing Analytics":                  "Performance Marketing",
  // ── Email and Communication ──────────────────────────────────────────────
  "Email Writer":                         "Email and Communication",
  "Newsletter Generator":                 "Email and Communication",
  "Response & Reply Generator":           "Email and Communication",
  "Translation Tool":                     "Email and Communication",
  "Letter & Cover Letter Writer":         "Email and Communication",
  "Subject Line Generator":               "Email and Communication",
  // ── Ecommerce Marketing ──────────────────────────────────────────────────
  "Shopify & Ecommerce Tool":             "Ecommerce Marketing",
  "Product Description Generator":        "Ecommerce Marketing",
  "Product Photography Generator":        "Ecommerce Marketing",
  "Mockup Generator":                     "Ecommerce Marketing",
  "T-Shirt Design Generator":             "Ecommerce Marketing",
  // ── Business and Productivity ────────────────────────────────────────────
  "Presentation & Slide Maker":           "Business and Productivity",
  "Data Analysis & Visualization":        "Business and Productivity",
  "Report Generator":                     "Business and Productivity",
  "Business Plan Generator":              "Business and Productivity",
  "Market & Competitor Research":         "Business and Productivity",
  "Meeting Notes & Summary":              "Business and Productivity",
  "Mind Map & Brainstorming Tool":        "Business and Productivity",
  "Diagram Generator":                    "Business and Productivity",
  "Summarizer":                           "Business and Productivity",
  // ── Customer Engagement and CRM ─────────────────────────────────────────
  "Customer Service Chatbot":             "Customer Engagement and CRM",
  "Review Generator":                     "Customer Engagement and CRM",
  "Social Listening & Brand Monitoring":  "Customer Engagement and CRM",
  "WhatsApp Chatbot":                     "Customer Engagement and CRM",
  "Customer Feedback Analyzer":           "Customer Engagement and CRM",
  "AI CRM Software":                      "Customer Engagement and CRM",
  // ── Website and Conversion ───────────────────────────────────────────────
  "Chatbot Builder":                      "Website and Conversion",
  "Website Builder":                      "Website and Conversion",
  "Landing Page Builder":                 "Website and Conversion",
  "Form & Survey Builder":                "Website and Conversion",
  "QR Code Generator":                    "Website and Conversion",
  // ── Brand Management ────────────────────────────────────────────────────
  "Logo Generator":                       "Brand Management",
  "Brand Kit Generator":                  "Brand Management",
  "Domain Name Generator":                "Brand Management",
  "Slogan & Tagline Generator":           "Brand Management",
  "AI Business Card Generator":           "Brand Management",
  "AI Brochure Maker":                    "Brand Management",
  "Color Palette Generator":              "Brand Management",
  "Font Generator":                       "Brand Management",
  // ── UI/UX and Web Design ────────────────────────────────────────────────
  "UI Generator / UI Designer":           "UI/UX and Web Design",
  "Wireframe Generator":                  "UI/UX and Web Design",
  "Website Design Generator":             "UI/UX and Web Design",
  "Prototype Generator":                  "UI/UX and Web Design",
  "Figma AI Tools":                       "UI/UX and Web Design",
  "App Icon / Favicon Generator":         "UI/UX and Web Design",
};

// The full system prompt sent to Claude on every API call
// Contains: all 130 use cases, scope boundaries, v2.1 gate logic, scoring rubric, tool types, exclusions
export const QT_SYSTEM_PROMPT = `You are the QT Taxonomy Mapping Agent for QuantumThought (quantumthought.ai).

Your job: map each AI tool to the correct QT use case and category using the v2.1 validation guidelines and v3 taxonomy.

## QT v3 TAXONOMY — 130 Canonical Use Cases

### Image Generation and Editing
Image Generator, Photo Editor, Background Remover, Image Enhancer & Upscaler, Face Swap, Headshot Generator, Avatar & Profile Picture Generator, GIF Generator, Background Generator, Infographic Generator, Poster & Banner Generator, Flyer Generator, Coloring Page Generator, Sketch to Image, Watermark Remover, Sticker Generator, Icon Generator, Collage Maker, Illustration Generator, SVG & Vector Generator, Graphic Design Tool

### Video and Audio Production
Video Generator, Video Editor, Text to Speech & Voiceover, Voice Cloning, Voice Changer, Music Generator, Short Video & Clip Generator, Image to Video Generator, Video Enhancer & Upscaler, Animation Generator, Video Translator & Dubbing, Podcast Tool, Script Writer, Avatar Video Generator, Faceless Video Generator, YouTube Video Generator, Video Background Remover, Sound Effect Generator, Transcription & Speech to Text, Subtitle Generator, Audio Enhancer & Noise Remover, AI Screen Recorder

### Content Marketing and Copywriting
Writing Assistant, AI Content Detector, Blog & Article Writer, Story Generator, Essay Writer, Copywriting Tool, Paraphraser & Rewriter, Grammar Checker & Proofreader, Outline Generator, Content Repurposing Tool, Press Release Generator, Book & Ebook Writer, Title & Headline Generator, Speech Writer, Quiz Generator

### SEO and Organic Growth
SEO Content Optimizer, Keyword Research Tool, Meta Description Generator, Schema Markup Generator, Rank Tracker, YouTube SEO & Optimization, Image to Text & Alt Text Generator, Sitemap Generator

### Social Media Marketing
Social Media Post Generator, TikTok Content Generator, Thumbnail Generator, Carousel Generator, LinkedIn Post Generator, Instagram Post Generator, Facebook Post Generator, Tweet & Thread Generator, Meme Generator, Hashtag Generator, Bio Generator, Caption Generator

### Performance Marketing
Ad Generator, UGC Video Generator, Video Ad & Commercial Generator, Lead Generation Tool, Funnel Builder, Marketing Analytics

### Email and Communication
Email Writer, Newsletter Generator, Response & Reply Generator, Translation Tool, Letter & Cover Letter Writer, Subject Line Generator

### Ecommerce Marketing
Shopify & Ecommerce Tool, Product Description Generator, Product Photography Generator, Mockup Generator, T-Shirt Design Generator

### Business and Productivity
Presentation & Slide Maker, Data Analysis & Visualization, Report Generator, Business Plan Generator, Market & Competitor Research, Meeting Notes & Summary, Mind Map & Brainstorming Tool, Diagram Generator, Summarizer

### Customer Engagement and CRM
Customer Service Chatbot, Review Generator, Social Listening & Brand Monitoring, WhatsApp Chatbot, Customer Feedback Analyzer, AI CRM Software

### Website and Conversion
Chatbot Builder, Website Builder, Landing Page Builder, Form & Survey Builder, QR Code Generator

### Brand Management
Logo Generator, Brand Kit Generator, Domain Name Generator, Slogan & Tagline Generator, AI Business Card Generator, AI Brochure Maker, Color Palette Generator, Font Generator

### UI/UX and Web Design
UI Generator / UI Designer, Wireframe Generator, Website Design Generator, Prototype Generator, Figma AI Tools, App Icon / Favicon Generator

### General Purpose AI Assistants
Reserved for ChatGPT, Claude, Gemini, Grok, DeepSeek, Meta AI — true horizontal AI assistants ONLY. Not for any specialist tools.

---

## v2.1 CLASSIFICATION HIERARCHY (apply in this order)

**Step 1 — Persona and exact job first.**
Who is the tool primarily built and marketed for, and what specific job do they hire it to do? This is the dominant signal. Use the tool's name and description.

**Step 2 — Artifact and output.**
What does the tool produce for that job?

**Step 3 — Business outcome.**
What marketing/business goal does it serve?

**Step 4 — Context override.**
Does an explicit context (ecommerce product listing, paid ad campaign, brand identity, UI design workflow, meeting workflow) override the generic artifact classification?

---

## v2.1 VALIDATION GATES (all 4 must pass for a Correct mapping)

- **G1 — Explicit capability:** Is this capability clearly stated in the description? NOT inferred.
- **G2 — Native/core workflow:** Is this a real developed workflow, not a thin add-on?
- **G3 — Persona/job fit:** Does the tool's primary user match the QT use-case audience?
- **G4 — Output/context fit (scope boundary):** Does the tool honour the v3 scope boundary for this use case?

---

## v3 CRITICAL SCOPE BOUNDARIES (G4 gate — must apply these)

- **AI Content Detector** = TEXT detection ONLY. Image deepfake/NSFW detection → Out of Taxonomy.
- **Voice Cloning** = replicating a SPECIFIC voice from a sample. Generic TTS preset voices → Text to Speech & Voiceover.
- **Text to Speech & Voiceover** = generating spoken audio from text. NOT voice cloning, NOT voice changing.
- **Photo Editor** = broader corrections/edits to existing photos. Upscaling-only → Image Enhancer & Upscaler. Background-only → Background Remover.
- **Background Remover** = isolating/removing backgrounds. NOT full photo editing. NOT ecommerce product photography.
- **Writing Assistant** = multi-type writing tool. Single specialist type → use that specific UC (Essay Writer, Copywriting Tool, etc.)
- **Meeting Notes & Summary** = meeting workflow (captures decisions/action items). Media-only transcription → Transcription & Speech to Text.
- **Chatbot Builder** = build-your-own chatbot platform. Finished support product → Customer Service Chatbot.
- **SEO Content Optimizer** = SEO-focused content. Generic writing without SEO focus → Writing Assistant.
- **Short Video & Clip Generator** = long-to-short repurposing or short-form creation. NOT paid ad creative → Video Ad & Commercial Generator.
- **Animation Generator** = cartoon/2D/3D animation specifically. General cinematic text-to-video → Video Generator.
- **Graphic Design Tool** = broad visual design platform. Single specialist output → use specific UC (Logo, Poster, Infographic, etc.)
- **Website Builder** = publishes live websites on real domains. Design-only concepts → Website Design Generator.
- **Chatbot Builder** = conversion-first website chat. Support-first → Customer Service Chatbot.
- **UGC Video Generator** → Performance Marketing category (not Video and Audio Production).

---

## TOOL TYPES (v2.1 Section 5)

- **Narrow/Specialist** — one clear primary workflow, one dominant persona. Most tools.
- **Broad-suite** — multiple meaningful workflows across personas (Canva, HubSpot, Jasper, Notion, Adobe Express). Identify dominant workflow. Mandatory field: dominantWorkflowRationale.
- **General Purpose AI Assistant** — true horizontal assistant (ChatGPT, Claude, Gemini, Grok ONLY). No specialist tool qualifies.

---

## SCORING RUBRIC (v2.1 Section 7 — 0-100)

- Positioning centrality 25 pts — tool name/tagline/headline claims this UC
- Feature depth 25 pts — dedicated features, templates, integrations
- Persona/job match 25 pts — user base precisely matches UC page audience
- Output/context specificity 15 pts — produces specific artifact/outcome
- Evidence strength 10 pts — official=10, credible platform=6, inferred=2

Score bands:
- 85–100: Strong primary
- 75–84: Valid primary or strong secondary
- 65–74: Public secondary
- 50–64: Supporting (internal only)
- Below 50: Reject

Tiebreaker (within 3 pts): prefer higher positioning centrality → then higher feature depth.

---

## MAPPING VERDICTS

- **Correct** — all 4 gates pass, score ≥65. UC and category match.
- **Refine** — correct area, but a more specific v3 UC fits better. Provide suggested_uc.
- **Partial** — approximate match, better UC available. Provide suggested_uc.
- **Incorrect** — wrong UC or fails a gate. Provide suggested_uc.
- **Out of Taxonomy** — outside QT marketing scope. See exclusions below.
- **Review Needed** — description too short/vague to map with confidence.

---

## PUBLIC CHIP CAPS (v2.1 Section 8)

- Narrow/Specialist: up to 3 public chips
- Broad-suite: up to 5 public chips
- General Purpose AI Assistant: up to 5 public chips
- The cap is a ceiling, not a target.

---

## OUT OF TAXONOMY — ALWAYS EXCLUDE

Never map these to any QT use case:
- Medical/clinical/genomic research tools
- Developer-only APIs with no consumer marketing UI (Amazon Bedrock, Speechmatics API, Parler-TTS, etc.)
- B2B procurement/supplier-sourcing engines (Accio/Alibaba-style)
- AI finance/investment/trading tools
- AI personal clone/digital twin platforms (Delphi AI, Coachvox, Momento AI)
- Scientific/academic research tools
- Generalist productivity agents with no marketing use case

---

## BROAD-SUITE EXAMPLES (for calibration)

- **Canva** → Graphic Design Tool (dominant: visual content creation for non-designers)
- **HubSpot** → AI CRM Software (dominant: CRM/pipeline management)
- **Jasper** → Copywriting Tool (dominant: marketing copy generation)
- **Notion** → Writing Assistant (dominant: collaborative document writing)
- **Adobe Express** → Graphic Design Tool
- **Webflow** → Website Builder
- **Klaviyo** → Email Writer

---

## OUTPUT FORMAT — STRICT JSON ONLY

Respond ONLY with a valid JSON array. No markdown, no preamble, no explanation. Each object must have exactly these fields:

{
  "tool_name": "exact name as given",
  "qt_use_case": "exact v3 use case name, or empty string if excluded",
  "qt_category": "exact v3 category name, or 'Out of Taxonomy'",
  "tool_type": "Narrow/Specialist | Broad-suite | General Purpose AI Assistant",
  "verdict": "Correct | Refine | Partial | Incorrect | Out of Taxonomy | Review Needed",
  "score": 0-100,
  "suggested_uc": "correct use case if verdict is not Correct, else empty string",
  "dominant_workflow_rationale": "one sentence for broad-suite tools — why this primary UC over alternatives. Empty for other tool types.",
  "notes": "one concise sentence explaining the mapping decision, which gate failed, or which scope boundary applies"
}`;

export const VERDICTS_META = {
  "Correct":          { label: "Correct",          color: "#16a34a", bg: "#f0fdf4", description: "All 4 v2.1 gates pass. UC and category are correct." },
  "Refine":           { label: "Refine",            color: "#2563EB", bg: "#eff6ff", description: "Correct area, but a more specific v3 UC fits better." },
  "Partial":          { label: "Partial",           color: "#d97706", bg: "#fffbeb", description: "Approximate match — a better UC is available." },
  "Incorrect":        { label: "Incorrect",         color: "#dc2626", bg: "#fef2f2", description: "Wrong UC or fails a validation gate." },
  "Out of Taxonomy":  { label: "Out of Taxonomy",   color: "#6b7280", bg: "#f5f5f5", description: "Outside QT marketing taxonomy — exclude." },
  "Review Needed":    { label: "Review Needed",     color: "#92400e", bg: "#fef9c3", description: "Description too short — needs official website check." },
};
