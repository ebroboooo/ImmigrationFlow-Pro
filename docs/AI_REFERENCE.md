# AI Reference — ImmigrationFlow Pro

## Architecture

```
Presentation (React) → Repository Layer → Mock/Firebase Storage
                              ↓
                    USCIS Quick Access (client-only, official website)
                              ↓
                    AI Intake Pipeline (human review before CRM writes)
```

### Document File Storage

- Abstraction: `src/infrastructure/storage/fileStorage.ts` (`IFileStorage` interface)
- Demo mode: IndexedDB storage keyed by document ID
- URLs stored as `local://{documentId}` — swappable for Firebase Storage URLs later
- Operations: upload, download, preview (PDF/images), rename, replace, delete

### Toast Notifications

- `src/presentation/contexts/ToastContext.tsx` — success/error/info feedback app-wide
- Replaces all `alert()` and `window.confirm()` in user-facing flows

### Data Import / Export

- Export: `src/lib/exportData.ts` — `exportTenantData`, `downloadJson`, `downloadCsv`
- Import: `src/lib/importData.ts` — `parseImportFile`, `importTenantData` (upserts into local storage with ID preservation via `MockRepository.upsert`)
- Settings → Data Management: export JSON backup, import JSON restore, load sample firm, clear all data (all with ConfirmDialog + toasts)

### Shared Action UI

- `ActionMenu.tsx` — keyboard-accessible dropdown rendered via **React Portal** (`document.body`, `z-index: 200`) so menus are never clipped by card `overflow` or sibling stacking
- `ConfirmDialog.tsx` — destructive action confirmation (Escape closes)
- `Modal.tsx` — autofocus first field, Escape closes, responsive bottom sheet on mobile

### Google Calendar Integration

Production-ready OAuth 2.0 + Calendar API v3 (no scraping, no mock API).

| Layer | Path |
|-------|------|
| Provider interface | `src/domain/calendar/ICalendarProvider.ts` |
| Event model | `src/domain/calendar/ExternalCalendarEvent.ts` |
| Auth (isolated) | `src/infrastructure/auth/IAuthService.ts`, `GoogleAuthService.ts` |
| Google provider | `src/infrastructure/calendar/GoogleCalendarProvider.ts` |
| Event mapper | `src/infrastructure/calendar/googleEventMapper.ts` |
| Local storage | `src/infrastructure/calendar/externalCalendarStorage.ts` |
| Provider registry | `src/infrastructure/calendar/calendarProviderRegistry.ts` (add Outlook/Apple here) |
| Config | `src/infrastructure/calendar/calendarConfig.ts` — reads `VITE_GOOGLE_CLIENT_ID` |
| UI state | `src/presentation/contexts/CalendarSyncContext.tsx` |
| Calendar UI | `GoogleCalendarPanel.tsx`, `CalendarImportModal.tsx`, `CalendarLegend.tsx` |

**Env:** `VITE_GOOGLE_CLIENT_ID` — OAuth 2.0 Web client; enable Google Calendar API; add authorized JS origins.

**User flow:** Import Google Calendar → OAuth consent → select calendars → sync with progress → imported/updated/skipped/failed counts. Settings: auto-sync toggle, manual sync, disconnect, last sync time, connection status.

**Theme default:** Light mode (`ThemeProvider defaultTheme="light"`). Preference persisted in `localStorage` key `clientflow-ui-theme`.

### AI Case Copilot & Knowledge Engine (Phase 4)

Case-scoped AI copilot aggregating full CRM context — not limited to single document intake.

```
Repositories → Case Knowledge Service → Case Context → AI Provider Manager → Gemini / Heuristics
                              ↓
                    Knowledge Cache (fingerprint invalidation)
                              ↓
                    Case Copilot UI (Client + Case pages)
```

| Layer | Path | Responsibility |
|-------|------|----------------|
| Domain | `src/domain/ai/CaseContext.ts`, `CaseCopilot.ts` | Normalized case context + copilot insight types |
| Application | `src/application/ai/caseKnowledgeService.ts` | Aggregates client, cases, docs, tasks, deadlines, billing, intake, timeline |
| Application | `src/application/ai/caseCopilotService.ts` | Insights, chat, email drafts, permission checks |
| Application | `src/application/ai/caseCopilotPermissions.ts` | Role-based access (`clients:view`, `cases:view`) |
| Infrastructure | `src/infrastructure/ai/copilot/` | Cache, chat history, heuristic fallback |
| Infrastructure | `src/infrastructure/ai/providers/gemini/GeminiCaseCopilotProvider.ts` | Gemini insights/chat/email via Provider Manager |
| Prompt library | `src/infrastructure/ai/prompts/caseCopilot.v1.ts` | Versioned case copilot prompts |
| Presentation | `src/presentation/components/ai/copilot/CaseCopilotPanel.tsx` | Overview, chat, email tabs on Client/Case pages |

**Case Context includes:** client profile, cases, documents, tasks, calendar, deadlines, billing summary, notes, activities, AI intake sessions, timeline events.

**Copilot capabilities:** executive summary, timeline narrative, risk analysis, missing documents, suggested actions, natural-language Q&A (per-case chat history), editable email drafts. Nothing auto-writes to CRM.

**Cache:** Insights cached in localStorage keyed by scope + data fingerprint; invalidated on refresh or when underlying data changes.

### OCR Platform (Phase 5)

Provider-agnostic OCR layer — the "eyes" of ImmigrationFlow AI.

```
Upload → Validation → Native Text Detection → OCR Provider Manager → Text Cleanup → Gemini → Human Review
```

| Layer | Path | Responsibility |
|-------|------|----------------|
| OCR Manager | `src/infrastructure/ai/ocr/ocrProviderManager.ts` | Register providers, failover, health, stats |
| Tesseract provider | `src/infrastructure/ai/ocr/providers/tesseractOCRProvider.ts` | Local OCR via Tesseract.js + PDF.js |
| Text extraction | `src/infrastructure/ai/extraction/documentTextExtractionService.ts` | Smart native-text vs OCR routing |
| Native PDF detect | `src/infrastructure/ai/extraction/nativePdfTextDetector.ts` | Skip OCR when selectable text exists |
| Text cleanup | `src/infrastructure/ai/ocr/ocrTextCleanup.ts` | Normalize OCR output for Gemini |
| OCR cache | `src/infrastructure/ai/ocr/ocrResultCache.ts` | Reuse OCR by storage key + file size |
| OCR telemetry | `src/infrastructure/ai/telemetry/ocrUsageTelemetry.ts` | Diagnostics (no raw errors to users) |
| UI progress | `src/presentation/components/ai/AiOcrProgressPanel.tsx` | Page progress, cancel support |

**Smart pipeline:** Text PDFs skip OCR. Scanned PDFs/images run Tesseract automatically. Results cached and cleaned before Gemini.

**Settings → AI → OCR:** Enable/disable, default provider, test OCR, avg confidence/latency.

**Future providers:** Register Google Vision, Document AI, Azure, AWS Textract via `ocrProviderManager.registerProvider()` — no application logic changes.

### Immigration Document Intelligence Engine (Phase 6)

Transforms generic extraction into document-type-aware immigration intelligence with schema-driven fields, entity extraction, validation, CRM matching, and grouped human review.

```
Upload → OCR/Text → Heuristic Classification → Document Intelligence (Gemini) → Validation → CRM Match Suggestions → Grouped Review → Approve → Automation
```

| Layer | Path | Responsibility |
|-------|------|----------------|
| Domain | `src/domain/ai/DocumentIntelligence.ts`, `DocumentClassification.ts` | Detection, persons, case entity, confidence fields, CRM match types |
| Schema registry | `src/infrastructure/ai/schemas/documentSchemaRegistry.ts` | Per-document-type field schemas (modular — register new types without pipeline changes) |
| Prompt library | `documentIntelligence.v1.ts`, `immigrationKnowledge.v1.ts` | USCIS terminology + structured JSON schema for LLM |
| Intelligence parser | `src/infrastructure/ai/intelligence/documentIntelligenceParser.ts` | Parse LLM JSON into intelligence payload |
| Validation | `src/infrastructure/ai/validation/fieldValidationService.ts` | Receipt, email, phone, date, duplicate name checks |
| Application | `documentIntelligenceService.ts`, `crmMatchingService.ts` | Build intelligence result, map to legacy fields, CRM match suggestions |
| Gemini provider | `GeminiProvider.ts` | Uses intelligence prompt via Provider Manager (no hardcoded business logic in services) |
| Review UI | `DocumentIntelligenceReview.tsx` | Grouped sections: Client, Case, Immigration, Contacts, Deadlines, Appointments, Documents, Warnings, Missing |
| Pipeline | `intakePipelineService.ts` | Stores `documentIntelligence` on `IntakeSession`; legacy `extractedFields` preserved for automation |

**Document types (25+):** USCIS Receipt/Approval/Interview/Biometrics notices, RFE, NOID, Passport, Visa, Green Card, EAD, Naturalization, Birth/Marriage/Divorce certificates, Driver License, State ID, SSN card, Police Clearance, Court Records, Medical Exam, Tax/Financial/Employment documents, Unknown.

**Per-field confidence:** value, confidence, source snippet, extraction method, OCR/LLM confidence, validation result, approve/reject in review UI.

**CRM matching:** Searches clients/cases by receipt, A-number, email, phone, name similarity. Suggests update/create/merge/manual review — **never auto-overwrites**.

**Smart recommendations:** Missing documents, appointments, RFE risk, legal actions, tasks, calendar, email drafts.

**Prompt library:** `documentIntelligence.v1.ts` (version `1.0.0`) — primary intake prompt; `documentAnalysis.v1.ts` retained for compatibility.

### Intelligent CRM Migration Wizard (Phase 7)

AI-powered spreadsheet migration engine — not a simple Excel importer.

```
Upload Spreadsheets → Optional ZIP → AI Analysis → Column Mapping → Preview → Duplicates → Options → Import → Report
```

| Layer | Path | Responsibility |
|-------|------|----------------|
| Domain | `src/domain/import/MigrationTypes.ts`, `IImportSourceProvider.ts` | Session, mappings, preview entities, duplicate resolution, import report |
| Application | `src/application/import/` | `migrationWizardService`, `migrationEntityBuilder`, `migrationImportService` |
| Infrastructure | `src/infrastructure/import/` | Spreadsheet/ZIP providers, column mapping, validation, duplicates, document linking, transaction rollback |
| Presentation | `src/presentation/pages/MigrationWizard.tsx`, `MigrationWizardContext.tsx` | 9-step wizard UI |

**Supported inputs:** `.xlsx`, `.xls`, `.csv`, `.tsv`, Google Sheets export, ZIP document archives, multiple spreadsheets.

**AI column mapping:** Detects Client Name, Email, Receipt Number, A-Number, Priority Date, Case Type, etc. with confidence — manual override before import.

**Duplicate engine:** Matches receipt, A-number, email, phone, name (exact + fuzzy). Actions: Update Existing, Merge, Skip, Create New — never auto-overwrite.

**Transactional import:** Snapshots all `clientflow_*` localStorage keys before write; full rollback on failure.

**Future providers:** Register Clio, MyCase, PracticePanther, Filevine via `registerImportSourceProvider()` — no core logic changes.

**Permissions:** `migration:view`, `migration:edit` — admin, manager roles.

### Role-Based Workspaces & Executive Intelligence (Phase 8)

Replaces the generic dashboard with personalized role-based workspaces. Dashboard layout, widgets, quick actions, notifications, and daily briefing adapt to the signed-in user's role.

```
Login → RoleWorkspaceService → WorkspaceDataService → Role-specific widgets (lazy-loaded)
                              ↓
                    FirmHealthService + DailyBriefingService + NotificationEngine
```

| Layer | Path | Responsibility |
|-------|------|----------------|
| Domain | `src/domain/workspace/WorkspaceTypes.ts` | Workspace roles, widget IDs, layouts, firm health, briefing, notifications |
| Application | `src/application/workspace/roleWorkspaceService.ts` | Per-role widget layouts, quick actions, permission filtering |
| Application | `src/application/workspace/workspaceDataService.ts` | Aggregates CRM, intake, billing, calendar data for widgets |
| Application | `src/application/workspace/firmHealthService.ts` | Firm health score, category scores, recommendations, risk alerts |
| Application | `src/application/workspace/dailyBriefingService.ts` | Role-specific daily briefing on login/home |
| Infrastructure | `src/infrastructure/workspace/workspaceNotificationEngine.ts` | Role-aware notifications (critical/high/medium/low) |
| Presentation | `src/presentation/pages/RoleWorkspaceDashboard.tsx` | Main dashboard orchestrator |
| Presentation | `src/presentation/components/workspace/WorkspaceWidgetGrid.tsx` | Lazy-loaded reusable widget renderer |

**Supported workspace roles:** Owner, Attorney, Paralegal, Legal Assistant, Intake Specialist, Receptionist, Billing, Document Specialist, AI Review Operator, Office Manager, Administrator (mapped from CRM `UserRole`).

**Role mapping:** `admin` → owner, `manager` → office_manager, `sales` → intake_specialist, `viewer` → document_specialist, `employee` → legal_assistant.

**Firm Health Engine:** Weighted score from deadlines, billing, documents, AI queue, RFEs, staff workload, case pipeline. Returns overall score, grade, category breakdown, recommendations, risk alerts.

**Daily Briefing:** Greeting, today's schedule, urgent items, role-specific sections (firm snapshot, my cases, intake pipeline, document queue, billing), recommended actions.

**Global widgets:** KPI cards, activity feed, task lists, invoice summary, AI queue, charts, firm health card, quick actions, USCIS quick access, migration wizard link.

**Permission filtering:** Widgets and notifications respect existing `permissions.ts` — users never see data outside their access.

**Performance:** Widget grid lazy-loaded via `React.lazy()` to avoid increasing initial bundle.

**Tests:** `src/application/workspace/workspaceServices.test.ts` — role routing, dashboard selection, firm health, briefing, permission filtering.

### Production Stabilization & Release Candidate (Phase 9)

Full-application QA pass — no new features; polish, bug fixes, sidebar UX, cleanup, release packaging.

| Area | Path / Action |
|------|----------------|
| Sidebar collapse | `NavigationContext.tsx`, `Sidebar.tsx`, `NavTooltip.tsx` — desktop + tablet collapse, localStorage persistence, icon-only + tooltips |
| Release packaging | `scripts/create-release.mjs` → `npm run release:pack` → `release/ImmigrationFlowAI_v1.0_RC1.zip` |
| QA audit | All routes, CRUD, modals, AI modules, migration wizard, workspace dashboards verified |
| Cleanup | Removed debug `console.log` from demo seeder; fixed duplicate doc entry; React hook deps in Cases |

**Release ZIP excludes:** `node_modules`, `dist`, `dev-dist`, `coverage`, `.git`, `release`, caches, logs.

**Restore:** Unzip → `npm install` → `npm run dev`.

### AI Intake Assistant (Phase 1)

Provider-agnostic intelligent document intake. **No CRM data is modified until a user approves and runs selected automations.**

```
Upload → File validation → Text extraction / OCR → Classification → Field extraction → Recommendations → Human review → Approve → Automation
```

| Layer | Path | Responsibility |
|-------|------|----------------|
| Domain models | `src/domain/ai/` | `IntakeSession`, `ExtractedImmigrationFields`, `IntakeRecommendations`, `AutomationPlan`, audit types |
| Domain interfaces | `src/domain/ai/services.ts` | OCR, text extraction, classification, LLM, recommendations, email, tasks, calendar, workflow |
| Application | `src/application/ai/` | `intakePipelineService`, `automationExecutionService` |
| Infrastructure | `src/infrastructure/ai/` | Validators, heuristic classifier, pattern extractor, rule-based recommendations, storage |
| LLM registry | `src/infrastructure/ai/providers/aiProviderManager.ts` | **Provider Manager** — all LLM access routes here |
| Gemini provider | `src/infrastructure/ai/providers/gemini/GeminiProvider.ts` | Real Google Gemini via server proxy |
| Server proxy | `server/ai/geminiHandler.ts`, `geminiApiPlugin.ts` | `GEMINI_API_KEY` server-only; `/api/ai/gemini` |
| Prompt library | `src/infrastructure/ai/prompts/` | Versioned prompts — no inline prompts in services |
| AI settings | Settings → AI tab, `aiSettingsStorage.ts` | Enable/disable, model, endpoint, test connection |
| AI Copilot | `src/presentation/components/ai/AiCopilotPanel.tsx` | Sidebar: confidence, risk, actions, approve/reject |
| Cost telemetry | `src/infrastructure/ai/telemetry/aiUsageTelemetry.ts` | Tokens, latency, estimated cost per request |
| OCR extension | `src/infrastructure/ai/ocr/unconfiguredOCRProvider.ts` | Connect Tesseract/Google Vision/Azure in Phase 2 |
| Presentation | `src/presentation/pages/AiIntake.tsx`, `src/presentation/components/ai/` | Upload, review screen, editable fields, automation selector |
| Context | `src/presentation/contexts/AiIntakeContext.tsx` | Session state, upload, approve, reject, run automation |

**Pipeline services (single responsibility):**
- `FileValidatorService` — size, type, blocked extensions
- `PlainTextExtractor` — `.txt` / `.json` files
- `UnconfiguredOCRProvider` — extension point for scanned PDFs/images
- `HeuristicDocumentClassifier` — extendable keyword/filename rules (25+ immigration document types)
- `PatternFieldExtractor` — receipt numbers, forms, dates, contact info (uses `receiptValidator`)
- `GeminiProvider` — real document analysis via Google Gemini API (structured JSON)
- `AIProviderManager` — provider selection, health, test connection, usage metrics
- `RuleBasedRecommendationService` — fallback when Gemini unavailable
- `WorkflowAutomationService` — creates CRM entities only after approval

**Env vars:** `GEMINI_API_KEY` (server only — set in `.env` for Vite dev/preview), `VITE_AI_LLM_PROVIDER=gemini`, `VITE_AI_OCR_PROVIDER`

**Gemini flow:** Browser → `/api/ai/gemini` (Vite middleware) → Google Generative Language API. API key never sent to client.

**Human review:** AI Copilot sidebar shows analysis status, confidence, risk, warnings, missing documents. Approve/Reject/Edit before any CRM write.

**Prompt library:** `documentAnalysis.v1.ts` (version `1.0.0`) — all prompts centralized; services import from `promptLibrary.ts` only.

**Audit trail:** Every session stores analysis timestamp, provider ID, confidence, approval user/time, document version, automation actions in `IntakeSession.audit[]`.

**Permissions:** `ai-intake:view`, `ai-intake:edit` — admin, attorney, paralegal roles.

### Design System

Shared tokens: `src/lib/design.ts` — `text-base`, `min-h-12` inputs/buttons for senior-friendly touch targets  
UI primitives: `src/presentation/components/ui/` (Skeleton, KpiCard, PageHeader, EmptyState, Modal, DataTable, DashboardWidget)  
CSS utilities: `src/index.css` (glass-card, safe-area, page-enter animations, dark mode elevation)

### Global Search (Ctrl+K)

- Context: `src/presentation/contexts/CommandPaletteContext.tsx`
- UI: `src/presentation/components/search/CommandPalette.tsx`
- Search logic: `src/lib/globalSearch.ts` — clients, cases, documents, invoices, tasks, deadlines, notes, pages
- Recent searches stored in `localStorage` (`immflow_recent_searches`)

### Notification Center

- Header dropdown: `src/presentation/components/notifications/NotificationCenter.tsx`
- Full page: `src/presentation/pages/Notifications.tsx` — filters by type, mark all read

### Entity Timelines

- Builder: `src/lib/entityTimeline.ts`
- UI: `src/presentation/components/timeline/EntityTimeline.tsx`
- Client panel: `ClientTimelinePanel.tsx` (loads related repo data)
- Case panel: `CaseTimelinePanel.tsx`
- Accessible from Clients and Cases pages via Timeline action

### USCIS Quick Access (single module)

No backend, no automation, no API calls. Users enter a receipt number and:

1. **Copy & Open Official USCIS** — normalizes input, copies to clipboard, opens official USCIS URL, shows success toast
2. **Copy Receipt** — copies normalized receipt to clipboard (with manual Ctrl+C fallback)
3. **Recent Receipt** — last searched receipt in `localStorage` (`STORAGE_KEYS.uscisRecentReceipt`)

Helper: `src/lib/uscisQuickAccess.ts`  
UI: `src/presentation/components/uscis/UscisQuickAccess.tsx` (Dashboard + Cases)

### Mobile Navigation

| Breakpoint | Navigation |
|------------|------------|
| Desktop (lg+) | Fixed sidebar with collapse/expand (persisted in `localStorage` key `immflow_sidebar_collapsed`), icon-only mode + hover tooltips |
| Tablet (md–lg) | Collapsible sidebar (shared collapsed state) |
| Mobile (<md) | Hamburger → slide-in drawer, overlay, ESC/outside tap closes, auto-close on route change |

Context: `src/presentation/contexts/NavigationContext.tsx`  
Layout: `src/presentation/components/layout/MainLayout.tsx`, `Header.tsx`, `Sidebar.tsx`

### PWA

- Manifest + service worker via `vite-plugin-pwa`
- Icons: `public/icons/icon-{192,256,384,512}.png`, `apple-touch-icon.png`
- Generate icons: `npm run icons:generate` (requires `sharp`)
- Install prompt: `src/presentation/components/pwa/PwaInstallPrompt.tsx`
- Service worker **disabled in dev** (`vite.config.ts` `devOptions.enabled: false`)

### Startup / Routing

| State | Redirect |
|-------|----------|
| No setup | `/welcome` |
| Setup complete, no session | `/login` |
| Authenticated | App routes |

**Never** redirect `/welcome` → `/` without a session (causes blank screen).

### Layers

| Layer | Path | Purpose |
|-------|------|---------|
| Quick Access UI | `src/presentation/components/uscis/UscisQuickAccess.tsx` | Receipt input, copy, open official USCIS, recent receipt |
| Quick Access lib | `src/lib/uscisQuickAccess.ts` | Normalize, clipboard, external URL, recent receipt storage |
| Global search | `src/lib/globalSearch.ts` | Cross-entity search for command palette |
| Timelines | `src/lib/entityTimeline.ts` | Client/case timeline event builder |
| Validator | `src/domain/uscis/receiptValidator.ts` | Receipt normalization (shared) |
| Navigation | `src/presentation/contexts/NavigationContext.tsx` | Sidebar collapse (persisted), mobile drawer, page titles |
| Nav tooltips | `src/presentation/components/ui/NavTooltip.tsx` | Icon-only sidebar hover labels |
| Command palette | `src/presentation/contexts/CommandPaletteContext.tsx` | Ctrl+K global search |
| PWA | `src/presentation/components/pwa/PwaInstallPrompt.tsx` | Install prompt banner |

### Dev Commands

```bash
npm run dev            # Vite dev server (5173)
npm test               # Unit tests (65 tests)
npm run release:pack   # Create release/ImmigrationFlowAI_v1.0_RC1.zip
npm run build          # Production build
npm run icons:generate # PWA PNG icons from SVG source
```

### Mock Repository Storage

All `clientflow_*` localStorage keys must store **JSON arrays**. `MockRepository.loadFromStorage()` normalizes legacy/corrupt formats on load.

Firebase repository factory (`FirebaseRepositoryFactory.ts`) unchanged — swap via `RepositoryContext` when credentials configured.
