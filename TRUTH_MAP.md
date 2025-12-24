# FlowScale Truth Map — Phase 2C

## 1. Single Source of Truth (SSOT) — Runtime
| Entity | Runtime Authority | Source | Communication |
| :--- | :--- | :--- | :--- |
| **Job State** | VPS `JobQueueManager` | In-memory + SQLite | `GET /api/jobs/:id` |
| **Pipeline Progress** | VPS FFmpeg Worker | Shared memory | `GET /api/health` |
| **Resource Health** | VPS `engine-utils` | System detection | `GET /api/health` |
| **Active Auth** | VPS JWT Provider | HS256 Signed Tokens | Header `Authorization` |

## 2. Single Source of Truth (SSOT) — DataStore
| Entity | Exclusive Data Store | Authority Mode | Forbidden Stores |
| :--- | :--- | :--- | :--- |
| **Projects** | VPS `flowscale.db` (SQLite) | Master | Supabase `projects` |
| **Scripts/Scenes** | VPS `flowscale.db` (SQLite) | Master | Supabase `scripts`/`scenes` |
| **Asset Metadata** | VPS `flowscale.db` (SQLite) | Master | Supabase `video_outputs` |
| **System Config** | VPS `user_settings` | Owner | LocalStorage, Supabase |
| **Observability** | VPS `execution_errors` | Immutable | Supabase `ai_failures` |

## 3. Reader/Owner Access Matrix
- **VPS Backend**: 👑 **Owner**. Absolute power to READ/WRITE all SQLite tables and local files.
- **Frontend App**: 👁️ **Consumer**. Forbidden from direct DB access. Forbidden from owning state. Must use `/api/*`.
- **Supabase**: 🗄️ **Mirror/Mirror**. Allowed only as a passive backup. No runtime usage.

## 4. Execution Flow Contract
All generative tools (Studio, Replicator, AI Editor) must follow the **Lock Flow**:
1. **Plan**: Generate RenderPlan (Immutable).
2. **POST /api/jobs**: Enqueue the plan on the VPS.
3. **Observe**: Poll `/api/jobs/:id` for state transitions.
4. **Finalize**: Consume local output URL provided by VPS.

---
**Status: ENFORCED**
**Zero Tolerance for Ambiguity.**
