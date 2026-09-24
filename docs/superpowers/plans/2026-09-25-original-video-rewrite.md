# Original Video Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a complete six-stage interactive 「原片仿写」 Demo to `#/remake` while preserving the existing four-stage 「元素替换」 flow.

**Architecture:** Keep `ViralRemake.jsx` as the mode chooser and existing element-replacement owner, and add a separate `OriginalRewrite` workflow with its own data, pure state module, tests, styles, storage key, and copied public Demo assets. Reuse existing semantic tokens and interaction conventions, but keep business state isolated so neither mode can invalidate the other.

**Tech Stack:** React, Vite, Node test runner, React Markdown, Lucide React, existing Agent Kit CSS tokens.

**Spec:** `docs/superpowers/specs/2026-09-25-original-video-rewrite-design.md`

## Global Constraints

- Do not change or merge the existing element-replacement project state or storage key.
- Do not execute or expose the supplied `技能 prompt.md` files as UI instructions.
- Do not call real model, FFmpeg, image-generation, video-generation, upload, download, publishing, billing, or task-queue services.
- Do not persist Data URLs, Blob URLs, or media binaries in `localStorage`.
- Use `Source Han Sans SC VF`, existing semantic `--color-*`, `--space-*`, `--radius-*`, `--type-*`, and `--shadow-*` tokens, and `lucide-react` icons.
- Do not edit `dist/` directly and do not introduce new runtime dependencies.
- Every async Demo action must be cancelable on unmount and must restore unfinished `running` states to `idle`.
- Existing 「元素替换」 tests and behavior must continue to pass.

## Review Focus

- A saved project containing corrupt arrays, unsupported models, invalid steps, or `running` jobs must recover field-by-field and reopen safely; Task 2 tests this explicitly.
- Replacing or deleting the source video must invalidate every downstream document and generation result without resetting model or aspect ratio; Task 2 tests both paths.
- A late `FileReader` result must not repopulate a reference slot after a newer selection or clear action; Task 5 implements request tokens and tests their pure helpers.
- Batch actions must ignore missing IDs and already-running segments and must not unlock later stages prematurely; Tasks 2 and 7 test these boundaries.
- Modal focus, Escape closing, narrow-screen layout, missing restored previews, asset 404s, and browser console errors require browser verification; Task 8 covers them.

---

## File Map

- Create `src/original-rewrite-data.js`: six-step labels, Demo paths, reference resources, four segment descriptors, and bundled Markdown strings.
- Create `src/original-rewrite-state.js`: pure project creation, validation, transitions, persistence, selection, and generation helpers.
- Create `src/original-rewrite-state.test.js`: state, asset mapping, source-level accessibility hooks, and resource-integrity tests.
- Create `src/OriginalRewrite.jsx`: the six-stage workflow, editors, modals, media cards, and simulated task lifecycle.
- Create `src/original-rewrite.css`: workflow-only layout and responsive styling using existing tokens.
- Modify `src/ViralRemake.jsx`: make mode selection return a mode ID, enable rewrite, and route to `OriginalRewrite` without altering the existing element workflow.
- Modify `src/viral-remake-data.js`: mark rewrite mode active and update mode availability copy if it remains data-owned.
- Copy user-supplied Demo artifacts into `public/original-rewrite-demo/` with stable ASCII filenames.

### Stable public asset mapping

| Source | Destination |
| --- | --- |
| `step1：上传原视频/原视频.mp4` | `public/original-rewrite-demo/source.mp4` |
| `step2：拆解视频、逐秒抽帧分镜/逐秒拆解.jpg` | `public/original-rewrite-demo/breakdown-storyboard.jpg` |
| `step3：原片仿写/图片1.png` | `public/original-rewrite-demo/product-bottle.png` |
| `step3：原片仿写/图片2.png` | `public/original-rewrite-demo/product-detail.png` |
| `step5：逐秒重绘/片段N重绘.png` | `public/original-rewrite-demo/redraw-N.png` |
| `step6：生成视频/片段N视频.mp4` | `public/original-rewrite-demo/segment-N.mp4` |

## Task 1: Demo Data and Public Assets

**Files:**
- Create: `src/original-rewrite-data.js`
- Create: `src/original-rewrite-state.test.js`
- Create: `public/original-rewrite-demo/source.mp4`
- Create: `public/original-rewrite-demo/breakdown-storyboard.jpg`
- Create: `public/original-rewrite-demo/product-bottle.png`
- Create: `public/original-rewrite-demo/product-detail.png`
- Create: `public/original-rewrite-demo/redraw-1.png` through `redraw-4.png`
- Create: `public/original-rewrite-demo/segment-1.mp4` through `segment-4.mp4`

**Interfaces:**
- Consumes: the six user-supplied step directories listed in the spec.
- Produces: `rewriteSteps`, `rewriteDemo`, `rewriteReferences`, and `rewriteSegments` exports for all later tasks.

- [ ] **Step 1: Write the failing resource-integrity test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { rewriteDemo, rewriteSegments, rewriteSteps } from "./original-rewrite-data.js";

test("原片仿写定义六个阶段和四个完整片段", () => {
  assert.deepEqual(rewriteSteps, [
    "上传原视频", "拆解视频", "原片仿写",
    "提取片段", "逐秒重绘", "生成视频",
  ]);
  assert.equal(rewriteSegments.length, 4);
  for (const segment of rewriteSegments) {
    assert.ok(segment.document.length > 500);
    assert.match(segment.redrawPath, /^\/original-rewrite-demo\/redraw-[1-4]\.png$/);
    assert.match(segment.videoPath, /^\/original-rewrite-demo\/segment-[1-4]\.mp4$/);
  }
});

test("原片仿写公共 Demo 资源全部存在且非空", () => {
  const paths = [
    rewriteDemo.videoPath,
    rewriteDemo.storyboardPath,
    ...rewriteDemo.referenceAssets.map((asset) => asset.path),
    ...rewriteSegments.flatMap((segment) => [segment.redrawPath, segment.videoPath]),
  ];
  for (const path of paths) {
    const file = new URL(`../public${path}`, import.meta.url);
    assert.equal(existsSync(file), true, path);
    assert.ok(readFileSync(file).byteLength > 1000, path);
  }
});
```

- [ ] **Step 2: Run the focused test and confirm the missing module failure**

Run: `node --test src/original-rewrite-state.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `original-rewrite-data.js`.

- [ ] **Step 3: Copy only the approved Demo artifacts**

Use PowerShell `Copy-Item -LiteralPath` with the exact source/destination pairs in the mapping table. Create `public/original-rewrite-demo` first. Do not copy any `技能 prompt.md` file.

- [ ] **Step 4: Create the data module with exact stable exports**

```js
export const rewriteSteps = [
  "上传原视频", "拆解视频", "原片仿写",
  "提取片段", "逐秒重绘", "生成视频",
];

export const rewriteReferences = [
  { id: "product-bottle", role: "图片1", title: "瓶装产品" },
  { id: "product-detail", role: "图片2", title: "单粒特写" },
];

export const rewriteDemo = {
  videoName: "原视频.mp4",
  videoPath: "/original-rewrite-demo/source.mp4",
  storyboardPath: "/original-rewrite-demo/breakdown-storyboard.jpg",
  breakdown: BREAKDOWN_DOCUMENT,
  request: REWRITE_REQUEST,
  rewriteDocument: REWRITE_DOCUMENT,
  referenceAssets: [
    { id: "product-bottle", role: "图片1", name: "图片1.png", path: "/original-rewrite-demo/product-bottle.png" },
    { id: "product-detail", role: "图片2", name: "图片2.png", path: "/original-rewrite-demo/product-detail.png" },
  ],
};

export const rewriteSegments = [1, 2, 3, 4].map((number) => ({
  id: `segment-${number}`,
  number,
  time: ["00:00–00:15", "00:15–00:30", "00:30–00:45", "00:45–00:59"][number - 1],
  title: ["14天变化开场", "状态趋于平衡", "消费痛点与配方", "配方解释与促单"][number - 1],
  document: SEGMENT_DOCUMENTS[number - 1],
  redrawPath: `/original-rewrite-demo/redraw-${number}.png`,
  videoPath: `/original-rewrite-demo/segment-${number}.mp4`,
}));
```

Above these exports, define `BREAKDOWN_DOCUMENT`, `REWRITE_REQUEST`, `REWRITE_DOCUMENT`, and the four entries of `SEGMENT_DOCUMENTS` as JavaScript template-string constants containing the complete UTF-8 text from `拆解视频.md`, `需求.md`, `原片仿写.md`, and `片段1.md` through `片段4.md`. Escape any backticks and `${` sequences so the exported text is byte-for-byte equivalent after JavaScript evaluation. Do not include text from any prompt document.

- [ ] **Step 5: Run the resource test**

Run: `node --test src/original-rewrite-state.test.js`

Expected: PASS for both data/resource tests.

- [ ] **Step 6: Commit the self-contained Demo data slice**

```bash
git add src/original-rewrite-data.js src/original-rewrite-state.test.js public/original-rewrite-demo
git commit -m "feat: add original rewrite demo data"
```

## Task 2: Pure Six-Stage Project State

**Files:**
- Create: `src/original-rewrite-state.js`
- Modify: `src/original-rewrite-state.test.js`

**Interfaces:**
- Consumes: `rewriteDemo`, `rewriteReferences`, and `rewriteSegments` from Task 1.
- Produces: `REWRITE_STORAGE_KEY`, `createRewriteProject(saved)`, `loadRewriteDemo(project)`, `replaceRewriteVideo(project, video)`, `clearRewriteVideo(project)`, `setRewriteStep(project, step)`, `advanceRewriteStep(project)`, `updateRewriteDocument(project, key, value)`, `upsertRewriteReference(project, asset)`, `removeRewriteReference(project, sourceId)`, `toggleRewriteSelection(project, id)`, `toggleAllRewriteSelections(project)`, `queueRewriteJobs(project, kind, ids)`, `setRewriteJobStatus(project, kind, id, status)`, `clearRewriteRunningStatuses(project)`, `persistRewriteProject(storage, project)`.

- [ ] **Step 1: Add failing initialization and recovery tests**

```js
import {
  REWRITE_STORAGE_KEY,
  createRewriteProject,
  clearRewriteRunningStatuses,
} from "./original-rewrite-state.js";

test("损坏草稿按字段恢复并重置运行任务", () => {
  const project = createRewriteProject({
    step: 99,
    maxStep: -2,
    model: "unknown",
    aspectRatio: "bad",
    references: "bad",
    segments: [{ id: "segment-1", redrawStatus: "running", videoStatus: "running" }],
  });
  assert.equal(project.step, 1);
  assert.equal(project.maxStep, 1);
  assert.equal(project.model, "seedance 2.0");
  assert.equal(project.aspectRatio, "9:16");
  assert.deepEqual(project.references, []);
  assert.equal(clearRewriteRunningStatuses(project).segments[0].redrawStatus, "idle");
});
```

- [ ] **Step 2: Add failing transition and invalidation tests**

```js
test("替换原视频清空所有下游结果但保留模型和画幅", () => {
  const loaded = loadRewriteDemo(createRewriteProject());
  const result = replaceRewriteVideo({ ...loaded, model: "seedance 2.5", aspectRatio: "1:1" }, { name: "new.mp4" });
  assert.equal(result.step, 1);
  assert.equal(result.maxStep, 1);
  assert.equal(result.videoName, "new.mp4");
  assert.equal(result.model, "seedance 2.5");
  assert.equal(result.aspectRatio, "1:1");
  assert.equal(result.documents.breakdown, "");
  assert.equal(result.segments.length, 0);
});

test("未完成全部重绘不能进入生成视频", () => {
  const project = { ...loadRewriteDemo(createRewriteProject()), step: 5, maxStep: 5 };
  assert.equal(advanceRewriteStep(project).step, 5);
  const done = {
    ...project,
    segments: project.segments.map((segment) => ({ ...segment, redrawStatus: "done" })),
  };
  assert.equal(advanceRewriteStep(done).step, 6);
});
```

- [ ] **Step 3: Add failing batching and serialization tests**

```js
test("批量任务忽略缺失和运行中的片段", () => {
  const project = loadRewriteDemo(createRewriteProject());
  project.segments[1].redrawStatus = "running";
  const result = queueRewriteJobs(project, "redraw", ["segment-1", "segment-2", "missing"]);
  assert.deepEqual(result.started, ["segment-1"]);
});

test("保存草稿移除本地预览并使用独立键", () => {
  const storage = { key: "", value: "", setItem(key, value) { this.key = key; this.value = value; } };
  const project = { ...createRewriteProject(), references: [{ id: "a", sourceId: "product-bottle", role: "图片1", name: "a.png", preview: "data:image/png;base64,abc" }] };
  persistRewriteProject(storage, project);
  assert.equal(storage.key, REWRITE_STORAGE_KEY);
  assert.doesNotMatch(storage.value, /base64/);
});
```

- [ ] **Step 4: Run tests to confirm missing exports**

Run: `node --test src/original-rewrite-state.test.js`

Expected: FAIL because `original-rewrite-state.js` does not exist.

- [ ] **Step 5: Implement the minimal normalized state and transition table**

```js
export const REWRITE_STORAGE_KEY = "shulan.original-rewrite.project.v1";

const EMPTY_REWRITE_PROJECT = {
  step: 1,
  maxStep: 1,
  videoName: "",
  videoPath: "",
  model: "seedance 2.0",
  aspectRatio: "9:16",
  request: "",
  references: [],
  documents: { breakdown: "", rewrite: "" },
  segments: [],
  savedAt: "",
};

const mayAdvance = (project) => {
  if (project.step === 1) return Boolean(project.videoName.trim());
  if (project.step === 2) return Boolean(project.documents.breakdown);
  if (project.step === 3) return Boolean(project.documents.rewrite);
  if (project.step === 4) return project.segments.length > 0;
  if (project.step === 5) return project.segments.length > 0 && project.segments.every((item) => item.redrawStatus === "done");
  return false;
};

export function advanceRewriteStep(project) {
  if (!mayAdvance(project)) return project;
  const step = Math.min(6, project.step + 1);
  return { ...project, step, maxStep: Math.max(project.maxStep, step) };
}
```

Implement every interface named above as a pure function. Normalize segments against the four known Demo segment IDs; only accept `idle` and `done` from storage, converting `running` to `idle`.

- [ ] **Step 6: Run both focused and full tests**

Run: `node --test src/original-rewrite-state.test.js`

Expected: PASS.

Run: `pnpm test`

Expected: all existing and new tests PASS.

- [ ] **Step 7: Commit pure state**

```bash
git add src/original-rewrite-state.js src/original-rewrite-state.test.js
git commit -m "feat: add original rewrite workflow state"
```

## Task 3: Mode Routing and Six-Step Shell

**Files:**
- Create: `src/OriginalRewrite.jsx`
- Create: `src/original-rewrite.css`
- Modify: `src/ViralRemake.jsx`
- Modify: `src/viral-remake-data.js`
- Modify: `src/original-rewrite-state.test.js`

**Interfaces:**
- Consumes: Task 2 project state helpers and `rewriteSteps`.
- Produces: default `OriginalRewrite({ onBack, notify })` component and mode routing from `ViralRemake`.

- [ ] **Step 1: Add failing source-level routing tests**

```js
const viralSource = readFileSync(new URL("./ViralRemake.jsx", import.meta.url), "utf8");
const rewriteSource = readFileSync(new URL("./OriginalRewrite.jsx", import.meta.url), "utf8");

test("模式选择开放原片仿写并保持结构仿写锁定", () => {
  assert.match(viralSource, /onSelect\(mode\.id\)/);
  assert.match(viralSource, /mode === "rewrite"[\s\S]*?<OriginalRewrite/);
  assert.match(rewriteSource, /rewriteSteps\.map/);
  assert.match(rewriteSource, /aria-label="原片仿写项目进度"/);
});
```

- [ ] **Step 2: Run the test and confirm the missing component failure**

Run: `node --test src/original-rewrite-state.test.js`

Expected: FAIL reading `OriginalRewrite.jsx`.

- [ ] **Step 3: Implement mode selection with an explicit mode ID**

```jsx
function ModeSelection({ onSelect, notify }) {
  // Preserve existing card markup.
  return modes.map((mode) => (
    <button disabled={!mode.active} onClick={() => mode.active && onSelect(mode.id)}>
      {mode.active ? <>开始创建 <ArrowRight /></> : "暂不可用"}
    </button>
  ));
}

export default function ViralRemake() {
  const [mode, setMode] = useState(null);
  if (!mode) return <ModeSelection onSelect={setMode} notify={notify} />;
  if (mode === "rewrite") return <OriginalRewrite onBack={() => setMode(null)} notify={notify} />;
  return <ExistingElementReplacementFlow onBack={() => setMode(null)} />;
}
```

Adapt the bottom of the existing component without moving or rewriting its element-replacement state. Extract only the smallest internal wrapper needed to keep current hooks legal and behavior unchanged.

- [ ] **Step 4: Implement the rewrite shell and storage lifecycle**

```jsx
export default function OriginalRewrite({ onBack, notify }) {
  const [project, setProject] = useState(() =>
    createRewriteProject(localStorage.getItem(REWRITE_STORAGE_KEY)),
  );

  useEffect(() => () => setProject((value) => clearRewriteRunningStatuses(value)), []);

  return (
    <main className="original-rewrite">
      <RewriteHeader project={project} onBack={onBack} onSave={() => {
        persistRewriteProject(localStorage, project);
        notify("原片仿写草稿已保存");
      }} />
      <nav className="rewrite-steps" aria-label="原片仿写项目进度">
        {rewriteSteps.map((label, index) => /* numbered accessible step button */)}
      </nav>
      <RewriteStage project={project} setProject={setProject} notify={notify} />
    </main>
  );
}
```

- [ ] **Step 5: Add shell styles using existing tokens only**

Define `.original-rewrite`, `.rewrite-project-header`, `.rewrite-steps`, `.rewrite-stage`, focus-visible, active, complete, disabled, and reduced-motion rules. Import `./original-rewrite.css` from the component. Do not add raw hex, RGB, or HSL values.

- [ ] **Step 6: Run tests and build**

Run: `pnpm test`

Expected: PASS.

Run: `pnpm build`

Expected: Vite build exits 0.

- [ ] **Step 7: Commit routing and shell**

```bash
git add src/ViralRemake.jsx src/viral-remake-data.js src/OriginalRewrite.jsx src/original-rewrite.css src/original-rewrite-state.test.js
git commit -m "feat: open original rewrite workflow"
```

## Task 4: Upload and Breakdown Stages

**Files:**
- Modify: `src/OriginalRewrite.jsx`
- Modify: `src/original-rewrite.css`
- Modify: `src/original-rewrite-state.test.js`

**Interfaces:**
- Consumes: `loadRewriteDemo`, `replaceRewriteVideo`, `clearRewriteVideo`, `updateRewriteDocument`, and `advanceRewriteStep`.
- Produces: `RewriteUploadStage` and `RewriteBreakdownStage` components and reusable `RewriteModal` for image viewing.

- [ ] **Step 1: Add failing structural and acceptance tests**

```js
test("上传与拆解阶段具备必需控件和可访问标签", () => {
  assert.match(rewriteSource, /accept="video\/mp4,video\/quicktime,\.mp4,\.mov"/);
  assert.match(rewriteSource, /aria-label="上传原视频"/);
  assert.match(rewriteSource, /加载 Demo/);
  assert.match(rewriteSource, /重新拆解/);
  assert.match(rewriteSource, /aria-label="查看逐秒拆解大图"/);
});
```

- [ ] **Step 2: Run the test and confirm failure**

Run: `node --test src/original-rewrite-state.test.js`

Expected: FAIL because stage controls are absent.

- [ ] **Step 3: Implement upload stage**

```jsx
function RewriteUploadStage({ project, setProject, notify, schedule }) {
  const chooseVideo = (event) => {
    const file = event.target.files?.[0];
    if (file) setProject((value) => replaceRewriteVideo(value, { name: file.name, preview: URL.createObjectURL(file) }));
    event.target.value = "";
  };
  return (
    <section className="rewrite-stage">
      <label className="rewrite-video-upload">
        <input aria-label="上传原视频" type="file" accept="video/mp4,video/quicktime,.mp4,.mov" onChange={chooseVideo} />
        <Upload /> <strong>上传原视频</strong>
      </label>
      {/* uploaded video card, model radios/select, aspect-ratio buttons, Demo and primary action */}
    </section>
  );
}
```

Revoke object URLs when replaced, removed, or unmounted. The primary action uses the workflow scheduler to show `running`, writes Demo breakdown data on completion, advances to stage 2, and announces completion.

- [ ] **Step 4: Implement breakdown stage and image modal**

Render the source video, Markdown breakdown through the existing React Markdown conventions, and the storyboard image button. `RewriteModal` must accept `open`, `title`, `onClose`, `triggerRef`, and `children`, trap focus using the existing `getTrappedFocusTarget` helper or equivalent shared pure helper, close on Escape/backdrop/button, lock body scroll, and restore focus.

- [ ] **Step 5: Add responsive two-column layout**

Add `.rewrite-breakdown-grid { grid-template-columns: minmax(0, .85fr) minmax(0, 1.15fr); }`, then collapse to one column under the existing 1050px breakpoint. Use semantic tokens for all spacing, borders, background, radius, and shadows.

- [ ] **Step 6: Run tests and build**

Run: `pnpm test && pnpm build`

Expected: all tests PASS and build exits 0.

- [ ] **Step 7: Commit stages 1–2**

```bash
git add src/OriginalRewrite.jsx src/original-rewrite.css src/original-rewrite-state.test.js
git commit -m "feat: add rewrite upload and breakdown stages"
```

## Task 5: Rewrite Brief, References, and Editable Storyboard

**Files:**
- Modify: `src/OriginalRewrite.jsx`
- Modify: `src/original-rewrite.css`
- Modify: `src/original-rewrite-state.test.js`

**Interfaces:**
- Consumes: reference CRUD, request/document updates, `beginLatestRequest`, `isLatestRequest`, `keepWithinTextLimit`, and mention parsing helpers from existing `viral-remake-state.js` where business-neutral.
- Produces: `RewriteReferenceRow`, `RewriteMentionEditor`, and `RewriteDocumentCard`.

- [ ] **Step 1: Add failing reference and editor tests**

```js
test("原片仿写只提供两个固定图片引用并标记缺失素材", () => {
  assert.match(rewriteSource, /product-bottle/);
  assert.match(rewriteSource, /product-detail/);
  assert.match(rewriteSource, /accept="image\/\*"/);
  assert.match(rewriteSource, /素材已删除/);
  assert.match(rewriteSource, /keepWithinTextLimit/);
});

test("异步参考图只接受最后一次选择", () => {
  const requests = new Map();
  const first = beginLatestRequest(requests, "product-bottle");
  const second = beginLatestRequest(requests, "product-bottle");
  assert.equal(isLatestRequest(requests, "product-bottle", first), false);
  assert.equal(isLatestRequest(requests, "product-bottle", second), true);
});
```

- [ ] **Step 2: Run the test and confirm stage 3 is absent**

Run: `node --test src/original-rewrite-state.test.js`

Expected: FAIL on missing source markers.

- [ ] **Step 3: Implement fixed reference uploads with request tokens**

```jsx
const latestReferenceRequest = useRef(new Map());

async function chooseReference(sourceId, file) {
  const request = beginLatestRequest(latestReferenceRequest.current, sourceId);
  const preview = await readFile(file);
  if (!isLatestRequest(latestReferenceRequest.current, sourceId, request)) return;
  setProject((value) => upsertRewriteReference(value, {
    id: sourceId,
    sourceId,
    role: sourceId === "product-bottle" ? "图片1" : "图片2",
    name: file.name,
    preview,
  }));
}
```

Clearing a slot must increment its request token before removing the asset so an older read cannot restore it.

- [ ] **Step 4: Implement the request editor and mentions**

Reuse the existing mention candidate, keyboard navigation, length limit, and token rendering behavior, restricted to the two fixed image references. Missing references remain visible with a `素材已删除` suffix. Preserve the 500-character limit without truncating a complete mention token.

- [ ] **Step 5: Implement the editable storyboard card**

```jsx
function RewriteDocumentCard({ value, onSave, onRegenerate, running }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  return editing ? (
    <textarea aria-label="编辑原片仿写故事面板" value={draft} onChange={(event) => setDraft(event.target.value)} />
  ) : (
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
  );
}
```

Saving updates `documents.rewrite`. Regeneration shows a short running state and Toast but never replaces `draft` or the saved value.

- [ ] **Step 6: Run tests and build**

Run: `pnpm test && pnpm build`

Expected: PASS and build exits 0.

- [ ] **Step 7: Commit stage 3**

```bash
git add src/OriginalRewrite.jsx src/original-rewrite.css src/original-rewrite-state.test.js
git commit -m "feat: add original rewrite brief and storyboard"
```

## Task 6: Segment Extraction and Editing

**Files:**
- Modify: `src/OriginalRewrite.jsx`
- Modify: `src/original-rewrite.css`
- Modify: `src/original-rewrite-state.test.js`

**Interfaces:**
- Consumes: four normalized segments, selection helpers, document updates, and `RewriteModal`.
- Produces: `RewriteSegmentCard` and editable segment-detail modal.

- [ ] **Step 1: Add failing segment interaction tests**

```js
test("提取片段提供四张可选择且可编辑的卡片", () => {
  assert.match(rewriteSource, /rewriteSegments\.map/);
  assert.match(rewriteSource, /aria-pressed=\{selected\}/);
  assert.match(rewriteSource, /全选/);
  assert.match(rewriteSource, /查看完整故事面板/);
  assert.match(rewriteSource, /编辑片段故事面板/);
});
```

- [ ] **Step 2: Run the test and confirm failure**

Run: `node --test src/original-rewrite-state.test.js`

Expected: FAIL on absent card and modal labels.

- [ ] **Step 3: Implement four segment cards and selection**

```jsx
function RewriteSegmentCard({ segment, selected, onToggle, onOpen }) {
  return (
    <article className={`rewrite-segment-card${selected ? " selected" : ""}`}>
      <button className="rewrite-segment-select" aria-pressed={selected} onClick={onToggle}>
        <span>片段 {String(segment.number).padStart(2, "0")}</span>
        <strong>{segment.title}</strong>
        <small>{segment.time} · {segment.shotCount} 个镜头</small>
      </button>
      <button onClick={onOpen}>查看完整故事面板</button>
    </article>
  );
}
```

The selection target must not contain nested buttons. Put the detail action beside it. Style selection with border plus text/icon, not color alone.

- [ ] **Step 4: Implement segment detail modal and editing**

Use React Markdown in read mode and a labeled textarea in edit mode. Save to the matching segment document by ID. Closing with unsaved text discards only the modal draft. `重新提取` simulates an overall running state without overwriting saved segment text.

- [ ] **Step 5: Run tests and build**

Run: `pnpm test && pnpm build`

Expected: PASS and build exits 0.

- [ ] **Step 6: Commit stage 4**

```bash
git add src/OriginalRewrite.jsx src/original-rewrite.css src/original-rewrite-state.test.js
git commit -m "feat: add rewrite segment extraction"
```

## Task 7: Redraw and Video Generation

**Files:**
- Modify: `src/OriginalRewrite.jsx`
- Modify: `src/original-rewrite.css`
- Modify: `src/original-rewrite-state.test.js`

**Interfaces:**
- Consumes: `queueRewriteJobs`, `setRewriteJobStatus`, selected segment IDs, Demo redraw/video paths, and `RewriteModal`.
- Produces: `RewriteRedrawStage`, `RewriteVideoStage`, reusable job scheduler, and completed-project summary.

- [ ] **Step 1: Add failing generation state tests**

```js
test("重绘和视频生成具有独立状态", () => {
  let project = loadRewriteDemo(createRewriteProject());
  project = setRewriteJobStatus(project, "redraw", "segment-1", "done");
  assert.equal(project.segments[0].redrawStatus, "done");
  assert.equal(project.segments[0].videoStatus, "idle");
  project = setRewriteJobStatus(project, "video", "segment-1", "running");
  assert.equal(project.segments[0].redrawStatus, "done");
  assert.equal(project.segments[0].videoStatus, "running");
});

test("第五步只有全部重绘完成时解锁第六步", () => {
  const project = { ...loadRewriteDemo(createRewriteProject()), step: 5, maxStep: 5 };
  const partial = { ...project, segments: project.segments.map((item, index) => ({ ...item, redrawStatus: index ? "done" : "idle" })) };
  assert.equal(advanceRewriteStep(partial).step, 5);
});
```

- [ ] **Step 2: Run the test and confirm UI markers are absent**

Run: `node --test src/original-rewrite-state.test.js`

Expected: state tests pass from Task 2, while new source checks for the two stages fail.

- [ ] **Step 3: Implement a cleanup-safe job scheduler**

```jsx
const timersRef = useRef(new Set());
const mountedRef = useRef(true);

const scheduleJobs = (kind, ids) => {
  const result = queueRewriteJobs(projectRef.current, kind, ids);
  setProject(result.project);
  result.started.forEach((id) => {
    const timer = window.setTimeout(() => {
      timersRef.current.delete(timer);
      if (mountedRef.current) setProject((value) => setRewriteJobStatus(value, kind, id, "done"));
    }, 700);
    timersRef.current.add(timer);
  });
};

useEffect(() => () => {
  mountedRef.current = false;
  timersRef.current.forEach(window.clearTimeout);
  timersRef.current.clear();
}, []);
```

Keep `projectRef` synchronized with state so rapid batch actions cannot enqueue stale statuses.

- [ ] **Step 4: Implement redraw cards and batch controls**

Each card displays segment number, title, time, status text, image or pending-state panel, single generate/regenerate button, and large-image action. Batch generation uses only currently selected IDs and disables while none are eligible. After all redraw statuses are `done`, enable the continue action.

- [ ] **Step 5: Implement video cards and completion summary**

```jsx
<video
  src={segment.videoPath}
  controls
  preload="metadata"
  aria-label={`片段${segment.number}生成视频`}
/>
```

Each card has visible text for idle/running/done and a generate/regenerate action. Batch generation ignores running IDs. When all four video statuses are `done`, show totals, duration `59秒`, ratio, selected model, and completion text. Do not add download, publish, or share actions.

- [ ] **Step 6: Add stage grid, status, and mobile styles**

Use the existing 1050px, 820px, and 620px breakpoints. Video cards must become one column at narrow widths; media must use `aspect-ratio: 9 / 16`, `object-fit: cover`, and a bounded desktop height.

- [ ] **Step 7: Run tests and build**

Run: `pnpm test && pnpm build`

Expected: all tests PASS and build exits 0.

- [ ] **Step 8: Commit stages 5–6**

```bash
git add src/OriginalRewrite.jsx src/original-rewrite.css src/original-rewrite-state.test.js
git commit -m "feat: add redraw and video generation stages"
```

## Task 8: Accessibility, Regression, and Browser Verification

**Files:**
- Modify: `src/OriginalRewrite.jsx` only if verification exposes a defect.
- Modify: `src/original-rewrite.css` only if verification exposes a defect.
- Modify: `src/original-rewrite-state.test.js` for each fixed regression.

**Interfaces:**
- Consumes: complete workflow from Tasks 1–7.
- Produces: verified six-stage Demo with no known regressions.

- [ ] **Step 1: Run the entire automated suite**

Run: `pnpm test`

Expected: all tests PASS, including the existing `viral-remake-state.test.js` suite.

- [ ] **Step 2: Run production build and inspect asset resolution**

Run: `pnpm build`

Expected: Vite exits 0 with no missing imports. Do not edit generated `dist/` files.

- [ ] **Step 3: Start or reuse the local Vite server and test both modes**

Open `http://127.0.0.1:5173/#/remake`. Verify:

1. 元素替换 still enters its existing four-stage flow.
2. 原片仿写 enters the new six-stage flow.
3. 结构仿写 remains disabled.
4. Loading Demo begins at stage 1 and the primary action advances one stage at a time.
5. Replacing/deleting source video relocks downstream stages.

- [ ] **Step 4: Exercise the complete rewrite happy path**

Use the Demo controls to reach stage 6. Open and close the storyboard image, edit and save the rewrite document, select segments, open and edit one segment, generate all redraws, and generate all videos. Confirm native video controls work and the completion summary appears only after all four videos finish.

- [ ] **Step 5: Verify keyboard and focus behavior**

Tab through each stage, operate step buttons and segment selection with the keyboard, open each modal, close by Escape, close by the text button, and verify focus returns to the opener. Confirm every icon-only control has a readable accessible name and disabled/running states include text.

- [ ] **Step 6: Verify responsive layouts**

Check desktop, 1050px, 820px, and 620px viewports. Confirm dual columns collapse, the six-step rail scrolls horizontally, media remains visible, action buttons do not overlap, and modal content stays within the viewport.

- [ ] **Step 7: Verify font, network, and console**

Confirm computed body font is `Source Han Sans SC VF`; only local base/common font requests occur for ordinary Chinese text; no external font request appears. Confirm every `/original-rewrite-demo/` request returns successfully and browser console contains no new errors.

- [ ] **Step 8: Add a regression test before fixing any discovered defect**

For each failure, add the narrowest pure or source-level assertion to `src/original-rewrite-state.test.js`, run it to see it fail, apply the smallest fix, then rerun `pnpm test && pnpm build`.

- [ ] **Step 9: Run Ponytail scope review**

Check for duplicated state helpers, unused exports/components, speculative configuration, dead five-step leftovers touched by this work, and new architecture branches inside the existing element state. Remove only new or directly superseded dead code, then rerun all tests.

- [ ] **Step 10: Commit verification fixes**

```bash
git add src/OriginalRewrite.jsx src/original-rewrite.css src/original-rewrite-state.test.js
git commit -m "test: verify original rewrite workflow"
```

If verification required no source change, skip this commit rather than creating an empty commit.

## Final Completion Gate

- [ ] `pnpm test` passes.
- [ ] `pnpm build` passes.
- [ ] Existing element replacement completes its original flow.
- [ ] Original rewrite completes all six stages with Demo data.
- [ ] All public Demo assets return without 404.
- [ ] Desktop and narrow-screen checks pass.
- [ ] Keyboard, modal focus, Escape, and focus restoration checks pass.
- [ ] Browser console has no new runtime errors.
- [ ] `git status --short` contains no unintended generated or user-owned changes.
