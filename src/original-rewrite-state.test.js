import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  OUTPUT_QUALITIES,
} from "./viral-remake-state.js";
import {
  rewriteDemo,
  rewriteSegments,
  rewriteSteps,
} from "./original-rewrite-data.js";
import {
  REWRITE_STORAGE_KEY,
  addRewriteReferences,
  advanceRewriteStep,
  clearRewriteRunningStatuses,
  createRewriteProject,
  findRewriteDocumentAssets,
  loadRewriteDemo,
  persistRewriteProject,
  queueRewriteJobs,
  removeRewriteAsset,
  replaceRewriteReference,
  replaceRewriteVideo,
  setRewriteJobStatus,
} from "./original-rewrite-state.js";

test("原片仿写持久化清晰度并回退不支持的选项", () => {
  assert.deepEqual(OUTPUT_QUALITIES, ["720P", "1080P"]);
  assert.equal(createRewriteProject().quality, "1080P");
  assert.equal(createRewriteProject({ quality: "720P" }).quality, "720P");
  assert.equal(createRewriteProject({ quality: "2K" }).quality, "1080P");
});

test("逐秒重绘按片段正文首次引用顺序读取现有素材", () => {
  const assets = [
    { id: "image-1", role: "图片1" },
    { id: "image-2", role: "图片2" },
    { id: "image-3", role: "图片3" },
  ];
  assert.deepEqual(
    findRewriteDocumentAssets("先用 @图片2，再用 @图片1，重复 @图片2，缺失 @图片4。", assets),
    [assets[1], assets[0], assets[2]],
  );
  assert.deepEqual(findRewriteDocumentAssets("已经引用 @图片3 和 @图片1", assets), [assets[0], assets[2]]);
  assert.deepEqual(findRewriteDocumentAssets("没有引用", assets), [assets[2]]);
  assert.deepEqual(
    rewriteSegments.map((segment) => findRewriteDocumentAssets(segment.document, rewriteDemo.referenceAssets).map((asset) => asset.role)),
    [["图片2", "图片3"], ["图片2", "图片3"], ["图片1", "图片3"], ["图片1", "图片3"]],
  );
});

test("原片仿写定义六个阶段和四个完整片段", () => {
  assert.deepEqual(rewriteSteps, [
    "上传原视频",
    "原片仿写",
    "展示仿写结果",
    "提取片段",
    "逐秒重绘",
    "生成视频",
  ]);
  assert.equal(rewriteSegments.length, 4);
  for (const segment of rewriteSegments) {
    assert.ok(segment.document.length > 500);
    assert.match(segment.redrawPath, /^\.\/original-rewrite-demo\/redraw-[1-4]\.png$/);
    assert.match(segment.videoPath, /^\.\/original-rewrite-demo\/segment-[1-4]\.mp4$/);
  }
});

test("原片仿写合并拆解内容并在生成结果后进入展示步骤", () => {
  const demo = loadRewriteDemo(createRewriteProject());
  const composing = { ...demo, step: 2, maxStep: 2, documents: { ...demo.documents, rewrite: "" } };
  assert.equal(advanceRewriteStep(composing).step, 2);
  const generated = { ...composing, documents: { ...composing.documents, rewrite: "# 仿写结果" } };
  assert.equal(advanceRewriteStep(generated).step, 3);
});

test("原片仿写公共 Demo 资源全部存在且非空", () => {
  const paths = [
    rewriteDemo.videoPath,
    rewriteDemo.storyboardPath,
    ...rewriteDemo.referenceAssets.map((asset) => asset.path),
    ...rewriteSegments.flatMap((segment) => [segment.redrawPath, segment.videoPath]),
  ];
  for (const path of paths) {
    const file = new URL(`../public/${path.replace(/^\.\//, "")}`, import.meta.url);
    assert.equal(existsSync(file), true, path);
    assert.ok(readFileSync(file).byteLength > 1000, path);
  }
});

test("损坏草稿按字段恢复并重置运行任务", () => {
  const project = createRewriteProject({ step: 99, maxStep: -2, model: "unknown", aspectRatio: "bad", references: "bad", segments: [{ id: "segment-1", redrawStatus: "running", videoStatus: "running" }] });
  assert.equal(project.step, 1);
  assert.equal(project.maxStep, 1);
  assert.equal(project.model, "seedance 2.0");
  assert.equal(project.aspectRatio, "9:16");
  assert.deepEqual(project.references, []);
  assert.equal(clearRewriteRunningStatuses(project).segments[0].redrawStatus, "idle");
});

test("替换原视频清空下游结果但保留模型和画幅", () => {
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

test("原片仿写支持新增、替换和独立删除其他素材", () => {
  const base = loadRewriteDemo(createRewriteProject());
  const added = addRewriteReferences(base, [
    { id: "extra-image", type: "image", name: "extra.png", preview: "data:image/png;base64,x" },
    { id: "extra-audio", type: "audio", name: "voice.mp3", preview: "data:audio/mp3;base64,x" },
  ]);
  assert.deepEqual(added.references.slice(-2).map((asset) => asset.role), ["图片4", "音频1"]);
  const replaced = replaceRewriteReference(added, "extra-image", { type: "video", name: "clip.mp4", preview: "data:video/mp4;base64,x" });
  assert.equal(replaced.references.find((asset) => asset.id === "extra-image").role, "视频1");
  assert.equal(replaced.references.find((asset) => asset.id === "extra-image").name, "clip.mp4");
  const removed = removeRewriteAsset(replaced, "extra-image");
  assert.equal(removed.references.some((asset) => asset.id === "extra-image"), false);
  assert.equal(removed.references.some((asset) => asset.id === "extra-audio"), true);
});

test("全部重绘完成后才可进入生成视频", () => {
  const project = { ...loadRewriteDemo(createRewriteProject()), step: 5, maxStep: 5 };
  assert.equal(advanceRewriteStep(project).step, 5);
  const done = { ...project, segments: project.segments.map((segment) => ({ ...segment, redrawStatus: "done" })) };
  assert.equal(advanceRewriteStep(done).step, 6);
});

test("批量任务忽略缺失和运行中的片段且两类状态独立", () => {
  let project = loadRewriteDemo(createRewriteProject());
  project = setRewriteJobStatus(project, "redraw", "segment-2", "running");
  const result = queueRewriteJobs(project, "redraw", ["segment-1", "segment-2", "missing"]);
  assert.deepEqual(result.started, ["segment-1"]);
  const updated = setRewriteJobStatus(result.project, "video", "segment-1", "done");
  assert.equal(updated.segments[0].redrawStatus, "running");
  assert.equal(updated.segments[0].videoStatus, "done");
});

test("保存草稿移除本地预览并使用独立键", () => {
  const storage = { key: "", value: "", setItem(key, value) { this.key = key; this.value = value; } };
  const project = { ...createRewriteProject(), references: [{ id: "a", sourceId: "product-bottle", role: "图片1", name: "a.png", preview: "data:image/png;base64,abc" }] };
  persistRewriteProject(storage, project);
  assert.equal(storage.key, REWRITE_STORAGE_KEY);
  assert.doesNotMatch(storage.value, /base64/);
});

test("模式选择开放原片仿写并挂载六步工作台", () => {
  const viralSource = readFileSync(new URL("./ViralRemake.jsx", import.meta.url), "utf8");
  const rewriteSource = readFileSync(new URL("./OriginalRewrite.jsx", import.meta.url), "utf8");
  assert.match(viralSource, /onSelect\(mode\.id\)/);
  assert.match(viralSource, /mode === "rewrite"/);
  assert.match(viralSource, /<OriginalRewrite/);
  assert.match(rewriteSource, /rewriteSteps\.map/);
  assert.match(rewriteSource, /aria-label="原片仿写项目进度"/);
});

test("上传和原片仿写阶段提供媒体、Demo、拆解内容与大图预览", () => {
  const source = readFileSync(new URL("./OriginalRewrite.jsx", import.meta.url), "utf8");
  assert.match(source, /accept="video\/mp4,video\/quicktime,\.mp4,\.mov"/);
  assert.match(source, /aria-label="上传原视频"/);
  assert.match(source, /加载 Demo/);
  assert.match(source, /重新生成/);
  assert.match(source, /aria-label="查看逐秒拆解大图"/);
  assert.match(source, /className="rewrite-compose-grid"/);
  assert.match(source, /title="视频拆解与复刻框架"/);
  assert.match(source, /原视频逐秒分镜/);
});

test("拆解框架沿用元素替换的摘要阅读与重新生成功能", () => {
  const source = readFileSync(new URL("./OriginalRewrite.jsx", import.meta.url), "utf8");
  assert.match(source, /meta="视频拆解prompt\.md · 已识别 9 个叙事镜头"/);
  assert.match(source, /点击阅读完整内容/);
  assert.match(source, /aria-label=\{`阅读完整\$\{title\}`\}/);
  assert.match(source, /title: "视频拆解与复刻框架"/);
  assert.match(source, /onRegenerate=/);
});

test("拆解框架摘要预览隐藏内部滚动条", () => {
  const styles = readFileSync(new URL("./original-rewrite.css", import.meta.url), "utf8");
  assert.match(styles, /\.rewrite-document-preview \.rewrite-markdown\{[^}]*overflow:hidden/);
  assert.match(styles, /\.rewrite-markdown\{[^}]*overflow:auto/);
});

test("原视频逐秒分镜预览保持一比一比例且大图不受裁切", () => {
  const styles = readFileSync(new URL("./original-rewrite.css", import.meta.url), "utf8");
  assert.match(styles, /\.rewrite-storyboard-section \.rewrite-storyboard-card\{[^}]*aspect-ratio:1\/1[^}]*height:auto/);
  assert.match(styles, /\.rewrite-storyboard-section \.rewrite-storyboard-card img\{[^}]*object-fit:cover/);
  assert.doesNotMatch(styles, /\.remake-modal-body>img\{[^}]*aspect-ratio:1\/1/);
});

test("原片仿写阶段提供三个引用素材和仿写需求，结果步骤提供故事面板", () => {
  const source = readFileSync(new URL("./OriginalRewrite.jsx", import.meta.url), "utf8");
  const replacementRow = readFileSync(new URL("./BoundReplacementRow.jsx", import.meta.url), "utf8");
  assert.deepEqual(rewriteDemo.referenceAssets.map((item) => item.sourceId), ["product-bottle", "product-detail", "storyboard-style"]);
  assert.match(source, /<BoundReplacementRow/);
  assert.match(replacementRow, /accept=\{BOUND_ASSET_ACCEPT\}/);
  assert.match(source, /素材已清空，点击上传/);
  assert.match(source, />仿写需求 <small>/);
  assert.match(source, /title="原片仿写结果"/);
  assert.doesNotMatch(source, />\s*(?:编辑|取消编辑|保存修改)\s*</);
  assert.doesNotMatch(source, />\s*重新开始\s*</);
});

test("三个复刻模式统一使用共享遮罩播放器", () => {
  const playerUrl = new URL("./VideoPreviewModal.jsx", import.meta.url);
  const rewriteSource = readFileSync(new URL("./OriginalRewrite.jsx", import.meta.url), "utf8");
  const viralSource = readFileSync(new URL("./ViralRemake.jsx", import.meta.url), "utf8");
  assert.equal(existsSync(playerUrl), true, "应提供共享视频遮罩播放器");
  assert.match(rewriteSource, /<VideoPreviewModal/);
  assert.match(viralSource, /<VideoPreviewModal/);
});

test("提取片段提供选择、全选和只读详情", () => {
  const source = readFileSync(new URL("./OriginalRewrite.jsx", import.meta.url), "utf8");
  assert.match(source, /aria-pressed=\{segment\.selected\}/);
  assert.match(source, /全选/);
  assert.match(source, /aria-label={`查看\$\{label\}完整内容`}/);
  assert.match(source, /content: <AssetMarkdown value=\{activeSegment\.document\}/);
});

test("原片仿写每个步骤分别打印当前步骤输入输出", () => {
  const source = readFileSync(new URL("./OriginalRewrite.jsx", import.meta.url), "utf8");
  assert.match(source, /const rewriteStepOperations = \{ 1: "拆解视频", 2: "生成仿写结果", 3: "提取片段", 4: "确认片段", 5: "逐秒重绘", 6: "生成视频" \}/);
  assert.match(source, /logRemakeFlow\("rewrite", 3, rewriteStepOperations\[3\]/);
  assert.match(source, /logRemakeFlow\("rewrite", step, rewriteStepOperations\[step\]/);
});

test("原片仿写下一步不会在 React 状态更新函数内打印日志", () => {
  const source = readFileSync(new URL("./OriginalRewrite.jsx", import.meta.url), "utf8");
  const nextHandler = source.slice(source.indexOf("  const next ="), source.indexOf("  const loadDemo ="));

  assert.match(nextHandler, /logRemakeFlow\(/u);
  assert.doesNotMatch(nextHandler, /setProject\(\(value\) => \{[\s\S]*logRemakeFlow\(/u);
});

test("重绘和视频阶段提供单段批量生成及原生播放", () => {
  const source = readFileSync(new URL("./OriginalRewrite.jsx", import.meta.url), "utf8");
  assert.match(source, /批量生成重绘/);
  assert.match(source, /批量生成视频/);
  assert.match(source, /controls/);
  assert.match(source, /项目已完成/);
});

test("模式页说明同步开放状态且 Demo 长需求可继续编辑", () => {
  const viralSource = readFileSync(new URL("./ViralRemake.jsx", import.meta.url), "utf8");
  const rewriteSource = readFileSync(new URL("./OriginalRewrite.jsx", import.meta.url), "utf8");
  assert.match(viralSource, /当前开放元素替换与原片仿写、结构仿写/);
  assert.ok(rewriteDemo.request.length > 500);
  assert.match(rewriteSource, /const REQUEST_LIMIT = 1000/);
  assert.match(rewriteSource, /maxLength=\{REQUEST_LIMIT\}/);
});

test("损坏片段展示字段和矛盾步骤会恢复安全值", () => {
  const project = createRewriteProject({
    step: 6,
    maxStep: 1,
    videoName: "demo.mp4",
    segments: [{ id: "segment-1", title: { bad: true }, time: [], number: {}, redrawPath: 4, videoPath: null }],
  });
  assert.equal(project.step, 1);
  assert.equal(project.maxStep, 1);
  assert.equal(project.segments[0].title, rewriteSegments[0].title);
  assert.equal(project.segments[0].time, rewriteSegments[0].time);
  assert.equal(project.segments[0].number, 1);
  const missingLocalVideo = createRewriteProject({ step: 4, maxStep: 4, videoName: "local.mp4", videoPath: "" });
  assert.equal(missingLocalVideo.step, 1);
});

test("生产资源路径跟随 Vite base 而不是站点根目录", () => {
  const paths = [rewriteDemo.videoPath, rewriteDemo.storyboardPath, ...rewriteSegments.flatMap((item) => [item.redrawPath, item.videoPath])];
  paths.forEach((path) => assert.match(path, /^\.\/original-rewrite-demo\//));
});

test("工作流具备任务失效、独立生成、重提取和实时片段弹层", () => {
  const source = readFileSync(new URL("./OriginalRewrite.jsx", import.meta.url), "utf8");
  assert.match(source, /operationEpoch/);
  assert.match(source, /生成仿写结果/);
  assert.match(source, /重新生成仿写结果/);
  assert.match(source, /重新提取片段/);
  assert.match(source, /type: "segment"/);
  assert.match(source, /重新选择原视频/);
  assert.match(source, /<BoundReplacementRow/);
});

test("需求编辑器支持素材候选、失效提示和键盘列表", () => {
  const source = readFileSync(new URL("./AssetMentions.jsx", import.meta.url), "utf8");
  assert.match(source, /role="listbox"/);
  assert.match(source, /role="option"/);
  assert.match(source, /素材已删除/);
  assert.match(source, /ArrowDown/);
});

test("弹层限制焦点且窄屏标题取消固定高度", () => {
  const source = readFileSync(new URL("./OriginalRewrite.jsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("./original-rewrite.css", import.meta.url), "utf8");
  assert.match(source, /getTrappedFocusTarget/);
  assert.match(source, /event\.key === "Tab"/);
  assert.match(styles, /\.rewrite-stage-heading\{[^}]*height:auto/);
});

test("原片仿写按钮沿用元素替换的统一规格", () => {
  const styles = readFileSync(new URL("./original-rewrite.css", import.meta.url), "utf8");
  assert.match(styles, /\.original-rewrite :where\(button:not\(\.rewrite-segment-select\):not\(\.rewrite-output-media\):not\(\.rewrite-storyboard-card button\)\)\{[^}]*height:36px/);
  assert.match(styles, /\.original-rewrite button\.primary\{[^}]*background:var\(--color-bg-inverse\)/);
  assert.match(styles, /\.original-rewrite button:disabled\{[^}]*background:var\(--color-bg-subtle\)[^}]*color:var\(--color-text-disabled\)/);
  assert.match(styles, /\.original-rewrite button:focus-visible/);
});

test("原片仿写与元素替换使用一致的双层项目标题栏", () => {
  const rewrite = readFileSync(new URL("./OriginalRewrite.jsx", import.meta.url), "utf8");
  const rewriteStyles = readFileSync(new URL("./original-rewrite.css", import.meta.url), "utf8");
  const viralStyles = readFileSync(new URL("./viral-remake.css", import.meta.url), "utf8");
  assert.match(rewrite, /<div className="rewrite-project-title">[\s\S]*?<button[\s\S]*?<div>[\s\S]*?<span>爆款复刻 \/ 原片仿写<\/span>[\s\S]*?<strong>\{project\.videoName \|\| "未命名项目"\}<\/strong>[\s\S]*?<\/div>/);
  assert.match(rewriteStyles, /\.rewrite-project-header\{[^}]*height:72px[^}]*padding:0 clamp\(24px,4vw,56px\)/);
  assert.match(rewriteStyles, /\.rewrite-project-title>div>span,\.rewrite-project-title>div>strong\{display:block\}/);
  assert.match(rewriteStyles, /\.rewrite-project-title>div>span\{[^}]*font:var\(--type-body-sm\)/);
  assert.match(rewriteStyles, /\.rewrite-project-title>div>strong\{[^}]*margin-top:2px[^}]*font:var\(--type-label\)/);
  assert.match(viralStyles, /\.remake-project-header \{[\s\S]*?height: 72px;[\s\S]*?padding: 0 clamp\(24px, 4vw, 56px\);/);
});

test("原片仿写六步导航沿用元素替换的白底连线样式", () => {
  const source = readFileSync(new URL("./OriginalRewrite.jsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("./original-rewrite.css", import.meta.url), "utf8");
  assert.match(source, /index < rewriteSteps\.length - 1 && <i aria-hidden="true"/);
  assert.match(styles, /\.rewrite-steps\{[^}]*background:var\(--color-bg-surface\)/);
  assert.match(styles, /\.rewrite-steps button>i\{[^}]*left:50%[^}]*right:-50%[^}]*height:1px/);
  assert.match(styles, /\.rewrite-steps button\.complete>i\{background:var\(--color-success\)/);
  assert.match(styles, /\.rewrite-steps button\.complete>span\{[^}]*background:var\(--color-success-subtle\)/);
});

test("原片仿写复用带缩略图的资源引用并提供未生成状态", () => {
  const sharedUrl = new URL("./AssetMentions.jsx", import.meta.url);
  assert.equal(existsSync(sharedUrl), true, "应提取共享资源引用组件");
  const shared = readFileSync(sharedUrl, "utf8");
  const rewrite = readFileSync(new URL("./OriginalRewrite.jsx", import.meta.url), "utf8");
  const viral = readFileSync(new URL("./ViralRemake.jsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("./original-rewrite.css", import.meta.url), "utf8");
  assert.match(shared, /export function MentionEditor/);
  assert.match(shared, /export function AssetMarkdown/);
  assert.match(shared, /remake-token-thumb/);
  assert.match(rewrite, /className="remake-selected-file"/);
  assert.match(rewrite, /尚未生成故事面板/);
  assert.match(rewrite, /<MentionEditor/);
  assert.match(rewrite, /<AssetMarkdown/);
  assert.match(viral, /import \{ AssetMarkdown, MentionEditor \} from "\.\/AssetMentions"/);
  assert.match(styles, /\.rewrite-steps button:hover\{background:transparent\}/);
});

test("提取片段使用元素替换的单列故事面板卡片", () => {
  const source = readFileSync(new URL("./OriginalRewrite.jsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("./original-rewrite.css", import.meta.url), "utf8");
  assert.match(source, /className={`remake-segment-card\$\{segment\.selected \? " selected" : ""\}`}/);
  assert.match(source, /className="remake-segment-preview"/);
  assert.match(source, /故事面板已就绪/);
  assert.match(source, /More <Maximize2/);
  assert.match(source, /<AssetMarkdown value=\{segment\.document\} assets=\{assets\}/);
  assert.match(styles, /\.rewrite-segment-list\{display:grid;gap:var\(--space-5\)\}/);
});

test("原片仿写弹窗复用元素替换的遮罩和弹窗结构", () => {
  const source = readFileSync(new URL("./OriginalRewrite.jsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("./original-rewrite.css", import.meta.url), "utf8");
  assert.match(source, /className="remake-modal rewrite-modal-layer"/);
  assert.match(source, /modal\.segment \|\| modal\.markdown \? "remake-markdown-modal" : "remake-segment-modal"/);
  assert.match(source, /className="remake-modal-footer"/);
  assert.match(source, /className="remake-modal-close"/);
  assert.doesNotMatch(styles, /\.rewrite-modal(?:-card|-body)?\{/);
});

test("逐秒分镜大图弹窗复用元素替换的最大宽度", () => {
  const source = readFileSync(new URL("./OriginalRewrite.jsx", import.meta.url), "utf8");
  const sharedStyles = readFileSync(new URL("./viral-remake.css", import.meta.url), "utf8");
  assert.match(source, /modal\.image \? "remake-image-viewer"/);
  assert.match(source, /title: "逐秒拆解分镜", image: true/);
  assert.match(sharedStyles, /\.remake-image-viewer,[\s\S]*?width: min\(1320px, 100%\)/);
  assert.match(sharedStyles, /\.remake-markdown-modal \{[\s\S]*?width: min\(1320px,/);
});

test("原片仿写六个步骤使用统一的页面宽度", () => {
  const styles = readFileSync(new URL("./original-rewrite.css", import.meta.url), "utf8");
  assert.match(styles, /\.rewrite-steps\{[^}]*width:min\(1320px,100%\)/);
  assert.match(styles, /\.rewrite-stage\{[^}]*width:min\(1320px,calc\(100% - 48px\)\)/);
  assert.doesNotMatch(styles, /\.rewrite-compose-stage\{[^}]*width:/);
});

test("逐秒重绘大图使用统一的大图弹窗", () => {
  const source = readFileSync(new URL("./OriginalRewrite.jsx", import.meta.url), "utf8");
  assert.match(source, /title: `\$\{segment\.title\}重绘分镜`, image: true/);
});

test("原片仿写所有遮罩弹窗统一最大宽度", () => {
  const source = readFileSync(new URL("./OriginalRewrite.jsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("./original-rewrite.css", import.meta.url), "utf8");
  assert.match(source, /className="remake-modal rewrite-modal-layer"/);
  assert.match(styles, /\.rewrite-modal-layer :is\(\.remake-image-viewer,\.remake-segment-modal,\.remake-video-modal,\.remake-markdown-modal\)\{width:min\(1320px,100%\)\}/);
});

test("原片仿写遮罩弹窗对齐主内容区", () => {
  const source = readFileSync(new URL("./OriginalRewrite.jsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("./original-rewrite.css", import.meta.url), "utf8");
  assert.doesNotMatch(source, /createPortal/);
  assert.match(styles, /\.rewrite-modal-layer\{padding-left:116px;padding-right:40px\}/);
  assert.match(styles, /@media\(max-width:720px\)\{\.rewrite-modal-layer\{padding:var\(--space-4\)\}\}/);
});

test("逐秒重绘使用单列参数列表展示片段时长和参考资源", () => {
  const source = readFileSync(new URL("./OriginalRewrite.jsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("./original-rewrite.css", import.meta.url), "utf8");
  assert.match(source, /className="rewrite-redraw-list"/);
  assert.match(source, /<dt>片段<\/dt>/);
  assert.match(source, /<dt>时长<\/dt>/);
  assert.match(source, /<dt>参考资源<\/dt>/);
  assert.match(source, /referencedAssets\.map\(\(asset\) =>/);
  assert.match(source, /<AssetMention asset=\{asset\} reference=\{asset\.role\} \/>/);
  assert.match(styles, /\.rewrite-redraw-list\{display:grid;grid-template-columns:1fr/);
  assert.doesNotMatch(styles, /\.rewrite-output-grid,.rewrite-video-grid\{display:grid;grid-template-columns:1fr 1fr/);
});

test("逐秒重绘保留三项命名资源配置且隐藏片段标题", () => {
  const source = readFileSync(new URL("./OriginalRewrite.jsx", import.meta.url), "utf8");
  assert.equal(createRewriteProject().referenceCounters.image, 3);
  assert.equal(rewriteDemo.referenceAssets.length, 3);
  assert.deepEqual(rewriteDemo.referenceAssets.map((asset) => [asset.role, asset.label]), [
    ["图片1", "WindBoss Cortisol Health瓶装产品"],
    ["图片2", "WindBoss琥珀色软胶囊"],
    ["图片3", "分镜风格参考"],
  ]);
  assert.match(source, /<dt>参考资源<\/dt>/);
  assert.match(source, /findRewriteDocumentAssets\(segment\.document, assets\)/);
  assert.match(source, /referencedAssets\.map\(\(asset\) => <span className="rewrite-redraw-reference"/);
  assert.match(source, /<span>无参考资源<\/span>/);
  assert.match(source, /asset\.label \|\| rewriteReferences\.find/);
  assert.doesNotMatch(source, /<small>\{segment\.title\}<\/small>/);
});

test("逐秒重绘使用紧凑列表和生成按钮三态文案", () => {
  const source = readFileSync(new URL("./OriginalRewrite.jsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("./original-rewrite.css", import.meta.url), "utf8");
  assert.match(source, /segment\.redrawStatus === "running" \? "生成中" : segment\.redrawStatus === "done" \? "重新生成" : "生成"/);
  assert.match(source, /segment\.redrawStatus === "running" \? <LoaderCircle className="spin" \/> : <RefreshCw \/>/);
  assert.match(styles, /\.rewrite-redraw-row\{[^}]*grid-template-columns:96px minmax\(0,1fr\) 110px/);
  assert.match(styles, /\.rewrite-output-media\{[^}]*width:96px;height:96px/);
  assert.match(styles, /\.rewrite-redraw-params\{[^}]*padding:var\(--space-3\) var\(--space-4\)/);
});

test("逐秒重绘复用片段故事面板的全选操作和黑色选中边框", () => {
  const source = readFileSync(new URL("./OriginalRewrite.jsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("./original-rewrite.css", import.meta.url), "utf8");
  assert.match(source, /className="remake-batch-actions"/);
  assert.match(source, /className="remake-select-all-button"/);
  assert.match(source, /selectedIds\.length\}\/\{project\.segments\.length/);
  assert.match(source, /className={`rewrite-redraw-row\$\{segment\.selected \? " selected" : ""\}`}/);
  assert.match(source, /toggleAllRewriteSelections/);
  assert.match(source, /toggleRewriteSelection/);
  assert.match(styles, /\.rewrite-redraw-row\.selected\{border:2px solid var\(--color-bg-inverse\)\}/);
  assert.doesNotMatch(styles, /\.rewrite-redraw-row\.selected::after/);
});

test("逐秒重绘压缩固定参数列并为参考资源保留剩余空间", () => {
  const styles = readFileSync(new URL("./original-rewrite.css", import.meta.url), "utf8");
  assert.match(styles, /\.rewrite-redraw-row\{grid-template-columns:96px minmax\(0,1fr\) 110px\}/);
  assert.match(styles, /\.rewrite-redraw-params\{grid-template-columns:90px 56px minmax\(0,1fr\);align-self:start;gap:var\(--space-3\);padding:var\(--space-3\) var\(--space-4\) var\(--space-3\) 45px\}/);
  assert.match(styles, /\.rewrite-redraw-actions\{[^}]*padding:var\(--space-3\) var\(--space-4\) var\(--space-3\) 0/);
});

test("逐秒重绘参数区左侧留白四十五像素并统一顶部对齐", () => {
  const styles = readFileSync(new URL("./original-rewrite.css", import.meta.url), "utf8");
  assert.match(styles, /\.rewrite-redraw-params\{[^}]*align-self:start;[^}]*padding:var\(--space-3\) var\(--space-4\) var\(--space-3\) 45px/);
  assert.match(styles, /\.rewrite-redraw-params>div\{[^}]*align-content:start/);
});

test("逐秒重绘移除独立状态胶囊并仅由按钮反馈状态", () => {
  const source = readFileSync(new URL("./OriginalRewrite.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /<span className=\{`rewrite-status \$\{segment\.redrawStatus\}`\}>\{statusText\[segment\.redrawStatus\]\}<\/span>/);
  assert.match(source, /disabled=\{segment\.redrawStatus === "running"\}/);
  assert.match(source, /<LoaderCircle className="spin" \/>/);
});

test("提取片段隐藏业务标题并展示时长和镜头范围", () => {
  const source = readFileSync(new URL("./OriginalRewrite.jsx", import.meta.url), "utf8");
  assert.match(source, /segment\.time} · \{segment\.duration} · \{segment\.shots/);
  assert.doesNotMatch(source, /segment\.shotCount} 个镜头 · \{segment\.title/);
  assert.deepEqual(
    rewriteSegments.map(({ duration, shots }) => [duration, shots]),
    [["15s", "镜头 1–4"], ["15s", "镜头 5–8"], ["15s", "镜头 9–12"], ["14s", "镜头 13–16"]],
  );
});

test("片段详情弹窗使用宽幅只读故事面板和完整参数", () => {
  const source = readFileSync(new URL("./OriginalRewrite.jsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("./original-rewrite.css", import.meta.url), "utf8");
  assert.match(source, /className=\{modal\.segment \? "remake-segment-modal-header" : undefined\}/);
  assert.match(source, /片段 \{String\(modal\.segment\.number\)\.padStart\(2, "0"\)}/);
  assert.match(source, /modal\.segment\.time} · \{modal\.segment\.duration} · \{modal\.segment\.shots/);
  assert.match(source, /content: <AssetMarkdown value=\{activeSegment\.document\} assets=\{referenceAssets\} \/>/);
  assert.doesNotMatch(source, /title={`\$\{activeSegment\.title\}故事面板`}/);
  assert.doesNotMatch(styles, /rewrite-segment-modal/);
});

test("片段详情复用元素替换的 Markdown 阅读布局", () => {
  const source = readFileSync(new URL("./OriginalRewrite.jsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("./original-rewrite.css", import.meta.url), "utf8");
  assert.match(source, /modal\.segment \|\| modal\.image \? modal\.content : <div className="remake-modal-body">\{modal\.content\}<\/div>/);
  assert.doesNotMatch(source, /rewrite-segment-modal/);
  assert.doesNotMatch(styles, /rewrite-segment-modal/);
});

test("原片仿写素材区提供替换资源和新增其他素材", () => {
  const source = readFileSync(new URL("./OriginalRewrite.jsx", import.meta.url), "utf8");
  assert.match(source, /替换资源/);
  assert.match(source, /新增其他素材/);
  assert.match(source, /accept=\{GENERAL_ASSET_ACCEPT\}/);
  assert.match(source, /multiple/);
  assert.match(source, /className="remake-other-asset"/);
  assert.match(source, /className="remake-asset-row"/);
  assert.match(source, /project\.references\.filter\(\(asset\) => !asset\.sourceId\)/);
});
