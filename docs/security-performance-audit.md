# Teachix Security, Performance, Stability and Production-Readiness Audit

**Project:** `student-guidance-platform-clean`  
**Audit date:** 2026-08-24  
**Scope:** Next.js 16 App Router, React, Prisma/MySQL, authentication, role dashboards, service access, APIs, uploads, PDF/print, PWA, and production configuration.  
**Method:** Static source review, route inventory, targeted data-flow review, dependency audit, TypeScript check, lint check, and build verification. No production credentials or secret values were read or recorded.

## 1. Executive Summary

The application has a solid baseline for a multi-role school platform: signed session tokens are backed by database sessions, dashboard APIs generally apply school scoping, mutation endpoints use POST/PUT/PATCH/DELETE, Prisma raw SQL is predominantly parameterized, curriculum and portfolio source references are re-resolved server-side, and the service worker intentionally excludes dashboard/API traffic from caching.

The highest practical risks found were:

- An unauthenticated evidence-file route makes stored evidence retrievable by URL alone. This is a privacy risk for student/school documents and requires a deliberate signed/authorized download design; it was not changed automatically because the current evidence model also has unlinked uploads and many existing print paths consume those URLs.
- The public curriculum PDF endpoint can invoke an expensive Cloudflare Browser Rendering job without authentication or rate limiting. A per-process rate limit was added as a low-risk containment measure; an edge/distributed limiter remains recommended.
- The activity-plan share-token encryption path previously fell back to a known development key in production. It now fails closed when production configuration is missing.
- The in-process rate limiter had unbounded key growth. It now prunes expired buckets and enforces a memory bound.
- Safe baseline security headers were added, and Next/eslint-config-next were upgraded from 16.2.6 to 16.2.11 because the installed Next line had published high-severity advisories affecting Proxy/Server Action behavior. Remaining transitive audit findings require a separately tested dependency update and were not force-fixed.

**Finding totals:** P0: 0 · P1: 4 · P2: 9 · P3: 4.  
**Automatic fixes:** 6 code/config/dependency changes.  
**Prisma schema changed:** No.  
**Migration created:** No.

## 2. Security Findings

### SEC-001 — P1 — Public evidence files are URL-readable without authorization

- **Category:** File privacy / IDOR-like access.
- **Affected files:** `app/uploads/evidence/[fileName]/route.ts`, `lib/evidence/evidence-file-storage.ts`, `lib/evidence/save-evidence-files.ts`, `proxy.ts`.
- **Issue:** The route validates a safe filename and file existence but does not require a session or verify that the requester belongs to the evidence file's school. `proxy.ts` deliberately allows `/uploads/` through. Filenames contain random components, but possession of a URL is sufficient.
- **Impact scenario:** A leaked report/evidence URL, browser history entry, referrer, or exported document can be used from an unauthenticated browser to retrieve a student or school attachment.
- **Fixed:** No.
- **Reason:** A safe fix requires a compatibility design for existing unlinked evidence uploads, report/portfolio rendering, print rendering, and possibly signed short-lived media URLs. Adding a session check alone would break legitimate existing document paths and would not resolve ownership for files that have no persisted owner row.
- **Recommendation:** Introduce an authenticated media resolver or signed URL route; persist owner/school scope for every uploaded file; migrate existing references before disabling direct access.

### SEC-002 — P1 — Public PDF generation was unbounded

- **Category:** Resource exhaustion / external-service abuse.
- **Affected file:** `app/api/public/curriculum-distribution/export/pdf/route.ts`.
- **Issue:** The endpoint is intentionally public and invokes Cloudflare Browser Rendering for caller-selected curriculum references, but had no request limiter.
- **Impact scenario:** Repeated anonymous requests can consume Cloudflare quota and application resources.
- **Fixed:** Yes.
- **Exact fix:** Added `enforceRateLimit` with a six-request-per-minute namespace before database lookup and PDF generation.
- **Remaining concern:** The limiter is process-local and the client IP is derived from forwarded headers. Hostinger/Cloudflare edge rate limiting should be added for production-wide enforcement and trusted proxy configuration should be verified.

### SEC-003 — P1 — Next.js security advisories on the original version

- **Category:** Dependency security.
- **Affected files:** `package.json`, `package-lock.json`.
- **Issue:** The original `next` and `eslint-config-next` versions were 16.2.6. `npm audit` reported high-severity Next advisories in the installed line, including Proxy bypass and Server Action/SSRF/DoS-related advisories.
- **Fixed:** Partially/compatibly fixed.
- **Exact fix:** Updated both packages to the compatible patch release 16.2.11 and verified TypeScript compilation. No major version or force upgrade was used.
- **Remaining concern:** `npm audit` still reports a high `next` path through vulnerable transitive `postcss`/`sharp` resolution and recommends a later Next release. A staged 16.3.2 upgrade should be tested separately against Hostinger, Cloudflare PDF flows, and PWA behavior; it was intentionally not forced during this audit.

### SEC-004 — P1 — Production share-token key fallback

- **Category:** Secret/configuration safety.
- **Affected file:** `lib/activity-plan/activity-plan-share-service.ts`.
- **Issue:** The activity-plan share token encryption key fell back to a known development string when production configuration was absent.
- **Impact scenario:** If encrypted token storage is exposed, production deployments using the fallback would not have a deployment-unique encryption secret.
- **Fixed:** Yes.
- **Exact fix:** Production now throws unless `ACTIVITY_PLAN_SHARE_TOKEN_ENCRYPTION_KEY` or `NEXTAUTH_SECRET` is configured with at least 32 characters. Development retains its explicit fallback for local work.
- **Remaining concern:** Existing encrypted tokens must be regenerated if the production key is rotated. The deployment process must provide the key before enabling share-token generation.

### SEC-005 — P2 — Forwarded client IPs are trusted by application rate limiting

- **Affected files:** `lib/auth/auth-rate-limit.ts`, `lib/security/rate-limit.ts`.
- **Issue:** Rate-limit identity uses `x-forwarded-for`/`x-real-ip`, which can be spoofed when the reverse-proxy trust boundary is not guaranteed.
- **Fixed:** No; the new public PDF limiter uses the same shared helper.
- **Recommendation:** Enforce trusted proxy headers at Hostinger/Cloudflare and, where available, use the platform's authenticated client-IP header. Do not accept arbitrary forwarded headers from direct internet traffic.

### SEC-006 — P2 — Cross-site mutation protection is implicit rather than explicit

- **Affected files:** `lib/auth/session.ts`, dashboard mutation route handlers.
- **Issue:** Session cookies use `httpOnly`, production `secure`, `SameSite=Lax`, and path `/`; mutations are generally non-GET. There is no uniform Origin/Referer validation layer for all JSON mutations.
- **Assessment:** SameSite cookies and POST-only mutation design provide meaningful protection, but do not cover every deployment/proxy edge case.
- **Fixed:** No.
- **Recommendation:** Add a small shared same-origin check for sensitive state-changing dashboard routes after validating Hostinger forwarded-host behavior. Do not add a broad framework without testing native/mobile clients.

### SEC-007 — P2 — Public activity-plan share is school-scoped and long-lived

- **Affected files:** `lib/activity-plan/activity-plan-share-service.ts`, `app/activity-plan/[token]/page.tsx`.
- **Issue:** One active share token is created per school account and resolves the full school's activity plan. Expiry is optional and defaults to no expiry.
- **Assessment:** This is consistent with the requested share feature, uses 32 random bytes, hashes lookup tokens, and supports revocation. It is intentionally broad and should be treated as a public school document link.
- **Fixed:** No functional change.
- **Recommendation:** Add explicit user-facing expiry/revocation policy and default expiry if product requirements permit. Keep `dynamic = "force-dynamic"` and verify CDN behavior remains private/no-store for token pages.

### SEC-008 — P2 — User-controlled rich HTML surfaces need continuous trust-boundary review

- **Affected files:** `app/print/curriculum-distribution/week/page.tsx`, `app/print/curriculum-distribution/page.tsx`, `app/report-2-export-preview/[token]/page.tsx`, `app/dashboard/certificates/*/preview-print/page.tsx`, several report preview components.
- **Issue:** `dangerouslySetInnerHTML` is used for generated print styles and stored/rendered report HTML. Some surfaces are trusted internal/generated HTML; others may contain user-authored report content.
- **Assessment:** No direct exploit was proven in this static audit. React escapes ordinary text nodes, while raw HTML remains a sensitive boundary.
- **Fixed:** No.
- **Recommendation:** Document trusted HTML producers, sanitize user-authored HTML at write/read boundaries where applicable, and add regression tests for `<script>`, event attributes, and unsafe URLs without sanitizing trusted print CSS.

## 3. Performance Findings

### PERF-001 — P2 — In-process rate-limit map could grow without bound

- **Affected file:** `lib/security/rate-limit.ts`.
- **Issue:** Expired buckets were only replaced when the same key returned; rotating keys could leave entries indefinitely.
- **Impact:** Memory growth under identity/IP rotation, especially on login/register or public endpoints.
- **Fixed:** Yes.
- **Exact fix:** Added expiration pruning and a 10,000-entry bound with oldest-bucket eviction.
- **Remaining concern:** This is a local safety net, not a distributed limiter.

### PERF-002 — P2 — Browser-rendered PDF paths are expensive and serialized

- **Affected files:** `lib/pdf-export/cloudflare-browser-run-pdf.ts`, dashboard/public PDF route handlers.
- **Issue:** Each export can wait up to 45 seconds for navigation/selector plus a 60-second abort timeout and starts a remote browser job. Multiple clicks or retries can be costly.
- **Fixed:** Partially through public endpoint rate limiting; authenticated flows already have loading states in the audited curriculum sharing path.
- **Recommendation:** Add server-side per-user export concurrency/idempotency and observe Cloudflare latency/quotas before introducing caching, because PDFs contain private data.

### PERF-003 — P2 — Portfolio/report read models contain large nested payloads

- **Affected files:** `lib/portfolio/portfolio-read-model.ts`, report engine read/normalization modules, portfolio APIs.
- **Issue:** Portfolio rendering intentionally assembles reports, evidence, service outputs, and structured content into one document model. This is correct for printing but can be large for interactive workspace requests.
- **Fixed:** No broad rewrite.
- **Recommendation:** Measure payload size in production; split workspace DTOs from print DTOs and select only fields needed by each route. Do not add blind caching to private data.

### PERF-004 — P2 — Several list APIs need explicit pagination audits

- **Affected areas:** admin dashboards, reports, surveys, timetable/data-center routes.
- **Issue:** The repository contains many `findMany` calls; many are bounded, but a full query-plan review is needed for large school accounts. The static scan found 307 `findMany` occurrences and 79 visible `take/skip` markers across the searched source.
- **Fixed:** No broad change without runtime cardinality evidence.
- **Recommendation:** Add route-level query timing and row-count metrics, then prioritize unbounded authenticated lists and missing composite indexes based on production data.

### PERF-005 — P3 — Lint scans historical and generated directories

- **Affected files:** `eslint.config.mjs`, `_backups/**`, Android build assets, many historical `.cjs` scripts.
- **Issue:** `npm run lint` traverses backups/tooling/generated assets and reports 1,093 errors, mostly `require()` rules in legacy scripts. This obscures production source regressions and slows feedback.
- **Fixed:** No; changing ignores could hide useful tooling checks without an agreed source policy.
- **Recommendation:** Add explicit repository ignores for backups/build outputs and separate a typed application lint target from legacy migration scripts.

## 4. Stability Findings

### STAB-001 — P2 — Production errors are not consistently normalized

- **Affected areas:** multiple `app/api/**/route.ts` handlers, notably evidence, data-center, workflow, statistics, and payment handlers.
- **Issue:** Some handlers return `error.message` or diagnostic details to clients. This can expose storage paths, provider messages, SQL context, or unstable internal codes and creates inconsistent client behavior.
- **Fixed:** No global rewrite.
- **Recommendation:** Use allowlisted user-facing error codes/messages and log the detailed error server-side with a correlation ID. The audit did not change unrelated handlers to avoid changing API contracts.

### STAB-002 — P2 — Multiple client mutations depend on UI-level duplicate-click prevention

- **Affected areas:** report, portfolio, timetable, PDF export, and service-link mutations.
- **Issue:** Many routes are not idempotency-key protected. A double click or retry can create duplicate work where database uniqueness does not cover the operation.
- **Fixed:** No global change.
- **Recommendation:** Add idempotency keys only to proven duplicate-prone writes, starting with expensive exports and payment/webhook operations.

### STAB-003 — P3 — Forwarded origin construction requires deployment verification

- **Affected files:** `lib/http/request-origin.ts`, Cloudflare PDF callers.
- **Issue:** Request origin uses forwarded host/proto values. This is appropriate behind a trusted reverse proxy but can generate incorrect or attacker-influenced internal URLs if proxy header handling is loose.
- **Fixed:** No.
- **Manual check:** Verify Hostinger overwrites, rather than forwards arbitrary client-supplied, `Host`, `X-Forwarded-Host`, and `X-Forwarded-Proto`.

## 5. Authentication / Session Findings

- Session cookies are `httpOnly`, `SameSite=Lax`, production-secure, path `/`, and 14 days max age. This is a good baseline.
- Signed session payloads use HMAC-SHA256 and random token/session IDs. Requests also query `UserSession`, check active/revoked/expiry state, and periodically update `lastSeenAt`.
- Logout/session revocation paths were inventoried; no clear bypass was proven.
- `AUTH_SECRET` fails closed in production when missing/short. Activity-plan share encryption now follows the same fail-closed principle.
- **Remaining P2:** session payload contains role/email claims, but current authorization correctly reloads the user from the database. Continue to treat DB role state as authoritative and test role changes against already-issued sessions.

## 6. Authorization / IDOR Findings

- Dashboard context derives the current user and school account server-side.
- Cases, reports, students, evidence mutations, service links, saved curriculum, activity plans, and portfolio routes commonly include owner/school predicates.
- Service output link update/delete uses owner and school scope; portfolio targets are validated server-side.
- Activity plan and curriculum source references are re-resolved by the server rather than trusting client-provided full data.
- **P1 SEC-001 remains:** evidence media is URL-readable without an ownership check.
- **P2:** every new dynamic route should receive an explicit ownership test; navigation visibility is not considered authorization.

## 7. Role / Permission Findings

- Role enums and role-specific performance/portfolio definitions are separated.
- Activity Leader, Teacher, Counselor, Principal, and Admin paths use explicit role checks in the audited service integrations.
- Admin exceptions are visible in helpers rather than inferred from UI.
- **Remaining P2:** several broad admin/principal helpers use `allowPrincipal` options; each newly added route should be reviewed for whether that exception is actually intended.

## 8. Subscription Enforcement Findings

- Curriculum distribution, activity plan, activity team, service output linking, and many dashboard APIs call service/subscription guards before work.
- The service worker and UI do not constitute the access boundary; server checks are present in reviewed paths.
- **Remaining P2:** perform an automated route matrix test for every service slug and role, especially newly added exports and public-vs-dashboard routes.

## 9. API Findings

- Next Route Handlers correctly return 405 for unsupported methods; weekly curriculum PDF remains POST-only.
- JSON parsing and basic malformed-input handling exist in many routes, but consistency varies.
- Public curriculum catalog/distribution GET endpoints intentionally expose curriculum source data without authentication; this appears to be a product feature, not account data. The public PDF endpoint is now rate limited.
- Several handlers return provider/internal error messages. This is documented under STAB-001 and intentionally not globally rewritten.
- Parameterized tagged Prisma queries were found in student search and certificate/case lookups. Dynamic certificate table identifiers are allowlisted literals; values use placeholders. No SQL injection was proven in the sampled raw SQL.

## 10. Prisma / Database Findings

- Provider remains MySQL in `prisma/schema.prisma`; no SQLite conversion was made.
- No schema change or migration was created by this audit.
- Existing ownership, school, and uniqueness indexes cover important service-link, saved-curriculum, session, portfolio, evidence, and activity-plan access paths.
- Raw SQL review found safe parameterization in sampled queries. `SHOW COLUMNS` uses literal allowlisted table names.
- **P2:** query cardinality and composite-index effectiveness require production `EXPLAIN`/slow-query evidence before schema changes. No speculative indexes were added.
- **P2:** database pool limits are environment-configured in `lib/prisma.ts`; verify Hostinger's connection ceiling against `PRISMA_CONNECTION_LIMIT` and workload.

## 11. Caching Findings

- Authenticated pages/API routes commonly use dynamic/no-store behavior where private data is involved.
- No `use cache`/shared cache was added to user/school data by this audit.
- The weekly PDF response uses `private, no-store`; public curriculum PDF also uses private/no-store despite being publicly callable.
- **P2:** verify CDN rules do not override private/no-store on authenticated pages, PDFs, or tokenized public pages.

## 12. Service Worker / PWA Findings

- `public/sw.js` ignores non-GET requests, bypasses `/api/`, dashboard HTML, login/register, and Next data requests.
- It uses a versioned static cache and deletes older `teachix-static-*` caches during activate.
- Navigation falls back to `/offline` only after a network failure; authenticated HTML is not stored.
- No service-worker change was needed for the weekly PDF POST/GET issue.
- **P3:** bump the static cache version deliberately when changing cached assets and verify `skipWaiting`/`clients.claim` behavior on production deployments.

## 13. Frontend / Bundle Findings

- The app includes large optional domains such as report studios, timetable tools, Excel/PDF tooling, charts, and native packages. Route-level client/server boundaries should be monitored.
- No broad dynamic-import rewrite was made without bundle measurement.
- `Math.random()` usages were found in UI labels/temporary IDs and certificate/local identifiers; no use was proven as an authorization token. Security-sensitive tokens use `crypto.randomBytes`/UUID paths.
- Lint currently scans backups, Android output, and legacy scripts; this is a quality/performance issue rather than a production runtime defect.

## 14. PDF / Print / Cloudflare Findings

- Existing architecture uses HTML print routes and Cloudflare Browser Rendering only where real PDF bytes are needed. Puppeteer was not introduced or expanded.
- The weekly curriculum share flow uses POST → Cloudflare PDF → Blob/File/Web Share; the full curriculum preview remains separate.
- Cloudflare credentials are read server-side and are not emitted in responses. Portfolio debug logging redacts the forwarded session cookie value, though URLs may still contain source references.
- **P1/P2:** expensive PDF endpoints need concurrency/rate controls; public curriculum PDF received a local limiter, while authenticated export controls remain primarily UI/request based.
- **Manual:** test Cloudflare timeout, quota exhaustion, malformed PDF responses, and reverse-proxy origin on Hostinger.

## 15. Logging / Error Leakage Findings

- `console.error` and structured diagnostics are present across APIs. Secrets were not printed by the audited Cloudflare helper; cookie values are redacted in its portfolio debug payload.
- Some logs include resource IDs or provider errors. This is useful operationally but should be retained only with access-controlled logs and retention policy.
- Some API responses expose `error.message`/details. This is a P2 stability/security hygiene issue and remains for a coordinated API error-contract pass.
- Mojibake Arabic strings remain in parts of the repository. They are primarily copy/UX correctness defects, not secret leakage, and were not mass-edited in this audit.

## 16. Dependency Audit Findings

`npm audit` was run without `fix` or `--force`. Result after the compatible Next patch update: **29 vulnerabilities: 13 high, 15 moderate, 1 low, 0 critical**.

- `next`/transitive `postcss`/`sharp`: high; direct Next was updated from 16.2.6 to 16.2.11, but audit still recommends a later release for remaining dependency paths.
- `@prisma/config`, `prisma`, `@prisma/dev`, `deepmerge-ts`, `hono`, `fast-uri`, `ip-address`, `js-yaml`, `nanoid`, and `brace-expansion`: high paths in tooling/transitive dependency trees.
- `xlsx`: high prototype-pollution/ReDoS findings; npm reports no automatic fix. Audit its actual server/client import and replace or isolate before processing untrusted workbooks.
- `postcss`, `sharp`, `firebase-admin` dependency tree, `exceljs`, Capacitor/Xcode, and related packages: moderate/high paths with potentially major or ecosystem-wide fixes.
- **Not auto-fixed:** no force upgrade, no major ecosystem migration, and no unverified dependency override was used. The Next patch was the only targeted dependency remediation.

## 17. Environment Variable Review

Variable names requiring production verification:

`DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_SECRET`, `AUTH_SINGLE_ACTIVE_SESSION`, `NEXT_PUBLIC_APP_URL`, `APP_URL`, `SITE_URL`, `ACTIVITY_PLAN_SHARE_TOKEN_ENCRYPTION_KEY`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_BROWSER_RUN_API_TOKEN`, `TEACHIX_STORAGE_ROOT`, `PRISMA_CONNECTION_LIMIT`, `PRISMA_POOL_TIMEOUT_MS`, `PRISMA_CONNECT_TIMEOUT_MS`, `REPORT_TWO_PDF_BACKEND`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_PRIVATE_KEY_BASE64`, `DEEPSEEK_API_KEY`, `DEEPSEEK_API_URL`, `DEEPSEEK_BASE_URL`, `DEEPSEEK_MODEL`, `PUSH_SCHEDULER_SECRET`, `TIMEFOLD_SOLVER_URL`, `ANALYTICS_USER_ID_SALT`.

No values are included in this report. `.env.example` was corrected from a SQLite file URL to a MySQL placeholder and now documents the main optional production variable names.

## 18. Files Changed by This Audit

Intentional audit changes:

- `.env.example` — MySQL-safe example and production variable-name documentation.
- `app/api/public/curriculum-distribution/export/pdf/route.ts` — rate limit before expensive public PDF work.
- `lib/activity-plan/activity-plan-share-service.ts` — fail closed on missing/weak production share encryption configuration.
- `lib/security/rate-limit.ts` — expiry pruning and bounded memory behavior.
- `next.config.ts` — safe baseline response security headers.
- `package.json` / `package-lock.json` — Next and eslint-config-next 16.2.6 → 16.2.11.

Pre-existing or generated worktree changes were preserved and are not attributed to this audit, including unrelated curriculum/portfolio work, Prisma edits, exports/backups, and `tsconfig.tsbuildinfo`.

## 19. Prisma Status

- **Schema changed:** NO.
- **Migration created:** NO.
- **Migration path:** None.
- Provider remains MySQL.
- No `prisma db push`, reset, force reset, or database recreation was run.

## 20. Findings Not Fixed

The following were intentionally left unchanged because they need a coordinated product/compatibility decision rather than a safe local patch:

1. Public evidence media authorization (SEC-001): requires ownership-aware/signed media architecture and migration of existing URLs.
2. Explicit CSRF/origin middleware: SameSite + non-GET mutation design exists, but proxy/native-client behavior needs testing first.
3. Distributed rate limiting: local bound/limiter added; edge or shared-store enforcement belongs in deployment infrastructure.
4. Error response normalization: many APIs have existing client contracts and need an endpoint-by-endpoint change.
5. Full dependency remediation: several fixes are major/ecosystem upgrades; no `npm audit fix --force` was used.
6. Broad query/index optimization: requires production traces, row counts, and `EXPLAIN`, not static guesses.
7. CSP: not added because the app has inline print styles, Cloudflare rendering, rich previews, and third-party/payment/native paths that require a tested policy.

## 21. Manual Production Checks Required

- Confirm Hostinger/Cloudflare overwrites forwarded host/proto/IP headers and does not trust client-supplied values.
- Confirm production `AUTH_SECRET` and `ACTIVITY_PLAN_SHARE_TOKEN_ENCRYPTION_KEY` are strong, stable, and not present in repository files.
- Verify MySQL pool limits and Cloudflare Browser Rendering quota/timeouts under concurrent PDF exports.
- Verify unauthenticated access to an evidence URL is either an accepted policy or schedule the signed-media remediation.
- Test login/logout, session revocation, role changes, and `logout-others` with old sessions.
- Test each role/service matrix, including explicit Admin and Principal exceptions.
- Scan CDN/proxy cache headers for authenticated dashboard/API/PDF responses.
- Test service-worker upgrade after a new static cache version and verify offline fallback does not expose private HTML.
- Run a production dependency update rehearsal for Next 16.3.2 and the remaining audit advisories in staging.
- Test public curriculum PDF rate limiting through the real proxy, not only localhost.

## 22. Regression Checklist

- Login/logout: source-reviewed; build pending final command.
- Role dashboards: no route/UI changes except global headers.
- Subscription/service guards: preserved; public PDF limiter runs before expensive work and does not bypass guards where guards exist.
- Workflows/cases/reports/surveys/portfolio/curriculum/My Curriculum/activity services: no business logic rewrites.
- Weekly PDF sharing: POST-only flow unchanged.
- Full curriculum preview/print: unchanged.
- PWA/mobile: service worker unchanged.
- Prisma/service-output persistence: unchanged.
- TypeScript: PASS (`npx tsc --noEmit`).
- Lint: FAILS on pre-existing repository-wide backup/generated/legacy-script issues; no lint errors were introduced in the audited changed TypeScript files according to the targeted TypeScript check, but the global lint script is not clean.

## 23. Final Build Result

The final verification command completed successfully:

`npm run build` — **PASS**

Build details: Prisma Client 7.8.0 generated successfully; Next.js 16.2.11 compiled successfully, TypeScript completed successfully, and all 344 application routes generated successfully.
