import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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

test("结构仿写作为独立模式开放并使用隔离草稿", () => {
  const structureMode = modes.find((mode) => mode.id === "structure");
  const rewriteMode = modes.find((mode) => mode.id === "rewrite");

  assert.equal(structureMode?.active, true);
  assert.equal(rewriteMode?.active, true);
  assert.equal(getStorageKey("element"), "shulan.viral-remake.project.v1");
  assert.equal(
    getStorageKey("structure"),
    "shulan.viral-remake.structure.project.v1",
  );
  assert.equal(structureDemo.aspectRatio, "1:1");
  assert.equal(structureDemo.referenceImage.endsWith("/structure-storyboard.jpg"), true);
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

  assert.equal(closeButtons.length, 6);
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
    6,
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
    2,
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
