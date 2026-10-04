import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import * as remakeState from "./viral-remake-state.js";
import {
  BOUND_ASSET_ACCEPT,
  GENERAL_ASSET_ACCEPT,
  OUTPUT_QUALITIES,
  addReplacementAsset,
  beginLatestRequest,
  advanceStep,
  canAdvance,
  clearVideo,
  createInitialProject,
  persistProject,
  parseAssetReferenceHref,
  serializeProject,
  splitAssetMentions,
  queueGeneration,
  removeReplacementAsset,
  replaceVideo,
  getMediaType,
  getSelectedSegmentIds,
  toggleAllSegmentSelections,
  nextAssetLabel,
  normalizeReferenceAssets,
  findMentionCandidates,
  findBoundReplacementAsset,
  getMentionMenuPosition,
  getTrappedFocusTarget,
  isMentionClickOutside,
  isBackdropSelfClick,
  isLatestRequest,
  moveMentionSelection,
  addSequencedAssets,
  keepWithinTextLimit,
  clearRunningStatuses,
  setCurrentStep,
  setGenerationStatus,
  updateReplacementAsset,
  replaceSequencedAsset,
  upsertBoundReplacementAsset,
  setBoundReplacementAsset,
  updateDocument,
  getStorageKey,
  formatGenerationTimestamp,
} from "./viral-remake-state.js";
import {
  breakdownText,
  demoAssets,
  originalReplacementResources,
  originalBoards,
  replacedBoards,
  segmentDocuments,
  steps,
  storyboardText,
  modes,
  structureDemo,
} from "./viral-remake-data.js";

const viralRemakeSource = readFileSync(
  new URL("./ViralRemake.jsx", import.meta.url),
  "utf8",
);
const viralRemakeStyles = readFileSync(
  new URL("./viral-remake.css", import.meta.url),
  "utf8",
);
const assetMentionsSource = readFileSync(
  new URL("./AssetMentions.jsx", import.meta.url),
  "utf8",
);
const videoPreviewModalSource = readFileSync(
  new URL("./VideoPreviewModal.jsx", import.meta.url),
  "utf8",
);

test("旧版结构仿写不再显示为独立入口", () => {
  const structureMode = modes.find((mode) => mode.id === "structure");

  assert.equal(structureMode, undefined);
  assert.equal(getStorageKey("element"), "shulan.viral-remake.project.v1");
  assert.equal(
    getStorageKey("structure"),
    "shulan.viral-remake.structure.project.v1",
  );
  assert.equal(structureDemo.aspectRatio, "1:1");
  assert.equal(structureDemo.referenceImage.endsWith("/structure-storyboard.jpg"), true);
});

test("四列工作台替换旧版入口并沿用结构仿写名称", () => {
  const columnMode = modes.find((mode) => mode.id === "structure-columns");

  assert.deepEqual(
    {
      title: columnMode?.title,
      active: columnMode?.active,
    },
    { title: "结构仿写", active: true },
  );
  assert.equal(modes.length, 3);
  assert.equal(
    getStorageKey("structure-columns"),
    "shulan.viral-remake.structure-columns.project.v1",
  );
  assert.notEqual(getStorageKey("structure-columns"), getStorageKey("structure"));
  assert.match(viralRemakeSource, /const workflowName = isElementColumns \? "元素替换" : isRewriteColumns \? "原片仿写" : "结构仿写"/);
  assert.match(viralRemakeSource, /爆款复刻 \/ \{workflowName\}/);
  assert.doesNotMatch(viralRemakeSource, /结构仿写（四列）/);
  assert.match(viralRemakeSource, /title="结构仿写任务记录"/);
});

test("四屏元素替换接替旧入口并继承原入口文案", () => {
  const elementModes = modes.filter((mode) => mode.title === "元素替换");
  const columnsMode = modes.find((mode) => mode.id === "element-columns");

  assert.deepEqual(elementModes.map((mode) => mode.id), ["element-columns"]);
  assert.equal(columnsMode?.subtitle, "最贴近原片动作镜头");
  assert.equal(
    columnsMode?.description,
    "保留原视频的镜头、运镜、动作、时长和口播节奏，只替换人物、产品或场景。",
  );
  assert.equal(columnsMode?.active, true);
  assert.equal(
    getStorageKey("element-columns"),
    "shulan.viral-remake.element-columns.project.v1",
  );
  assert.notEqual(getStorageKey("element-columns"), getStorageKey("element"));
  assert.match(viralRemakeSource, /mode === "element-columns"/);
  assert.match(viralRemakeSource, /元素替换四屏工作区/);
});

test("元素替换四屏分别展示三张原视频和三张替换结果分镜", () => {
  assert.equal(originalBoards.length, 3);
  assert.equal(replacedBoards.length, 3);
  assert.match(viralRemakeSource, /<BoardGallery originals onOpen=\{onOpen\} \/>/);
  assert.match(viralRemakeSource, /<BoardGallery onOpen=\{onOpen\} \/>/);
  assert.match(viralRemakeSource, /原视频逐秒分镜/);
  assert.match(viralRemakeSource, /替换后逐秒分镜/);
  assert.match(viralRemakeStyles, /\.remake-column-gallery[\s\S]*?\.remake-board-grid/);
});

test("元素替换逐秒分镜按生成批次追加到生成结果快照", () => {
  assert.match(
    viralRemakeSource,
    /const redrawResults = isRewriteColumns \|\| isElementColumns \? project\.redrawRecords : \[\]/,
  );
  assert.match(viralRemakeSource, /isElementColumns \? columnsDemo\.segments\.map\(\(segment, index\) => \(\{/);
  assert.match(viralRemakeSource, /redrawPath: replacedBoards\[index\]/);
  assert.match(viralRemakeSource, /redrawRecords: \[\.\.\.newRedrawRecords, \.\.\.next\.redrawRecords\]/);
  assert.match(viralRemakeSource, /kind: "image"/);
  assert.match(viralRemakeSource, />查看分镜快照<\/button>/);
});

test("元素替换四屏故事面板卡片只预览风格统一约束", () => {
  assert.match(
    viralRemakeSource,
    /styleGuide: storyboardText\.split\("### 2\. 分镜卡片"\)\[0\]\.trim\(\)/,
  );
  assert.match(viralRemakeSource, /value=\{columnsDemo\.styleGuide\}/);
  assert.match(viralRemakeSource, /value=\{project\.documents\.storyboard \|\| columnsDemo\.storyboard\}/);
});

test("四屏故事面板整张卡片可点击或键盘预览", () => {
  assert.match(
    viralRemakeSource,
    /<button\s+type="button"\s+className=\{isElementColumns \? "remake-column-card remake-column-result"/,
  );
  assert.match(viralRemakeSource, /onClick=\{\(\) => setStoryboardOpen\(true\)\}/);
});

test("四屏故事面板与第一屏拆解结果复用统一卡片样式", () => {
  const sharedResultCards = viralRemakeSource.match(/remake-column-card remake-column-result/g) ?? [];

  assert.equal(sharedResultCards.length, 2);
  assert.doesNotMatch(viralRemakeStyles, /\.remake-column-storyboard:hover/);
  assert.doesNotMatch(viralRemakeStyles, /\.remake-column-storyboard:focus-visible/);
});

test("四屏工作台接替旧版原片仿写且首页入口不显示编号", () => {
  const legacyRewrite = modes.find((mode) => mode.id === "rewrite");
  const columnsRewrite = modes.find((mode) => mode.id === "rewrite-columns");

  assert.deepEqual(
    {
      title: columnsRewrite?.title,
      subtitle: columnsRewrite?.subtitle,
      description: columnsRewrite?.description,
      active: columnsRewrite?.active,
    },
    {
      title: "原片仿写",
      subtitle: "中等自由度",
      description: "学习原片镜头、动作与叙事节奏，对整体画面进行重新绘制。",
      active: true,
    },
  );
  assert.equal(legacyRewrite, undefined);
  assert.equal(modes.length, 3);
  assert.equal(modes.some((mode) => "index" in mode), false);
  assert.doesNotMatch(viralRemakeSource, /\{mode\.index\}/);
  assert.doesNotMatch(viralRemakeSource, /<OriginalRewrite/);
  assert.match(viralRemakeStyles, /\.remake-mode-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
  assert.equal(
    getStorageKey("rewrite-columns"),
    "shulan.viral-remake.rewrite-columns.project.v1",
  );
  assert.notEqual(getStorageKey("rewrite-columns"), getStorageKey("rewrite"));
  assert.match(viralRemakeSource, /mode === "structure-columns" \|\| mode === "rewrite-columns"/);
  assert.match(viralRemakeSource, /mode=\{mode\}/);
  assert.match(viralRemakeSource, /原片仿写四屏工作区/);
  assert.match(viralRemakeSource, /maxLength=\{isRewriteColumns \? 1000 : 500\}/);
  assert.match(viralRemakeSource, /rewriteDemo\.rewriteDocument\.split\("### 2\. 分镜卡片"\)\[0\]\.trim\(\)/);
  assert.match(viralRemakeSource, /remake-column-storyboard\$\{isRewriteColumns \? " compact" : ""\}/);
  assert.match(viralRemakeStyles, /\.remake-column-storyboard\.compact\s*\{[^}]*max-height:\s*400px/);
  assert.match(viralRemakeStyles, /\.remake-column-storyboard\.compact > \.remake-column-preview\s*\{[^}]*max-height:\s*260px/);
});

test("原片仿写四屏在视频生成前展示逐秒重绘结果", () => {
  assert.match(viralRemakeSource, /const generateRedraws = \(ids\) =>/);
  assert.match(viralRemakeSource, /一键生成逐秒分镜图/);
  assert.doesNotMatch(viralRemakeSource, /批量生成逐秒分镜/);
  assert.match(viralRemakeSource, /segment\.redrawStatus === "done" \? <img src=\{segment\.redrawPath\}/);
  assert.match(viralRemakeSource, /生成逐秒分镜/);
  assert.match(viralRemakeSource, /selectedRedrawsReady/);
  assert.match(viralRemakeSource, /disabled=\{selectedExtractedSegments\.size === 0 \|\| !selectedRedrawsReady\}/);
});

test("一键生成逐秒分镜只提交尚未生成且未在生成中的片段", () => {
  const segments = [
    { id: "idle" },
    { id: "running", redrawStatus: "running" },
    { id: "done", redrawStatus: "done" },
  ];

  assert.deepEqual(remakeState.getPendingRedrawSegmentIds(segments), ["idle"]);
});

test("一键生成逐秒分镜位于片段标题栏全选按钮左侧", () => {
  const headerStart = viralRemakeSource.indexOf('className="remake-column-extracted-header"');
  const headerEnd = viralRemakeSource.indexOf("</div>", headerStart);
  const headerSource = viralRemakeSource.slice(headerStart, headerEnd);

  assert.ok(headerStart >= 0);
  assert.ok(headerSource.indexOf("一键生成逐秒分镜图") >= 0);
  assert.ok(headerSource.indexOf("一键生成逐秒分镜图") < headerSource.indexOf("全选"));
});

test("未生成分镜的片段不能选中生成视频", () => {
  const segments = [
    { id: "idle" },
    { id: "ready", redrawStatus: "done" },
  ];
  const current = new Set(["ready"]);

  const blocked = remakeState.toggleRedrawReadySelection(current, segments, "idle");
  assert.equal(blocked.blocked, true);
  assert.deepEqual([...blocked.selectedIds], ["ready"]);

  const deselected = remakeState.toggleRedrawReadySelection(current, segments, "ready");
  assert.equal(deselected.blocked, false);
  assert.deepEqual([...deselected.selectedIds], []);
  assert.deepEqual(remakeState.getRedrawReadySegmentIds(segments), ["ready"]);
});

test("选择未生成分镜的片段时展示统一遮罩提示", () => {
  assert.match(viralRemakeSource, /setRedrawRequiredOpen\(true\)/);
  assert.match(viralRemakeSource, /aria-label="请先生成分镜参考图"/);
  assert.match(viralRemakeSource, />请先生成分镜参考图<\/h2>/);
});

test("原片仿写四屏在生成结果列同步展示已完成的逐秒分镜快照", () => {
  assert.match(viralRemakeSource, /const redrawResults = isRewriteColumns \|\| isElementColumns \? project\.redrawRecords : \[\]/);
  assert.match(viralRemakeSource, /setRedrawRecords\(\(current\) => \[\.\.\.newRecords, \.\.\.current\]\)/);
  assert.match(viralRemakeSource, /const unifiedResults = \[/);
  assert.match(viralRemakeSource, /kind: "image"/);
  assert.match(viralRemakeSource, /kind: "video"/);
  assert.match(viralRemakeSource, /className="remake-column-image-preview"/);
  assert.match(viralRemakeSource, /onOpen\(segment\.redrawPath, `片段\$\{segment\.number\}逐秒分镜快照`\)/);
  assert.match(viralRemakeSource, />查看分镜快照<\/button>/);
  assert.match(viralRemakeSource, /unifiedResults\.length === 0/);
});

test("逐秒分镜快照记录按生成次数追加并随草稿恢复", () => {
  const first = {
    id: "redraw-1-segment-1",
    segmentId: "segment-1",
    generatedAt: "2026-10-04T08:00:00.000Z",
    snapshot: { id: "segment-1", number: 1, redrawPath: "/redraw-1.jpg" },
  };
  const second = {
    ...first,
    id: "redraw-2-segment-1",
    generatedAt: "2026-10-04T08:01:00.000Z",
  };

  const restored = createInitialProject(JSON.parse(serializeProject({
    ...createInitialProject(),
    redrawRecords: [first, second],
  })));

  assert.deepEqual(restored.redrawRecords.map((record) => record.id), [second.id, first.id]);
  assert.equal(restored.redrawRecords[0].segmentId, restored.redrawRecords[1].segmentId);
});

test("逐秒分镜片段卡片使用缩略图信息和双按钮单行布局", () => {
  assert.match(viralRemakeStyles, /\.remake-four-columns\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(220px,\s*1fr\)\)/);
  assert.match(viralRemakeSource, /`redraw-layout\$\{selectedExtractedSegments/);
  assert.match(viralRemakeStyles, /\.remake-column-extracted-segments > article\.redraw-layout\s*\{[^}]*grid-template-columns:\s*48px\s+minmax\(0,\s*1fr\)\s+auto\s+auto/);
  assert.match(viralRemakeStyles, /\.remake-column-redraw\s*\{[^}]*display:\s*contents/);
  assert.match(viralRemakeStyles, /\.remake-column-redraw-generate\s*\{[^}]*grid-column:\s*3[^}]*grid-row:\s*1\s*\/\s*3/);
});

test("已生成逐秒分镜的缩略图可独立打开大图", () => {
  assert.match(viralRemakeSource, /className="remake-column-redraw-preview"/);
  assert.match(viralRemakeSource, /disabled=\{segment\.redrawStatus !== "done"\}/);
  assert.match(viralRemakeSource, /event\.stopPropagation\(\);[\s\S]*?onOpen\(segment\.redrawPath, `片段\$\{segment\.number\}逐秒分镜快照`\)/);
});

test("四列工作流只在完成当前步骤后开放下一列且重复完成不会越级", () => {
  assert.equal(typeof remakeState.completeWorkflowStep, "function");
  const initial = createInitialProject({ videoName: "demo.mp4" });
  const afterBreakdown = remakeState.completeWorkflowStep(initial, 1);

  assert.deepEqual(
    { step: afterBreakdown.step, maxStep: afterBreakdown.maxStep },
    { step: 2, maxStep: 2 },
  );
  assert.deepEqual(
    remakeState.completeWorkflowStep(afterBreakdown, 1),
    afterBreakdown,
  );
  assert.deepEqual(
    remakeState.completeWorkflowStep(afterBreakdown, 2),
    { ...afterBreakdown, step: 3, maxStep: 3 },
  );
});

test("四列视频拆解经历未开始、运行中和完成状态且不会自动开放下一列", () => {
  assert.equal(typeof remakeState.getColumnsBreakdownStatus, "function");
  assert.equal(typeof remakeState.startColumnsBreakdown, "function");
  assert.equal(typeof remakeState.finishColumnsBreakdown, "function");
  const empty = createInitialProject();
  assert.equal(remakeState.getColumnsBreakdownStatus(empty), "idle");
  assert.deepEqual(remakeState.startColumnsBreakdown(empty), empty);

  const uploaded = createInitialProject({ videoName: "demo.mp4" });
  const running = remakeState.startColumnsBreakdown(uploaded);
  assert.equal(remakeState.getColumnsBreakdownStatus(running), "running");
  assert.equal(running.maxStep, 1);

  const done = remakeState.finishColumnsBreakdown(running);
  assert.equal(remakeState.getColumnsBreakdownStatus(done), "done");
  assert.equal(done.maxStep, 1);
  assert.equal(remakeState.completeWorkflowStep(done, 1).maxStep, 2);
});

test("四列锁定提示紧接步骤标题顶部对齐", () => {
  const lockRule = viralRemakeStyles.match(/\.remake-column-lock\s*\{([\s\S]*?)\}/)?.[1] ?? "";

  assert.match(lockRule, /top:\s*calc\(var\(--space-8\) \+ 108px\)/);
  assert.doesNotMatch(lockRule, /translateY\(-50%\)/);
});

test("四屏锁定列使用布尔 inert 属性而不触发 React 警告", () => {
  assert.match(viralRemakeSource, /inert=\{replacementLocked \|\| undefined\}/);
  assert.match(viralRemakeSource, /inert=\{storyboardLocked \|\| undefined\}/);
  assert.doesNotMatch(viralRemakeSource, /inert=\{[^}]+\? "" : undefined\}/);
});

test("四列进入替换素材前在第二列显示加载状态", () => {
  assert.match(viralRemakeSource, /const \[replacementLoading, setReplacementLoading\] = useState\(false\)/);
  assert.match(viralRemakeSource, /正在加载可替换素材\.\.\./);
  assert.match(viralRemakeSource, /replacementLoading \? <LoaderCircle className="spin" \/> : <Lock \/>/);
  assert.match(viralRemakeSource, /disabled=\{replacementLoading\}/);
});

test("四列素材已开放时再次点击先确认再重新加载", () => {
  assert.match(viralRemakeSource, /const \[replacementConfirmOpen, setReplacementConfirmOpen\] = useState\(false\)/);
  assert.match(viralRemakeSource, /是否重新加载可替换素材/);
  assert.match(viralRemakeSource, />取消<\/button>/);
  assert.match(viralRemakeSource, />确认重新加载<\/button>/);
  assert.match(viralRemakeSource, /project\.maxStep < 2 \|\| replacementLoading/);
  assert.match(viralRemakeSource, /重新加载将清空当前素材配置和\{workflowName\}需求，此操作不可撤销。/);
  assert.match(viralRemakeSource, /assets:\s*\[\],\s*request:\s*""/);
  assert.doesNotMatch(viralRemakeSource, /现有内容不会被清空/);
});

test("四列故事面板首次生成和再次生成都显示加载状态", () => {
  assert.match(viralRemakeSource, /const \[storyboardLoading, setStoryboardLoading\] = useState\(false\)/);
  assert.match(viralRemakeSource, /下一步：生成结构仿写故事面板/);
  assert.match(viralRemakeSource, /正在生成结构仿写故事面板\.\.\./);
  assert.match(viralRemakeSource, /project\.maxStep < 3 \|\| storyboardLoading/);
  assert.match(viralRemakeSource, /disabled=\{storyboardLoading\}/);
});

test("四列拆解与故事面板使用受控预览和完整内容弹窗", () => {
  assert.match(viralRemakeSource, /const breakdownPreview =/);
  assert.match(viralRemakeSource, /<ReactMarkdown remarkPlugins=\{\[remarkGfm\]\}>\{breakdownPreview\}<\/ReactMarkdown>/);
  assert.doesNotMatch(viralRemakeSource, /className="remake-column-lines"/);
  assert.match(viralRemakeSource, /value=\{columnsDemo\.styleGuide\}/);
  assert.doesNotMatch(viralRemakeSource, /完整时长 41 秒 · 11 个镜头/);
  assert.match(viralRemakeSource, /setStoryboardOpen\(true\)/);
  assert.match(viralRemakeSource, /aria-label=\{`\$\{workflowName\}故事面板完整内容`\}/);
});

test("四列故事面板再次生成前显示确认弹窗", () => {
  assert.match(viralRemakeSource, /const \[storyboardConfirmOpen, setStoryboardConfirmOpen\] = useState\(false\)/);
  assert.match(viralRemakeSource, /是否重新生成\{workflowName\}故事面板/);
  assert.match(viralRemakeSource, />确认重新生成<\/button>/);
});

test("四列第三屏承载仿写操作且第四屏汇总图片与视频结果", () => {
  assert.match(viralRemakeSource, /<h1>\{isElementColumns \? "替换结果" : "仿写结果"\}<\/h1><p>查看\{isElementColumns \? "替换" : "仿写"\}故事面板并提取片段<\/p>/);
  assert.match(viralRemakeSource, /<h1>生成结果<\/h1><p>查看全部生成结果<\/p>/);
});

test("四列第三屏先提取片段再开放片段视频", () => {
  assert.match(viralRemakeSource, /const \[segmentExtractionLoading, setSegmentExtractionLoading\] = useState\(false\)/);
  assert.match(viralRemakeSource, /const \[extractedSegments, setExtractedSegments\] = useState\(\[\]\)/);
  assert.match(viralRemakeSource, /正在提取片段\.\.\./);
  assert.match(viralRemakeSource, /segmentExtractionLoading \? "正在提取片段\.\.\." : "提取片段"/);
  assert.equal(structureDemo.segments[0].heading, "## 片段一｜15秒｜反差钩子、生活痛点共情与软糖方案亮相");
  assert.equal(structureDemo.segments[1].heading, "## 片段二｜15秒｜商品包装展示、标签信息拆解与选择理由建立");
  assert.match(viralRemakeSource, /片段 \{String\(segment\.number \|\| index \+ 1\)\.padStart\(2, "0"\)\}｜\{segment\.duration\.replace\("s", "秒"\)\}｜/);
  assert.match(viralRemakeSource, />\s*批量生成视频\s*<ArrowRight \/>\s*<\/button>/);
  assert.match(viralRemakeSource, /aria-label=\{`查看\$\{segment\.title\}提取结果`\}/);
  assert.doesNotMatch(viralRemakeSource, /生成片段视频（3）/);
});

test("四列片段支持全选批量生成且结果列展示生成状态", () => {
  assert.match(viralRemakeSource, /const \[selectedExtractedSegments, setSelectedExtractedSegments\] = useState\(new Set\(\)\)/);
  assert.match(viralRemakeSource, /全选/);
  assert.match(viralRemakeSource, /取消全选/);
  assert.match(viralRemakeSource, /selectedExtractedSegments\.has\(segment\.id\) \? "已选择" : "选择"/);
  assert.match(viralRemakeSource, />\s*批量生成视频\s*<ArrowRight \/>\s*<\/button>/);
  assert.match(viralRemakeSource, /<h1>生成结果<\/h1><p>查看全部生成结果<\/p>/);
  assert.match(viralRemakeSource, /视频生成中\.\.\./);
  assert.match(viralRemakeSource, /<LoaderCircle className="spin" \/>/);
  assert.doesNotMatch(viralRemakeSource, />重新生成<\/button>/);
});

test("四列批量生成保留历史结果且结果列不显示完成项目", () => {
  assert.match(viralRemakeSource, /const generationRecords = project\.generationRecords/);
  assert.match(viralRemakeSource, /setGenerationRecords\(\(current\) => \[\.\.\.newRecords, \.\.\.current\]\)/);
  assert.match(viralRemakeSource, /generationBatchCounter\.current \+= 1/);
  assert.match(viralRemakeSource, /record\.batchId === batchId \? \{ \.\.\.record, status: "done", generatedAt \} : record/);
  assert.match(viralRemakeSource, /unifiedResults\.map\(\(\{ kind, record \}\) =>/);
  assert.doesNotMatch(viralRemakeSource, /四列结构仿写项目已完成/);
});

test("四列生成结果展示生成参数并可查看独立片段快照", () => {
  assert.match(viralRemakeSource, /snapshot:\s*\{ \.\.\.segment \}/);
  assert.match(viralRemakeSource, /generatedAt:\s*null/);
  assert.match(viralRemakeSource, /const generatedAt = new Date\(\)\.toISOString\(\)/);
  assert.match(viralRemakeSource, /生成于 \{formatGenerationTimestamp\(record\.generatedAt\)\}/);
  assert.match(viralRemakeSource, /setGenerationSnapshotOpen\(record\)/);
  assert.match(viralRemakeSource, /aria-label="片段生成快照"/);
  assert.doesNotMatch(viralRemakeSource, /\{done \? "已完成" : "生成中"\}/);
  assert.match(viralRemakeStyles, /\.remake-column-video-title[\s\S]*?text-overflow:\s*ellipsis/);
  assert.match(viralRemakeStyles, /\.remake-column-video-title[\s\S]*?white-space:\s*nowrap/);
});

test("生成记录时间按今天昨天一周内和跨年日期显示", () => {
  const now = new Date(2026, 9, 4, 16, 0);

  assert.equal(formatGenerationTimestamp(new Date(2026, 9, 4, 14, 30), now), "14:30");
  assert.equal(formatGenerationTimestamp(new Date(2026, 9, 3, 23, 59), now), "昨天");
  assert.equal(formatGenerationTimestamp(new Date(2026, 8, 30, 12, 0), now), "周三");
  assert.equal(formatGenerationTimestamp(new Date(2026, 5, 15, 12, 0), now), "6 月 15 日");
  assert.equal(formatGenerationTimestamp(new Date(2025, 5, 15, 12, 0), now), "2025 年 6 月 15 日");
});

test("四列生成结果按时间时长比例清晰度排序并提供脚本快照按钮", () => {
  assert.match(viralRemakeSource, /生成于 \{formatGenerationTimestamp\(record\.generatedAt\)\}[\s\S]*?\{segment\.duration\.toUpperCase\(\)\}[\s\S]*?9:16[\s\S]*?\{project\.quality\}/);
  assert.match(viralRemakeSource, /className="remake-column-snapshot-button"[\s\S]*?查看脚本快照/);
  assert.match(viralRemakeSource, /onClick=\{\(\) => setGenerationSnapshotOpen\(record\)\}/);
});

test("四列生成结果强化播放入口并将带图标参数靠右排列", () => {
  assert.match(viralRemakeSource, /className="remake-column-video-play"/);
  assert.match(viralRemakeSource, /<Clock3 \/>[\s\S]*?\{segment\.duration\.toUpperCase\(\)\}/);
  assert.match(viralRemakeSource, /<RectangleVertical \/>[\s\S]*?9:16/);
  assert.match(viralRemakeSource, /<ScanLine \/>[\s\S]*?\{project\.quality\}/);
  assert.match(viralRemakeStyles, /\.remake-column-video-parameters[\s\S]*?margin-left:\s*auto/);
  assert.match(viralRemakeStyles, /\.remake-column-video-play[\s\S]*?border-radius:\s*50%/);
});

test("四列无生成记录时显示统一空状态", () => {
  assert.match(viralRemakeSource, /unifiedResults\.length === 0[\s\S]*?暂无生成结果记录/);
  assert.doesNotMatch(viralRemakeSource, /生成故事面板后开放/);
  assert.match(viralRemakeStyles, /\.remake-column-empty/);
});

test("四列图片和视频结果使用双列瀑布流且图片等比完整显示", () => {
  assert.match(viralRemakeStyles, /\.remake-column-results\s*\{[^}]*column-count:\s*2[^}]*column-gap:/);
  assert.match(viralRemakeStyles, /\.remake-column-results > \.remake-column-video\s*\{[^}]*break-inside:\s*avoid/);
  assert.match(viralRemakeStyles, /\.remake-column-image-preview img\s*\{[^}]*height:\s*auto[^}]*object-fit:\s*contain/);
  assert.match(viralRemakeStyles, /\.remake-column-video\s*\{[^}]*min-width:\s*0/);
  assert.match(viralRemakeStyles, /\.remake-column-video-preview\s*\{[\s\S]*?aspect-ratio:\s*9\s*\/\s*14/);
  assert.match(viralRemakeStyles, /\.remake-column-video-preview video\s*\{[^}]*object-fit:\s*cover/);
  assert.match(viralRemakeStyles, /\.remake-column-video-title\s*\{[\s\S]*?height:\s*20px/);
  assert.match(viralRemakeStyles, /\.remake-column-video-meta\s*\{[\s\S]*?min-height:\s*20px/);
  assert.match(viralRemakeStyles, /\.remake-column-video-parameters\s*\{[^}]*flex-wrap:\s*wrap/);
});

test("四列视频画面无按钮内边距并完整铺满预览容器", () => {
  assert.match(viralRemakeStyles, /\.remake-column-video-preview\s*\{[\s\S]*?padding:\s*0/);
  assert.match(viralRemakeStyles, /\.remake-column-video-preview\s*\{[\s\S]*?line-height:\s*0/);
  assert.match(viralRemakeStyles, /\.remake-column-video-preview video\s*\{[^}]*display:\s*block/);
});

test("四列视频预览底部直角且标题与画面左侧对齐", () => {
  assert.match(viralRemakeStyles, /\.remake-column-video-preview\s*\{[\s\S]*?border-radius:\s*var\(--radius-control\)\s+var\(--radius-control\)\s+0\s+0/);
  assert.match(viralRemakeStyles, /\.remake-column-video-title\s*\{[\s\S]*?padding:\s*0/);
  assert.match(viralRemakeStyles, /\.remake-column-video-title\s*\{[\s\S]*?text-align:\s*left/);
});

test("四列生成结果超过视口时仅结果列独立滚动", () => {
  assert.match(viralRemakeSource, /<section className="remake-flow-column remake-results-column">/);
  assert.match(viralRemakeStyles, /\.remake-results-column\s*\{[\s\S]*?max-height:\s*calc\(100dvh\s*-\s*72px\)/);
  assert.match(viralRemakeStyles, /\.remake-results-column\s*\{[\s\S]*?overflow-y:\s*auto/);
  assert.match(viralRemakeStyles, /@media\s*\(max-width:\s*820px\)[\s\S]*?\.remake-results-column\s*\{[\s\S]*?max-height:\s*none[\s\S]*?overflow-y:\s*visible/);
});

test("四列生成结果滚动区域与其他列保持相同背景", () => {
  assert.match(viralRemakeStyles, /\.remake-results-column\s*\{[\s\S]*?height:\s*calc\(100dvh\s*-\s*72px\)/);
  assert.match(viralRemakeStyles, /\.remake-results-column\s*\{[\s\S]*?background:\s*var\(--color-bg-subtle-alt\)/);
  assert.match(viralRemakeStyles, /@media\s*\(max-width:\s*820px\)[\s\S]*?\.remake-results-column\s*\{[\s\S]*?height:\s*auto/);
});

test("四列生成记录仅属于当前任务且保存草稿不会清空", () => {
  assert.match(viralRemakeSource, /const \[structureColumnsSessionKey, setStructureColumnsSessionKey\] = useState\(0\)/);
  assert.match(viralRemakeSource, /onNew=\{\(\) => \{[\s\S]*?setStructureColumnsSessionKey\(\(value\) => value \+ 1\)/);
  assert.match(viralRemakeSource, /onSelect=\{\(draft\) => \{[\s\S]*?setStructureColumnsSessionKey\(\(value\) => value \+ 1\)/);
  assert.match(viralRemakeSource, /key=\{mode === "element-columns" \? elementColumnsSessionKey : mode === "rewrite-columns" \? rewriteColumnsSessionKey : structureColumnsSessionKey\}/);
  assert.doesNotMatch(viralRemakeSource, /onSave=\{[^}]*setStructureColumnsSessionKey/);
});

test("四列草稿保存并恢复当前任务的已完成生成记录", () => {
  const record = {
    id: "1-segment-1",
    batchId: 1,
    segmentId: "segment-1",
    status: "done",
    generatedAt: "2026-10-04T06:30:00.000Z",
    snapshot: { id: "segment-1", title: "片段一", video: "/demo.mp4" },
    assets: [{ id: "asset-1", role: "图片1", name: "人物.jpg", type: "image", preview: "data:image/png;base64,abc" }],
  };

  const serialized = serializeProject({ ...createInitialProject(), generationRecords: [record] });
  const stored = JSON.parse(serialized);
  const restored = createInitialProject(stored);

  assert.equal(stored.generationRecords[0].assets[0].preview, undefined);
  assert.deepEqual(restored.generationRecords[0].snapshot, record.snapshot);
  assert.equal(restored.generationRecords[0].status, "done");
});

test("四列草稿不会恢复尚未完成的生成记录", () => {
  const runningRecord = {
    id: "2-segment-1",
    batchId: 2,
    segmentId: "segment-1",
    status: "running",
    generatedAt: null,
    snapshot: { id: "segment-1", title: "片段一" },
    assets: [],
  };

  const restored = createInitialProject(JSON.parse(serializeProject({
    ...createInitialProject(),
    generationRecords: [runningRecord],
  })));

  assert.deepEqual(restored.generationRecords, []);
});

test("四列工作区从当前项目读取并更新生成记录", () => {
  assert.match(viralRemakeSource, /const generationRecords = project\.generationRecords/);
  assert.match(viralRemakeSource, /generationRecords:\s*typeof updater === "function" \? updater\(value\.generationRecords\) : updater/);
  assert.doesNotMatch(viralRemakeSource, /const \[generationRecords, setGenerationRecords\] = useState\(\[\]\)/);
});

test("四列流程按钮移除魔法棒并始终显示固定动作名称", () => {
  assert.match(viralRemakeSource, /breakdownStatus === "running" \? "视频拆解中" : "开始视频拆解"/);
  assert.match(viralRemakeSource, /下一步：替换素材/);
  assert.match(viralRemakeSource, /下一步：生成结构仿写故事面板/);
  assert.match(viralRemakeSource, /segmentExtractionLoading \? "正在提取片段\.\.\." : "提取片段"/);
  assert.doesNotMatch(viralRemakeSource, /重新执行：/);
  assert.doesNotMatch(viralRemakeSource, /<Sparkles \/>\}\{breakdownStatus/);
  assert.doesNotMatch(viralRemakeSource, /<Sparkles \/>下一步：生成结构仿写故事面板/);
  assert.doesNotMatch(viralRemakeSource, /:\s*<Sparkles \/>\}\s*\{segmentExtractionLoading/);
});

test("四列主流程按钮在非加载状态统一显示右箭头", () => {
  assert.match(viralRemakeSource, /\{breakdownStatus !== "running" && <ArrowRight \/>\}/);
  assert.match(viralRemakeSource, /下一步：替换素材 <ArrowRight \/>/);
  assert.match(viralRemakeSource, /\{storyboardActionLabel\}\s*<ArrowRight \/>/);
  assert.match(viralRemakeSource, /\{!segmentExtractionLoading && <ArrowRight \/>\}/);
  assert.match(viralRemakeSource, /批量生成视频\s*<ArrowRight \/>/);
});

test("四列最新生成记录置顶且播放弹窗只显示标题", () => {
  assert.match(viralRemakeSource, /setGenerationRecords\(\(current\) => \[\.\.\.newRecords, \.\.\.current\]\)/);
  assert.match(
    viralRemakeSource,
    /<VideoPreviewModal\s+open=\{Boolean\(videoPreview\)\}[\s\S]*?title=\{videoPreview\?\.title \|\| "片段视频"\}\s*\/>/,
  );
  assert.doesNotMatch(
    viralRemakeSource,
    /title=\{videoPreview\?\.title \|\| "片段视频"\}[\s\S]{0,160}?badge="STRUCTURE"/,
  );
});

test("结构仿写 Demo 提供图片4风格参考及专属需求", () => {
  assert.deepEqual(structureDemo.replacementResources.at(-1), {
    id: "style-reference",
    type: "style",
    role: "图片4",
    title: "风格参考",
    description:
      "提取叙事骨架：开场钩子、镜头顺序、剪辑节奏、分镜逻辑；可改写画面、人物、台词、场景。",
  });
  assert.deepEqual(structureDemo.assets.at(-1), {
    id: "style-reference",
    name: "结构分镜参考.jpg",
    role: "图片4",
    type: "image",
    sourceId: "style-reference",
    path: "./viral-remake-demo/structure-storyboard.jpg",
  });
  assert.match(structureDemo.request, /@图片4/);
});

test("结构仿写第三步与第四步共享同一份三片段故事面板", () => {
  assert.match(structureDemo.storyboard, /### 1\. 风格统一约束/);
  assert.match(structureDemo.storyboard, /## 片段一｜15秒｜反差钩子、生活痛点共情与软糖方案亮相/);
  assert.match(structureDemo.storyboard, /#### 镜头 11｜条件式库存CTA/);
  assert.deepEqual(
    structureDemo.segments.map(({ time, duration, shots }) => ({ time, duration, shots })),
    [
      { time: "00:00–00:15", duration: "15s", shots: "镜头 01–04" },
      { time: "00:15–00:30", duration: "15s", shots: "镜头 05–08" },
      { time: "00:30–00:41", duration: "11s", shots: "镜头 09–11" },
    ],
  );
  structureDemo.segments.forEach((segment) => {
    const segmentOnly = segment.content.slice(structureDemo.styleGuide.length).trim();
    assert.ok(structureDemo.storyboard.includes(segmentOnly));
    assert.match(segment.content, /### 3\. 片段约束/);
  });
});

test("结构仿写素材编号与新故事面板引用保持一致", () => {
  assert.deepEqual(
    Object.fromEntries(structureDemo.assets.map((asset) => [asset.role, asset.sourceId])),
    {
      图片1: "product-detail",
      图片2: "product-bottle",
      图片3: "person",
      图片4: "style-reference",
    },
  );
});

test("结构仿写卧室风格统一引用图片4", () => {
  assert.match(structureDemo.storyboard, /@图片4 \[真人自拍视频与上方对比画中画版式\]/);
  assert.doesNotMatch(structureDemo.storyboard, /@图片3/);
  structureDemo.segments.forEach((segment) => {
    assert.doesNotMatch(segment.content, /@图片3/);
  });
});

test("结构仿写第四步在每个片段内展示风格统一约束", () => {
  assert.match(structureDemo.styleGuide, /### 1\. 风格统一约束/);
  assert.match(structureDemo.styleGuide, /TikTok短视频电商｜9:16竖屏｜41秒/);
  assert.doesNotMatch(structureDemo.styleGuide, /## 片段一/);
  structureDemo.segments.forEach((segment) => {
    assert.equal(segment.content.startsWith(structureDemo.styleGuide), true);
  });
  assert.doesNotMatch(viralRemakeSource, /className="remake-shared-style-guide"/);
});

test("结构仿写三个片段分别绑定独立 Demo 视频", () => {
  assert.deepEqual(
    structureDemo.segments.map((segment) => segment.video),
    [
      "./viral-remake-demo/structure-segment-1.mp4",
      "./viral-remake-demo/structure-segment-2.mp4",
      "./viral-remake-demo/structure-segment-3.mp4",
    ],
  );
  structureDemo.segments.forEach((segment) => {
    assert.equal(
      existsSync(new URL(`../public/${segment.video.slice(2)}`, import.meta.url)),
      true,
    );
  });
});

test("结构仿写草稿保存到指定键而不覆盖元素替换", () => {
  const values = new Map();
  const storage = { setItem: (key, value) => values.set(key, value) };

  persistProject(
    storage,
    createInitialProject({ videoName: "structure.mp4", aspectRatio: "1:1" }),
    getStorageKey("structure"),
  );

  assert.equal(values.has(getStorageKey("element")), false);
  assert.equal(
    createInitialProject(values.get(getStorageKey("structure"))).videoName,
    "structure.mp4",
  );
});

test("结构仿写挂载独立任务记录侧栏", () => {
  assert.doesNotMatch(viralRemakeSource, /no-sidebar/);
  assert.match(viralRemakeSource, /useRemakeDrafts\(STRUCTURE_DRAFTS_KEY, "structure"\)/);
  assert.match(viralRemakeSource, /storageKey=\{STRUCTURE_DRAFTS_KEY\}[\s\S]*?title="结构仿写任务记录"/);
});

test("加载 Demo 后替换素材默认保持未上传", () => {
  const loadDemoHandler = viralRemakeSource.slice(
    viralRemakeSource.indexOf("  const loadDemo ="),
    viralRemakeSource.indexOf("  const regenerateStoryboard ="),
  );

  assert.match(loadDemoHandler, /assets:\s*\[\]/u);
  assert.match(loadDemoHandler, /request:\s*""/u);
  assert.doesNotMatch(loadDemoHandler, /assets:\s*mode ===/u);
  assert.doesNotMatch(loadDemoHandler, /request:\s*mode ===/u);
});

test("元素替换工作区对齐原片仿写的页面骨架", () => {
  assert.match(viralRemakeStyles, /\.remake-steps \{[\s\S]*?width: min\(1320px, 100%\);[\s\S]*?background: var\(--color-bg-surface\);[\s\S]*?border-bottom: 1px solid var\(--color-border-subtle\);[\s\S]*?\}/);
  assert.match(viralRemakeStyles, /\.remake-stage \{[\s\S]*?width: min\(1320px, calc\(100% - 48px\)\);[\s\S]*?margin: var\(--space-10\) auto;[\s\S]*?padding: var\(--space-10\);[\s\S]*?background: var\(--color-bg-surface\);[\s\S]*?\}/);
  assert.match(viralRemakeStyles, /\.remake-stage-heading \{[\s\S]*?align-items: flex-start;[\s\S]*?gap: var\(--space-8\);[\s\S]*?margin-bottom: var\(--space-8\);[\s\S]*?\}/);
  assert.match(viralRemakeStyles, /\.remake-image-viewer,[\s\S]*?\.remake-segment-modal,[\s\S]*?\.remake-video-modal \{[\s\S]*?width: min\(1320px, 100%\)/);
  assert.doesNotMatch(viralRemakeStyles, /\.remake-steps \{[^}]*width: min\(1120px/);
  assert.doesNotMatch(viralRemakeStyles, /\.remake-stage \{[^}]*width: min\(1280px/);
  assert.doesNotMatch(viralRemakeStyles, /\.remake-(?:image-viewer|video-modal|segment-modal)[^{]*\{[^}]*width: min\((?:1100|920|680)px/);
});

test("元素替换和原片仿写步骤导航统一使用完整边框并仅保留下方圆角", () => {
  const rewriteStyles = readFileSync(new URL("./original-rewrite.css", import.meta.url), "utf8");
  assert.match(viralRemakeStyles, /\.remake-steps \{[\s\S]*?border-radius: 0 0 var\(--radius-card-sm\) var\(--radius-card-sm\);[\s\S]*?border: 1px solid var\(--color-border-subtle\);[\s\S]*?background: var\(--color-bg-surface\);/);
  assert.match(rewriteStyles, /\.rewrite-steps\{[^}]*border-radius:0 0 var\(--radius-card-sm\) var\(--radius-card-sm\)[^}]*border:1px solid var\(--color-border-subtle\)[^}]*background:var\(--color-bg-surface\)/);
  assert.doesNotMatch(viralRemakeStyles, /\.remake-steps \{[^}]*border-bottom:/);
  assert.doesNotMatch(rewriteStyles, /\.rewrite-steps\{[^}]*border-bottom:/);
});

test("三个复刻模块分别挂载独立草稿记录侧栏", () => {
  const rewriteSource = readFileSync(new URL("./OriginalRewrite.jsx", import.meta.url), "utf8");
  const sidebarSource = readFileSync(new URL("./RemakeDraftSidebar.jsx", import.meta.url), "utf8");
  assert.match(viralRemakeSource, /<RemakeDraftSidebar[\s\S]*?storageKey=\{ELEMENT_DRAFTS_KEY\}/);
  assert.match(viralRemakeSource, /<RemakeDraftSidebar[\s\S]*?storageKey=\{STRUCTURE_DRAFTS_KEY\}/);
  assert.match(rewriteSource, /<RemakeDraftSidebar[\s\S]*?storageKey=\{REWRITE_DRAFTS_KEY\}/);
  assert.match(sidebarSource, /任务记录/);
  assert.match(sidebarSource, /新建任务/);
  assert.match(sidebarSource, /搜索任务/);
  assert.match(sidebarSource, /置顶/);
  assert.match(sidebarSource, /重命名/);
  assert.match(sidebarSource, /删除/);
});

test("两个独立草稿侧栏在任务记录前显示所属模块", () => {
  const rewriteSource = readFileSync(new URL("./OriginalRewrite.jsx", import.meta.url), "utf8");
  const sidebarSource = readFileSync(new URL("./RemakeDraftSidebar.jsx", import.meta.url), "utf8");
  assert.match(viralRemakeSource, /<RemakeDraftSidebar[\s\S]*?title="元素替换任务记录"/);
  assert.match(rewriteSource, /<RemakeDraftSidebar[\s\S]*?storageKey=\{REWRITE_DRAFTS_KEY\}/);
  assert.match(sidebarSource, /storageKey === REWRITE_DRAFTS_KEY \? "原片仿写任务记录" : "元素替换任务记录"/);
  assert.match(sidebarSource, /<strong>\{heading\}<\/strong>/);
});

test("复刻流程只保留四个步骤并在片段提取结束", () => {
  assert.deepEqual(steps, ["拆解视频", "替换素材", "替换结果", "提取片段"]);
});

test("元素替换与结构仿写页面只读展示故事面板且不提供重新开始", () => {
  assert.doesNotMatch(viralRemakeSource, />\s*(?:编辑|预览|保存修改)\s*</);
  assert.doesNotMatch(viralRemakeSource, />\s*重新开始\s*</);
  assert.doesNotMatch(viralRemakeSource, /aria-label=\{editing \? `预览\$\{title\}` : `编辑\$\{title\}`\}/);
  assert.match(viralRemakeSource, /<AssetMarkdown[\s\S]*?value=\{value\}[\s\S]*?assets=\{assets\}/);
});

test("片段故事面板状态图标已正确导入且不会导致第四步白屏", () => {
  assert.match(viralRemakeSource, /FilePenLine,[\s\S]*?FileText,/);
  assert.match(viralRemakeSource, /<FilePenLine \/>\s*故事面板已就绪/);
});

test("项目流程不会进入已移除的第五步", () => {
  const project = createInitialProject({
    step: 4,
    maxStep: 5,
    videoName: "demo.mp4",
    request: "替换人物与产品",
  });

  assert.equal(project.step, 4);
  assert.equal(project.maxStep, 4);
  assert.equal(advanceStep(project).step, 4);
  assert.equal(setCurrentStep(project, 5).step, 4);
});

test("批量生成视频只提交已选择且存在的片段", () => {
  assert.deepEqual(
    getSelectedSegmentIds(
      new Set(["segment-3", "missing", "segment-1"]),
      ["segment-1", "segment-2", "segment-3"],
    ),
    ["segment-1", "segment-3"],
  );
});

test("全选按钮在全选和取消全选之间切换", () => {
  const available = ["segment-1", "segment-2", "segment-3"];
  assert.deepEqual(
    [...toggleAllSegmentSelections(new Set(["segment-1"]), available)],
    available,
  );
  assert.deepEqual(
    [...toggleAllSegmentSelections(new Set(available), available)],
    [],
  );
});

test("片段卡片移除复选框并使用黑色边框表示选择状态", () => {
  const selectedCardRule = viralRemakeStyles.match(
    /\.remake-segment-editors\s*>\s*article\.selected\s*\{([^}]+)\}/,
  )?.[1] ?? "";
  const selectedOutlineRule = viralRemakeStyles.match(
    /\.remake-segment-editors\s*>\s*article\.selected::after\s*\{([^}]+)\}/,
  )?.[1] ?? "";

  assert.doesNotMatch(viralRemakeSource, /className="remake-segment-select"/);
  assert.match(
    viralRemakeSource,
    /className=\{`remake-segment-card\$\{selected \? " selected" : ""\}`\}/,
  );
  assert.match(
    viralRemakeSource,
    /<button[\s\S]*?className="remake-segment-selection-target"[\s\S]*?aria-pressed=\{selected\}/,
  );
  assert.doesNotMatch(
    viralRemakeSource,
    /<header[\s\S]{0,180}?role="button"/,
  );
  assert.match(selectedCardRule, /border:\s*2px solid var\(--color-bg-inverse\)/);
  assert.equal(selectedOutlineRule, "");
});

test("所有遮罩弹窗统一使用文字关闭按钮", () => {
  const closeButtons = [
    ...`${viralRemakeSource}\n${videoPreviewModalSource}`.matchAll(
      /className="remake-modal-close"[\s\S]{0,220}?<\/button>/g,
    ),
  ].map((match) => match[0]);

  assert.equal(closeButtons.length, 10);
  closeButtons.forEach((button) => {
    assert.match(button, />\s*关闭\s*<\/button>/);
    assert.doesNotMatch(button, /<X\s*\/>/);
  });
});

test("遮罩关闭按钮位于弹窗底部操作栏且主次按钮等高", () => {
  const closeRule = viralRemakeStyles.match(/\.remake-modal-close\s*\{([^}]+)\}/)?.[1] ?? "";
  const footerRule = viralRemakeStyles.match(
    /\.remake-modal-footer\s*\{([^}]+)\}/,
  )?.[1] ?? "";
  const segmentHeaderRule = viralRemakeStyles.match(
    /\.remake-segment-modal-header\s*\{([^}]+)\}/,
  )?.[1] ?? "";
  const nestedFooterRule = viralRemakeStyles.match(
    /\.remake-segment-editors\s+article\s*>\s*\.remake-modal-footer\s*\{([^}]+)\}/,
  )?.[1] ?? "";
  const actionRule = viralRemakeStyles.match(
    /\.remake-primary,\s*\.remake-secondary\s*\{([^}]+)\}/,
  )?.[1] ?? "";

  assert.doesNotMatch(closeRule, /position:\s*absolute/);
  assert.match(footerRule, /justify-content:\s*flex-end/);
  assert.match(footerRule, /border-top:/);
  assert.match(segmentHeaderRule, /display:\s*flex/);
  assert.match(segmentHeaderRule, /align-items:\s*center/);
  assert.match(segmentHeaderRule, /padding:/);
  assert.match(segmentHeaderRule, /border-bottom:/);
  assert.doesNotMatch(viralRemakeStyles, /\.remake-video-modal\s+header\s*\{/);
  assert.doesNotMatch(
    viralRemakeStyles,
    /\.remake-video-modal\s+header\s*>\s*span\s*\{/,
  );
  assert.match(
    viralRemakeStyles,
    /@media\s*\(max-width:\s*620px\)[\s\S]*?\.remake-segment-modal-header,[\s\S]*?\.remake-markdown-modal\s*>\s*\.remake-markdown-body/,
  );
  assert.match(nestedFooterRule, /justify-content:\s*flex-end/);
  assert.equal(
    (`${viralRemakeSource}\n${videoPreviewModalSource}`.match(/className="remake-modal-footer"/g) ?? []).length,
    13,
  );
  assert.match(viralRemakeSource, /const segmentDetailCloseRef = useRef\(null\)/);
  assert.match(viralRemakeSource, /ref=\{segmentDetailCloseRef\}/);
  assert.match(
    viralRemakeSource,
    /className="remake-segment-modal"[\s\S]*?<header>[\s\S]*?className="remake-modal-body"[\s\S]*?className="remake-modal-footer"/,
  );
  assert.match(
    viralRemakeSource,
    /className="remake-segment-modal-header"[\s\S]*?<span>0\{index \+ 1\}<\/span>[\s\S]*?<h2>\{segment\.title\}<\/h2>[\s\S]*?<p>\{segment\.time\}/,
  );
  assert.equal(
    (`${viralRemakeSource}\n${videoPreviewModalSource}`.match(/className="remake-segment-modal-header"/g) ?? []).length,
    4,
  );
  assert.match(
    videoPreviewModalSource,
    /className="remake-video-modal shared-video-preview"[\s\S]*?className="remake-segment-modal-header"/,
  );
  assert.match(
    viralRemakeSource,
    /<VideoPreviewModal[\s\S]*?badge=\{`0\$\{index \+ 1\}`\}[\s\S]*?subtitle=\{`\$\{segment\.time\}/,
  );
  assert.match(actionRule, /height:\s*36px/);

  const demoRule = viralRemakeStyles.match(
    /\.remake-demo-button\s*\{([^}]+)\}/,
  )?.[1] ?? "";
  const modeActionRule = viralRemakeStyles.match(
    /\.remake-mode-card\s*>\s*button\s*\{([^}]+)\}/,
  )?.[1] ?? "";

  assert.match(demoRule, /height:\s*36px/);
  assert.match(modeActionRule, /height:\s*36px/);
});

test("步骤条保持居中且长内容弹窗仅正文区域滚动", () => {
  const stepsRule = viralRemakeStyles.match(
    /\.remake-steps\s*\{([^}]+)\}/,
  )?.[1] ?? "";
  const stepButtonRule = viralRemakeStyles.match(
    /\.remake-steps\s+button\s*\{([^}]+)\}/,
  )?.[1] ?? "";
  const stepConnectorRule = viralRemakeStyles.match(
    /\.remake-steps\s+button\s*>\s*i\s*\{([^}]+)\}/,
  )?.[1] ?? "";
  const stepLabelRule = viralRemakeStyles.match(
    /\.remake-steps\s+button\s*>\s*b\s*\{([^}]+)\}/,
  )?.[1] ?? "";
  const markdownModalRule = viralRemakeStyles.match(
    /\.remake-markdown-modal\s*\{([^}]+)\}/,
  )?.[1] ?? "";
  const markdownBodyRule = viralRemakeStyles.match(
    /\.remake-markdown-modal\s*>\s*\.remake-markdown-body\s*\{([^}]+)\}/,
  )?.[1] ?? "";
  const segmentBodyRule = viralRemakeStyles.match(
    /\.remake-segment-modal\s*>\s*div\s*\{([^}]+)\}/,
  )?.[1] ?? "";

  assert.match(stepsRule, /margin-inline:\s*auto/);
  assert.match(stepsRule, /width:\s*min\(1320px,/);
  assert.match(stepButtonRule, /justify-content:\s*center/);
  assert.match(stepButtonRule, /gap:\s*0/);
  assert.match(stepLabelRule, /padding-left:\s*var\(--space-3\)/);
  assert.match(stepConnectorRule, /left:\s*50%/);
  assert.match(stepConnectorRule, /right:\s*-50%/);
  assert.match(stepConnectorRule, /pointer-events:\s*none/);
  assert.match(markdownModalRule, /display:\s*flex/);
  assert.match(markdownModalRule, /overflow:\s*hidden/);
  assert.match(markdownBodyRule, /overflow-y:\s*auto/);
  assert.match(segmentBodyRule, /overflow-y:\s*auto/);
});

test("替换素材页面不再显示拆解工具摘要卡片", () => {
  assert.doesNotMatch(viralRemakeSource, /remake-analysis-summary/);
  assert.doesNotMatch(viralRemakeSource, /Gemini 3\.1 Pro/);
  assert.doesNotMatch(viralRemakeSource, /FFmpeg/);
  assert.doesNotMatch(viralRemakeSource, /42 个画面/);
  assert.doesNotMatch(viralRemakeStyles, /\.remake-analysis-summary/);
});

test("替换需求明确标记为非必填", () => {
  assert.match(
    viralRemakeSource,
    /className="remake-optional-label">非必填<\/span>/,
  );
});

test("替换结果页先展示逐秒分镜对照再展示故事面板", () => {
  const comparisonIndex = viralRemakeSource.indexOf("逐秒分镜对照");
  const storyboardIndex = viralRemakeSource.indexOf("替换后的故事面板");

  assert.notEqual(comparisonIndex, -1);
  assert.notEqual(storyboardIndex, -1);
  assert.ok(comparisonIndex < storyboardIndex);
});

test("逐秒分镜对照与故事面板使用统一卡片结构", () => {
  assert.match(
    viralRemakeSource,
    /<article className="remake-document remake-comparison-card">/,
  );
  assert.match(
    viralRemakeStyles,
    /\.remake-comparison-card\s*>\s*\.remake-comparison\s*\{[^}]*padding:/,
  );
});

test("替换结果页移除状态标签并支持完整阅读故事面板", () => {
  assert.doesNotMatch(viralRemakeSource, /GPT-5\.6 Sol \+ Image 2\.5/);
  assert.doesNotMatch(viralRemakeSource, /一致性检查通过/);
  assert.match(viralRemakeSource, /className="remake-storyboard-trigger"/);
  assert.match(viralRemakeSource, /className="remake-markdown-modal remake-storyboard-modal"/);
  assert.match(
    viralRemakeStyles,
    /\.remake-storyboard-preview\s*\{[^}]*max-height:\s*220px/,
  );
  const documentEditorSource = viralRemakeSource.match(
    /function DocumentEditor[\s\S]*?function MarkdownDocumentPreview/,
  )?.[0] ?? "";
  assert.match(documentEditorSource, /getTrappedFocusTarget/);
});

test("故事面板移除时长元信息并使用底部居中阅读入口", () => {
  assert.doesNotMatch(
    viralRemakeSource,
    /9 个镜头 · 3 个生成片段 · 41 秒/,
  );
  const readMoreRule = viralRemakeStyles.match(
    /\.remake-storyboard-read-more\s*\{([^}]+)\}/,
  )?.[1] ?? "";
  assert.match(readMoreRule, /left:\s*0/);
  assert.match(readMoreRule, /right:\s*0/);
  assert.match(readMoreRule, /justify-content:\s*center/);
  assert.doesNotMatch(readMoreRule, /border-radius:/);
  assert.doesNotMatch(readMoreRule, /box-shadow:/);
});

test("替换后故事面板 Demo 使用完整三片段九镜头内容和固定资源编号", () => {
  for (const section of [
    "### 1. 风格统一约束",
    "## 片段一｜15秒",
    "## 片段二｜15秒",
    "## 片段三｜11秒",
    "#### 镜头 09｜链接引导与免邮催单",
    "### 3. 片段约束",
  ]) {
    assert.equal(storyboardText.includes(section), true, section);
  }
  assert.match(storyboardText, /@图片3 \[男性口播者及灰色亨利领上衣\]/);
  assert.match(storyboardText, /@图片2 \[WindBoss Gold Shilajit Gummies产品罐\]/);
  assert.match(storyboardText, /@图片1 \[红色方糖形软糖\]/);
  assert.doesNotMatch(storyboardText, /@图片1 \[男性口播者/);
});

test("故事面板文本可拆分为普通文字和资源胶囊引用", () => {
  assert.deepEqual(
    splitAssetMentions("人物使用 @图片1 并展示 @图片2。"),
    [
      { type: "text", value: "人物使用 " },
      { type: "mention", value: "@图片1", role: "图片1" },
      { type: "text", value: " 并展示 " },
      { type: "mention", value: "@图片2", role: "图片2" },
      { type: "text", value: "。" },
    ],
  );
});

test("后续生成片段与新故事面板的镜头分组和结尾保持一致", () => {
  assert.deepEqual(
    segmentDocuments.map((segment) => segment.shots),
    ["镜头 1–4", "镜头 5–7", "镜头 8–9"],
  );
  assert.match(segmentDocuments[2].content, /@图片2|产品罐/);
  assert.doesNotMatch(segmentDocuments[2].content, /方糖软糖.*收尾/);
});

test("片段提取 Demo 使用三份完整 Markdown 并统一资源编号", () => {
  const expectedTitles = [
    "片段一｜15秒｜以两性表现对比建立焦虑",
    "片段二｜15秒｜说明产品成分与作用原理",
    "片段三｜11秒｜强化缺货风险",
  ];
  segmentDocuments.forEach((segment, index) => {
    assert.match(segment.content, /### 1\. 全局风格统一约束/);
    assert.match(segment.content, /### 3\. 引用资源/);
    assert.match(segment.content, /### 5\. 片段生成约束/);
    assert.equal(segment.content.includes(expectedTitles[index]), true);
    assert.match(segment.content, /@图片3 \[男性口播者及灰色亨利领上衣\]/);
    assert.doesNotMatch(segment.content, /@图片1 \[男性口播者/);
  });
  assert.match(segmentDocuments[0].content, /@图片1 \[红色方糖形软糖\]/);
});

test("视频生成列表保留独立的紧凑片段摘要", () => {
  segmentDocuments.forEach((segment) => {
    assert.equal(typeof segment.summary, "string");
    assert.equal(segment.summary.length > 20, true);
    assert.equal(segment.summary.length < 240, true);
    assert.doesNotMatch(segment.summary, /^###/);
  });
});

test("固定人物产品和方糖槽位只接受图片素材", () => {
  assert.equal(BOUND_ASSET_ACCEPT, "image/*");
  assert.equal(GENERAL_ASSET_ACCEPT, "image/*,audio/*,video/*");
});

test("故事面板只解析合法的内部素材引用链接", () => {
  assert.equal(parseAssetReferenceHref("#asset-%E5%9B%BE%E7%89%871"), "图片1");
  assert.equal(parseAssetReferenceHref("#asset-%E0%A4%A"), null);
  assert.equal(parseAssetReferenceHref("#asset-任意内容"), null);
});

test("阅读弹窗只在点击遮罩自身时关闭", () => {
  const backdrop = {};
  assert.equal(isBackdropSelfClick(backdrop, backdrop), true);
  assert.equal(isBackdropSelfClick({}, backdrop), false);
});

test("阅读弹窗在首尾控件间循环焦点", () => {
  const first = {};
  const middle = {};
  const last = {};
  const focusable = [first, middle, last];
  assert.equal(getTrappedFocusTarget(focusable, first, true), last);
  assert.equal(getTrappedFocusTarget(focusable, last, false), first);
  assert.equal(getTrappedFocusTarget(focusable, middle, false), null);
});

test("拆解 Demo 使用最新文件中的完整六部分框架", () => {
  for (const section of [
    "01｜视频定位",
    "02｜转化逻辑",
    "03｜吸引力机制",
    "04｜叙事编排",
    "05｜场景规划",
    "06｜分镜执行",
  ]) {
    assert.equal(breakdownText.includes(section), true);
  }
  assert.equal(breakdownText.includes("完整时长00:41"), true);
  assert.equal(breakdownText.includes("00:00-00:07开场钩子"), true);
  assert.equal(breakdownText.includes("黑色带银蓝标签"), true);
});

test("页面可将带 type 和 url 的引用素材映射转换为胶囊素材", () => {
  assert.deepEqual(normalizeReferenceAssets({
    图片1: { type: "image", url: "https://cdn.example.com/gummy.webp" },
    图片2: { type: "image", url: "https://cdn.example.com/product.webp" },
  }), [
    { role: "图片1", type: "image", url: "https://cdn.example.com/gummy.webp" },
    { role: "图片2", type: "image", url: "https://cdn.example.com/product.webp" },
  ]);
  assert.deepEqual(normalizeReferenceAssets([{ role: "图片3", type: "image", preview: "local" }]), [
    { role: "图片3", type: "image", preview: "local" },
  ]);
});

test("页面素材胶囊优先使用 url 地址", () => {
  assert.match(assetMentionsSource, /asset\?\.url\s*\|\|\s*asset\?\.preview\s*\|\|\s*asset\?\.path/);
});

test("未上传视频不能开始拆解", () => {
  const project = createInitialProject({ request: "替换人物与产品" });
  assert.equal(canAdvance(project), false);
});

test("上传视频后无需替换需求即可进入素材配置", () => {
  const project = createInitialProject({ videoName: "demo.mp4" });
  assert.equal(canAdvance(project), true);
  assert.equal(advanceStep(project).step, 2);
});

test("第二步替换需求为空时仍可生成替换结果", () => {
  const project = createInitialProject({
    step: 2,
    maxStep: 2,
    videoName: "demo.mp4",
    request: "",
  });
  assert.equal(canAdvance(project), true);
  assert.equal(advanceStep(project).step, 3);
});

test("第二步填写替换需求后可以进入替换结果", () => {
  const project = createInitialProject({
    step: 2,
    maxStep: 2,
    videoName: "demo.mp4",
    request: "替换人物与产品",
  });
  assert.equal(canAdvance(project), true);
  assert.equal(advanceStep(project).step, 3);
});

test("编辑故事面板返回不可变的新状态", () => {
  const project = createInitialProject();
  const next = updateDocument(project, "storyboard", "新内容");
  assert.equal(next.documents.storyboard, "新内容");
  assert.notEqual(next, project);
});

test("不能跳转到尚未解锁的步骤", () => {
  const project = createInitialProject({
    step: 2,
    maxStep: 2,
    videoName: "demo.mp4",
    request: "替换产品",
  });
  assert.equal(setCurrentStep(project, 5).step, 2);
  assert.equal(setCurrentStep(project, 1).step, 1);
});

test("片段生成状态独立更新", () => {
  const project = createInitialProject();
  const next = setGenerationStatus(project, "segment-2", "running");
  assert.equal(next.generation["segment-2"], "running");
  assert.equal(next.generation["segment-1"], undefined);
});

test("Demo 素材使用兼容开发和构建部署的相对地址", () => {
  const paths = [
    ...demoAssets.map((item) => item.path),
    ...originalBoards,
    ...replacedBoards,
  ];
  assert.equal(
    paths.every((path) => path.startsWith("./viral-remake-demo/")),
    true,
  );
});

test("保存项目会写入指定存储并可恢复", () => {
  const values = new Map();
  const storage = { setItem: (key, value) => values.set(key, value) };
  const project = createInitialProject({
    videoName: "demo.mp4",
    request: "替换产品",
  });
  persistProject(storage, project);
  assert.equal(
    createInitialProject(values.get("shulan.viral-remake.project.v1"))
      .videoName,
    "demo.mp4",
  );
});

test("保存草稿不会把本地媒体二进制写入 localStorage", () => {
  const project = createInitialProject({
    assets: [
      {
        id: "video-1",
        role: "视频1",
        type: "video",
        name: "large.mp4",
        preview: "data:video/mp4;base64,AAAA",
      },
    ],
  });
  const saved = serializeProject(project);
  assert.equal(saved.includes("data:video"), false);
  assert.equal(JSON.parse(saved).assets[0].name, "large.mp4");
});

test("合法 JSON 中的损坏字段会回退为安全值", () => {
  const project = createInitialProject(
    JSON.stringify({
      videoName: 12,
      request: 42,
      assets: [null, { role: "人物与服饰" }],
      documents: { storyboard: { broken: true } },
      generation: { "segment-1": "running", "segment-2": "unknown" },
    }),
  );
  assert.equal(project.videoName, "");
  assert.equal(project.request, "");
  assert.deepEqual(project.assets, []);
  assert.deepEqual(project.documents, {});
  assert.deepEqual(project.generation, { "segment-1": "idle" });
});

test("删除视频后不能通过顶部步骤回到素材配置页", () => {
  const project = createInitialProject({
    step: 1,
    maxStep: 5,
    videoName: "",
    request: "替换产品",
  });
  assert.equal(setCurrentStep(project, 2).step, 1);
});

test("清空替换需求后仍可通过顶部步骤进入替换结果页", () => {
  const project = createInitialProject({
    step: 2,
    maxStep: 5,
    videoName: "demo.mp4",
    request: "",
  });
  assert.equal(setCurrentStep(project, 3).step, 3);
});

test("批量排队只启动尚未运行的片段并可统一回退", () => {
  const project = {
    ...createInitialProject(),
    generation: { "segment-1": "running" },
  };
  const queued = queueGeneration(project, [
    "segment-1",
    "segment-2",
    "segment-3",
  ]);
  assert.deepEqual(queued.started, ["segment-2", "segment-3"]);
  assert.equal(queued.project.generation["segment-1"], "running");
  assert.equal(queued.project.generation["segment-2"], "running");
  assert.deepEqual(clearRunningStatuses(queued.project).generation, {
    "segment-1": "idle",
    "segment-2": "idle",
    "segment-3": "idle",
  });
});

test("三个 Demo 素材使用图片序列名称", () => {
  assert.deepEqual(
    demoAssets.map((item) => item.role),
    ["图片1", "图片2", "图片3"],
  );
});

test("替换素材区提供三个可配对的原始资源描述", () => {
  assert.deepEqual(
    originalReplacementResources.map(({ id, title }) => ({ id, title })),
    [
      { id: "person", title: "人物1" },
      { id: "product-detail", title: "产品1-单粒特写" },
      { id: "product-bottle", title: "产品1-瓶装" },
    ],
  );
  assert.equal(
    originalReplacementResources.every((resource) => resource.description.length > 0),
    true,
  );
});

test("替换素材通过原始资源 id 保持绑定关系", () => {
  const project = createInitialProject({
    assets: [
      { id: "person-image", role: "图片1", name: "person.jpg", sourceId: "person" },
      { id: "bottle-image", role: "图片2", name: "bottle.jpg", sourceId: "product-bottle" },
    ],
  });

  const next = removeReplacementAsset(project, "person-image");

  assert.equal(next.assets.length, 1);
  assert.equal(next.assets[0].sourceId, "product-bottle");
  assert.equal(
    createInitialProject(serializeProject(next)).assets[0].sourceId,
    "product-bottle",
  );
});

test("三个 Demo 替换素材与原始资源逐项绑定", () => {
  assert.deepEqual(
    Object.fromEntries(demoAssets.map((asset) => [asset.name, asset.sourceId])),
    {
      "人物形象.jpg": "person",
      "产品外观.jpg": "product-bottle",
      "产品方糖心态.png": "product-detail",
    },
  );
});

test("绑定素材清空后可从同一原始资源槽位重新上传", () => {
  const project = createInitialProject({ assets: demoAssets });
  const cleared = removeReplacementAsset(
    project,
    findBoundReplacementAsset(project.assets, "person").id,
  );
  assert.equal(findBoundReplacementAsset(cleared.assets, "person"), undefined);

  const restored = upsertBoundReplacementAsset(cleared, {
    id: "new-person",
    name: "new-person.png",
    type: "image",
    sourceId: "person",
    role: "图片1",
  });
  assert.equal(
    findBoundReplacementAsset(restored.assets, "person").name,
    "new-person.png",
  );
  assert.equal(findBoundReplacementAsset(restored.assets, "person").role, "图片1");
  assert.deepEqual(
    findMentionCandidates(restored.assets, "图片1").map((asset) => asset.name),
    ["new-person.png"],
  );
});

test("同一原始资源的连续首次上传只保留一个绑定素材", () => {
  const project = createInitialProject();
  const first = upsertBoundReplacementAsset(project, {
    id: "person-a",
    name: "person-a.png",
    type: "image",
    sourceId: "person",
  });
  const second = upsertBoundReplacementAsset(first, {
    id: "person-b",
    name: "person-b.png",
    type: "image",
    sourceId: "person",
  });

  assert.equal(second.assets.length, 1);
  assert.equal(second.assets[0].sourceId, "person");
  assert.equal(second.assets[0].name, "person-b.png");
});

test("绑定素材只接受最后一次文件选择的异步结果", () => {
  const latestBySource = new Map();
  const first = beginLatestRequest(latestBySource, "person");
  const second = beginLatestRequest(latestBySource, "person");

  assert.equal(isLatestRequest(latestBySource, "person", first), false);
  assert.equal(isLatestRequest(latestBySource, "person", second), true);
  beginLatestRequest(latestBySource, "person");
  assert.equal(isLatestRequest(latestBySource, "person", second), false);
});

test("根据文件类型分别生成稳定的下一个素材序号", () => {
  const assets = [
    { role: "图片1", type: "image" },
    { role: "图片3", type: "image" },
    { role: "音频1", type: "audio" },
  ];
  assert.equal(nextAssetLabel(assets, "image"), "图片4");
  assert.equal(nextAssetLabel(assets, "audio"), "音频2");
  assert.equal(nextAssetLabel(assets, "video"), "视频1");
});

test("从 MIME 类型或扩展名识别替换素材类型", () => {
  assert.equal(getMediaType({ type: "image/png", name: "a.bin" }), "image");
  assert.equal(getMediaType({ type: "", name: "voice.mp3" }), "audio");
  assert.equal(getMediaType({ type: "", name: "clip.mov" }), "video");
});

test("输入 @ 后可按序列名称筛选引用素材", () => {
  const assets = [{ role: "图片1" }, { role: "图片2" }, { role: "音频1" }];
  assert.deepEqual(
    findMentionCandidates(assets, "").map((item) => item.role),
    ["图片1", "图片2", "音频1"],
  );
  assert.deepEqual(
    findMentionCandidates(assets, "图片").map((item) => item.role),
    ["图片1", "图片2"],
  );
});

test("删除最高编号后新增素材不会复用旧编号", () => {
  const project = createInitialProject({
    assets: [
      { id: "1", role: "图片1", type: "image", name: "1.png" },
      { id: "3", role: "图片3", type: "image", name: "3.png" },
    ],
  });
  const withoutThree = removeReplacementAsset(project, "3");
  const next = addSequencedAssets(withoutThree, [
    { id: "4", type: "image", name: "4.png" },
  ]);
  assert.equal(next.assets.at(-1).role, "图片4");
  assert.equal(next.assetCounters.image, 4);
});

test("新增其他图片从图片4开始并为固定槽位预留前三个编号", () => {
  const project = createInitialProject();
  const withOther = addSequencedAssets(project, [
    { id: "other", type: "image", name: "other.png" },
  ]);
  const withPerson = addSequencedAssets(withOther, [
    {
      id: "person",
      type: "image",
      name: "person.png",
      sourceId: "person",
      role: "图片1",
    },
  ]);

  assert.equal(withOther.assets[0].role, "图片4");
  assert.deepEqual(
    withPerson.assets.map((asset) => asset.role),
    ["图片4", "图片1"],
  );
});

test("普通素材跨类型替换会推进新类型编号避免后续重复", () => {
  const project = createInitialProject({
    assets: [{ id: "audio", role: "音频1", type: "audio", name: "old.mp3" }],
  });
  const replaced = replaceSequencedAsset(project, "audio", {
    type: "image",
    name: "replacement.png",
  });
  const removed = removeReplacementAsset(replaced, "audio");
  const next = addSequencedAssets(removed, [
    { id: "next", type: "image", name: "next.png" },
  ]);

  assert.equal(replaced.assets[0].role, "图片4");
  assert.equal(replaced.assetCounters.image, 4);
  assert.equal(next.assets[0].role, "图片5");
});

test("恢复旧草稿时按固定图片编号迁移前三个绑定槽位", () => {
  const project = createInitialProject({
    assets: [
      { id: "person", role: "图片1", type: "image", name: "person.png" },
      { id: "bottle", role: "图片2", type: "image", name: "bottle.png" },
      { id: "detail", role: "图片3", type: "image", name: "detail.png" },
      { id: "duplicate", role: "图片1", type: "image", name: "duplicate.png" },
    ],
  });

  assert.deepEqual(
    project.assets.map((asset) => asset.sourceId),
    ["person", "product-bottle", "product-detail", undefined],
  );
});

test("连续批次上传基于最新状态原子分配编号", () => {
  const first = addSequencedAssets(createInitialProject(), [
    { id: "1", type: "image", name: "1.png" },
  ]);
  const second = addSequencedAssets(first, [
    { id: "2", type: "image", name: "2.png" },
    { id: "a1", type: "audio", name: "1.mp3" },
  ]);
  assert.deepEqual(
    second.assets.map((item) => item.role),
    ["图片4", "图片5", "音频1"],
  );
});

test("超限编辑会保留上一次完整文本而不截断素材引用", () => {
  const previous = `${"a".repeat(493)} @图片1`;
  const attempted = `新增文字${previous}`;
  assert.equal(keepWithinTextLimit(previous, attempted, 500), previous);
  assert.equal(
    keepWithinTextLimit(previous, "正常内容 @图片1", 500),
    "正常内容 @图片1",
  );
});

test("可新增任意替换对象且不会覆盖已有素材", () => {
  const project = createInitialProject({
    assets: [{ id: "person", role: "人物", name: "person.jpg" }],
  });
  const next = addReplacementAsset(project, {
    id: "scene",
    role: "卧室背景",
    name: "room.png",
  });
  assert.deepEqual(
    next.assets.map((item) => item.role),
    ["人物", "卧室背景"],
  );
});

test("可按素材 id 修改名称和替换文件", () => {
  const project = createInitialProject({
    assets: [
      { id: "person", role: "人物", name: "old.jpg" },
      { id: "product", role: "产品", name: "jar.jpg" },
    ],
  });
  const next = updateReplacementAsset(project, "person", {
    role: "人物与服饰",
    name: "new.jpg",
  });
  assert.deepEqual(next.assets, [
    { id: "person", role: "人物与服饰", name: "new.jpg", type: "image" },
    { id: "product", role: "产品", name: "jar.jpg", type: "image" },
  ]);
});

test("删除单个替换素材不会影响其他素材", () => {
  const project = createInitialProject({
    assets: [
      { id: "person", role: "人物", name: "person.jpg" },
      { id: "product", role: "产品", name: "jar.jpg" },
    ],
  });
  assert.deepEqual(
    removeReplacementAsset(project, "person").assets.map((item) => item.id),
    ["product"],
  );
});

test("删除模板视频会保留替换需求和素材", () => {
  const project = createInitialProject({
    step: 5,
    maxStep: 5,
    videoName: "demo.mp4",
    request: "替换人物",
    assets: [{ id: "person", role: "人物", name: "person.jpg" }],
    documents: { storyboard: "旧故事面板" },
    generation: { "segment-1": "done" },
  });
  const next = clearVideo(project);
  assert.equal(next.videoName, "");
  assert.equal(next.request, "替换人物");
  assert.equal(next.assets.length, 1);
  assert.equal(next.step, 1);
  assert.equal(next.maxStep, 1);
  assert.deepEqual(next.documents, {});
  assert.deepEqual(next.generation, {});
});

test("替换模板视频会使旧拆解和生成结果失效", () => {
  const project = createInitialProject({
    step: 5,
    maxStep: 5,
    videoName: "old.mp4",
    request: "替换产品",
    documents: { breakdown: "旧拆解" },
    generation: { "segment-1": "done" },
  });
  const next = replaceVideo(project, "new.mp4");
  assert.equal(next.videoName, "new.mp4");
  assert.equal(next.request, "替换产品");
  assert.equal(next.step, 1);
  assert.equal(next.maxStep, 1);
  assert.deepEqual(next.documents, {});
  assert.deepEqual(next.generation, {});
});

test("引用素材弹层可用上下键循环选择", () => {
  assert.equal(moveMentionSelection(0, 1, 3), 1);
  assert.equal(moveMentionSelection(2, 1, 3), 0);
  assert.equal(moveMentionSelection(0, -1, 3), 2);
  assert.equal(moveMentionSelection(0, 1, 0), 0);
});

test("引用素材弹层跟随 @ 光标右下角并在右侧边缘内收", () => {
  assert.deepEqual(getMentionMenuPosition({ right: 120, bottom: 48 }, 560), {
    left: 126,
    top: 54,
  });
  assert.deepEqual(getMentionMenuPosition({ right: 520, bottom: 92 }, 560), {
    left: 224,
    top: 98,
  });
});

test("点击气泡层之外的输入区域也会关闭气泡层", () => {
  const editorTarget = {};
  const menuTarget = {};
  const outside = {};
  const editor = { contains: (target) => target === editorTarget || target === menuTarget };
  const menu = { contains: (target) => target === menuTarget };
  assert.equal(isMentionClickOutside(editor, menu, menuTarget), false);
  assert.equal(isMentionClickOutside(editor, menu, editorTarget), true);
  assert.equal(isMentionClickOutside(editor, menu, outside), true);
  assert.equal(isMentionClickOutside(editor, null, outside), false);
});

test("画面比例使用默认值并只恢复支持的持久化选项", () => {
  assert.equal(createInitialProject().aspectRatio, "9:16");
  assert.equal(
    createInitialProject({ aspectRatio: "21:9" }).aspectRatio,
    "21:9",
  );
  assert.equal(
    createInitialProject({ aspectRatio: "2:1" }).aspectRatio,
    "9:16",
  );
});

test("清晰度默认使用 1080P 并只恢复支持的持久化选项", () => {
  assert.deepEqual(OUTPUT_QUALITIES, ["720P", "1080P"]);
  assert.equal(createInitialProject().quality, "1080P");
  assert.equal(createInitialProject({ quality: "720P" }).quality, "720P");
  assert.equal(createInitialProject({ quality: "4K" }).quality, "1080P");
});

test("固定槽位上传、替换和清空时同步替换需求", () => {
  const resource = { id: "person", title: "人物1", role: "图片1" };
  const project = createInitialProject({ request: "保留原片节奏" });
  const uploaded = setBoundReplacementAsset(project, resource, {
    id: "person-a",
    name: "person-a.png",
    type: "image",
    sourceId: "person",
    role: "图片1",
  });

  assert.equal(uploaded.request, "保留原片节奏\n[人物1]替换成@图片1");

  const replaced = setBoundReplacementAsset(uploaded, resource, {
    id: "person-b",
    name: "person-b.png",
    type: "image",
    sourceId: "person",
    role: "图片1",
  });
  assert.equal(replaced.request, "保留原片节奏\n[人物1]替换成@图片1");
  assert.equal(replaced.assets.length, 1);

  const cleared = setBoundReplacementAsset(replaced, resource, null);
  assert.equal(cleared.request, "保留原片节奏");
  assert.equal(cleared.assets.length, 0);
});

test("风格参考同步素材时不显示替换成", () => {
  const resource = { id: "style-reference", type: "style", title: "风格参考", role: "图片4" };
  const project = createInitialProject();
  const uploaded = setBoundReplacementAsset(project, resource, {
    id: "style-reference",
    name: "style.jpg",
    type: "image",
    sourceId: "style-reference",
    role: "图片4",
  });

  assert.equal(uploaded.request, "[风格参考]@图片4");
});

test("新拆解 Demo 的脚本资源以 JSON 驱动三个替换素材槽位", () => {
  assert.match(breakdownText, /以下是根据【视频拆解与复刻框架｜紧凑版】/u);
  assert.match(breakdownText, /### 06｜分镜执行/u);
  assert.deepEqual(
    originalReplacementResources.map(({ id, type, title }) => ({ id, type, title })),
    [
      { id: "person", type: "person", title: "人物1" },
      { id: "product-detail", type: "product", title: "产品1-单粒特写" },
      { id: "product-bottle", type: "product", title: "产品1-瓶装" },
    ],
  );
});

test("元素替换下一步不会在 React 状态更新函数内打印日志", () => {
  const source = readFileSync(new URL("./ViralRemake.jsx", import.meta.url), "utf8");
  const componentStart = source.indexOf("export default function ViralRemake");
  const nextHandler = source.slice(
    source.indexOf("  const next = () => {", componentStart),
    source.indexOf("  const loadDemo =", componentStart),
  );

  assert.match(nextHandler, /logRemakeFlow\(/u);
  assert.doesNotMatch(nextHandler, /setProject\(\(value\) => \{[\s\S]*logRemakeFlow\(/u);
});
