# Sentinel Compliance Portal

## Overview

Sentinel Compliance Portal is a client-facing compliance and audit management dashboard built for Momentum Growth Agency. It allows clients to view security audits, track compliance findings, manage support tickets, and download deliverable artifacts. The application features a dark, cybersecurity-themed UI with animated scanning HUD effects, audit score gauges, and a "locks grid" showing compliance check statuses.

The app is a frontend-only SPA (Single Page Application) that communicates with an external Gateway API for all data operations. There is no backend or database in this repository — it is purely a React client.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Stack
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite 7 (dev server runs on port 3000)
- **Routing**: React Router DOM with `BrowserRouter`
- **Styling**: Tailwind CSS with CSS variables for theming (dark theme by default)
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives
- **Animations**: Framer Motion for page transitions and interactive elements
- **Notifications**: Sonner for toast notifications
- **Icons**: Lucide React

### Path Aliases
- `@/*` maps to `./src/*` (configured in both `tsconfig.json` and `vite.config.ts`)

### Application Structure
- **`src/pages/`** — Route-level page components:
  - `Login` — Authentication page with email/magic link and Google OAuth
  - `Dashboard` — Main overview with audit score gauge, locks grid, and summary stats
  - `Audits` — List of compliance audits with search and scanning HUD animation
  - `AuditDetail` — Individual audit view with findings table and tabs
  - `Tickets` — Support ticket management with create/filter capabilities
  - `Deliverables` — Downloadable compliance artifacts and documents

- **`src/components/`** — Reusable application components:
  - `AppShell` — Main layout wrapper with sidebar navigation and spotlight mouse-follow effect
  - `AuditScoreGauge` — Animated SVG circular gauge showing audit scores
  - `FindingsTable` — Expandable table for security findings with severity badges
  - `LocksGrid` — Grid of compliance lock status cards (READY/LOCKED/PROCESSING)
  - `ScanningHud` — Animated terminal-style scanning animation shown during loading

- **`src/components/ui/`** — shadcn/ui component library (do not modify these directly; use `npx shadcn` to add new ones)

- **`src/lib/`** — Core utilities:
  - `api.ts` — HTTP client wrapper for the Gateway API with auth token management
  - `auth.tsx` — Authentication context provider combining Supabase auth + Gateway JWT
  - `supabase.ts` — Supabase client initialization
  - `utils.ts` — `cn()` helper for merging Tailwind classes

### Authentication Flow
The app uses a dual-auth approach:
1. **Supabase Auth** — Handles user identity via Google OAuth or magic link emails
2. **Gateway JWT** — After Supabase authenticates the user, their email is exchanged with the Gateway API (`/auth/login`) for a Gateway-specific JWT token
3. The Gateway token is stored in `localStorage` and sent as a `Bearer` token on all API requests
4. If a 401/403 is received, the token is cleared and the user is redirected to login
5. There's also a direct Gateway login path (admin login) that bypasses Supabase entirely

### API Client Pattern
All API calls go through `src/lib/api.ts` which provides:
- Automatic Bearer token injection from localStorage
- Centralized error handling with auto-redirect on 401/403
- Named methods for each endpoint (`getDashboard`, `getAudits`, `getAudit`, `getTickets`, `getArtifacts`, etc.)

### Routing & Protection
- Routes are protected via a `ProtectedRoute` wrapper component
- Unauthenticated users are redirected to `/login`
- The default route redirects to `/dashboard`
- All protected pages render inside the `AppShell` layout

### TypeScript Configuration
- TypeScript is configured with relaxed strictness (most strict checks disabled)
- This is intentional — do not enable strict mode flags

### Theming
- Dark theme only, using HSL CSS custom variables defined in `src/index.css`
- Primary color is blue (`217 91% 60%`)
- Background is very dark blue-gray (`225 38% 5%`)
- The `:root` and `.dark` selectors have identical values (always dark)

## External Dependencies

### Gateway API
- **Base URL**: Configured via `VITE_GATEWAY_URL` env var, defaults to `https://gateway.sentinel.momentumgrowthagency.com`
- **Endpoints used**:
  - `POST /auth/login` — Exchange email for JWT token
  - `GET /auth/health` — Health check for connection status display
  - `GET /portal/dashboard` — Dashboard summary data
  - `GET /portal/audits` — Paginated audit list
  - `GET /portal/audits/:id` — Individual audit detail
  - `GET /portal/tickets` — Ticket list
  - `POST /portal/tickets` — Create ticket
  - `GET /portal/artifacts` — Deliverables list
- **Auth**: Bearer JWT token in Authorization header

### Supabase
- **Configuration**: Via `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars
- **Usage**: Authentication only (Google OAuth, magic link emails)
- **Graceful degradation**: App checks `isSupabaseConfigured` and can work without it via direct Gateway login

### Blink SDK
- `@blinkdotnew/sdk` is included (project was scaffolded with Blink)
- An auto-engineer script is loaded in `index.html`

### Key NPM Dependencies
- `framer-motion` — Animations throughout the app
- `sonner` — Toast notifications
- `recharts` — Charting library (available via shadcn chart component)
- `react-day-picker` — Calendar component
- `embla-carousel-react` — Carousel component
- `vaul` — Drawer component
- `cmdk` — Command palette component
- `react-hook-form` + `@hookform/resolvers` — Form handling
- `@dnd-kit/core` — Drag and drop capability
- `input-otp` — OTP input component
- `react-resizable-panels` — Resizable panel layouts