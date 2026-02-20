# Overview

This is a SheerID student verification automation tool. It provides a web-based dashboard for automating student verification flows through SheerID's API. The app allows users to submit verification URLs, monitors their progress, manages proxies, and tracks verification results (success/failure/review). It's a full-stack TypeScript application with a React frontend and Express backend, backed by PostgreSQL.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Overall Structure

The project follows a monorepo-style layout with three main directories:

- **`client/`** — React single-page application (frontend)
- **`server/`** — Express API server (backend)
- **`shared/`** — Shared TypeScript types and database schema used by both client and server

### Frontend Architecture

- **Framework**: React with TypeScript
- **Build Tool**: Vite (configured in `vite.config.ts`)
- **Routing**: Wouter (lightweight client-side router)
- **State Management / Data Fetching**: TanStack React Query for server state, with automatic polling (refetchInterval) on key pages
- **UI Components**: Shadcn/ui (new-york style) built on Radix UI primitives, styled with Tailwind CSS
- **Styling**: Tailwind CSS with CSS custom properties for theming (light/dark mode support)
- **Pages**:
  - `/` — Dashboard with stats overview (total, success, failed, running, success rate), animated counters, gradient text
  - `/verify` — Submit verification URLs, view list of verifications, view logs, recent document previews
  - `/documents` — Document generator with form, live SVG preview, PNG download, and card history (30 templates: 15 ID cards + 15 document types)
  - `/proxies` — Proxy management (add/remove/toggle, bulk import, role assignment: warmup vs submit)
  - `/universities` — University enable/disable management (56 verified tribal colleges)
  - `/telegram` — Telegram bot management (add/remove/toggle bots, admin IDs, credit prices, message templates)
  - `/settings` — System configuration overview (program ID, endpoints, delays, fingerprint info)
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend Architecture

- **Framework**: Express 5 on Node.js with TypeScript (run via `tsx`)
- **API Pattern**: RESTful JSON API under `/api/` prefix
- **Key Endpoints**:
  - `GET /api/verifications` — List all verifications
  - `GET /api/verifications/:id` — Get single verification
  - `GET /api/verifications/:id/logs` — Get logs for a verification
  - `POST /api/verifications/check` — Check if a verification URL is valid
  - `POST /api/verifications` — Start a new verification (runs async in background)
  - `GET /api/stats` — Dashboard statistics
  - `GET /api/documents/recent` — Last 3 document previews from verifications
  - `GET/POST/DELETE /api/cards` — Card CRUD (document generator)
  - `POST /api/cards/preview` — Generate SVG preview without saving
  - `GET/POST/PATCH/DELETE /api/proxies` — Proxy management CRUD
  - `GET /api/universities` — List all universities with enabled status
  - `PATCH /api/universities/:id` — Toggle single university enabled/disabled
  - `POST /api/universities/bulk` — Bulk enable/disable universities
- **Background Processing**: Verifications run asynchronously after creation via `runVerification()` which calls SheerID APIs
- **Development**: Vite dev server is integrated as middleware (HMR via `server/vite.ts`)
- **Production**: Client is pre-built to `dist/public`, served as static files via `server/static.ts`

### Verification Engine (`server/verifier.ts`)

- Interacts with SheerID's REST API (`https://services.sheerid.com/rest/v2`)
- Uses a hardcoded program ID for Google One (Gemini) student verification
- **University list**: 35 small tribal colleges and community colleges with hardcoded SheerID org IDs (no org search needed). These are small, low-profile schools less likely to be flagged by anti-bot systems. Weighted random selection. Uses generic email domains (gmail, yahoo, outlook etc.) instead of college-specific domains.
- **Anti-detection headers**: Full browser-like headers including `clientversion`, `clientname`, NewRelic tracking headers (`newrelic`, `traceparent`, `tracestate`), and `sec-ch-ua`/`sec-fetch-*` headers to mimic real browser requests.
- **Fingerprint generation**: Realistic browser fingerprint hash using screen resolution, timezone, language, platform, CPU cores, device memory, and session ID.
- **Document output**: Generates student ID cards as JPEG (not PNG) with slight rotation, brightness/saturation variation, and subtle blur to simulate phone photography of a physical card.
- Supports proxy rotation for requests via undici ProxyAgent
- **Fraud detection handling**: Detects `fraudRulesReject` errors and provides actionable advice (residential proxy needed).
- **Detailed error logging**: Logs full SheerID API response bodies for debugging failed verifications.
- Randomized delays with jitter (400-1200ms base + 0-150ms jitter) to mimic human behavior

#### Recent Changes (Feb 2026)
- **TLS Fingerprint Spoofing**: Uses `impit` (Rust-based) to impersonate Chrome's JA3/JA4 TLS signatures, critical for bypassing SheerID's fraud detection
- **Session Warming**: Makes 2 preliminary API requests (program theme + org search) before verification to establish legitimate browser session
- **Document Anti-Detection**: Random pixel noise overlay (80 points), dynamic element positioning (±3px jitter), 10 color schemes, QR code alongside barcode, variable font sizes
- **University Success Rate Tracking**: In-memory per-university stats (success/failure/fraud counts), auto-adjusts selection weights based on performance
- **Fraud Retry with Exponential Backoff**: Up to 3 attempts on fraudRulesReject, creates new session/identity each retry, exponential backoff (2-30s + random jitter)
- **API Endpoint**: `GET /api/stats/universities` for university performance data
- **Dashboard**: University performance table showing attempts, success, failures, fraud rejects, success rate, adjusted weight
- Reverted from large US universities back to small tribal colleges (large schools too heavily targeted by bots, causing higher fraud detection)
- Uses generic email domains (gmail, yahoo, outlook, etc.) instead of college-specific domains
- Added NewRelic tracking headers required by SheerID
- Added `clientversion`/`clientname` headers (jslib client identity)
- Added sec-ch-ua browser hint headers
- Switched document output from PNG to JPEG with photo simulation effects
- College names on cards now strip "(City, ST)" suffix from SheerID search results
- Extended name pools (67 first names, 56 last names) for more variety
- Improved error messages with actual API response data for debugging
- VerificationSession pattern: consistent headers and proxy throughout entire verification flow

### Database

- **Database**: PostgreSQL (required, connection via `DATABASE_URL` environment variable)
- **ORM**: Drizzle ORM with `drizzle-zod` for schema validation
- **Schema** (defined in `shared/schema.ts`):
  - `verifications` — Tracks each verification attempt (id, verificationId, url, status, college info, student info, error messages, redirect URL, documentSvg, timestamps)
  - `verification_logs` — Log entries per verification (message, level: info/warning/error)
  - `cards` — Generated student ID cards (name, collegeName, dateOfBirth, department, studentId, validUntil, primaryColor, gender, photoUrl, svgContent)
  - `proxies` — Proxy server list (url, isActive, label)
- **Migrations**: Managed via `drizzle-kit push` (`npm run db:push`)
- **Storage Layer**: `server/storage.ts` implements `IStorage` interface with `DatabaseStorage` class using Drizzle queries

### Build System

- **Development**: `npm run dev` — runs Express server with Vite middleware for HMR
- **Production Build**: `npm run build` — runs `script/build.ts` which:
  1. Builds client with Vite (output to `dist/public`)
  2. Bundles server with esbuild (output to `dist/index.cjs`), externalizing most deps but bundling common ones for faster cold starts
- **Production Start**: `npm start` — runs `node dist/index.cjs`

## External Dependencies

### Required Services

- **PostgreSQL Database**: Required. Connection string provided via `DATABASE_URL` environment variable. Used for all data persistence.
- **SheerID API**: `https://services.sheerid.com/rest/v2` — The core external API for student verification flows. Uses program ID `67c8c14f5f17a83b745e3f82`.
- **randomuser.me API**: `https://randomuser.me/api/` — Used to fetch realistic face photos for student ID cards (gender-matched).

### Key NPM Packages

- **Frontend**: React, Vite, TanStack React Query, Wouter, Radix UI, Tailwind CSS, Shadcn/ui, Lucide icons, Recharts (charts), embla-carousel, react-day-picker, react-hook-form, vaul (drawer), cmdk (command palette)
- **Backend**: Express 5, Drizzle ORM, pg (PostgreSQL driver), connect-pg-simple (session store), zod (validation)
- **Replit-specific**: `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner`

### Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (required)
- `NODE_ENV` — Controls dev vs production mode