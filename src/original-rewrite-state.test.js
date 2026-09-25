import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  rewriteDemo,
  rewriteSegments,
  rewriteSteps,
} from "./original-rewrite-data.js";
import {
  REWRITE_STORAGE_KEY,
  advanceRewriteStep,
  clearRewriteRunningStatuses,
  createRewriteProject,
  loadRewriteDemo,
  persistRewriteProject,
  queueRewriteJobs,
  replaceRewriteVideo,
  setRewriteJobStatus,
} from "./original-rewrite-state.js";

test("原片仿写定义六个阶段和四个完整片段", () => {
  assert.deepEqual(rewriteSteps, [
    "上传原视频",
    "拆解视频",
    "原片仿写",
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

test("上传和拆解阶段提供媒体、Demo、重新拆解与大图预览", () => {
  const source = readFileSync(new URL("./OriginalRewrite.jsx", import.meta.url), "utf8");
  assert.match(source, /accept="video\/mp4,video\/quicktime,\.mp4,\.mov"/);
  assert.match(source, /aria-label="上传原视频"/);
  assert.match(source, /加载 Demo/);
  assert.match(source, /重新拆解/);
  assert.match(source, /aria-label="查看逐秒拆解大图"/);
});

test("原片仿写阶段提供两个引用素材、需求和可编辑故事面板", () => {
  const source = readFileSync(new URL("./OriginalRewrite.jsx", import.meta.url), "utf8");
  assert.deepEqual(rewriteDemo.referenceAssets.map((item) => item.sourceId), ["product-bottle", "product-detail"]);
  assert.match(source, /accept="image\/\*"/);
  assert.match(source, /素材已删除/);
  assert.match(source, /editLabel="编辑原片仿写故事面板"/);
});

test("提取片段提供选择、全选和只读详情", () => {
  const source = readFileSync(new URL("./OriginalRewrite.jsx", import.meta.url), "utf8");
  assert.match(source, /aria-pressed=\{segment\.selected\}/);
  assert.match(source, /全选/);
  assert.match(source, /aria-label={`查看\$\{label\}完整内容`}/);
  assert.match(source, /content: <AssetMarkdown value=\{activeSegment\.document\}/);
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
  assert.match(viralSource, /当前开放元素替换与原片仿写/);
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
  assert.match(source, /重新生成故事面板/);
  assert.match(source, /重新提取片段/);
  assert.match(source, /type: "segment"/);
  assert.match(source, /重新选择原视频/);
  assert.match(source, /重新选择图片/);
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
  assert.match(rewrite, /className="rewrite-video-ready"/);
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
  assert.match(source, /className="remake-modal"/);
  assert.match(source, /className={`remake-segment-modal/);
  assert.match(source, /className="remake-modal-body"/);
  assert.match(source, /className="remake-modal-footer"/);
  assert.match(source, /className="remake-modal-close"/);
  assert.doesNotMatch(styles, /\.rewrite-modal(?:-card|-body)?\{/);
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
  assert.match(source, /className=\{modal\.segment \? "rewrite-segment-modal-heading" : undefined\}/);
  assert.match(source, /片段 \{String\(modal\.segment\.number\)\.padStart\(2, "0"\)}/);
  assert.match(source, /modal\.segment\.time} · \{modal\.segment\.duration} · \{modal\.segment\.shots/);
  assert.match(source, /content: <AssetMarkdown value=\{activeSegment\.document\} assets=\{referenceAssets\} \/>/);
  assert.doesNotMatch(source, /title={`\$\{activeSegment\.title\}故事面板`}/);
  assert.match(styles, /\.remake-segment-modal\.rewrite-segment-modal\{width:min\(1600px,100%\)\}/);
});
