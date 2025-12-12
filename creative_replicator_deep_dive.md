
# Deep Dive: Creative Replicator Architecture (v2.1)

This document analyzes the "Production-Ready" Creative Replicator system, detailing how it achieves scalability, low cost, and high flexibility through its **Split-Brain** and **Capability-Routing** architecture.

## 1. High-Level Architecture: The "Split-Brain" Model
The system is strictly divided into two independent phases. This is the key to its robustness:

*   **PHASE 1: THE BRAIN (Intelligence)**
    *   **Goal:** Pure Strategy. No video processing.
    *   **Input:** User Video URL + Market Context (e.g., "Saudi Arabia").
    *   **Action:** Analysis Edge Function calls an LLM (via Gateway).
    *   **Output:** A `ScenePlan` JSON. This is valid "Code" that describes the video but doesn't create it.
    *   **Advantage:** Fast, cheap, and deterministic. It never crashes because it never touches video bytes.

*   **PHASE 2: THE MUSCLE (Execution)**
    *   **Goal:** Pure Obedience. Follow the JSON plan exactly.
    *   **Input:** `ScenePlan` JSON + Original Video.
    *   **Action:** The **Engine Router** picks the best worker for the job.
    *   **Output:** Final `.mp4` video.

## 2. The Core Innovation: Capability-Based Routing
Old systems hardcode logic like `if (free) use(ffmpeg)`. We deleted that.
The new **Advanced Engine Router** decides like a smart manager:

### The Selection Algorithm
1.  **Analyze Request:** The Router looks at the `ScenePlan`.
    *   *Does it need AI In-painting?* YES.
    *   *Does it need 4K rendering?* NO.
    *   *Is the video > 60 seconds?* NO.
2.  **Scan Registry:** It looks at `ENGINE_REGISTRY` (the list of all available workers).
    *   `ffmpeg.wasm` (Browser) -> ❌ Can't do AI In-painting.
    *   `remotion` (Server) -> ❌ Can't do AI In-painting.
    *   `runway` (Cloud) -> ✅ CAN do AI In-painting.
3.  **Tier Check:** "Is the user on the Premium plan?"
    *   If **YES** -> Deploy `runway`.
    *   If **NO** -> Fail gracefully or revert to a simpler "Trim" plan that `ffmpeg.wasm` *can* handle.

**Why this matters:** You can add 50 new engines (Sora, Kling, Luma) without changing a single line of your app's logic. You just add them to the Registry.

## 3. The "Free Tier" Magic: Browser-Side Execution
The biggest blocker was "Serverless Functions don't allow FFmpeg."
The solution is **Client-Side Compute**.

*   **How it works:** When a specific engine (like `ffmpeg.wasm`) is selected, the browser downloads a tiny ~20MB WASM binary.
*   **The Processor:** Your user's laptop becomes the render farm. The chrome tab processes the video bytes in memory.
*   **Zero Cost:** You pay $0.00 for this compute.
*   **Privacy:** The video never leaves the user's device until the final result is uploaded.
*   **Speed:** No upload queue. Instant start.

## 4. The Data Flow (The "Fix")
We resolved the database synchronization issues with a strictly ordered flow:

1.  **Job Initialization:** 
    *   Generate `UUID` (Strict v4).
    *   **IMMEDIATELY** insert a `pending` record into `pipeline_jobs` table.
2.  **Optimistic UI:**
    *   The UI subscribes to this `UUID` instantly.
3.  **Parallel Execution:**
    *   The browser starts processing loop (0% -> 100%).
    *   Every chunk (25%, 50%...) updates the `video_variations` table.
    *   Supabase Realtime pushes these updates back to the UI in milliseconds.
4.  **Completion:**
    *   Final video Blob is uploaded to Supabase Storage.
    *   Public URL is written to DB.
    *   UI displays the result.

## 5. Summary of Capabilities
| Feature | Implementation | Benefit |
| :--- | :--- | :--- |
| **Routing** | Dynamic Capability Match | Use best tool for every specific shot |
| **Cost** | Browser-First / Cloud-Second | Free tier costs $0 to operate |
| **Stability** | Strict JSON Plans | AI hallucinations don't break the renderer |
| **Scale** | Stateless Architecture | Can handle 1 user or 1,000,000 users without server upgrades |

This architecture is currently **LIVE** in your application.
