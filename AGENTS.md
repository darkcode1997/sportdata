# Repository Guidelines

## Project Structure & Module Organization
SportData is an npm-workspace monorepo for sports event management.
- `apps/backend/src/`: NestJS API, organized into feature modules with controllers, services, and `dto/` validation classes.
- `apps/backend/prisma/`: PostgreSQL schema, versioned migrations, SQL constraints, and seed scripts.
- `apps/frontend/src/`: Next.js routes in `app/`, reusable UI in `components/`, hooks in `hooks/`, and shared helpers/types in `lib/`.
- `tests/load/`: k6 load scenarios. `docs/` contains product and operational guides; `deploy/` contains infrastructure configuration. Generated PDF samples live in `output/pdf/`.

## Build, Test, and Development Commands
Run commands from the repository root.
- `npm install`: install workspace dependencies.
- `npm run prisma:generate`: regenerate the Prisma client after schema changes.
- `npm run prisma:migrate`: apply/create development migrations against your configured database.
- `npm run seed`: populate development data; use a disposable development database.
- `npm run dev`: start both apps; frontend uses port 3000, backend port 4000, with Swagger at `/api/docs`.
- `npm run build`: build both workspaces.
- `npm run lint --workspace=@sportdata/frontend`: run ESLint with Next.js Core Web Vitals rules.
- `npm run docker:up`: build and start the local Docker stack.

## Coding Style & Naming Conventions
Use TypeScript, two-space indentation, single quotes, and semicolons, following surrounding code. Use PascalCase for components/classes, camelCase for functions/variables, and backend filenames such as `categories.service.ts` and `create-category.dto.ts`. Keep feature logic in services and request validation in DTOs. Follow the frontend ESLint configuration; no dedicated formatter is configured.

## Testing Guidelines
No unit-test runner, root `npm test` script, or coverage requirement is configured. Validate changes with builds, frontend lint, and manual checks of affected API/CMS/public flows. For load checks, run `k6 run -e BASE_URL=http://localhost:4000 -e EVENT_ID=your-event-id tests/load/sea-games.js`. Existing thresholds require errors below 1%, p95 below one second, and p99 below two seconds. Place additional load scenarios in `tests/load/`.

## Commit & Pull Request Guidelines
Recent commits use short messages such as `fix bug` and `update`; no formal convention is evident. Prefer descriptive imperative messages naming the affected feature. PRs should explain the behavior change, link relevant issues, record validation, and include screenshots for UI changes. Call out migrations and configuration changes.

## Security & Configuration
Copy `.env.example` to `.env` for local development. Keep credentials and identity documents out of commits. Use `docker-compose.yml` locally; consult `docs/production-runbook.md` for production configuration. Replace default admin credentials and `JWT_SECRET` before deployment.
