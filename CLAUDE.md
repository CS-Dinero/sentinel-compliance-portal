# CLAUDE.md — Sentinel Compliance Portal

## Project Overview

Sentinel Compliance Portal is a client-facing SPA for viewing compliance audits, health scores, support tickets, and deliverables. It communicates with a custom Gateway API and uses Supabase for OAuth authentication. The project was scaffolded with Blink and uses a dark, security-themed UI aesthetic.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18+ (hooks-based, no class components) |
| Build tool | Vite 7 |
| Language | TypeScript (loose — `strict: false` in tsconfig) |
| Styling | Tailwind CSS 3.3 + CSS variables (HSL format) |
| UI components | shadcn/ui (New York style) + Radix UI primitives |
| Routing | React Router DOM v7 (BrowserRouter) |
| Auth | Supabase OAuth/Magic Link + custom Gateway JWT |
| Forms | React Hook Form + Zod |
| Animations | Framer Motion |
| Toasts | Sonner |
| Icons | Lucide React |
| Charts | Recharts |
| Package manager | Bun (scripts use `bun run`) |

## Repository Structure

```
sentinel-compliance-portal/
├── index.html                  # Entry HTML (includes Blink auto-engineer script)
├── package.json                # Dependencies and scripts
├── vite.config.ts              # Vite config (port 3000, @ alias)
├── tsconfig.json               # TypeScript config (loose checks)
├── tsconfig.node.json          # Node-specific TS config
├── tailwind.config.cjs         # Tailwind theme + CSS variable colors
├── postcss.config.cjs          # PostCSS with autoprefixer
├── components.json             # shadcn/ui configuration
├── .env.example                # Environment variable template
├── .env.local                  # Local environment (gitignored via *.local)
├── public/                     # Static assets (favicon, _redirects)
└── src/
    ├── main.tsx                # React DOM entry point
    ├── App.tsx                 # Root component, routing, AuthProvider
    ├── index.css               # Global styles, CSS variables, custom effects
    ├── pages/                  # Route-level page components
    │   ├── Login.tsx           # Auth page (Google OAuth, Magic Link, Gateway direct)
    │   ├── Dashboard.tsx       # Main dashboard with health score, stats, locks
    │   ├── Audits.tsx          # Audit list with pagination
    │   ├── AuditDetail.tsx     # Single audit view with findings table
    │   ├── Tickets.tsx         # Support tickets with create modal
    │   └── Deliverables.tsx    # Downloadable artifacts
    ├── components/             # Reusable components
    │   ├── AppShell.tsx        # Layout shell (sidebar, header, mobile menu)
    │   ├── AuditScoreGauge.tsx # Radial SVG gauge
    │   ├── FindingsTable.tsx   # Data table for audit findings
    │   ├── LocksGrid.tsx       # Compliance lock status grid
    │   ├── ScanningHud.tsx     # Terminal-style loading animation
    │   └── ui/                 # ~53 shadcn/ui primitives (DO NOT manually edit)
    ├── lib/                    # Core utilities and services
    │   ├── auth.tsx            # AuthContext provider + useAuth hook
    │   ├── api.ts              # Gateway API client (fetch wrapper)
    │   ├── supabase.ts         # Supabase client initialization
    │   └── utils.ts            # cn() helper (clsx + tailwind-merge)
    └── hooks/                  # Custom React hooks
        └── use-mobile.tsx      # useIsMobile() responsive breakpoint hook
```

## Common Commands

```bash
bun run dev           # Start dev server on http://localhost:3000
bun run build         # Production build (vite build)
bun run preview       # Preview production build
bun run lint          # Run all linters (types → JS → CSS → CSS vars → CSS classes)
bun run lint:types    # TypeScript type check (tsc --noEmit)
bun run lint:js       # ESLint for .ts/.tsx files
bun run lint:css      # Stylelint with auto-fix
```

Note: `node_modules` may not be installed. Run `bun install` first if needed. The `lint` script depends on `scripts/check-css-variables.js` and `scripts/check-css-classes.js` which may not exist in the repo — these may fail.

## Architecture & Patterns

### Authentication (Dual-Layer)

Authentication uses two systems in tandem (see `src/lib/auth.tsx`):

1. **Supabase** — Google OAuth or Magic Link (email OTP). Creates a Supabase session.
2. **Gateway API** — The Supabase user's email is exchanged for a Gateway JWT via `POST /auth/login`. This JWT is stored in `localStorage` as `gateway_token` and sent as a Bearer token on all API requests.

A user is considered authenticated if a `gateway_token` exists in localStorage. The Gateway also supports direct login (bypassing Supabase) for admin/staff users.

The `<ProtectedRoute>` component in `App.tsx` guards all routes except `/login`.

### API Client (`src/lib/api.ts`)

- Centralized `request<T>()` function wrapping `fetch()`
- Automatically injects Bearer token from localStorage
- 401/403 responses clear the token and redirect to `/login`
- Base URL from `VITE_GATEWAY_URL` env var
- **Gateway endpoints:**
  - `POST /auth/login` — exchange email for JWT
  - `POST /auth/health` — health check
  - `GET /portal/dashboard` — dashboard stats
  - `GET /portal/audits?page_size=N&offset=N` — paginated audits
  - `GET /portal/audits/:id` — single audit
  - `GET /portal/tickets` — list tickets
  - `POST /portal/tickets` — create ticket `{category, message, audit_record_id?}`
  - `GET /portal/artifacts` — deliverables

### State Management

- **No global store** (no Redux, Zustand, etc.)
- Auth state via React Context (`AuthProvider` / `useAuth`)
- Page data fetched directly in components via `useEffect` + `useState`
- All API responses typed as `any` — there are no shared type definitions for API data

### Routing (`src/App.tsx`)

| Path | Component | Auth |
|---|---|---|
| `/` | Redirects to `/dashboard` | — |
| `/login` | `Login` | Public |
| `/dashboard` | `Dashboard` | Protected |
| `/audits` | `Audits` | Protected |
| `/audits/:id` | `AuditDetail` | Protected |
| `/tickets` | `Tickets` | Protected |
| `/deliverables` | `Deliverables` | Protected |

### Component Patterns

- **Pages** are in `src/pages/` — named exports (e.g., `export function Dashboard()`)
- **Shared components** are in `src/components/` — named exports
- **shadcn/ui components** live in `src/components/ui/` — managed by the shadcn CLI. Do not manually edit these files; use `npx shadcn@latest add <component>` to add new ones.
- **Skeleton loaders** are co-located inside page files as private components (e.g., `TicketsSkeleton` in `Tickets.tsx`)
- **Status rendering** uses local helper components (e.g., `StatusPill`, `StatusBadge`)

### Import Conventions

- Use the `@/` path alias for all project imports: `import { api } from '@/lib/api'`
- shadcn/ui components: `import { Button } from '@/components/ui/button'`
- Icons from lucide-react: `import { Shield, Menu } from 'lucide-react'`
- Framer Motion: `import { motion, AnimatePresence } from 'framer-motion'`
- Toast notifications: `import { toast } from 'sonner'`

## Styling

### Tailwind + CSS Variables

Colors are defined as HSL values (without the `hsl()` wrapper) in CSS variables in `src/index.css`, then consumed in `tailwind.config.cjs` via `hsl(var(--name))`. The theme is dark-only in practice (`:root` and `.dark` have identical values).

Key semantic colors: `background`, `foreground`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `card`, `popover`, `border`, `input`, `ring`.

### Custom CSS Classes (defined in `src/index.css`)

| Class | Purpose |
|---|---|
| `.glass` | Glass morphism: backdrop blur + semi-transparent bg + border |
| `.glass-morphism` | `.glass` with hover brightening |
| `.spotlight` | Mouse-tracking radial gradient (uses `--x`, `--y` CSS vars) |
| `.glow-blue` | Blue box-shadow glow effect |
| `.scan-line` | Animated horizontal scan line overlay |
| `.shimmer` | Animated shimmer loading effect |
| `.terminal-log` | Monospace terminal styling |
| `.terminal-line` | Fade-in animation for terminal output lines |
| `.terminal-cursor` | Blinking underscore cursor |
| `.gauge-bg` / `.gauge-progress` / `.gauge-progress-destructive` | SVG gauge stroke styles |

### Style Conventions

- Use `cn()` from `@/lib/utils` to merge Tailwind classes conditionally
- Prefer Tailwind utilities over custom CSS
- UI is heavily stylized: glass morphism, glow effects, uppercase tracking-widest labels, rounded-2xl/3xl corners
- Animations via Framer Motion `<motion.div>` with `initial`/`animate`/`exit` props
- Responsive: desktop sidebar collapses to hamburger menu on mobile (lg breakpoint)

## Environment Variables

Required variables (prefixed with `VITE_` for Vite):

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GATEWAY_URL=https://gateway.sentinel.momentumgrowthagency.com
```

Copy `.env.example` to `.env.local` for local development. The `.env.local` file is gitignored.

## TypeScript

TypeScript is configured with **all strict checks disabled** (`strict: false`, `noImplicitAny: false`, `strictNullChecks: false`, etc.). API responses are typed as `any`. This means:

- The compiler will not catch null/undefined access errors
- Adding types to API responses is welcome but not enforced
- When adding new code, prefer using explicit types where practical but don't over-engineer type safety for existing patterns

## Testing

There is **no test framework configured**. No Jest, Vitest, or testing-library. No test files exist. If tests are needed, Vitest is the recommended choice given the Vite build setup.

## CI/CD

There is **no CI/CD pipeline**. No GitHub Actions, no deployment scripts. The `public/_redirects` file suggests deployment to Netlify or similar.

## Key Gotchas

1. **No `node_modules`** — run `bun install` before building or running the dev server.
2. **Lint scripts reference missing files** — `scripts/check-css-variables.js` and `scripts/check-css-classes.js` may not exist; the combined `lint` script may fail on those steps.
3. **Loose TypeScript** — the codebase uses `any` extensively. Don't assume type safety.
4. **Gateway API dependency** — the app is non-functional without the external Gateway API at `gateway.sentinel.momentumgrowthagency.com`.
5. **Blink auto-engineer script** — `index.html` includes an external Blink script. Do not remove it (there's a comment warning about this).
6. **shadcn/ui components** — files in `src/components/ui/` are generated. Use the CLI to add/update, don't edit manually.
7. **No SSR** — this is a client-side SPA. `rsc: false` in `components.json`.
8. **`NEXT_PUBLIC_*` env vars in `.env.local`** — legacy from an earlier Next.js setup. Only `VITE_*` vars are used by the current Vite build.
