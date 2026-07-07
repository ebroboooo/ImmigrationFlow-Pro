# Changelog (AI)

## 2026-07-07 — Production Stabilization & Release Candidate (Phase 9)

### Added
- `src/presentation/components/ui/NavTooltip.tsx` — accessible hover tooltips for collapsed sidebar icons
- `scripts/create-release.mjs` — release ZIP generator (`npm run release:pack`)
- `release/ImmigrationFlowAI_v1.0_RC1.zip` — restorable source package (excludes node_modules, dist, dev artifacts)

### Changed
- `src/presentation/contexts/NavigationContext.tsx` — unified sidebar collapse with localStorage persistence
- `src/presentation/components/layout/Sidebar.tsx` — desktop collapse/expand, icon-only mode, tooltips, improved active state
- `src/presentation/components/layout/MainLayout.tsx` — mobile drawer `aria-modal` / `role="dialog"`
- `src/presentation/pages/Cases.tsx` — fixed `useEffect` dependency array
- `src/infrastructure/seeders/DemoSeeder.ts` — removed debug `console.log`
- `src/lib/constants.ts` — `sidebarCollapsed` storage key
- `.gitignore` — exclude `dev-dist`, `release`
- `docs/AI_REFERENCE.md` — Phase 9 section, sidebar docs, release commands; removed duplicate cache paragraph

### Verified (no feature removals)
- All CRM routes and CRUD operations
- AI Intake, OCR, Gemini, Copilot, Document Intelligence
- Migration Wizard, Calendar, Documents, Billing, Deadlines, Notifications, Settings
- Role workspace dashboards, authentication, PWA install prompt
- Responsive layouts (320px–1440px+), keyboard navigation, touch targets

## 2026-07-07 — Role-Based Workspaces & Executive Intelligence (Phase 8)

### Added
- `src/domain/workspace/WorkspaceTypes.ts` — workspace roles, widget IDs, layouts, firm health, briefing, notification types
- `src/application/workspace/roleWorkspaceService.ts` — per-role layouts, quick actions, permission filtering
- `src/application/workspace/workspaceDataService.ts` — CRM data aggregation for dashboard widgets
- `src/application/workspace/firmHealthService.ts` — firm health score engine with category breakdown
- `src/application/workspace/dailyBriefingService.ts` — role-specific daily briefing generation
- `src/infrastructure/workspace/workspaceNotificationEngine.ts` — role-aware notification engine
- `src/presentation/pages/RoleWorkspaceDashboard.tsx` — main role-based dashboard
- `src/presentation/components/workspace/WorkspaceWidgetGrid.tsx` — lazy-loaded widget renderer
- Tests: `src/application/workspace/workspaceServices.test.ts` — role routing, dashboard selection, firm health, briefing, permissions

### Changed
- `src/presentation/pages/Dashboard.tsx` — thin re-export of `RoleWorkspaceDashboard` (preserves route/lazy import)
- `package.json` — added workspace tests to `npm test` script

### Design principles
- Modular workspace engine — add roles/widgets without changing CRM core
- Permission-aware widgets — reuse existing `permissions.ts`
- Lazy-loaded presentation layer — no initial bundle bloat
- All existing features preserved (AI Intake, OCR, Gemini, Copilot, Migration Wizard)

## 2026-07-07 — Intelligent CRM Migration Wizard (Phase 7)

### Added
- `src/domain/import/MigrationTypes.ts`, `IImportSourceProvider.ts` — migration domain models + provider interfaces
- `src/infrastructure/import/providers/spreadsheetImportProvider.ts` — Excel/CSV/TSV via SheetJS (xlsx)
- `src/infrastructure/import/providers/zipDocumentArchiveProvider.ts` — ZIP document extraction via JSZip
- `src/infrastructure/import/mapping/columnMappingEngine.ts` — AI heuristic column mapping with confidence
- `src/infrastructure/import/validation/migrationValidationService.ts` — pre-import validation
- `src/infrastructure/import/duplicate/migrationDuplicateEngine.ts` — duplicate detection + resolution
- `src/infrastructure/import/documents/documentLinkingEngine.ts` — link ZIP docs to clients/cases
- `src/infrastructure/import/transaction/migrationSnapshot.ts` — localStorage snapshot/rollback
- `src/application/import/migrationWizardService.ts`, `migrationEntityBuilder.ts`, `migrationImportService.ts`
- `src/presentation/pages/MigrationWizard.tsx`, `MigrationWizardPage.tsx`, `MigrationWizardContext.tsx`
- Tests: column mapping, duplicates, validation, document linking, rollback, large dataset (1200 rows)
- Dependencies: `xlsx`, `jszip`

### Changed
- `AppRouter.tsx` — `/migration` route
- `Sidebar.tsx` — Migration Wizard nav item
- `permissions.ts` — `migration:view`, `migration:edit`
- `MockRepositoryFactory.ts` — `reloadFromStorage()` for post-rollback reload

### Design principles
- Modular provider architecture for future legal software imports
- Nothing written until user approves; full rollback on failure
- No business logic in UI components

## 2026-07-06 — Immigration Document Intelligence Engine (Phase 6)

### Added
- `src/domain/ai/DocumentIntelligence.ts` — intelligence result types, persons, case entity, CRM match, confidence fields
- `src/infrastructure/ai/schemas/documentSchemaRegistry.ts` — modular per-document-type field schemas
- `src/infrastructure/ai/prompts/documentIntelligence.v1.ts` — structured intelligence prompt
- `src/infrastructure/ai/prompts/immigrationKnowledge.v1.ts` — USCIS terminology glossary
- `src/infrastructure/ai/intelligence/documentIntelligenceParser.ts` — parse LLM intelligence JSON
- `src/infrastructure/ai/validation/fieldValidationService.ts` — cross-field validation
- `src/application/ai/documentIntelligenceService.ts` — build intelligence, map to legacy fields
- `src/application/ai/crmMatchingService.ts` — CRM search and match suggestions
- `src/presentation/components/ai/DocumentIntelligenceReview.tsx` — grouped review UI
- Tests: `documentIntelligenceParser.test.ts`, `fieldValidationService.test.ts`

### Changed
- `DocumentClassification.ts` — expanded to 25+ document types with alias normalization
- `heuristicDocumentClassifier.ts` — rules for all immigration document types
- `GeminiProvider.ts` — uses `documentIntelligence.v1` prompt via prompt library
- `intakePipelineService.ts` — wires intelligence layer; stores `documentIntelligence` on session
- `IntakeSession.ts` — `documentIntelligence?: DocumentIntelligenceResult`
- `AiReviewScreen.tsx` — grouped intelligence review with CRM match panel
- `promptLibrary.ts` — exports `getDocumentIntelligencePrompt`
- `services.ts` — `LLMAnalysisResponse.intelligencePayload`

### Design principles
- Modular schema registry — add document types without changing pipeline business logic
- No Gemini logic outside providers; no CRM auto-writes
- Legacy `ExtractedImmigrationFields` preserved for automation compatibility

## 2026-07-06 — OCR Platform & Intelligent Document Reading (Phase 5)

### Added
- `src/infrastructure/ai/ocr/ocrProviderManager.ts` — OCR Provider Manager (required entry point)
- `src/infrastructure/ai/ocr/providers/tesseractOCRProvider.ts` — Tesseract.js local OCR
- `src/infrastructure/ai/extraction/documentTextExtractionService.ts` — smart text routing
- `src/infrastructure/ai/extraction/nativePdfTextDetector.ts` — selectable PDF text detection
- `src/infrastructure/ai/ocr/ocrTextCleanup.ts`, `ocrResultCache.ts`, `pdfJsLoader.ts`
- `src/infrastructure/ai/telemetry/ocrUsageTelemetry.ts` — OCR diagnostics
- `src/domain/ai/OCRUsage.ts` — OCR types, progress, health
- `src/presentation/components/ai/AiOcrProgressPanel.tsx` — OCR progress UI
- Tests: `ocrTextCleanup.test.ts`
- Dependencies: `tesseract.js`, `pdfjs-dist`

### Changed
- `intakePipelineService.ts` — full pipeline: validation → native detect → OCR → cleanup → Gemini
- `domain/ai/services.ts` — extended `IOCRProvider`, `OCRResult`, progress options
- `AiIntakeContext.tsx` — live session updates, OCR cancel, provider status
- `AiSettingsPanel.tsx` — OCR configuration section
- `AiIntake.tsx`, `AiReviewScreen.tsx` — OCR progress and status messaging
- `aiSettingsStorage.ts` — OCR enable/provider settings

### Design principles
- Provider-agnostic OCR (same pattern as LLM Provider Manager)
- Never OCR when native text sufficient
- No CRM auto-writes; intake pipeline unchanged architecturally

## 2026-07-06 — AI Case Copilot & Firm Knowledge Engine (Phase 4)

### Added
- `src/domain/ai/CaseContext.ts`, `CaseCopilot.ts` — normalized case knowledge + copilot types
- `src/application/ai/caseKnowledgeService.ts` — CRM data aggregation into Case Context
- `src/application/ai/caseCopilotService.ts` — insights, chat, email, cache orchestration
- `src/application/ai/caseCopilotPermissions.ts` — role-based copilot access
- `src/infrastructure/ai/copilot/` — cache, chat storage, heuristic fallback
- `src/infrastructure/ai/providers/gemini/GeminiCaseCopilotProvider.ts` — Gemini case copilot via Provider Manager
- `src/infrastructure/ai/prompts/caseCopilot.v1.ts` — versioned case copilot prompts
- `src/presentation/components/ai/copilot/CaseCopilotPanel.tsx` — Client/Case copilot UI
- Tests: `caseCopilotHeuristics.test.ts`, `caseCopilotResponseParser.test.ts`

### Changed
- `aiProviderManager.ts` — `getCaseCopilotProvider()` for case-scoped AI
- `Clients.tsx`, `Cases.tsx` — AI Copilot action + modal panel
- `domain/ai/services.ts` — `ICaseCopilotProvider` interface

### Design principles (unchanged)
- No CRM auto-writes from AI output
- Provider Manager required for all LLM calls
- Heuristic fallback when Gemini unavailable
- Advisory-only disclaimer on all insights

## 2026-07-06 — Real AI Integration: Google Gemini (Phase 3)

### Added
- `server/ai/geminiHandler.ts`, `geminiApiPlugin.ts` — secure Gemini proxy (`GEMINI_API_KEY` server-side)
- `src/infrastructure/ai/providers/aiProviderManager.ts` — Provider Manager (required entry point for LLM)
- `src/infrastructure/ai/providers/gemini/GeminiProvider.ts` — real structured JSON document analysis
- `src/infrastructure/ai/providers/gemini/geminiApiClient.ts`, `geminiResponseParser.ts`
- `src/infrastructure/ai/prompts/` — versioned prompt library (`documentAnalysis.v1.ts`)
- `src/infrastructure/ai/telemetry/aiUsageTelemetry.ts` — cost/latency/token tracking
- `src/infrastructure/ai/settings/aiSettingsStorage.ts` — AI settings (no API key in browser)
- `src/application/ai/geminiRecommendationMapper.ts` — maps Gemini JSON → intake recommendations
- `src/domain/ai/GeminiAnalysis.ts`, `AIUsage.ts` — structured analysis + usage types
- `src/presentation/components/ai/AiCopilotPanel.tsx` — AI Copilot sidebar
- `src/presentation/components/settings/AiSettingsPanel.tsx` — Settings → AI tab
- Tests: `geminiResponseParser.test.ts`, `promptLibrary.test.ts`

### Changed
- `intakePipelineService.ts` — uses Provider Manager; Gemini for classification, extraction, summaries, tasks, calendar, email when configured; graceful fallback to heuristics
- `IntakeRecommendations`, `IntakeSession` — attorney/client summaries, risk level, AI metadata
- `AiReviewScreen.tsx` — calendar/deadline suggestions, Copilot sidebar
- `vite.config.ts` — registers `geminiApiPlugin`
- `.env.example` — `GEMINI_API_KEY` server-side; removed `VITE_GEMINI_API_KEY`
- `aiConfig.ts` — Gemini key no longer read from frontend env

### Design principles (unchanged)
- No CRM writes until user approval
- No fake AI when Gemini configured — real LLM responses
- Heuristic fallback on rate limits, timeouts, malformed JSON, network failures

## 2026-07-06 — AI Automation Engine & Intelligent Intake (Phase 1)

### Added
- `src/domain/ai/` — Intake session, extracted fields, recommendations, automation plan, audit, service interfaces
- `src/application/ai/intakePipelineService.ts` — full document pipeline orchestration
- `src/application/ai/automationExecutionService.ts` — post-approval CRM automation
- `src/infrastructure/ai/validation/fileValidatorService.ts` — real file validation
- `src/infrastructure/ai/extraction/plainTextExtractor.ts`, `patternFieldExtractor.ts`
- `src/infrastructure/ai/classification/heuristicDocumentClassifier.ts` — 17+ document types
- `src/infrastructure/ai/providers/llmProviderRegistry.ts`, `unconfiguredLLMProvider.ts`
- `src/infrastructure/ai/ocr/unconfiguredOCRProvider.ts` — OCR extension point
- `src/infrastructure/ai/recommendations/ruleBasedRecommendationService.ts`
- `src/infrastructure/ai/email/templateEmailDraftService.ts`
- `src/infrastructure/ai/tasks/taskSuggestionService.ts`
- `src/infrastructure/ai/calendar/calendarSuggestionService.ts`
- `src/infrastructure/ai/automation/workflowAutomationService.ts`
- `src/infrastructure/ai/storage/intakeSessionStorage.ts`, `aiIntakeFileStorage.ts`
- `src/presentation/pages/AiIntake.tsx` — upload + review UI
- `src/presentation/components/ai/` — UploadZone, ReviewScreen, ExtractedFieldsForm
- `src/presentation/contexts/AiIntakeContext.tsx`
- Permissions: `ai-intake:view`, `ai-intake:edit`
- Tests: heuristic classifier + pattern extractor
- Documentation updated

### Design principles
- No CRM writes until user approval
- No fake AI — LLM/OCR use extension points when not configured
- Pattern extraction + heuristic classification active without providers
- Full audit trail for legal compliance

## 2026-07-06 — Calendar Integration + Critical UX Fixes

### Added
- `src/domain/calendar/` — `ICalendarProvider`, `ExternalCalendarEvent`, connection/sync types
- `src/infrastructure/auth/IAuthService.ts`, `GoogleAuthService.ts` — isolated Google OAuth 2.0 (GIS)
- `src/infrastructure/calendar/GoogleCalendarProvider.ts` — real Calendar API v3 sync
- `src/infrastructure/calendar/externalCalendarStorage.ts` — connection + imported events persistence
- `src/infrastructure/calendar/googleEventMapper.ts` + tests — Google event → domain model
- `src/infrastructure/calendar/calendarProviderRegistry.ts` — extensible provider registry
- `src/infrastructure/calendar/calendarConfig.ts` — env-driven config
- `src/presentation/contexts/CalendarSyncContext.tsx` — sync state for UI
- `src/presentation/components/calendar/GoogleCalendarPanel.tsx` — connect/sync/settings/disconnect
- `src/presentation/components/calendar/CalendarImportModal.tsx` — calendar selection + import progress
- `src/presentation/components/calendar/CalendarLegend.tsx` — color legend for all event types
- `src/vite-env.d.ts` — Vite env typings including `VITE_GOOGLE_CLIENT_ID`

### Changed
- `ActionMenu.tsx` — portal rendering, fixed positioning, flip-above, arrow-key navigation (fixes menu behind cards)
- `ThemeContext.tsx`, `App.tsx` — default theme light; preference still persisted
- `Calendar.tsx` — Google events merged; legend; Google panel; auto-sync support
- `MainLayout.tsx` — `CalendarSyncProvider` wrapper
- `index.html` — light theme-color for PWA
- `.env.example` — Google OAuth client ID documented
- Documentation updated

### Fixed
- Task/Leads/Documents action menus clipped or hidden behind adjacent cards (stacking context + no portal)

## 2026-07-06 — Production QA & Business Workflow Validation

### Added
- `src/lib/importData.ts` — JSON backup import with date revival and ID-preserving upsert
- `MockRepository.upsert()` — preserves entity IDs on import restore

### Changed
- `Modal.tsx` — Escape closes dialog; autofocus first input/select/textarea on open
- `ConfirmDialog.tsx` — Escape closes dialog
- `design.ts` — Larger inputs/buttons (`text-base`, `min-h-12`) for senior-friendly UX
- `Settings.tsx` — ConfirmDialog for reset/clear; working JSON import; toasts; professional labels
- `Deadlines.tsx` — PageHeader, PageSkeleton, Modal, EmptyState, delete with confirm, validation, toasts
- `Billing.tsx` — PageHeader, Modal, EmptyState, mobile cards, confirm Mark Paid, validation, toasts
- `Reports.tsx` — PageSkeleton, PageHeader, design system buttons
- `Login.tsx` — Autofocus email, plain-English labels, friendly errors
- `Dashboard.tsx` — Removed decorative hover-only Plus icon on quick actions
- Documentation updated

### Fixed
- Settings import showed `alert()` placeholder instead of restoring data
- Settings reset/clear used `window.confirm()` instead of ConfirmDialog
- Deadlines used legacy inline modal without Escape, autofocus, or empty state
- Billing Mark Paid had no confirmation; no mobile layout; no toasts
- Login showed "Demo mode: any password" placeholder
- Settings showed "Local Mock Storage (Active)" label
- Stray `console.error` in presentation pages (Billing, Deadlines, Cases, Reports, AuthContext)

## 2026-07-06 — Critical UX Fixes + Workflow Completion

### Added
- `src/infrastructure/storage/fileStorage.ts` — IndexedDB file storage abstraction (`IFileStorage`)
- `src/presentation/contexts/ToastContext.tsx` — App-wide toast notifications
- `src/presentation/components/ui/ActionMenu.tsx` — Accessible action dropdown menu
- `src/presentation/components/ui/ConfirmDialog.tsx` — Destructive action confirmation

### Changed
- `Leads.tsx` — Full CRUD, modals, validation, search/filter/sort, action menu, convert to client/case
- `Tasks.tsx` — Complete action menu with all task operations
- `Documents.tsx` — Real file upload/download/preview/rename/replace/delete via IndexedDB
- `Calendar.tsx` — Month/week/day grid views, deadlines/tasks/cases on calendar, event details
- `App.tsx` — ToastProvider wrapper
- Documentation updated

### Fixed
- Add Lead button used `alert()` instead of modal (root cause of broken lead creation)
- Task three-dot menu had no `onClick` handler (root cause of broken task actions)
- Lead action menu was decorative with no handlers
- Document download buttons were non-functional placeholders
- Calendar day/week views showed list instead of time grid

## 2026-07-06 — Premium SaaS UX/UI Modernization (Final Polish)

### Added
- `src/lib/design.ts` — Shared design tokens (buttons, inputs, cards, page layout)
- `src/lib/globalSearch.ts` — Application-wide search across all entity types + recent searches
- `src/lib/entityTimeline.ts` — Client/case timeline event builder
- `src/presentation/contexts/CommandPaletteContext.tsx` — Ctrl+K command palette state
- `src/presentation/components/search/CommandPalette.tsx` — Global search modal with keyboard navigation
- `src/presentation/components/notifications/NotificationCenter.tsx` — Header notification dropdown with filters
- `src/presentation/components/timeline/EntityTimeline.tsx` — Timeline cards with icons
- `src/presentation/components/timeline/ClientTimelinePanel.tsx` — Client timeline data loader
- `src/presentation/components/timeline/CaseTimelinePanel.tsx` — Case timeline data loader
- `src/presentation/components/ui/Skeleton.tsx` — Page, dashboard, table skeleton loaders
- `src/presentation/components/ui/AnimatedCounter.tsx` — Animated KPI numbers
- `src/presentation/components/ui/KpiCard.tsx` — Executive KPI cards with sparklines
- `src/presentation/components/ui/PageHeader.tsx` — Consistent page headers
- `src/presentation/components/ui/DashboardWidget.tsx` — Dashboard widget + row components
- `src/presentation/components/ui/DataTable.tsx` — Sortable, paginated, responsive table
- `src/presentation/components/ui/Modal.tsx` — Responsive modal + document preview panel
- Page-enter animations and reduced-motion support in `index.css`

### Changed
- `Dashboard.tsx` — Complete redesign with KPI cards, widgets, system status, recent payments
- `Header.tsx` — Ctrl+K search trigger, notification center dropdown
- `MainLayout.tsx` — CommandPaletteProvider integration
- `Notifications.tsx` — Type filters, improved cards, skeleton loading
- `Documents.tsx` — Drag-and-drop, upload progress, preview, sort, mobile cards
- `Clients.tsx` — Timeline modal, PageHeader, skeleton, enhanced empty states
- `Cases.tsx` — Timeline modal, PageSkeleton
- `Billing.tsx`, `Tasks.tsx` — PageSkeleton loading states
- `EmptyState.tsx` — Compact mode, gradient icon, design system buttons
- Dark mode card elevation in `index.css`
- Documentation updated

## 2026-07-06 — Mobile UX Overhaul + USCIS Cleanup + PWA Installation

### Added
- `src/presentation/contexts/NavigationContext.tsx` — Mobile drawer state, page titles, ESC/body scroll lock
- `src/presentation/components/pwa/PwaInstallPrompt.tsx` — Install banner for supported browsers
- `src/presentation/components/uscis/UscisQuickAccess.tsx` — Single USCIS module (copy/open/recent receipt/toast)
- `src/lib/uscisQuickAccess.ts` — Normalize, clipboard fallback, open USCIS URL, recent receipt storage
- `scripts/generate-pwa-icons.mjs` — PNG icon generator (192/256/384/512 + apple-touch-icon)
- `public/icons/icon-source.svg` — Source artwork for PWA icons
- CSS utilities: `.safe-top`, `.safe-bottom`, `.touch-target`; mobile overflow fixes
- `npm run icons:generate` script

### Changed
- `MainLayout.tsx` — Hamburger drawer, tablet/desktop sidebars, PWA prompt, `100dvh` layout
- `Sidebar.tsx` — Variants: desktop (lg+), tablet (collapsible), mobile (drawer)
- `Header.tsx` — Menu button, mobile page title, collapsible search, 44px touch targets
- `Cases.tsx` — Mobile card list + desktop sticky table; `UscisQuickAccess`; bottom-sheet modal
- `Clients.tsx` — Mobile card list + desktop table; responsive bottom-sheet modal
- `Dashboard.tsx` — `UscisQuickAccess` replaces dashboard widget
- `Sales.ts` — Removed `lastStatus`, `lastChecked`, `statusHistory` from Case model
- `constants.ts` — Added `uscisRecentReceipt` storage key
- `vite.config.ts` — Full PWA manifest (all icon sizes, standalone, workbox offline shell)
- `index.html` — viewport-fit=cover, apple-touch-icon, theme-color, PWA metadata
- `public/manifest.webmanifest` — All icon sizes, maskable entries
- Documentation updated

### Removed
- `UscisCaseStatusPanel.tsx`, `UscisStatusCard.tsx`, `UscisTimeline.tsx`
- `UscisGuidancePanel.tsx`, `UscisLastSync.tsx`, `UscisDashboardWidget.tsx`
- `src/domain/models/Uscis.ts`
- `src/application/uscis/uscisGuidance.service.ts`

## 2026-07-06 — USCIS Official Quick Access (Playwright Removed)

### Added
- `src/lib/uscisQuickAccess.ts` — Normalize receipt, clipboard copy with fallback, open official USCIS URL
- Lightweight `UscisCaseStatusPanel` — Open Official USCIS + Copy Receipt Number workflow

### Changed
- `src/presentation/pages/Cases.tsx` — Quick access panel only; removed API lookup/saved receipts
- `src/presentation/pages/Settings.tsx` — Removed dev provider admin panel
- `src/presentation/components/uscis/UscisStatusCard.tsx` — Removed provider badge
- `package.json` — Frontend-only dev script; removed server/playwright dependencies
- `vite.config.ts` — Removed `/api` proxy
- `.env.example` — Removed USCIS server/playwright variables
- Documentation updated

### Removed
- Entire `server/` Express USCIS API (Playwright, providers, diagnostics, health endpoint)
- `playwright`, `express`, `cors`, `concurrently` dependencies
- `src/application/hooks/useUscisCaseStatus.ts`
- `src/infrastructure/api/uscisApi.ts`
- `src/infrastructure/persistence/UscisPersistenceService.ts`
- `src/application/uscis/uscisRefresh.service.ts`
- `src/application/uscis/uscisStatusHistory.ts`
- `src/presentation/components/uscis/UscisProviderAdmin.tsx`
- `src/presentation/components/uscis/UscisStatusChangeAlert.tsx`
- Server-side USCIS parser/diagnostics tests

## 2026-07-06 — Playwright USCIS Provider

(Superseded and removed — see entry above)

## 2026-07-06 — Generic USCIS Receipt Validation

### Added
- `src/domain/uscis/receiptValidator.ts` — Centralized format-only validation
- `src/domain/uscis/receiptValidator.test.ts` — 18 automated tests
- `npm test` script

## 2026-07-06 — MockRepository localStorage Fix

### Fixed
- `MockRepository.loadFromStorage()` normalizes corrupt localStorage arrays

## 2026-07-06 — Blank Screen Fix

### Fixed
- Auth redirect loop and PWA dev service worker stale cache

## 2026-07-06 — USCIS Tracking Upgrade

### Added
- Status history, guidance, dashboard widget, last sync UI components

## 2026-07-06 — USCIS Case Status Integration

### Added
- Initial USCIS UI components and case model extensions
