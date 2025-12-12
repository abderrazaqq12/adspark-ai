
# Creative Replicator: Capability-Based Architecture

## 1. Core Philosophy: "Capability over Tier"
The system no longer hardcodes engines to user tiers (e.g., "Free = FFmpeg"). Instead, it uses a **Capability Registry**.

*   **Logic:** The AI Planner outputs a *Requirement List* (e.g., `["trim", "merge", "ai_fill"]`).
*   **Router:** Scans the `ENGINE_REGISTRY` to find *any* engine that matches those capabilities AND fits within the user's constraints (Cost, Resolution).

## 2. The new Engine Router Logic

### A. The Registry (`registry-types.ts`)
A central database of all trusted engines (Browser, Local, Cloud).
```typescript
{
  "ffmpeg.wasm": { capabilities: ["trim", "merge"], cost: 0, loc: "browser" },
  "remotion":    { capabilities: ["react_text"],    cost: 0.1, loc: "server" },
  "runway":      { capabilities: ["ai_fill"],       cost: 0.5, loc: "cloud" }
}
```

### B. The Selection Algorithm (`AdvancedRouter.ts`)
1.  **Filter by Tier:** Exclude engines the user hasn't paid for.
2.  **Filter by Capability:** Exclude engines that can't do the job (e.g., FFmpeg can't do "AI Fill").
3.  **Filter by Constraints:** Exclude engines that can't handle 4K or >60s duration.
4.  **Rank:** Prefer Local/Free -> Then Cheapest Cloud -> Then Premium Cloud.

## 3. Execution Flow (Refactored)

1.  **Frontend (`CreativeReplicator.tsx`):**
    *   Uploads Video.
    *   AI Brain analyzes it (Edge Function).
    *   **NEW:** Frontend constructs a `ScenePlan` explicit object.
    *   **NEW:** Frontend calls `AdvancedEngineRouter.selectEngine(plan)`.
    *   **NEW:** Frontend instantiates the chosen engine (dynamic import pattern).
    *   **NEW:** Engine executes the task (Browser WASM or Cloud API).

## 4. Addressing "FFmpeg Blocked"
*   **Solution:** We moved the default "Free" engine entirely to the **Browser (Client-Side)**.
*   **Fallback:** If the browser fails (e.g. out of memory), the router *could* seamlessly switch to a "Low Cost Cloud" fallback (like a cheap Remotion Lambda) if the user has credits. (Future proof).

## 5. Scalability
To add a new engine (e.g. "Sora"):
1.  Add entry to `ENGINE_REGISTRY`.
2.  Create `SoraEngine.ts` adapter implementing `IVideoEngine`.
3.  Done. The Router automatically picks it when a user asks for "Cinematic" capabilities.
