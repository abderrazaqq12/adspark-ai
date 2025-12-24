# Truth Violation List — Phase 2C

## BLOCKING VIOLATIONS (Must be fixed)

1. **Supabase Direct Data Ownership (Frontend)**
   - **Sites**: `ProjectGallery.tsx`, `Projects.tsx`, `SceneBuilder.tsx`, `Templates.tsx`, `Settings.tsx`, `EnhancedResultsGallery.tsx`.
   - **Violation**: Use of `supabase.from()` to read/write project metadata, assets, and configuration.
   - **Fix**: Replace all `supabase.from()` calls with `fetch('/api/...')` targeting the VPS Backend.

2. **Split Asset Persistence**
   - **Sites**: `renderflow/api.ts`.
   - **Violation**: Logic that falls back to Supabase Storage if the VPS is "unavailable".
   - **Fix**: Remove Supabase fallback. If the VPS is down, the system is down. There is no second truth.

3. **In-Browser Execution Decisions**
   - **Sites**: `CreateVideo.tsx`.
   - **Violation**: Frontend decides how to split scenes or handle media processing before sending to backend.
   - **Fix**: Frontend sends a high-level "Intent" or a pre-compiled `RenderPlan`. Backend validates and executes.

4. **Shadow Settings**
   - **Sites**: `Settings.tsx`, `useSettings` hooks.
   - **Violation**: API keys and configurations are being read from/written to Supabase.
   - **Fix**: Migrate all settings to VPS `user_settings` table.

5. **Legacy Supabase Auth Remnants**
   - **Sites**: `useAuth.ts`, `ProtectedRoute.tsx`.
   - **Violation**: Use of Supabase types or client methods in auth flow.
   - **Fix**: Strip all Supabase Auth dependencies. Use local VPS JWT exclusively.

---
**Resolution required before proceeding to Phase 3.**
