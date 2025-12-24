# FlowScale System Discipline Contracts (Phase 3)

> **Status:** ACTIVE & ENFORCED  
> **Authority:** SYSTEM KERNEL  
> **Last Updated:** 2025-12-24

This document defines the non-negotiable architectural contracts for the FlowScale platform. These rules are enforced by the backend and must be respected by the frontend. Violations will result in execution blocks (`403 Forbidden` or `422 Unprocessable Entity`).

---

## 1. Tool Responsibility Contracts (HARD BOUNDARIES)

Each tool has a specific functional domain. Tools generally cannot impersonate each other.

### **A. Studio (Zero-to-Hero)**
*   **Purpose:** Create net-new video assets from raw inputs (ideas, scripts, or media).
*   **Privileges:** Full access to all engines, full duration control.
*   **Restrictions:**
    *   Cannot perform bulk replication.
    *   Cannot bypass the `Planning` stage.
*   **Output:** Single primary asset (with optional artifacts).

### **B. Creative Replicator (High-Volume)**
*   **Purpose:** Generate variations of an *existing* approved source asset.
*   **Privileges:** Bulk execution.
*   **Restrictions:**
    *   **MUST** have a `sourceAssetId` or valid `sourcePath`.
    *   **Duration Lock:** 20s – 35s (Hard system limit).
    *   **Audience:** Inherited from source (cannot override locally).
    *   No "blank canvas" generation.

### **C. Creative AI Editor (Analysis)**
*   **Purpose:** Analyze, restructure, and blueprint existing assets.
*   **Privileges:** Read-only access to high-level analysis data.
*   **Restrictions:**
    *   **CANNOT** trigger final render jobs directly.
    *   Output is a `Blueprint` or `EditList`, not a `.mp4`.

---

## 2. Project = Single Source of Truth

The `Project` entity is the root of all data.

*   **Validation:** Every execution request **MUST** include a valid `projectId`.
*   **Isolation:** A job cannot access files outside its `projectId` (except immutable system assets).
*   **Persistence:**
    *   Logs must be tagged with `projectId`.
    *   Costs must be aggregated by `projectId`.
*   **Frontend Rule:** Never assume a project exists. Always validate `projectId` against `{ id, role }` from the auth token before enabling UI buttons.

---

## 3. Planning → Execution Contract (The "Two-Step")

Execution is a privileged action that requires a signed plan.

**Step 1: Planning (Safe, Fast)**
*   **Input:** User intents, rough parameters.
*   **Process:** Backend calculates feasibility, cost, logic, and engine selection.
*   **Output:** `ExecutionPlan` (JSON) - Immutable, valid for 1 hour.

**Step 2: Execution (Expensive, Slow)**
*   **Input:** `planId` (and strictly limited overrides).
*   **Process:** The system executes *exactly* what was planned.
*   **Rule:** Frontend cannot "tweak" ffmpeg arguments directly during execution. It must request a new plan.

---

## 4. Observability Discipline

The system must explain itself. "Unknown Error" is unacceptable.

**Effect:**
*   **Error Structure:**
    ```json
    {
      "code": "ERR_SOURCE_INVALID",
      "stage": "pre-flight",
      "message": "The source file 'video.mp4' is missing or corrupted.",
      "remediation": "Please re-upload the source asset."
    }
    ```
*   **UI:** Must display `stage` and `message` to the user.

---

## 5. Deterministic Execution

The Backend is the **ONLY** authority for:
*   **Engine Selection:** (FFmpeg vs. Cloud Render vs. Edge). Frontend cannot force "Cloud" if backend decides "Local" is better/cheaper.
*   **Arguments:** FFmpeg command lines are built server-side.
*   **Concurrency:** Backend decides how many jobs run in parallel.

---

## 6. Settings as Governance

Global Settings (Settings Page) > Tool Settings.

*   If Global Settings say "Max Cost = $5", the Studio cannot generate a $10 video.
*   If Global Settings say "Restricted Mode", the Replicator cannot access NSFW models.
*   **Inheritance:** Tools automatically inherit these constraints.

---

## 7. Zero-Ambiguity Policy

*   **No Silent Failures:** If a font is missing, fail loud. Do not substitute default font silently.
*   **No "Maybe":** If a user asks for 4K but the source is 480p, the system denies the request (or explicitly upscales with a warning), it does not just output 480p quietly.

---
