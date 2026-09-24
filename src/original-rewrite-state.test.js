import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  rewriteDemo,
  rewriteSegments,
  rewriteSteps,
} from "./original-rewrite-data.js";

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
