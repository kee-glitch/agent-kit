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
