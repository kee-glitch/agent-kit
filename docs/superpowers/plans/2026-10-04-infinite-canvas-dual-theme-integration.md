# ShuLan Infinite Canvas Dual-Theme Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the empty ShuLan canvas page with the complete infinite-canvas feature set and expose its shared data through temporary Original and ShuLan visual entries.

**Architecture:** Move the existing canvas domain, stores, services, and feature components into one isolated `src/canvas/` module. The ShuLan shell owns route selection, while a root `data-canvas-theme` attribute selects either the preserved Original theme or a scoped ShuLan token override; both modes mount the same stores and persistence schema.

**Tech Stack:** React 19, Vite, TypeScript for the migrated module, `@xyflow/react`, Zustand, Vitest, Testing Library, existing Agent Kit CSS tokens and Lucide icons.

**Spec:** `docs/superpowers/specs/2026-10-04-infinite-canvas-dual-theme-integration.md`

## Global Constraints

- Preserve the existing ShuLan directory navigation and application shell.
- Keep one copy of all canvas behavior and state; themes may change presentation only.
- `#/canvas`, `#/canvas/original`, and `#/canvas/shulan` are the only new route shapes.
- Both themes share the same canvas snapshot, viewport, local media, and node identifiers.
- The ShuLan theme must use existing `--color-*`, `--space-*`, `--radius-*`, `--type-*`, and `--shadow-*` tokens and `Source Han Sans SC VF`.
- Keep Original-only visual variables scoped below `[data-canvas-theme="original"]`; do not change global Agent Kit styles.
- Do not invent cloud sharing or enable controls that are disabled in the source project.
- Do not edit `dist/`; production output is generated only by the build.
- Preserve unrelated uncommitted changes already present in the Agent Kit worktree.

## Review Focus

- A malformed or unknown canvas hash must fall back to the existing default route without crashing; Task 1 pins this behavior.
- Switching theme while the canvas contains nodes must preserve node IDs, edges, and viewport; Task 4 pins this behavior.
- Unavailable localStorage must still produce a usable in-memory canvas; Task 2 preserves and runs the source regression test.
- A stale local-media reference must render its existing missing-media state without breaking sibling nodes; Task 3 preserves and runs the source component test.
- Narrow widths must keep navigation, creation controls, and editor actions reachable without overlapping the ShuLan rail; Task 5 adds browser assertions and visual verification.

---

### Task 1: Dependencies, Test Harness, and Canvas Route Model

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `tsconfig.canvas.json`
- Create: `src/canvas/integration/canvasRoute.ts`
- Create: `src/canvas/integration/canvasRoute.test.ts`
- Modify: `src/index.jsx`

**Interfaces:**
- Consumes: the current `pageFromHash()` route behavior in `src/index.jsx`.
- Produces: `type CanvasTheme = 'original' | 'shulan'`, `parseAppRoute(hash: string): { pageId: string; canvasTheme: CanvasTheme | null }`, and `canvasThemeHash(theme: CanvasTheme): string`.

- [ ] **Step 1: Add the failing canvas-route tests**

  Test `parseAppRoute()` for `#/canvas`, `#/canvas/original`, `#/canvas/shulan`, a malformed canvas child, and the existing `#/remake` route. Assert that only the two explicit theme hashes produce a non-null `canvasTheme`.

- [ ] **Step 2: Run the focused test and verify RED**

  Run: `pnpm vitest run src/canvas/integration/canvasRoute.test.ts`

  Expected: FAIL because the module does not exist.

- [ ] **Step 3: Add the smallest TypeScript/Vitest setup and route implementation**

  Add `@xyflow/react` and `zustand` as runtime dependencies; add `typescript`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, and React type packages as development dependencies. Keep the existing Node tests and add `test:canvas` plus a combined `test` script. Limit `tsconfig.canvas.json` to `src/canvas/**/*`.

- [ ] **Step 4: Make `src/index.jsx` consume `parseAppRoute()` without changing rendered pages yet**

  The existing hash listener must retain current behavior for Agent, video, assets, remake, skills, and history.

- [ ] **Step 5: Run route and legacy tests and verify GREEN**

  Run: `pnpm vitest run src/canvas/integration/canvasRoute.test.ts`

  Run: `node --test src/*.test.js`

  Expected: both commands PASS.

- [ ] **Step 6: Commit**

  Commit message: `build: prepare canvas integration`

### Task 2: Migrate Canvas Domain, Stores, Services, and Persistence

**Files:**
- Create: `src/canvas/domain/canvas/*`
- Create: `src/canvas/stores/*`
- Create: `src/canvas/services/contracts/canvasServices.ts`
- Create: `src/canvas/services/mock/*`
- Create: `src/canvas/features/tasks/*`
- Create: `src/canvas/features/persistence/*`
- Test: matching migrated `*.test.ts` files under the same directories

**Interfaces:**
- Consumes: `@xyflow/react` geometry types, Zustand, browser `Storage`, and the source project's existing snapshot schema.
- Produces: the existing canvas command functions, connection rules, auto-layout, mention helpers, task runners, `useCanvasSessionStore`, `useCanvasInteractionStore`, `useLocalMediaStore`, and `hydrateCanvasSession(storage, now)` with unchanged behavior.

- [ ] **Step 1: Copy the source domain/store/service tests before implementations**

  Preserve test names and assertions from `D:\树懒AI\无限画布\src\domain`, `stores`, `services`, and task/persistence feature tests; update only import roots required by the new `src/canvas/` location.

- [ ] **Step 2: Run the migrated tests and verify RED**

  Run: `pnpm vitest run src/canvas/domain src/canvas/stores src/canvas/services src/canvas/features/tasks src/canvas/features/persistence`

  Expected: FAIL on missing production modules.

- [ ] **Step 3: Move the matching production modules with their public exports unchanged**

  Preserve the source snapshot versioning and graceful `Storage | null` path. Change imports only where relocation requires it; do not add adapters or new store layers.

- [ ] **Step 4: Run the migrated core tests and verify GREEN**

  Run the same focused Vitest command.

  Expected: PASS with zero failed tests.

- [ ] **Step 5: Commit**

  Commit message: `feat: migrate canvas core`

### Task 3: Migrate Canvas UI and Preserve the Original Theme

**Files:**
- Create: `src/canvas/app/CanvasApp.tsx`
- Create: `src/canvas/features/canvas/*`
- Create: `src/canvas/features/content/*`
- Create: `src/canvas/features/nodes/*`
- Create: `src/canvas/features/media/*`
- Create: `src/canvas/features/generation/*`
- Create: `src/canvas/features/processing/*`
- Create: `src/canvas/features/media-editor/*`
- Create: `src/canvas/features/assets/*`
- Create: `src/canvas/features/workspace/*`
- Create: `src/canvas/styles/original-tokens.css`
- Create: `src/canvas/styles/canvas-base.css`
- Test: matching migrated `*.test.tsx` files

**Interfaces:**
- Consumes: Task 2 stores and services.
- Produces: `CanvasApp({ theme }: { theme: CanvasTheme }): JSX.Element`, a single React Flow provider, and scoped canvas CSS rooted at `.canvas-module[data-canvas-theme]`.

- [ ] **Step 1: Copy all source component tests before UI implementations**

  Update imports for the `src/canvas/` root. Add one assertion that a stale media reference shows the source missing-media fallback while another valid node remains rendered.

- [ ] **Step 2: Run component tests and verify RED**

  Run: `pnpm vitest run src/canvas/features src/canvas/app`

  Expected: FAIL on missing migrated components.

- [ ] **Step 3: Move components and styles with behavior unchanged**

  Rename the source `App` export to `CanvasApp`, accept `theme`, place `data-canvas-theme={theme}` on its root, and keep one provider/store graph. Replace source-local icon implementations only where Agent Kit already supplies the identical Lucide icon.

- [ ] **Step 4: Scope Original visual tokens and structural canvas CSS**

  Move source `tokens.css`, `global.css`, `app.css`, `nodes.css`, processing CSS, and media-editor CSS into the two canvas style files or feature-local CSS while ensuring no selector styles `html`, `body`, `button`, or `input` outside `.canvas-module`.

- [ ] **Step 5: Run all migrated canvas tests and verify GREEN**

  Run: `pnpm vitest run src/canvas`

  Expected: PASS with zero failed tests.

- [ ] **Step 6: Commit**

  Commit message: `feat: migrate infinite canvas UI`

### Task 4: Add the Shared Dual-Entry Experience

**Files:**
- Create: `src/canvas/integration/CanvasLanding.tsx`
- Create: `src/canvas/integration/CanvasWorkspaceRoute.tsx`
- Create: `src/canvas/integration/canvasIntegration.css`
- Create: `src/canvas/integration/CanvasWorkspaceRoute.test.tsx`
- Modify: `src/index.jsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: `CanvasApp`, `CanvasTheme`, `canvasThemeHash()`, and Agent Kit navigation.
- Produces: `CanvasLanding()` and `CanvasWorkspaceRoute({ theme, onThemeChange })`; theme switching changes the hash and root theme attribute without clearing canvas stores.

- [ ] **Step 1: Add failing landing and theme-switch tests**

  Assert that `#/canvas` offers exactly two labeled entries, each link resolves to its explicit hash, and switching from Original to ShuLan preserves seeded node IDs, edge IDs, and viewport values.

- [ ] **Step 2: Run the focused tests and verify RED**

  Run: `pnpm vitest run src/canvas/integration`

  Expected: FAIL because the landing and workspace route components do not exist.

- [ ] **Step 3: Implement the landing and workspace route**

  Use the existing Agent Kit page header, button, focus, and empty-state patterns. Keep the theme control inside the canvas workspace header and label both choices visibly.

- [ ] **Step 4: Replace the canvas placeholder branch in `App`**

  Render `CanvasLanding` for a null canvas theme and `CanvasWorkspaceRoute` for an explicit theme. Add a `canvas-layout` class only when a canvas workspace is active so other pages keep their existing layout.

- [ ] **Step 5: Run integration and full automated tests and verify GREEN**

  Run: `pnpm test`

  Expected: legacy Node tests and all canvas Vitest tests PASS.

- [ ] **Step 6: Commit**

  Commit message: `feat: add dual canvas entries`

### Task 5: Implement the ShuLan Theme and Responsive Shell Fit

**Files:**
- Create: `src/canvas/styles/shulan-theme.css`
- Modify: `src/canvas/integration/canvasIntegration.css`
- Modify: `src/canvas/features/workspace/WorkspaceShell.tsx`
- Modify: `src/canvas/features/workspace/WorkspaceShell.test.tsx`
- Modify: `src/canvas/features/canvas/ViewControls.test.tsx`

**Interfaces:**
- Consumes: the existing Agent Kit design tokens and the shared canvas DOM from Task 3.
- Produces: `[data-canvas-theme="shulan"]` overrides only; no second component tree or store.

- [ ] **Step 1: Add failing theme-contract and narrow-layout tests**

  Assert that ShuLan mode exposes the theme attribute, uses the shared component tree, renders the theme switch and creation controls at narrow width, and retains accessible labels for all icon-only controls.

- [ ] **Step 2: Run the focused tests and verify RED**

  Run: `pnpm vitest run src/canvas/features/workspace/WorkspaceShell.test.tsx src/canvas/features/canvas/ViewControls.test.tsx`

  Expected: FAIL on missing ShuLan contract or responsive behavior.

- [ ] **Step 3: Add the minimal ShuLan token overrides**

  Map canvas surfaces, text, borders, controls, focus rings, radii, spacing, shadows, and typography to existing Agent Kit variables. Keep Original styles untouched and do not add literal color values in business components.

- [ ] **Step 4: Fit the workspace to the ShuLan rail and narrow screens**

  Ensure the canvas fills the remaining content area, toolbars wrap or collapse without overlap, and editors remain reachable at the project's existing breakpoints. Respect `prefers-reduced-motion` for any retained transitions.

- [ ] **Step 5: Run focused and full tests and verify GREEN**

  Run: `pnpm test`

  Expected: all tests PASS.

- [ ] **Step 6: Commit**

  Commit message: `feat: add shulan canvas theme`

### Task 6: Production and Browser Verification

**Files:**
- Modify only files required by defects found during verification.
- Create: browser screenshots under the existing ignored `output/` directory if useful for comparison.

**Interfaces:**
- Consumes: the completed dual-theme integration.
- Produces: verified production build and visible end-to-end evidence; no new product API.

- [ ] **Step 1: Run the complete automated suite**

  Run: `pnpm test`

  Expected: zero failed Node or Vitest tests.

- [ ] **Step 2: Run TypeScript validation for the migrated module**

  Run: `pnpm exec tsc -p tsconfig.canvas.json --noEmit`

  Expected: exit code 0 with no diagnostics.

- [ ] **Step 3: Run the production build**

  Run: `pnpm build`

  Expected: exit code 0 with no unresolved imports or asset errors.

- [ ] **Step 4: Verify both entries in the browser**

  At desktop and a common narrow viewport, verify `#/canvas`, `#/canvas/original`, and `#/canvas/shulan`; create text and media nodes, connect nodes, move and zoom the canvas, undo/redo, auto-layout, open an editor, switch theme, reload, and confirm the same content returns.

- [ ] **Step 5: Verify Agent Kit visual requirements**

  In ShuLan mode confirm the computed UI font is `Source Han Sans SC VF`, only local base/common font files load for common Chinese text, there are no external font requests, and no static resource returns 404. Confirm other main routes still render correctly.

- [ ] **Step 6: Run a scope review and commit fixes**

  Inspect the diff for duplicated component trees, unused exports, unscoped global CSS, unrelated edits, or new abstractions with one caller. Commit only verification fixes with message `fix: verify canvas integration`.

