(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[turbopack]/browser/dev/hmr-client/hmr-client.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/// <reference path="../../../shared/runtime/runtime-types.d.ts" />
/// <reference path="../../../shared/runtime/dev-globals.d.ts" />
/// <reference path="../../../shared/runtime/dev-protocol.d.ts" />
/// <reference path="../../../shared/runtime/dev-extensions.ts" />
__turbopack_context__.s([
    "connect",
    ()=>connect,
    "setHooks",
    ()=>setHooks,
    "subscribeToUpdate",
    ()=>subscribeToUpdate
]);
function connect({ addMessageListener, sendMessage, onUpdateError = console.error }) {
    addMessageListener((msg)=>{
        switch(msg.type){
            case 'turbopack-connected':
                handleSocketConnected(sendMessage);
                break;
            default:
                try {
                    if (Array.isArray(msg.data)) {
                        for(let i = 0; i < msg.data.length; i++){
                            handleSocketMessage(msg.data[i]);
                        }
                    } else {
                        handleSocketMessage(msg.data);
                    }
                    applyAggregatedUpdates();
                } catch (e) {
                    console.warn('[Fast Refresh] performing full reload\n\n' + "Fast Refresh will perform a full reload when you edit a file that's imported by modules outside of the React rendering tree.\n" + 'You might have a file which exports a React component but also exports a value that is imported by a non-React component file.\n' + 'Consider migrating the non-React component export to a separate file and importing it into both files.\n\n' + 'It is also possible the parent component of the component you edited is a class component, which disables Fast Refresh.\n' + 'Fast Refresh requires at least one parent function component in your React tree.');
                    onUpdateError(e);
                    location.reload();
                }
                break;
        }
    });
    const queued = globalThis.TURBOPACK_CHUNK_UPDATE_LISTENERS;
    if (queued != null && !Array.isArray(queued)) {
        throw new Error('A separate HMR handler was already registered');
    }
    globalThis.TURBOPACK_CHUNK_UPDATE_LISTENERS = {
        push: ([chunkPath, callback])=>{
            subscribeToChunkUpdate(chunkPath, sendMessage, callback);
        }
    };
    if (Array.isArray(queued)) {
        for (const [chunkPath, callback] of queued){
            subscribeToChunkUpdate(chunkPath, sendMessage, callback);
        }
    }
}
const updateCallbackSets = new Map();
function sendJSON(sendMessage, message) {
    sendMessage(JSON.stringify(message));
}
function resourceKey(resource) {
    return JSON.stringify({
        path: resource.path,
        headers: resource.headers || null
    });
}
function subscribeToUpdates(sendMessage, resource) {
    sendJSON(sendMessage, {
        type: 'turbopack-subscribe',
        ...resource
    });
    return ()=>{
        sendJSON(sendMessage, {
            type: 'turbopack-unsubscribe',
            ...resource
        });
    };
}
function handleSocketConnected(sendMessage) {
    for (const key of updateCallbackSets.keys()){
        subscribeToUpdates(sendMessage, JSON.parse(key));
    }
}
// we aggregate all pending updates until the issues are resolved
const chunkListsWithPendingUpdates = new Map();
function aggregateUpdates(msg) {
    const key = resourceKey(msg.resource);
    let aggregated = chunkListsWithPendingUpdates.get(key);
    if (aggregated) {
        aggregated.instruction = mergeChunkListUpdates(aggregated.instruction, msg.instruction);
    } else {
        chunkListsWithPendingUpdates.set(key, msg);
    }
}
function applyAggregatedUpdates() {
    if (chunkListsWithPendingUpdates.size === 0) return;
    hooks.beforeRefresh();
    for (const msg of chunkListsWithPendingUpdates.values()){
        triggerUpdate(msg);
    }
    chunkListsWithPendingUpdates.clear();
    finalizeUpdate();
}
function mergeChunkListUpdates(updateA, updateB) {
    let chunks;
    if (updateA.chunks != null) {
        if (updateB.chunks == null) {
            chunks = updateA.chunks;
        } else {
            chunks = mergeChunkListChunks(updateA.chunks, updateB.chunks);
        }
    } else if (updateB.chunks != null) {
        chunks = updateB.chunks;
    }
    let merged;
    if (updateA.merged != null) {
        if (updateB.merged == null) {
            merged = updateA.merged;
        } else {
            // Since `merged` is an array of updates, we need to merge them all into
            // one, consistent update.
            // Since there can only be `EcmascriptMergeUpdates` in the array, there is
            // no need to key on the `type` field.
            let update = updateA.merged[0];
            for(let i = 1; i < updateA.merged.length; i++){
                update = mergeChunkListEcmascriptMergedUpdates(update, updateA.merged[i]);
            }
            for(let i = 0; i < updateB.merged.length; i++){
                update = mergeChunkListEcmascriptMergedUpdates(update, updateB.merged[i]);
            }
            merged = [
                update
            ];
        }
    } else if (updateB.merged != null) {
        merged = updateB.merged;
    }
    return {
        type: 'ChunkListUpdate',
        chunks,
        merged
    };
}
function mergeChunkListChunks(chunksA, chunksB) {
    const chunks = {};
    for (const [chunkPath, chunkUpdateA] of Object.entries(chunksA)){
        const chunkUpdateB = chunksB[chunkPath];
        if (chunkUpdateB != null) {
            const mergedUpdate = mergeChunkUpdates(chunkUpdateA, chunkUpdateB);
            if (mergedUpdate != null) {
                chunks[chunkPath] = mergedUpdate;
            }
        } else {
            chunks[chunkPath] = chunkUpdateA;
        }
    }
    for (const [chunkPath, chunkUpdateB] of Object.entries(chunksB)){
        if (chunks[chunkPath] == null) {
            chunks[chunkPath] = chunkUpdateB;
        }
    }
    return chunks;
}
function mergeChunkUpdates(updateA, updateB) {
    if (updateA.type === 'added' && updateB.type === 'deleted' || updateA.type === 'deleted' && updateB.type === 'added') {
        return undefined;
    }
    if (updateB.type === 'total') {
        // A total update replaces the entire chunk, so it supersedes any prior update.
        return updateB;
    }
    if (updateA.type === 'partial') {
        invariant(updateA.instruction, 'Partial updates are unsupported');
    }
    if (updateB.type === 'partial') {
        invariant(updateB.instruction, 'Partial updates are unsupported');
    }
    return undefined;
}
function mergeChunkListEcmascriptMergedUpdates(mergedA, mergedB) {
    const entries = mergeEcmascriptChunkEntries(mergedA.entries, mergedB.entries);
    const chunks = mergeEcmascriptChunksUpdates(mergedA.chunks, mergedB.chunks);
    return {
        type: 'EcmascriptMergedUpdate',
        entries,
        chunks
    };
}
function mergeEcmascriptChunkEntries(entriesA, entriesB) {
    return {
        ...entriesA,
        ...entriesB
    };
}
function mergeEcmascriptChunksUpdates(chunksA, chunksB) {
    if (chunksA == null) {
        return chunksB;
    }
    if (chunksB == null) {
        return chunksA;
    }
    const chunks = {};
    for (const [chunkPath, chunkUpdateA] of Object.entries(chunksA)){
        const chunkUpdateB = chunksB[chunkPath];
        if (chunkUpdateB != null) {
            const mergedUpdate = mergeEcmascriptChunkUpdates(chunkUpdateA, chunkUpdateB);
            if (mergedUpdate != null) {
                chunks[chunkPath] = mergedUpdate;
            }
        } else {
            chunks[chunkPath] = chunkUpdateA;
        }
    }
    for (const [chunkPath, chunkUpdateB] of Object.entries(chunksB)){
        if (chunks[chunkPath] == null) {
            chunks[chunkPath] = chunkUpdateB;
        }
    }
    if (Object.keys(chunks).length === 0) {
        return undefined;
    }
    return chunks;
}
function mergeEcmascriptChunkUpdates(updateA, updateB) {
    if (updateA.type === 'added' && updateB.type === 'deleted') {
        // These two completely cancel each other out.
        return undefined;
    }
    if (updateA.type === 'deleted' && updateB.type === 'added') {
        const added = [];
        const deleted = [];
        const deletedModules = new Set(updateA.modules ?? []);
        const addedModules = new Set(updateB.modules ?? []);
        for (const moduleId of addedModules){
            if (!deletedModules.has(moduleId)) {
                added.push(moduleId);
            }
        }
        for (const moduleId of deletedModules){
            if (!addedModules.has(moduleId)) {
                deleted.push(moduleId);
            }
        }
        if (added.length === 0 && deleted.length === 0) {
            return undefined;
        }
        return {
            type: 'partial',
            added,
            deleted
        };
    }
    if (updateA.type === 'partial' && updateB.type === 'partial') {
        const added = new Set([
            ...updateA.added ?? [],
            ...updateB.added ?? []
        ]);
        const deleted = new Set([
            ...updateA.deleted ?? [],
            ...updateB.deleted ?? []
        ]);
        if (updateB.added != null) {
            for (const moduleId of updateB.added){
                deleted.delete(moduleId);
            }
        }
        if (updateB.deleted != null) {
            for (const moduleId of updateB.deleted){
                added.delete(moduleId);
            }
        }
        return {
            type: 'partial',
            added: [
                ...added
            ],
            deleted: [
                ...deleted
            ]
        };
    }
    if (updateA.type === 'added' && updateB.type === 'partial') {
        const modules = new Set([
            ...updateA.modules ?? [],
            ...updateB.added ?? []
        ]);
        for (const moduleId of updateB.deleted ?? []){
            modules.delete(moduleId);
        }
        return {
            type: 'added',
            modules: [
                ...modules
            ]
        };
    }
    if (updateA.type === 'partial' && updateB.type === 'deleted') {
        // We could eagerly return `updateB` here, but this would potentially be
        // incorrect if `updateA` has added modules.
        const modules = new Set(updateB.modules ?? []);
        if (updateA.added != null) {
            for (const moduleId of updateA.added){
                modules.delete(moduleId);
            }
        }
        return {
            type: 'deleted',
            modules: [
                ...modules
            ]
        };
    }
    // Any other update combination is invalid.
    return undefined;
}
function invariant(_, message) {
    throw new Error(`Invariant: ${message}`);
}
const CRITICAL = [
    'bug',
    'error',
    'fatal'
];
function compareByList(list, a, b) {
    const aI = list.indexOf(a) + 1 || list.length;
    const bI = list.indexOf(b) + 1 || list.length;
    return aI - bI;
}
const chunksWithIssues = new Map();
function emitIssues() {
    const issues = [];
    const deduplicationSet = new Set();
    for (const [_, chunkIssues] of chunksWithIssues){
        for (const chunkIssue of chunkIssues){
            if (deduplicationSet.has(chunkIssue.formatted)) continue;
            issues.push(chunkIssue);
            deduplicationSet.add(chunkIssue.formatted);
        }
    }
    sortIssues(issues);
    hooks.issues(issues);
}
function handleIssues(msg) {
    const key = resourceKey(msg.resource);
    let hasCriticalIssues = false;
    for (const issue of msg.issues){
        if (CRITICAL.includes(issue.severity)) {
            hasCriticalIssues = true;
        }
    }
    if (msg.issues.length > 0) {
        chunksWithIssues.set(key, msg.issues);
    } else if (chunksWithIssues.has(key)) {
        chunksWithIssues.delete(key);
    }
    emitIssues();
    return hasCriticalIssues;
}
const SEVERITY_ORDER = [
    'bug',
    'fatal',
    'error',
    'warning',
    'info',
    'log'
];
const CATEGORY_ORDER = [
    'parse',
    'resolve',
    'code generation',
    'rendering',
    'typescript',
    'other'
];
function sortIssues(issues) {
    issues.sort((a, b)=>{
        const first = compareByList(SEVERITY_ORDER, a.severity, b.severity);
        if (first !== 0) return first;
        return compareByList(CATEGORY_ORDER, a.category, b.category);
    });
}
const hooks = {
    beforeRefresh: ()=>{},
    refresh: ()=>{},
    buildOk: ()=>{},
    issues: (_issues)=>{}
};
function setHooks(newHooks) {
    Object.assign(hooks, newHooks);
}
function handleSocketMessage(msg) {
    sortIssues(msg.issues);
    handleIssues(msg);
    switch(msg.type){
        case 'issues':
            break;
        case 'partial':
            // aggregate updates
            aggregateUpdates(msg);
            break;
        default:
            // run single update
            const runHooks = chunkListsWithPendingUpdates.size === 0;
            if (runHooks) hooks.beforeRefresh();
            triggerUpdate(msg);
            if (runHooks) finalizeUpdate();
            break;
    }
}
function finalizeUpdate() {
    hooks.refresh();
    hooks.buildOk();
    // This is used by the Next.js integration test suite to notify it when HMR
    // updates have been completed.
    // TODO: Only run this in test environments (gate by `process.env.__NEXT_TEST_MODE`)
    if (globalThis.__NEXT_HMR_CB) {
        globalThis.__NEXT_HMR_CB();
        globalThis.__NEXT_HMR_CB = null;
    }
}
function subscribeToChunkUpdate(chunkListPath, sendMessage, callback) {
    return subscribeToUpdate({
        path: chunkListPath
    }, sendMessage, callback);
}
function subscribeToUpdate(resource, sendMessage, callback) {
    const key = resourceKey(resource);
    let callbackSet;
    const existingCallbackSet = updateCallbackSets.get(key);
    if (!existingCallbackSet) {
        callbackSet = {
            callbacks: new Set([
                callback
            ]),
            unsubscribe: subscribeToUpdates(sendMessage, resource)
        };
        updateCallbackSets.set(key, callbackSet);
    } else {
        existingCallbackSet.callbacks.add(callback);
        callbackSet = existingCallbackSet;
    }
    return ()=>{
        callbackSet.callbacks.delete(callback);
        if (callbackSet.callbacks.size === 0) {
            callbackSet.unsubscribe();
            updateCallbackSets.delete(key);
        }
    };
}
function triggerUpdate(msg) {
    const key = resourceKey(msg.resource);
    const callbackSet = updateCallbackSets.get(key);
    if (!callbackSet) {
        return;
    }
    for (const callback of callbackSet.callbacks){
        callback(msg);
    }
    if (msg.type === 'notFound') {
        // This indicates that the resource which we subscribed to either does not exist or
        // has been deleted. In either case, we should clear all update callbacks, so if a
        // new subscription is created for the same resource, it will send a new "subscribe"
        // message to the server.
        // No need to send an "unsubscribe" message to the server, it will have already
        // dropped the update stream before sending the "notFound" message.
        updateCallbackSets.delete(key);
    }
}
}),
"[project]/lib/taxonomy.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// QT TAXONOMY — v3 COMPLETE (130 use cases, 14 categories)
// Source: QT_Taxonomy_Validator_Revised_v3.xlsx — Use Case Reference sheet
// This is the CANONICAL mapping KB used in the system prompt
__turbopack_context__.s([
    "QT_CATEGORIES",
    ()=>QT_CATEGORIES,
    "QT_SYSTEM_PROMPT",
    ()=>QT_SYSTEM_PROMPT,
    "QT_USE_CASES",
    ()=>QT_USE_CASES,
    "VERDICTS_META",
    ()=>VERDICTS_META
]);
const QT_CATEGORIES = [
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
const QT_USE_CASES = {
    // ── Image Generation and Editing ───────────────────────────────────────
    "Image Generator": "Image Generation and Editing",
    "Photo Editor": "Image Generation and Editing",
    "Background Remover": "Image Generation and Editing",
    "Image Enhancer & Upscaler": "Image Generation and Editing",
    "Face Swap": "Image Generation and Editing",
    "Headshot Generator": "Image Generation and Editing",
    "Avatar & Profile Picture Generator": "Image Generation and Editing",
    "GIF Generator": "Image Generation and Editing",
    "Background Generator": "Image Generation and Editing",
    "Infographic Generator": "Image Generation and Editing",
    "Poster & Banner Generator": "Image Generation and Editing",
    "Flyer Generator": "Image Generation and Editing",
    "Coloring Page Generator": "Image Generation and Editing",
    "Sketch to Image": "Image Generation and Editing",
    "Watermark Remover": "Image Generation and Editing",
    "Sticker Generator": "Image Generation and Editing",
    "Icon Generator": "Image Generation and Editing",
    "Collage Maker": "Image Generation and Editing",
    "Illustration Generator": "Image Generation and Editing",
    "SVG & Vector Generator": "Image Generation and Editing",
    "Graphic Design Tool": "Image Generation and Editing",
    // ── Video and Audio Production ──────────────────────────────────────────
    "Video Generator": "Video and Audio Production",
    "Video Editor": "Video and Audio Production",
    "Text to Speech & Voiceover": "Video and Audio Production",
    "Voice Cloning": "Video and Audio Production",
    "Voice Changer": "Video and Audio Production",
    "Music Generator": "Video and Audio Production",
    "Short Video & Clip Generator": "Video and Audio Production",
    "UGC Video Generator": "Performance Marketing",
    "Image to Video Generator": "Video and Audio Production",
    "Video Enhancer & Upscaler": "Video and Audio Production",
    "Animation Generator": "Video and Audio Production",
    "Video Translator & Dubbing": "Video and Audio Production",
    "Podcast Tool": "Video and Audio Production",
    "Script Writer": "Video and Audio Production",
    "Avatar Video Generator": "Video and Audio Production",
    "Faceless Video Generator": "Video and Audio Production",
    "YouTube Video Generator": "Video and Audio Production",
    "Video Background Remover": "Video and Audio Production",
    "Sound Effect Generator": "Video and Audio Production",
    "Transcription & Speech to Text": "Video and Audio Production",
    "Subtitle Generator": "Video and Audio Production",
    "Audio Enhancer & Noise Remover": "Video and Audio Production",
    "AI Screen Recorder": "Video and Audio Production",
    // ── Content Marketing and Copywriting ───────────────────────────────────
    "Writing Assistant": "Content Marketing and Copywriting",
    "AI Content Detector": "Content Marketing and Copywriting",
    "Blog & Article Writer": "Content Marketing and Copywriting",
    "Story Generator": "Content Marketing and Copywriting",
    "Essay Writer": "Content Marketing and Copywriting",
    "Copywriting Tool": "Content Marketing and Copywriting",
    "Paraphraser & Rewriter": "Content Marketing and Copywriting",
    "Grammar Checker & Proofreader": "Content Marketing and Copywriting",
    "Outline Generator": "Content Marketing and Copywriting",
    "Content Repurposing Tool": "Content Marketing and Copywriting",
    "Press Release Generator": "Content Marketing and Copywriting",
    "Book & Ebook Writer": "Content Marketing and Copywriting",
    "Title & Headline Generator": "Content Marketing and Copywriting",
    "Speech Writer": "Content Marketing and Copywriting",
    "Quiz Generator": "Content Marketing and Copywriting",
    // ── SEO and Organic Growth ───────────────────────────────────────────────
    "SEO Content Optimizer": "SEO and Organic Growth",
    "Keyword Research Tool": "SEO and Organic Growth",
    "Meta Description Generator": "SEO and Organic Growth",
    "Schema Markup Generator": "SEO and Organic Growth",
    "Rank Tracker": "SEO and Organic Growth",
    "YouTube SEO & Optimization": "SEO and Organic Growth",
    "Image to Text & Alt Text Generator": "SEO and Organic Growth",
    "Sitemap Generator": "SEO and Organic Growth",
    // ── Social Media Marketing ───────────────────────────────────────────────
    "Social Media Post Generator": "Social Media Marketing",
    "TikTok Content Generator": "Social Media Marketing",
    "Thumbnail Generator": "Social Media Marketing",
    "Carousel Generator": "Social Media Marketing",
    "LinkedIn Post Generator": "Social Media Marketing",
    "Instagram Post Generator": "Social Media Marketing",
    "Facebook Post Generator": "Social Media Marketing",
    "Tweet & Thread Generator": "Social Media Marketing",
    "Meme Generator": "Social Media Marketing",
    "Hashtag Generator": "Social Media Marketing",
    "Bio Generator": "Social Media Marketing",
    "Caption Generator": "Social Media Marketing",
    // ── Performance Marketing ────────────────────────────────────────────────
    "Ad Generator": "Performance Marketing",
    "Video Ad & Commercial Generator": "Performance Marketing",
    "Lead Generation Tool": "Performance Marketing",
    "Funnel Builder": "Performance Marketing",
    "Marketing Analytics": "Performance Marketing",
    // ── Email and Communication ──────────────────────────────────────────────
    "Email Writer": "Email and Communication",
    "Newsletter Generator": "Email and Communication",
    "Response & Reply Generator": "Email and Communication",
    "Translation Tool": "Email and Communication",
    "Letter & Cover Letter Writer": "Email and Communication",
    "Subject Line Generator": "Email and Communication",
    // ── Ecommerce Marketing ──────────────────────────────────────────────────
    "Shopify & Ecommerce Tool": "Ecommerce Marketing",
    "Product Description Generator": "Ecommerce Marketing",
    "Product Photography Generator": "Ecommerce Marketing",
    "Mockup Generator": "Ecommerce Marketing",
    "T-Shirt Design Generator": "Ecommerce Marketing",
    // ── Business and Productivity ────────────────────────────────────────────
    "Presentation & Slide Maker": "Business and Productivity",
    "Data Analysis & Visualization": "Business and Productivity",
    "Report Generator": "Business and Productivity",
    "Business Plan Generator": "Business and Productivity",
    "Market & Competitor Research": "Business and Productivity",
    "Meeting Notes & Summary": "Business and Productivity",
    "Mind Map & Brainstorming Tool": "Business and Productivity",
    "Diagram Generator": "Business and Productivity",
    "Summarizer": "Business and Productivity",
    // ── Customer Engagement and CRM ─────────────────────────────────────────
    "Customer Service Chatbot": "Customer Engagement and CRM",
    "Review Generator": "Customer Engagement and CRM",
    "Social Listening & Brand Monitoring": "Customer Engagement and CRM",
    "WhatsApp Chatbot": "Customer Engagement and CRM",
    "Customer Feedback Analyzer": "Customer Engagement and CRM",
    "AI CRM Software": "Customer Engagement and CRM",
    // ── Website and Conversion ───────────────────────────────────────────────
    "Chatbot Builder": "Website and Conversion",
    "Website Builder": "Website and Conversion",
    "Landing Page Builder": "Website and Conversion",
    "Form & Survey Builder": "Website and Conversion",
    "QR Code Generator": "Website and Conversion",
    // ── Brand Management ────────────────────────────────────────────────────
    "Logo Generator": "Brand Management",
    "Brand Kit Generator": "Brand Management",
    "Domain Name Generator": "Brand Management",
    "Slogan & Tagline Generator": "Brand Management",
    "AI Business Card Generator": "Brand Management",
    "AI Brochure Maker": "Brand Management",
    "Color Palette Generator": "Brand Management",
    "Font Generator": "Brand Management",
    // ── UI/UX and Web Design ────────────────────────────────────────────────
    "UI Generator / UI Designer": "UI/UX and Web Design",
    "Wireframe Generator": "UI/UX and Web Design",
    "Website Design Generator": "UI/UX and Web Design",
    "Prototype Generator": "UI/UX and Web Design",
    "Figma AI Tools": "UI/UX and Web Design",
    "App Icon / Favicon Generator": "UI/UX and Web Design"
};
const QT_SYSTEM_PROMPT = `You are the QT Taxonomy Mapping Agent for QuantumThought (quantumthought.ai).

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
const VERDICTS_META = {
    "Correct": {
        label: "Correct",
        color: "#16a34a",
        bg: "#f0fdf4",
        description: "All 4 v2.1 gates pass. UC and category are correct."
    },
    "Refine": {
        label: "Refine",
        color: "#2563EB",
        bg: "#eff6ff",
        description: "Correct area, but a more specific v3 UC fits better."
    },
    "Partial": {
        label: "Partial",
        color: "#d97706",
        bg: "#fffbeb",
        description: "Approximate match — a better UC is available."
    },
    "Incorrect": {
        label: "Incorrect",
        color: "#dc2626",
        bg: "#fef2f2",
        description: "Wrong UC or fails a validation gate."
    },
    "Out of Taxonomy": {
        label: "Out of Taxonomy",
        color: "#6b7280",
        bg: "#f5f5f5",
        description: "Outside QT marketing taxonomy — exclude."
    },
    "Review Needed": {
        label: "Review Needed",
        color: "#92400e",
        bg: "#fef9c3",
        description: "Description too short — needs official website check."
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/pages/index.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Home
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/styled-jsx/style.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$head$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/head.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/xlsx/xlsx.mjs [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$taxonomy$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/taxonomy.js [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
;
// ─── Constants ───────────────────────────────────────────────────────────────
const BATCH_SIZE = 20;
const PHASES = [
    "Parsing & normalising source file",
    "Detecting tool type (Narrow / Broad-suite / GPAA)",
    "Running 4-gate validation per tool",
    "Scoring 5 dimensions (positioning · depth · persona · output · evidence)",
    "Assigning mapping roles & enforcing public caps",
    "Running New-UC cluster detection",
    "Building output"
];
const SOURCES = [
    {
        id: "auto",
        label: "Auto-detect"
    },
    {
        id: "taaft",
        label: "TAAFT"
    },
    {
        id: "aixploria",
        label: "AIxploria"
    },
    {
        id: "toolify",
        label: "Toolify"
    },
    {
        id: "custom",
        label: "Custom"
    }
];
const ENHANCEMENTS = [
    {
        key: "sourceAware",
        label: "Source-aware confidence",
        desc: "Adjusts evidence score based on source quality (TAAFT vs AIxploria vs custom)."
    },
    {
        key: "conflict",
        label: "Conflict detection",
        desc: "Flags duplicate tool names in your source file before mapping starts."
    },
    {
        key: "newUC",
        label: "New-UC detection",
        desc: "After mapping, finds clusters needing a new QT use case."
    },
    {
        key: "liveness",
        label: "Discontinued tool flagging",
        desc: "Marks tools with no/very short descriptions as Review Needed."
    },
    {
        key: "rationale",
        label: "Broad-suite rationale log",
        desc: "Logs dominant workflow reasoning for Canva/HubSpot/Jasper-type tools."
    }
];
// ─── Helpers ─────────────────────────────────────────────────────────────────
function sleep(ms) {
    return new Promise((r)=>setTimeout(r, ms));
}
function parseFile(file) {
    return new Promise((resolve, reject)=>{
        const reader = new FileReader();
        reader.onload = (e)=>{
            try {
                let rows = [], cols = [];
                if (file.name.toLowerCase().endsWith(".csv")) {
                    const text = e.target.result;
                    const lines = text.split(/\r?\n/).filter((l)=>l.trim());
                    cols = lines[0].split(",").map((h)=>h.trim().replace(/^"|"$/g, ""));
                    for(let i = 1; i < lines.length; i++){
                        const vals = lines[i].split(",").map((v)=>v.trim().replace(/^"|"$/g, ""));
                        const obj = {};
                        cols.forEach((c, j)=>{
                            obj[c] = vals[j] || "";
                        });
                        rows.push(obj);
                    }
                } else {
                    const wb = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["read"](e.target.result, {
                        type: "binary"
                    });
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    rows = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["utils"].sheet_to_json(ws, {
                        defval: ""
                    });
                    cols = rows.length ? Object.keys(rows[0]) : [];
                }
                resolve({
                    rows,
                    cols
                });
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        if (file.name.toLowerCase().endsWith(".csv")) reader.readAsText(file);
        else reader.readAsBinaryString(file);
    });
}
function guessColumns(cols) {
    const nameCol = cols.find((c)=>/tool.?name|name|title/i.test(c)) || cols[0] || "";
    const descCol = cols.find((c)=>/desc|tagline|summary|about|sc_desc|list_desc/i.test(c)) || cols[1] || "";
    const urlCol = cols.find((c)=>/url|website|link|web/i.test(c)) || "";
    return {
        nameCol,
        descCol,
        urlCol
    };
}
function downloadExcel(results, newUCSuggestions, mode, source) {
    const wb = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["utils"].book_new();
    // Sheet 1: Main results
    const main = [
        [
            "Tool Name",
            "Website URL",
            "QT Primary Use Case",
            "QT Category",
            "Tool Type",
            "Verdict",
            "Score (0-100)",
            "Suggested Use Case",
            "Dominant Workflow Rationale",
            "Validator Notes",
            "Delta Status"
        ],
        ...results.map((r)=>[
                r.tool_name || "",
                r._url || "",
                r.qt_use_case || "",
                r.qt_category || "",
                r.tool_type || "",
                r.verdict || "",
                r.score || 0,
                r.suggested_uc || "",
                r.dominant_workflow_rationale || "",
                r.notes || "",
                r._delta || ""
            ])
    ];
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["utils"].book_append_sheet(wb, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["utils"].aoa_to_sheet(main), "QT Mapping Results");
    // Sheet 2: Review queue (non-Correct / non-Refine)
    const flagged = results.filter((r)=>![
            "Correct",
            "Refine"
        ].includes(r.verdict));
    const reviewSheet = [
        [
            "Tool Name",
            "Current QT Use Case",
            "Verdict",
            "Suggested Correct UC",
            "Notes"
        ],
        ...flagged.map((r)=>[
                r.tool_name || "",
                r.qt_use_case || "—",
                r.verdict || "",
                r.suggested_uc || "",
                r.notes || ""
            ])
    ];
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["utils"].book_append_sheet(wb, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["utils"].aoa_to_sheet(reviewSheet), "Review Queue");
    // Sheet 3: New UC suggestions
    if (newUCSuggestions.length > 0) {
        const ucSheet = [
            [
                "Suggested Use Case",
                "Parent Category",
                "Why Needed",
                "Example Tools"
            ],
            ...newUCSuggestions.map((s)=>[
                    s.use_case_name || "",
                    s.suggested_category || "",
                    s.reason || "",
                    s.example_tools || ""
                ])
        ];
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["utils"].book_append_sheet(wb, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["utils"].aoa_to_sheet(ucSheet), "New UC Suggestions");
    }
    // Sheet 4: Broad-suite log
    const bsRows = results.filter((r)=>r.tool_type === "Broad-suite" && r.dominant_workflow_rationale);
    if (bsRows.length > 0) {
        const bsSheet = [
            [
                "Tool Name",
                "Primary UC",
                "Category",
                "Dominant Workflow Rationale"
            ],
            ...bsRows.map((r)=>[
                    r.tool_name || "",
                    r.qt_use_case || "",
                    r.qt_category || "",
                    r.dominant_workflow_rationale || ""
                ])
        ];
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["utils"].book_append_sheet(wb, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["utils"].aoa_to_sheet(bsSheet), "Broad-Suite Log");
    }
    // Sheet 5: Summary
    const counts = {};
    results.forEach((r)=>{
        counts[r.verdict] = (counts[r.verdict] || 0) + 1;
    });
    const summarySheet = [
        [
            "Metric",
            "Value"
        ],
        [
            "Total Processed",
            results.length
        ],
        [
            "Mode",
            mode
        ],
        [
            "Source",
            source
        ],
        [
            "Run Date",
            new Date().toLocaleDateString()
        ],
        [
            "",
            ""
        ],
        [
            "Verdict",
            "Count"
        ],
        ...Object.entries(counts).map(([k, v])=>[
                k,
                v
            ])
    ];
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["utils"].book_append_sheet(wb, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["utils"].aoa_to_sheet(summarySheet), "Run Summary");
    const date = new Date().toISOString().split("T")[0];
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["writeFile"](wb, `QT_Mapping_${mode}_${date}.xlsx`);
}
function Home() {
    _s();
    const [step, setStep] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(1);
    const [mode, setMode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])("full");
    const [source, setSource] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])("auto");
    const [enhs, setEnhs] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])({
        sourceAware: true,
        conflict: true,
        newUC: true,
        liveness: true,
        rationale: true
    });
    const [fileRows, setFileRows] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [fileCols, setFileCols] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [nameCol, setNameCol] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [descCol, setDescCol] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [urlCol, setUrlCol] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [fileName, setFileName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [existingRows, setExistingRows] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [existingFileName, setExistingFileName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [results, setResults] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [newUCSuggestions, setNewUCSuggestions] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [progress, setProgress] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])({
        done: 0,
        total: 0,
        batch: 0,
        correct: 0,
        flagged: 0
    });
    const [phase, setPhase] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(-1);
    const [log, setLog] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [filter, setFilter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])("all");
    const [search, setSearch] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])("");
    const fileInputRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRef"])();
    const existingFileRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRef"])();
    const addLog = (msg)=>setLog((prev)=>[
                ...prev.slice(-30),
                msg
            ]);
    // ── File handling ──────────────────────────────────────────────────────────
    async function handleFile(file) {
        try {
            const { rows, cols } = await parseFile(file);
            setFileRows(rows);
            setFileCols(cols);
            setFileName(file.name);
            const guess = guessColumns(cols);
            setNameCol(guess.nameCol);
            setDescCol(guess.descCol);
            setUrlCol(guess.urlCol);
        } catch (e) {
            setError("Could not read file: " + e.message);
        }
    }
    async function handleExistingFile(file) {
        try {
            const { rows } = await parseFile(file);
            setExistingRows(rows);
            setExistingFileName(file.name);
        } catch (e) {
            setError("Could not read existing file: " + e.message);
        }
    }
    // ── Main run ───────────────────────────────────────────────────────────────
    async function runMapping() {
        setError("");
        setLog([]);
        setResults([]);
        setNewUCSuggestions([]);
        setStep(3);
        setPhase(0);
        // Build tool list
        let tools = fileRows.map((r)=>({
                name: String(r[nameCol] || "").trim(),
                description: String(r[descCol] || "").trim(),
                url: urlCol ? String(r[urlCol] || "").trim() : "",
                _raw: r
            })).filter((t)=>t.name);
        // Delta mode: remove already-mapped tools
        if (mode === "delta" && existingRows.length > 0) {
            const existingNames = new Set(existingRows.map((r)=>String(r["Tool Name"] || r["tool_name"] || "").toLowerCase().trim()));
            const before = tools.length;
            tools = tools.filter((t)=>!existingNames.has(t.name.toLowerCase()));
            addLog(`Delta: ${before} total → ${tools.length} new/changed tools`);
            tools = tools.map((t)=>({
                    ...t,
                    _delta: "New"
                }));
        }
        // Calibration mode: first 25 only
        if (mode === "calibrate") {
            tools = tools.slice(0, 25);
            addLog(`Calibration mode: processing first 25 tools`);
        }
        // Conflict detection
        if (enhs.conflict) {
            const nc = {};
            tools.forEach((t)=>{
                nc[t.name.toLowerCase()] = (nc[t.name.toLowerCase()] || 0) + 1;
            });
            const conflicts = Object.entries(nc).filter(([, n])=>n > 1).map(([k])=>k);
            if (conflicts.length > 0) addLog(`⚠ ${conflicts.length} duplicate tool names detected: ${conflicts.slice(0, 3).join(", ")}${conflicts.length > 3 ? " ..." : ""}`);
        }
        // Liveness flagging
        let livenessFlagged = 0;
        if (enhs.liveness) {
            livenessFlagged = tools.filter((t)=>!t.description || t.description.length < 15).length;
            if (livenessFlagged > 0) addLog(`⚠ ${livenessFlagged} tools have no/short description → will be flagged Review Needed`);
        }
        setProgress({
            done: 0,
            total: tools.length,
            batch: 0,
            correct: 0,
            flagged: 0
        });
        setPhase(1);
        const allResults = [];
        const totalBatches = Math.ceil(tools.length / BATCH_SIZE);
        for(let i = 0; i < tools.length; i += BATCH_SIZE){
            const batchNum = Math.floor(i / BATCH_SIZE) + 1;
            const batch = tools.slice(i, i + BATCH_SIZE);
            setProgress((p)=>({
                    ...p,
                    batch: batchNum
                }));
            setPhase(2);
            addLog(`Batch ${batchNum}/${totalBatches}: mapping tools ${i + 1}–${Math.min(i + BATCH_SIZE, tools.length)}...`);
            try {
                setPhase(3);
                const res = await fetch("/api/map", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        tools: batch,
                        source,
                        enhancements: enhs,
                        mode
                    })
                });
                if (!res.ok) {
                    const errData = await res.json().catch(()=>({}));
                    throw new Error(errData.error || `HTTP ${res.status}`);
                }
                const data = await res.json();
                const batchResults = (data.results || []).map((r, j)=>({
                        ...r,
                        _url: batch[j]?._url || batch[j]?.url || "",
                        _delta: batch[j]?._delta || ""
                    }));
                allResults.push(...batchResults);
                setPhase(4);
                const correct = allResults.filter((r)=>r.verdict === "Correct").length;
                const flagged = allResults.filter((r)=>![
                        "Correct",
                        "Refine"
                    ].includes(r.verdict)).length;
                setProgress((p)=>({
                        ...p,
                        done: allResults.length,
                        correct,
                        flagged
                    }));
                setResults([
                    ...allResults
                ]);
                addLog(`✓ Batch ${batchNum}: ${batchResults.filter((r)=>r.verdict === "Correct").length} Correct, ${batchResults.filter((r)=>r.verdict === "Incorrect").length} Incorrect`);
                setPhase(5);
                if (i + BATCH_SIZE < tools.length) await sleep(800);
            } catch (err) {
                addLog(`❌ Batch ${batchNum} error: ${err.message}`);
                // Mark batch as Review Needed and continue
                batch.forEach((t, j)=>{
                    allResults.push({
                        tool_name: t.name,
                        qt_use_case: "",
                        qt_category: "",
                        tool_type: "",
                        verdict: "Review Needed",
                        score: 0,
                        suggested_uc: "",
                        dominant_workflow_rationale: "",
                        notes: `API error: ${err.message}`,
                        _url: t.url || "",
                        _delta: t._delta || ""
                    });
                });
                setResults([
                    ...allResults
                ]);
            }
        }
        // New-UC detection
        setPhase(5);
        if (enhs.newUC) {
            const reviewRows = allResults.filter((r)=>[
                    "Review Needed",
                    "Out of Taxonomy"
                ].includes(r.verdict));
            if (reviewRows.length >= 3) {
                addLog(`Running New-UC detection on ${reviewRows.length} Review Needed/Out of Taxonomy tools...`);
                try {
                    const res = await fetch("/api/detect-new-uc", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            reviewRows
                        })
                    });
                    const data = await res.json();
                    if (data.suggestions?.length > 0) {
                        setNewUCSuggestions(data.suggestions);
                        addLog(`💡 ${data.suggestions.length} new use case(s) suggested`);
                    }
                } catch (e) {
                    addLog("New-UC detection skipped (non-critical error)");
                }
            }
        }
        // Append existing rows for delta mode
        if (mode === "delta" && existingRows.length > 0) {
            const existingFormatted = existingRows.map((r)=>({
                    tool_name: String(r["Tool Name"] || ""),
                    qt_use_case: String(r["QT Primary Use Case"] || ""),
                    qt_category: String(r["QT Category"] || r["QT Primary Category"] || ""),
                    tool_type: String(r["Tool Type"] || ""),
                    verdict: String(r["Verdict"] || "Correct"),
                    score: Number(r["Score (0-100)"] || 0),
                    suggested_uc: String(r["Suggested Use Case"] || ""),
                    dominant_workflow_rationale: String(r["Dominant Workflow Rationale"] || ""),
                    notes: String(r["Validator Notes"] || ""),
                    _url: String(r["Website URL"] || ""),
                    _delta: "Existing"
                }));
            allResults.push(...existingFormatted);
            setResults([
                ...allResults
            ]);
        }
        setPhase(6);
        await sleep(300);
        setStep(4);
        addLog(`✅ Complete: ${allResults.filter((r)=>r.verdict === "Correct").length} Correct out of ${allResults.length} tools`);
    }
    // ── Filtered results ───────────────────────────────────────────────────────
    const filtered = results.filter((r)=>{
        const matchV = filter === "all" || r.verdict === filter;
        const matchS = !search || r.tool_name?.toLowerCase().includes(search.toLowerCase());
        return matchV && matchS;
    });
    const stats = {
        Correct: results.filter((r)=>r.verdict === "Correct").length,
        Refine: results.filter((r)=>r.verdict === "Refine").length,
        "Partial/Incorrect": results.filter((r)=>[
                "Partial",
                "Incorrect"
            ].includes(r.verdict)).length,
        "Review Needed": results.filter((r)=>r.verdict === "Review Needed").length,
        "Out of Taxonomy": results.filter((r)=>r.verdict === "Out of Taxonomy").length
    };
    // ── Render ─────────────────────────────────────────────────────────────────
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$head$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("title", {
                        className: "jsx-59332589fe4d066a",
                        children: "QT Mapping Agent — QuantumThought"
                    }, void 0, false, {
                        fileName: "[project]/pages/index.js",
                        lineNumber: 336,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("meta", {
                        name: "viewport",
                        content: "width=device-width, initial-scale=1",
                        className: "jsx-59332589fe4d066a"
                    }, void 0, false, {
                        fileName: "[project]/pages/index.js",
                        lineNumber: 337,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("link", {
                        rel: "preconnect",
                        href: "https://fonts.googleapis.com",
                        className: "jsx-59332589fe4d066a"
                    }, void 0, false, {
                        fileName: "[project]/pages/index.js",
                        lineNumber: 338,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("link", {
                        href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap",
                        rel: "stylesheet",
                        className: "jsx-59332589fe4d066a"
                    }, void 0, false, {
                        fileName: "[project]/pages/index.js",
                        lineNumber: 339,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/pages/index.js",
                lineNumber: 335,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                id: "59332589fe4d066a",
                children: "*,:before,:after{box-sizing:border-box;margin:0;padding:0}body{color:#0f172a;background:#f8faff;min-height:100vh;font-family:Plus Jakarta Sans,sans-serif}h1,h2,h3{font-family:Bricolage Grotesque,sans-serif}input,select,button{font-family:inherit}.mono{font-family:JetBrains Mono,monospace}::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:#f1f5f9}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px}"
            }, void 0, false, void 0, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                style: {
                    background: "#1A1A2E",
                    height: 56,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 32px",
                    position: "sticky",
                    top: 0,
                    zIndex: 100
                },
                className: "jsx-59332589fe4d066a",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: "flex",
                            alignItems: "center",
                            gap: 12
                        },
                        className: "jsx-59332589fe4d066a",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                style: {
                                    fontFamily: "Bricolage Grotesque",
                                    fontWeight: 800,
                                    fontSize: 18,
                                    color: "#fff"
                                },
                                className: "jsx-59332589fe4d066a",
                                children: [
                                    "Quantum",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        style: {
                                            color: "#2563EB"
                                        },
                                        className: "jsx-59332589fe4d066a",
                                        children: "Thought"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/index.js",
                                        lineNumber: 357,
                                        columnNumber: 20
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/index.js",
                                lineNumber: 356,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                style: {
                                    fontSize: 10,
                                    background: "rgba(37,99,235,.25)",
                                    color: "#93c5fd",
                                    padding: "3px 8px",
                                    borderRadius: 4,
                                    letterSpacing: ".04em"
                                },
                                className: "jsx-59332589fe4d066a" + " " + "mono",
                                children: "MAPPING AGENT"
                            }, void 0, false, {
                                fileName: "[project]/pages/index.js",
                                lineNumber: 359,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/index.js",
                        lineNumber: 355,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        style: {
                            fontSize: 11,
                            color: "rgba(255,255,255,.35)"
                        },
                        className: "jsx-59332589fe4d066a" + " " + "mono",
                        children: "v3 Taxonomy · v2.1 Guidelines"
                    }, void 0, false, {
                        fileName: "[project]/pages/index.js",
                        lineNumber: 361,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/pages/index.js",
                lineNumber: 354,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    display: "flex",
                    borderBottom: "1px solid #e2e8f0",
                    background: "#fff"
                },
                className: "jsx-59332589fe4d066a",
                children: [
                    "Settings",
                    "Upload File",
                    "Running",
                    "Results"
                ].map((label, i)=>{
                    const n = i + 1;
                    const isActive = step === n;
                    const isDone = step > n;
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            flex: 1,
                            padding: "14px 16px",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            borderRight: "1px solid #e2e8f0",
                            background: isActive ? "#1A1A2E" : "#fff",
                            cursor: isDone ? "pointer" : "default"
                        },
                        onClick: ()=>isDone && setStep(n),
                        className: "jsx-59332589fe4d066a",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    width: 24,
                                    height: 24,
                                    borderRadius: "50%",
                                    background: isActive ? "#2563EB" : isDone ? "#16a34a" : "#e2e8f0",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 11,
                                    fontWeight: 500,
                                    color: isActive || isDone ? "#fff" : "#64748B",
                                    flexShrink: 0,
                                    fontFamily: "JetBrains Mono"
                                },
                                className: "jsx-59332589fe4d066a",
                                children: isDone ? "✓" : n
                            }, void 0, false, {
                                fileName: "[project]/pages/index.js",
                                lineNumber: 372,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: isActive ? "#fff" : isDone ? "#16a34a" : "#64748B",
                                    lineHeight: 1.3
                                },
                                className: "jsx-59332589fe4d066a",
                                children: label
                            }, void 0, false, {
                                fileName: "[project]/pages/index.js",
                                lineNumber: 373,
                                columnNumber: 15
                            }, this)
                        ]
                    }, n, true, {
                        fileName: "[project]/pages/index.js",
                        lineNumber: 371,
                        columnNumber: 13
                    }, this);
                })
            }, void 0, false, {
                fileName: "[project]/pages/index.js",
                lineNumber: 365,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    maxWidth: 1080,
                    margin: "0 auto",
                    padding: "32px 24px"
                },
                className: "jsx-59332589fe4d066a",
                children: [
                    step === 1 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "jsx-59332589fe4d066a",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    background: "#fff",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: 16,
                                    padding: "28px 32px",
                                    marginBottom: 20,
                                    boxShadow: "0 1px 3px rgba(0,0,0,.06)"
                                },
                                className: "jsx-59332589fe4d066a",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontSize: 10,
                                            color: "#2563EB",
                                            letterSpacing: ".1em",
                                            textTransform: "uppercase",
                                            marginBottom: 8,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8
                                        },
                                        className: "jsx-59332589fe4d066a" + " " + "mono",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                style: {
                                                    width: 16,
                                                    height: 1.5,
                                                    background: "#2563EB",
                                                    display: "inline-block"
                                                },
                                                className: "jsx-59332589fe4d066a"
                                            }, void 0, false, {
                                                fileName: "[project]/pages/index.js",
                                                lineNumber: 386,
                                                columnNumber: 187
                                            }, this),
                                            "Step 1 of 4"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/pages/index.js",
                                        lineNumber: 386,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        style: {
                                            fontSize: 20,
                                            fontWeight: 700,
                                            color: "#1A1A2E",
                                            marginBottom: 6,
                                            letterSpacing: "-.02em"
                                        },
                                        className: "jsx-59332589fe4d066a",
                                        children: "Choose mapping mode"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/index.js",
                                        lineNumber: 387,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        style: {
                                            fontSize: 13,
                                            color: "#64748B",
                                            marginBottom: 20
                                        },
                                        className: "jsx-59332589fe4d066a",
                                        children: "Pick what you want to do. All 5 quality enhancements are on by default."
                                    }, void 0, false, {
                                        fileName: "[project]/pages/index.js",
                                        lineNumber: 388,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: "grid",
                                            gridTemplateColumns: "repeat(3,1fr)",
                                            gap: 10,
                                            marginBottom: 20
                                        },
                                        className: "jsx-59332589fe4d066a",
                                        children: [
                                            {
                                                id: "full",
                                                icon: "🗺️",
                                                name: "Full Mapping Run",
                                                desc: "Map a fresh batch of tools against QT taxonomy from scratch."
                                            },
                                            {
                                                id: "delta",
                                                icon: "⚡",
                                                name: "Delta / Incremental",
                                                desc: "Upload new batch + existing mapped file. Only new/changed tools get processed."
                                            },
                                            {
                                                id: "calibrate",
                                                icon: "🎯",
                                                name: "Calibration Run",
                                                desc: "Run only the first 25 tools to validate scoring thresholds before a full run."
                                            }
                                        ].map((m)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                onClick: ()=>setMode(m.id),
                                                style: {
                                                    padding: "14px 16px",
                                                    border: `1.5px solid ${mode === m.id ? "#2563EB" : "#e2e8f0"}`,
                                                    borderRadius: 10,
                                                    cursor: "pointer",
                                                    background: mode === m.id ? "#eff6ff" : "#fff",
                                                    position: "relative",
                                                    transition: "all .15s"
                                                },
                                                className: "jsx-59332589fe4d066a",
                                                children: [
                                                    mode === m.id && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        style: {
                                                            position: "absolute",
                                                            top: 8,
                                                            right: 10,
                                                            color: "#2563EB",
                                                            fontWeight: 700,
                                                            fontSize: 13
                                                        },
                                                        className: "jsx-59332589fe4d066a",
                                                        children: "✓"
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/index.js",
                                                        lineNumber: 396,
                                                        columnNumber: 37
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            fontSize: 18,
                                                            marginBottom: 6
                                                        },
                                                        className: "jsx-59332589fe4d066a",
                                                        children: m.icon
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/index.js",
                                                        lineNumber: 397,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            fontSize: 12,
                                                            fontWeight: 700,
                                                            color: "#1A1A2E"
                                                        },
                                                        className: "jsx-59332589fe4d066a",
                                                        children: m.name
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/index.js",
                                                        lineNumber: 398,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            fontSize: 11,
                                                            color: "#64748B",
                                                            marginTop: 2,
                                                            lineHeight: 1.5
                                                        },
                                                        className: "jsx-59332589fe4d066a",
                                                        children: m.desc
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/index.js",
                                                        lineNumber: 399,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, m.id, true, {
                                                fileName: "[project]/pages/index.js",
                                                lineNumber: 395,
                                                columnNumber: 19
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/pages/index.js",
                                        lineNumber: 389,
                                        columnNumber: 15
                                    }, this),
                                    mode === "delta" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            background: "#eff6ff",
                                            border: "1px solid #bfdbfe",
                                            borderRadius: 8,
                                            padding: "10px 14px",
                                            fontSize: 12,
                                            color: "#1e40af",
                                            marginBottom: 16,
                                            lineHeight: 1.6
                                        },
                                        className: "jsx-59332589fe4d066a",
                                        children: [
                                            "Delta mode: also upload your existing mapped Excel below so only new tools are processed.",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    marginTop: 8
                                                },
                                                className: "jsx-59332589fe4d066a",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                        style: {
                                                            display: "inline-flex",
                                                            alignItems: "center",
                                                            gap: 8,
                                                            fontSize: 12,
                                                            cursor: "pointer",
                                                            padding: "6px 12px",
                                                            border: "1.5px dashed #93c5fd",
                                                            borderRadius: 8,
                                                            color: "#1e40af"
                                                        },
                                                        className: "jsx-59332589fe4d066a",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                type: "file",
                                                                accept: ".xlsx,.xls,.csv",
                                                                style: {
                                                                    display: "none"
                                                                },
                                                                ref: existingFileRef,
                                                                onChange: (e)=>e.target.files[0] && handleExistingFile(e.target.files[0]),
                                                                className: "jsx-59332589fe4d066a"
                                                            }, void 0, false, {
                                                                fileName: "[project]/pages/index.js",
                                                                lineNumber: 408,
                                                                columnNumber: 23
                                                            }, this),
                                                            "📂 Upload existing mapped file"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/pages/index.js",
                                                        lineNumber: 407,
                                                        columnNumber: 21
                                                    }, this),
                                                    existingFileName && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        style: {
                                                            fontSize: 12,
                                                            color: "#16a34a",
                                                            marginLeft: 10,
                                                            fontFamily: "JetBrains Mono"
                                                        },
                                                        className: "jsx-59332589fe4d066a",
                                                        children: [
                                                            "✓ ",
                                                            existingFileName
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/pages/index.js",
                                                        lineNumber: 411,
                                                        columnNumber: 42
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/pages/index.js",
                                                lineNumber: 406,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/pages/index.js",
                                        lineNumber: 404,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/index.js",
                                lineNumber: 385,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    background: "#fff",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: 16,
                                    padding: "28px 32px",
                                    marginBottom: 20,
                                    boxShadow: "0 1px 3px rgba(0,0,0,.06)"
                                },
                                className: "jsx-59332589fe4d066a",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        style: {
                                            fontSize: 18,
                                            fontWeight: 700,
                                            color: "#1A1A2E",
                                            marginBottom: 6,
                                            letterSpacing: "-.02em"
                                        },
                                        className: "jsx-59332589fe4d066a",
                                        children: "Quality enhancements"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/index.js",
                                        lineNumber: 419,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        style: {
                                            fontSize: 13,
                                            color: "#64748B",
                                            marginBottom: 18
                                        },
                                        className: "jsx-59332589fe4d066a",
                                        children: "All 5 are on by default. Turn any off for a faster run."
                                    }, void 0, false, {
                                        fileName: "[project]/pages/index.js",
                                        lineNumber: 420,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: "grid",
                                            gridTemplateColumns: "1fr 1fr",
                                            gap: 10
                                        },
                                        className: "jsx-59332589fe4d066a",
                                        children: ENHANCEMENTS.map((e)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                onClick: ()=>setEnhs((prev)=>({
                                                            ...prev,
                                                            [e.key]: !prev[e.key]
                                                        })),
                                                style: {
                                                    display: "flex",
                                                    alignItems: "flex-start",
                                                    gap: 10,
                                                    padding: "12px 14px",
                                                    border: `1.5px solid ${enhs[e.key] ? "#2563EB" : "#e2e8f0"}`,
                                                    borderRadius: 10,
                                                    cursor: "pointer",
                                                    background: enhs[e.key] ? "#eff6ff" : "#fff",
                                                    transition: "all .15s"
                                                },
                                                className: "jsx-59332589fe4d066a",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            width: 18,
                                                            height: 18,
                                                            borderRadius: 4,
                                                            border: `2px solid ${enhs[e.key] ? "#2563EB" : "#d1d5db"}`,
                                                            flexShrink: 0,
                                                            marginTop: 1,
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            fontSize: 11,
                                                            background: enhs[e.key] ? "#2563EB" : "transparent",
                                                            color: "#fff"
                                                        },
                                                        className: "jsx-59332589fe4d066a",
                                                        children: enhs[e.key] ? "✓" : ""
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/index.js",
                                                        lineNumber: 424,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "jsx-59332589fe4d066a",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                style: {
                                                                    fontSize: 12,
                                                                    fontWeight: 700,
                                                                    color: "#1A1A2E"
                                                                },
                                                                className: "jsx-59332589fe4d066a",
                                                                children: e.label
                                                            }, void 0, false, {
                                                                fileName: "[project]/pages/index.js",
                                                                lineNumber: 425,
                                                                columnNumber: 26
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                style: {
                                                                    fontSize: 11,
                                                                    color: "#64748B",
                                                                    marginTop: 2,
                                                                    lineHeight: 1.5
                                                                },
                                                                className: "jsx-59332589fe4d066a",
                                                                children: e.desc
                                                            }, void 0, false, {
                                                                fileName: "[project]/pages/index.js",
                                                                lineNumber: 425,
                                                                columnNumber: 103
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/pages/index.js",
                                                        lineNumber: 425,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, e.key, true, {
                                                fileName: "[project]/pages/index.js",
                                                lineNumber: 423,
                                                columnNumber: 19
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/pages/index.js",
                                        lineNumber: 421,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/index.js",
                                lineNumber: 418,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setStep(2),
                                style: {
                                    width: "100%",
                                    padding: 16,
                                    border: "none",
                                    borderRadius: 12,
                                    background: "linear-gradient(135deg,#1A1A2E,#2563EB)",
                                    color: "#fff",
                                    fontFamily: "Bricolage Grotesque",
                                    fontWeight: 700,
                                    fontSize: 16,
                                    cursor: "pointer",
                                    letterSpacing: "-.01em"
                                },
                                className: "jsx-59332589fe4d066a",
                                children: "Continue to Upload File →"
                            }, void 0, false, {
                                fileName: "[project]/pages/index.js",
                                lineNumber: 431,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/index.js",
                        lineNumber: 383,
                        columnNumber: 11
                    }, this),
                    step === 2 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "jsx-59332589fe4d066a",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    background: "#fff",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: 16,
                                    padding: "28px 32px",
                                    marginBottom: 20,
                                    boxShadow: "0 1px 3px rgba(0,0,0,.06)"
                                },
                                className: "jsx-59332589fe4d066a",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontSize: 10,
                                            color: "#2563EB",
                                            letterSpacing: ".1em",
                                            textTransform: "uppercase",
                                            marginBottom: 8,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8
                                        },
                                        className: "jsx-59332589fe4d066a" + " " + "mono",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                style: {
                                                    width: 16,
                                                    height: 1.5,
                                                    background: "#2563EB",
                                                    display: "inline-block"
                                                },
                                                className: "jsx-59332589fe4d066a"
                                            }, void 0, false, {
                                                fileName: "[project]/pages/index.js",
                                                lineNumber: 441,
                                                columnNumber: 187
                                            }, this),
                                            "Step 2 of 4"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/pages/index.js",
                                        lineNumber: 441,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        style: {
                                            fontSize: 20,
                                            fontWeight: 700,
                                            color: "#1A1A2E",
                                            marginBottom: 6
                                        },
                                        className: "jsx-59332589fe4d066a",
                                        children: "Upload your tool file"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/index.js",
                                        lineNumber: 442,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        style: {
                                            fontSize: 13,
                                            color: "#64748B",
                                            marginBottom: 18
                                        },
                                        className: "jsx-59332589fe4d066a",
                                        children: "Any CSV or Excel from TAAFT, Toolify, AIxploria, or your own list. The agent auto-detects columns."
                                    }, void 0, false, {
                                        fileName: "[project]/pages/index.js",
                                        lineNumber: 443,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: "flex",
                                            gap: 8,
                                            flexWrap: "wrap",
                                            marginBottom: 18
                                        },
                                        className: "jsx-59332589fe4d066a",
                                        children: SOURCES.map((s)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                onClick: ()=>setSource(s.id),
                                                style: {
                                                    padding: "6px 14px",
                                                    border: `1.5px solid ${source === s.id ? "#1A1A2E" : "#e2e8f0"}`,
                                                    borderRadius: 20,
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    cursor: "pointer",
                                                    background: source === s.id ? "#1A1A2E" : "#fff",
                                                    color: source === s.id ? "#fff" : "#64748B",
                                                    transition: "all .15s"
                                                },
                                                className: "jsx-59332589fe4d066a",
                                                children: s.label
                                            }, s.id, false, {
                                                fileName: "[project]/pages/index.js",
                                                lineNumber: 448,
                                                columnNumber: 19
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/pages/index.js",
                                        lineNumber: 446,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        onClick: ()=>fileInputRef.current?.click(),
                                        onDragOver: (e)=>{
                                            e.preventDefault();
                                            e.currentTarget.style.borderColor = "#2563EB";
                                            e.currentTarget.style.background = "#eff6ff";
                                        },
                                        onDragLeave: (e)=>{
                                            e.currentTarget.style.borderColor = "#e2e8f0";
                                            e.currentTarget.style.background = fileRows.length ? "#f0fdf4" : "#F8FAFF";
                                        },
                                        onDrop: (e)=>{
                                            e.preventDefault();
                                            e.currentTarget.style.borderColor = fileRows.length ? "#16a34a" : "#e2e8f0";
                                            e.currentTarget.style.background = fileRows.length ? "#f0fdf4" : "#F8FAFF";
                                            if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
                                        },
                                        style: {
                                            border: `2px dashed ${fileRows.length ? "#16a34a" : "#e2e8f0"}`,
                                            borderRadius: 12,
                                            padding: 32,
                                            textAlign: "center",
                                            cursor: "pointer",
                                            background: fileRows.length ? "#f0fdf4" : "#F8FAFF",
                                            transition: "all .2s"
                                        },
                                        className: "jsx-59332589fe4d066a",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: 32,
                                                    marginBottom: 10
                                                },
                                                className: "jsx-59332589fe4d066a",
                                                children: "📂"
                                            }, void 0, false, {
                                                fileName: "[project]/pages/index.js",
                                                lineNumber: 459,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: 14,
                                                    fontWeight: 600,
                                                    color: "#1A1A2E",
                                                    marginBottom: 4
                                                },
                                                className: "jsx-59332589fe4d066a",
                                                children: "Click to upload or drag & drop"
                                            }, void 0, false, {
                                                fileName: "[project]/pages/index.js",
                                                lineNumber: 460,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: 12,
                                                    color: "#64748B"
                                                },
                                                className: "jsx-59332589fe4d066a",
                                                children: "Supports .xlsx, .xls, .csv — any column order"
                                            }, void 0, false, {
                                                fileName: "[project]/pages/index.js",
                                                lineNumber: 461,
                                                columnNumber: 17
                                            }, this),
                                            fileName && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: 12,
                                                    color: "#16a34a",
                                                    marginTop: 8,
                                                    fontWeight: 500
                                                },
                                                className: "jsx-59332589fe4d066a" + " " + "mono",
                                                children: [
                                                    "✓ ",
                                                    fileName,
                                                    " (",
                                                    fileRows.length,
                                                    " rows)"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/pages/index.js",
                                                lineNumber: 462,
                                                columnNumber: 30
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/pages/index.js",
                                        lineNumber: 453,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "file",
                                        accept: ".xlsx,.xls,.csv",
                                        style: {
                                            display: "none"
                                        },
                                        ref: fileInputRef,
                                        onChange: (e)=>e.target.files[0] && handleFile(e.target.files[0]),
                                        className: "jsx-59332589fe4d066a"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/index.js",
                                        lineNumber: 464,
                                        columnNumber: 15
                                    }, this),
                                    fileRows.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            marginTop: 16
                                        },
                                        className: "jsx-59332589fe4d066a",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    background: "#eff6ff",
                                                    border: "1px solid #bfdbfe",
                                                    borderRadius: 8,
                                                    padding: "10px 14px",
                                                    fontSize: 12,
                                                    color: "#1e40af",
                                                    marginBottom: 14,
                                                    lineHeight: 1.6
                                                },
                                                className: "jsx-59332589fe4d066a",
                                                children: [
                                                    "✓ Loaded ",
                                                    fileRows.length,
                                                    " rows. Preview: ",
                                                    fileRows.slice(0, 2).map((r)=>`${r[nameCol] || "?"}: ${String(r[descCol] || "").slice(0, 50)}`).join(" | ")
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/pages/index.js",
                                                lineNumber: 469,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    display: "flex",
                                                    gap: 12,
                                                    flexWrap: "wrap",
                                                    alignItems: "center"
                                                },
                                                className: "jsx-59332589fe4d066a",
                                                children: [
                                                    [
                                                        "Name column",
                                                        nameCol,
                                                        setNameCol
                                                    ],
                                                    [
                                                        "Description column",
                                                        descCol,
                                                        setDescCol
                                                    ],
                                                    [
                                                        "URL column (optional)",
                                                        urlCol,
                                                        setUrlCol
                                                    ]
                                                ].map(([label, val, setter])=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                        style: {
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: 6,
                                                            fontSize: 12,
                                                            color: "#64748B",
                                                            fontWeight: 600
                                                        },
                                                        className: "jsx-59332589fe4d066a",
                                                        children: [
                                                            label,
                                                            ":",
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                                value: val,
                                                                onChange: (e)=>setter(e.target.value),
                                                                style: {
                                                                    padding: "5px 8px",
                                                                    border: "1.5px solid #e2e8f0",
                                                                    borderRadius: 6,
                                                                    fontSize: 12,
                                                                    outline: "none"
                                                                },
                                                                className: "jsx-59332589fe4d066a",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                        value: "",
                                                                        className: "jsx-59332589fe4d066a",
                                                                        children: "-- select --"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/pages/index.js",
                                                                        lineNumber: 477,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    fileCols.map((c)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                            value: c,
                                                                            className: "jsx-59332589fe4d066a",
                                                                            children: c
                                                                        }, c, false, {
                                                                            fileName: "[project]/pages/index.js",
                                                                            lineNumber: 478,
                                                                            columnNumber: 46
                                                                        }, this))
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/pages/index.js",
                                                                lineNumber: 476,
                                                                columnNumber: 25
                                                            }, this)
                                                        ]
                                                    }, label, true, {
                                                        fileName: "[project]/pages/index.js",
                                                        lineNumber: 474,
                                                        columnNumber: 23
                                                    }, this))
                                            }, void 0, false, {
                                                fileName: "[project]/pages/index.js",
                                                lineNumber: 472,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/pages/index.js",
                                        lineNumber: 468,
                                        columnNumber: 17
                                    }, this),
                                    error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            background: "#fef2f2",
                                            border: "1px solid #fecaca",
                                            borderRadius: 8,
                                            padding: "10px 14px",
                                            fontSize: 12,
                                            color: "#dc2626",
                                            marginTop: 12
                                        },
                                        className: "jsx-59332589fe4d066a",
                                        children: [
                                            "❌ ",
                                            error
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/pages/index.js",
                                        lineNumber: 486,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/index.js",
                                lineNumber: 440,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: runMapping,
                                disabled: !fileRows.length || !nameCol || !descCol,
                                style: {
                                    width: "100%",
                                    padding: 16,
                                    border: "none",
                                    borderRadius: 12,
                                    background: "linear-gradient(135deg,#1A1A2E,#2563EB)",
                                    color: "#fff",
                                    fontFamily: "Bricolage Grotesque",
                                    fontWeight: 700,
                                    fontSize: 16,
                                    cursor: !fileRows.length || !nameCol || !descCol ? "not-allowed" : "pointer",
                                    opacity: !fileRows.length || !nameCol || !descCol ? 0.45 : 1,
                                    letterSpacing: "-.01em"
                                },
                                className: "jsx-59332589fe4d066a",
                                children: "Start Mapping Run →"
                            }, void 0, false, {
                                fileName: "[project]/pages/index.js",
                                lineNumber: 489,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/index.js",
                        lineNumber: 439,
                        columnNumber: 11
                    }, this),
                    step === 3 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            background: "#1A1A2E",
                            borderRadius: 16,
                            padding: "28px 32px"
                        },
                        className: "jsx-59332589fe4d066a",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                style: {
                                    fontFamily: "Bricolage Grotesque",
                                    fontWeight: 700,
                                    fontSize: 18,
                                    color: "#fff",
                                    marginBottom: 18
                                },
                                className: "jsx-59332589fe4d066a",
                                children: "🤖 Mapping Agent Running..."
                            }, void 0, false, {
                                fileName: "[project]/pages/index.js",
                                lineNumber: 498,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 8,
                                    marginBottom: 20
                                },
                                className: "jsx-59332589fe4d066a",
                                children: PHASES.map((p, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 12
                                        },
                                        className: "jsx-59332589fe4d066a",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: "50%",
                                                    background: i < phase ? "#4ade80" : i === phase ? "#60a5fa" : "rgba(255,255,255,.2)",
                                                    flexShrink: 0,
                                                    boxShadow: i === phase ? "0 0 8px #3b82f6" : "none",
                                                    transition: "all .3s"
                                                },
                                                className: "jsx-59332589fe4d066a"
                                            }, void 0, false, {
                                                fileName: "[project]/pages/index.js",
                                                lineNumber: 502,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: 13,
                                                    color: i < phase ? "#4ade80" : i === phase ? "#fff" : "rgba(255,255,255,.45)",
                                                    fontWeight: i === phase ? 600 : 400,
                                                    transition: "all .3s"
                                                },
                                                className: "jsx-59332589fe4d066a",
                                                children: p
                                            }, void 0, false, {
                                                fileName: "[project]/pages/index.js",
                                                lineNumber: 503,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, i, true, {
                                        fileName: "[project]/pages/index.js",
                                        lineNumber: 501,
                                        columnNumber: 17
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/pages/index.js",
                                lineNumber: 499,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    background: "rgba(255,255,255,.1)",
                                    borderRadius: 8,
                                    height: 8,
                                    overflow: "hidden",
                                    marginBottom: 12
                                },
                                className: "jsx-59332589fe4d066a",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        height: "100%",
                                        background: "linear-gradient(90deg,#3b82f6,#60a5fa)",
                                        borderRadius: 8,
                                        width: `${progress.total ? Math.round(progress.done / progress.total * 100) : 0}%`,
                                        transition: "width .4s ease"
                                    },
                                    className: "jsx-59332589fe4d066a"
                                }, void 0, false, {
                                    fileName: "[project]/pages/index.js",
                                    lineNumber: 508,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/pages/index.js",
                                lineNumber: 507,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: "flex",
                                    gap: 20,
                                    marginBottom: 14
                                },
                                className: "jsx-59332589fe4d066a",
                                children: [
                                    [
                                        "Tools",
                                        progress.total
                                    ],
                                    [
                                        "Processed",
                                        progress.done
                                    ],
                                    [
                                        "Correct",
                                        progress.correct
                                    ],
                                    [
                                        "Flagged",
                                        progress.flagged
                                    ],
                                    [
                                        "Batch",
                                        progress.batch
                                    ]
                                ].map(([l, v])=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            textAlign: "center"
                                        },
                                        className: "jsx-59332589fe4d066a",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: 22,
                                                    fontWeight: 500,
                                                    color: "#fff"
                                                },
                                                className: "jsx-59332589fe4d066a" + " " + "mono",
                                                children: v
                                            }, void 0, false, {
                                                fileName: "[project]/pages/index.js",
                                                lineNumber: 513,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: 11,
                                                    color: "rgba(255,255,255,.45)",
                                                    marginTop: 2
                                                },
                                                className: "jsx-59332589fe4d066a",
                                                children: l
                                            }, void 0, false, {
                                                fileName: "[project]/pages/index.js",
                                                lineNumber: 514,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, l, true, {
                                        fileName: "[project]/pages/index.js",
                                        lineNumber: 512,
                                        columnNumber: 17
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/pages/index.js",
                                lineNumber: 510,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    background: "rgba(0,0,0,.2)",
                                    borderRadius: 8,
                                    padding: "10px 12px",
                                    fontFamily: "JetBrains Mono",
                                    fontSize: 11,
                                    color: "rgba(255,255,255,.65)",
                                    maxHeight: 120,
                                    overflowY: "auto",
                                    lineHeight: 1.7
                                },
                                className: "jsx-59332589fe4d066a",
                                children: log.map((l, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "jsx-59332589fe4d066a",
                                        children: [
                                            "› ",
                                            l
                                        ]
                                    }, i, true, {
                                        fileName: "[project]/pages/index.js",
                                        lineNumber: 519,
                                        columnNumber: 33
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/pages/index.js",
                                lineNumber: 518,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/index.js",
                        lineNumber: 497,
                        columnNumber: 11
                    }, this),
                    step === 4 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "jsx-59332589fe4d066a",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    background: "#fff",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: 16,
                                    padding: "18px 32px",
                                    marginBottom: 20,
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    flexWrap: "wrap",
                                    gap: 12,
                                    boxShadow: "0 1px 3px rgba(0,0,0,.06)"
                                },
                                className: "jsx-59332589fe4d066a",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "jsx-59332589fe4d066a",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: 10,
                                                    color: "#2563EB",
                                                    letterSpacing: ".1em",
                                                    textTransform: "uppercase",
                                                    marginBottom: 4,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 8
                                                },
                                                className: "jsx-59332589fe4d066a" + " " + "mono",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        style: {
                                                            width: 16,
                                                            height: 1.5,
                                                            background: "#2563EB",
                                                            display: "inline-block"
                                                        },
                                                        className: "jsx-59332589fe4d066a"
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/index.js",
                                                        lineNumber: 530,
                                                        columnNumber: 189
                                                    }, this),
                                                    "Complete"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/pages/index.js",
                                                lineNumber: 530,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                                style: {
                                                    fontSize: 20,
                                                    fontWeight: 700,
                                                    color: "#1A1A2E",
                                                    letterSpacing: "-.02em"
                                                },
                                                className: "jsx-59332589fe4d066a",
                                                children: "Mapping Results"
                                            }, void 0, false, {
                                                fileName: "[project]/pages/index.js",
                                                lineNumber: 531,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/pages/index.js",
                                        lineNumber: 529,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>downloadExcel(results, newUCSuggestions, mode, source),
                                        style: {
                                            padding: "10px 22px",
                                            background: "#16a34a",
                                            color: "#fff",
                                            border: "none",
                                            borderRadius: 10,
                                            fontFamily: "Bricolage Grotesque",
                                            fontWeight: 700,
                                            fontSize: 14,
                                            cursor: "pointer"
                                        },
                                        className: "jsx-59332589fe4d066a",
                                        children: "⬇ Download Excel"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/index.js",
                                        lineNumber: 533,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/index.js",
                                lineNumber: 528,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: "grid",
                                    gridTemplateColumns: "repeat(5,1fr)",
                                    gap: 10,
                                    marginBottom: 20
                                },
                                className: "jsx-59332589fe4d066a",
                                children: [
                                    {
                                        label: "✅ Correct",
                                        val: stats["Correct"],
                                        color: "#16a34a"
                                    },
                                    {
                                        label: "🔵 Refine",
                                        val: stats["Refine"],
                                        color: "#2563EB"
                                    },
                                    {
                                        label: "⚠️ Partial/Incorrect",
                                        val: stats["Partial/Incorrect"],
                                        color: "#d97706"
                                    },
                                    {
                                        label: "🔍 Review",
                                        val: stats["Review Needed"],
                                        color: "#0891b2"
                                    },
                                    {
                                        label: "⬛ Excluded",
                                        val: stats["Out of Taxonomy"],
                                        color: "#6b7280"
                                    }
                                ].map((s)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            background: "#fff",
                                            border: "1px solid #e2e8f0",
                                            borderRadius: 12,
                                            padding: 16,
                                            textAlign: "center",
                                            boxShadow: "0 1px 3px rgba(0,0,0,.06)"
                                        },
                                        className: "jsx-59332589fe4d066a",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontFamily: "Bricolage Grotesque",
                                                    fontWeight: 800,
                                                    fontSize: 28,
                                                    color: s.color,
                                                    marginBottom: 2
                                                },
                                                className: "jsx-59332589fe4d066a",
                                                children: s.val
                                            }, void 0, false, {
                                                fileName: "[project]/pages/index.js",
                                                lineNumber: 548,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: 11,
                                                    color: "#64748B",
                                                    fontWeight: 500
                                                },
                                                className: "jsx-59332589fe4d066a",
                                                children: s.label
                                            }, void 0, false, {
                                                fileName: "[project]/pages/index.js",
                                                lineNumber: 549,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, s.label, true, {
                                        fileName: "[project]/pages/index.js",
                                        lineNumber: 547,
                                        columnNumber: 17
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/pages/index.js",
                                lineNumber: 539,
                                columnNumber: 13
                            }, this),
                            newUCSuggestions.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    background: "#fffbeb",
                                    border: "1.5px solid #fcd34d",
                                    borderRadius: 12,
                                    padding: "18px 24px",
                                    marginBottom: 20
                                },
                                className: "jsx-59332589fe4d066a",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontFamily: "Bricolage Grotesque",
                                            fontWeight: 700,
                                            fontSize: 16,
                                            color: "#92400e",
                                            marginBottom: 12
                                        },
                                        className: "jsx-59332589fe4d066a",
                                        children: "💡 New Use Case Suggestions from this batch"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/index.js",
                                        lineNumber: 557,
                                        columnNumber: 17
                                    }, this),
                                    newUCSuggestions.map((s, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                background: "#fff",
                                                border: "1px solid #fde68a",
                                                borderRadius: 8,
                                                padding: "10px 14px",
                                                marginBottom: 8
                                            },
                                            className: "jsx-59332589fe4d066a",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        fontWeight: 700,
                                                        fontSize: 13,
                                                        color: "#1A1A2E"
                                                    },
                                                    className: "jsx-59332589fe4d066a",
                                                    children: [
                                                        s.use_case_name,
                                                        " ",
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            style: {
                                                                fontSize: 11,
                                                                color: "#64748B",
                                                                fontWeight: 400
                                                            },
                                                            className: "jsx-59332589fe4d066a",
                                                            children: [
                                                                "→ ",
                                                                s.suggested_category
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/pages/index.js",
                                                            lineNumber: 560,
                                                            columnNumber: 101
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/pages/index.js",
                                                    lineNumber: 560,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        fontSize: 12,
                                                        color: "#64748B",
                                                        marginTop: 3
                                                    },
                                                    className: "jsx-59332589fe4d066a",
                                                    children: [
                                                        s.reason,
                                                        " | Examples: ",
                                                        s.example_tools
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/pages/index.js",
                                                    lineNumber: 561,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, i, true, {
                                            fileName: "[project]/pages/index.js",
                                            lineNumber: 559,
                                            columnNumber: 19
                                        }, this))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/index.js",
                                lineNumber: 556,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    background: "#fff",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: 12,
                                    overflow: "hidden",
                                    boxShadow: "0 1px 3px rgba(0,0,0,.06)"
                                },
                                className: "jsx-59332589fe4d066a",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            padding: "14px 20px 10px",
                                            borderBottom: "1px solid #e2e8f0",
                                            display: "flex",
                                            gap: 8,
                                            flexWrap: "wrap",
                                            alignItems: "center"
                                        },
                                        className: "jsx-59332589fe4d066a",
                                        children: [
                                            [
                                                [
                                                    "all",
                                                    "All"
                                                ],
                                                [
                                                    "Correct",
                                                    "✅ Correct"
                                                ],
                                                [
                                                    "Refine",
                                                    "🔵 Refine"
                                                ],
                                                [
                                                    "Partial",
                                                    "⚠️ Partial"
                                                ],
                                                [
                                                    "Incorrect",
                                                    "❌ Incorrect"
                                                ],
                                                [
                                                    "Out of Taxonomy",
                                                    "⬛ Excluded"
                                                ],
                                                [
                                                    "Review Needed",
                                                    "🔍 Review"
                                                ]
                                            ].map(([val, label])=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    onClick: ()=>setFilter(val),
                                                    style: {
                                                        padding: "5px 12px",
                                                        border: `1.5px solid ${filter === val ? "#1A1A2E" : "#e2e8f0"}`,
                                                        borderRadius: 20,
                                                        fontSize: 11,
                                                        fontWeight: 600,
                                                        cursor: "pointer",
                                                        background: filter === val ? "#1A1A2E" : "#fff",
                                                        color: filter === val ? "#fff" : "#64748B",
                                                        transition: "all .15s"
                                                    },
                                                    className: "jsx-59332589fe4d066a",
                                                    children: label
                                                }, val, false, {
                                                    fileName: "[project]/pages/index.js",
                                                    lineNumber: 575,
                                                    columnNumber: 19
                                                }, this)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                placeholder: "Search tool name...",
                                                value: search,
                                                onChange: (e)=>setSearch(e.target.value),
                                                style: {
                                                    marginLeft: "auto",
                                                    padding: "6px 12px",
                                                    border: "1.5px solid #e2e8f0",
                                                    borderRadius: 8,
                                                    fontSize: 12,
                                                    outline: "none",
                                                    width: 200
                                                },
                                                className: "jsx-59332589fe4d066a"
                                            }, void 0, false, {
                                                fileName: "[project]/pages/index.js",
                                                lineNumber: 577,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/pages/index.js",
                                        lineNumber: 569,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            overflowX: "auto"
                                        },
                                        className: "jsx-59332589fe4d066a",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                                style: {
                                                    width: "100%",
                                                    borderCollapse: "collapse",
                                                    fontSize: 12
                                                },
                                                className: "jsx-59332589fe4d066a",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                        className: "jsx-59332589fe4d066a",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                            className: "jsx-59332589fe4d066a",
                                                            children: [
                                                                "#",
                                                                "TOOL NAME",
                                                                "QT USE CASE",
                                                                "CATEGORY",
                                                                "VERDICT",
                                                                "TYPE",
                                                                "SCORE",
                                                                "SUGGESTED UC",
                                                                "NOTES"
                                                            ].map((h)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                    style: {
                                                                        background: "#1A1A2E",
                                                                        color: "#fff",
                                                                        padding: "9px 12px",
                                                                        textAlign: "left",
                                                                        fontWeight: 600,
                                                                        fontSize: 10,
                                                                        whiteSpace: "nowrap",
                                                                        fontFamily: "JetBrains Mono",
                                                                        letterSpacing: ".04em"
                                                                    },
                                                                    className: "jsx-59332589fe4d066a",
                                                                    children: h
                                                                }, h, false, {
                                                                    fileName: "[project]/pages/index.js",
                                                                    lineNumber: 583,
                                                                    columnNumber: 23
                                                                }, this))
                                                        }, void 0, false, {
                                                            fileName: "[project]/pages/index.js",
                                                            lineNumber: 582,
                                                            columnNumber: 21
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/index.js",
                                                        lineNumber: 581,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                        className: "jsx-59332589fe4d066a",
                                                        children: filtered.map((r, i)=>{
                                                            const vm = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$taxonomy$2e$js__$5b$client$5d$__$28$ecmascript$29$__["VERDICTS_META"][r.verdict] || {
                                                                color: "#000",
                                                                bg: "#fff"
                                                            };
                                                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                style: {
                                                                    borderBottom: "1px solid #f1f5f9"
                                                                },
                                                                className: "jsx-59332589fe4d066a",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                        style: {
                                                                            padding: "8px 12px",
                                                                            color: "#94a3b8",
                                                                            fontFamily: "JetBrains Mono",
                                                                            fontSize: 10
                                                                        },
                                                                        className: "jsx-59332589fe4d066a",
                                                                        children: i + 1
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/pages/index.js",
                                                                        lineNumber: 591,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                        style: {
                                                                            padding: "8px 12px"
                                                                        },
                                                                        className: "jsx-59332589fe4d066a",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                style: {
                                                                                    fontWeight: 700,
                                                                                    color: "#1A1A2E",
                                                                                    fontSize: 12
                                                                                },
                                                                                className: "jsx-59332589fe4d066a",
                                                                                children: r.tool_name
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/pages/index.js",
                                                                                lineNumber: 593,
                                                                                columnNumber: 29
                                                                            }, this),
                                                                            r._url && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                                                href: r._url,
                                                                                target: "_blank",
                                                                                rel: "noreferrer",
                                                                                style: {
                                                                                    fontSize: 10,
                                                                                    color: "#2563EB"
                                                                                },
                                                                                className: "jsx-59332589fe4d066a",
                                                                                children: "↗ site"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/pages/index.js",
                                                                                lineNumber: 594,
                                                                                columnNumber: 40
                                                                            }, this),
                                                                            r._delta && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                style: {
                                                                                    fontSize: 9,
                                                                                    background: "#f0fdf4",
                                                                                    color: "#16a34a",
                                                                                    padding: "1px 5px",
                                                                                    borderRadius: 3,
                                                                                    marginLeft: 4
                                                                                },
                                                                                className: "jsx-59332589fe4d066a" + " " + "mono",
                                                                                children: r._delta
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/pages/index.js",
                                                                                lineNumber: 595,
                                                                                columnNumber: 42
                                                                            }, this)
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/pages/index.js",
                                                                        lineNumber: 592,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                        style: {
                                                                            padding: "8px 12px",
                                                                            color: "#2563EB",
                                                                            fontWeight: 600,
                                                                            fontSize: 11
                                                                        },
                                                                        className: "jsx-59332589fe4d066a",
                                                                        children: r.qt_use_case || "—"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/pages/index.js",
                                                                        lineNumber: 597,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                        style: {
                                                                            padding: "8px 12px",
                                                                            color: "#64748B",
                                                                            fontSize: 11
                                                                        },
                                                                        className: "jsx-59332589fe4d066a",
                                                                        children: r.qt_category || "—"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/pages/index.js",
                                                                        lineNumber: 598,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                        style: {
                                                                            padding: "8px 12px"
                                                                        },
                                                                        className: "jsx-59332589fe4d066a",
                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            style: {
                                                                                display: "inline-block",
                                                                                padding: "3px 8px",
                                                                                borderRadius: 6,
                                                                                fontSize: 10,
                                                                                fontWeight: 700,
                                                                                fontFamily: "JetBrains Mono",
                                                                                background: vm.bg,
                                                                                color: vm.color,
                                                                                whiteSpace: "nowrap"
                                                                            },
                                                                            className: "jsx-59332589fe4d066a",
                                                                            children: r.verdict
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/pages/index.js",
                                                                            lineNumber: 600,
                                                                            columnNumber: 29
                                                                        }, this)
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/pages/index.js",
                                                                        lineNumber: 599,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                        style: {
                                                                            padding: "8px 12px",
                                                                            color: "#64748B",
                                                                            fontSize: 10,
                                                                            fontFamily: "JetBrains Mono"
                                                                        },
                                                                        className: "jsx-59332589fe4d066a",
                                                                        children: r.tool_type?.split("/")?.[0] || "—"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/pages/index.js",
                                                                        lineNumber: 602,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                        style: {
                                                                            padding: "8px 12px",
                                                                            textAlign: "center"
                                                                        },
                                                                        className: "jsx-59332589fe4d066a",
                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            style: {
                                                                                fontFamily: "JetBrains Mono",
                                                                                fontSize: 12,
                                                                                fontWeight: 600,
                                                                                color: r.score >= 75 ? "#16a34a" : r.score >= 50 ? "#d97706" : r.score > 0 ? "#dc2626" : "#94a3b8"
                                                                            },
                                                                            className: "jsx-59332589fe4d066a",
                                                                            children: r.score > 0 ? r.score : "—"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/pages/index.js",
                                                                            lineNumber: 604,
                                                                            columnNumber: 29
                                                                        }, this)
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/pages/index.js",
                                                                        lineNumber: 603,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                        style: {
                                                                            padding: "8px 12px",
                                                                            color: "#d97706",
                                                                            fontSize: 11,
                                                                            fontWeight: 600
                                                                        },
                                                                        className: "jsx-59332589fe4d066a",
                                                                        children: r.suggested_uc || ""
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/pages/index.js",
                                                                        lineNumber: 606,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                        style: {
                                                                            padding: "8px 12px",
                                                                            color: "#64748B",
                                                                            fontSize: 11,
                                                                            maxWidth: 260
                                                                        },
                                                                        className: "jsx-59332589fe4d066a",
                                                                        children: r.notes || ""
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/pages/index.js",
                                                                        lineNumber: 607,
                                                                        columnNumber: 27
                                                                    }, this)
                                                                ]
                                                            }, i, true, {
                                                                fileName: "[project]/pages/index.js",
                                                                lineNumber: 590,
                                                                columnNumber: 25
                                                            }, this);
                                                        })
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/index.js",
                                                        lineNumber: 586,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/pages/index.js",
                                                lineNumber: 580,
                                                columnNumber: 17
                                            }, this),
                                            filtered.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    padding: 40,
                                                    textAlign: "center",
                                                    color: "#64748B",
                                                    fontSize: 13
                                                },
                                                className: "jsx-59332589fe4d066a",
                                                children: "No results match this filter."
                                            }, void 0, false, {
                                                fileName: "[project]/pages/index.js",
                                                lineNumber: 613,
                                                columnNumber: 43
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/pages/index.js",
                                        lineNumber: 579,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/index.js",
                                lineNumber: 568,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/index.js",
                        lineNumber: 526,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/pages/index.js",
                lineNumber: 379,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
_s(Home, "C8W5gbmjby6ESDHET+kHD/Sy1Wg=");
_c = Home;
var _c;
__turbopack_context__.k.register(_c, "Home");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[next]/entry/page-loader.ts { PAGE => \"[project]/pages/index.js [client] (ecmascript)\" } [client] (ecmascript)", ((__turbopack_context__, module, exports) => {

const PAGE_PATH = "/";
(window.__NEXT_P = window.__NEXT_P || []).push([
    PAGE_PATH,
    ()=>{
        return __turbopack_context__.r("[project]/pages/index.js [client] (ecmascript)");
    }
]);
// @ts-expect-error module.hot exists
if ("TURBOPACK compile-time truthy", 1) {
    // @ts-expect-error module.hot exists
    module.hot.dispose(function() {
        window.__NEXT_P.push([
            PAGE_PATH
        ]);
    });
}
}),
"[hmr-entry]/hmr-entry.js { ENTRY => \"[project]/pages/index\" }", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.r("[next]/entry/page-loader.ts { PAGE => \"[project]/pages/index.js [client] (ecmascript)\" } [client] (ecmascript)");
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__0psj7se._.js.map