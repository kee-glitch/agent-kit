import test from "node:test";
import assert from "node:assert/strict";
import {
  ELEMENT_DRAFTS_KEY,
  REWRITE_DRAFTS_KEY,
  STRUCTURE_DRAFTS_KEY,
  createDraftCollection,
  deleteDraft,
  filterDrafts,
  getDraftModeLabel,
  saveDraft,
  toggleDraftPin,
  updateDraftTitle,
} from "./remake-drafts-state.js";

test("三个复刻模块使用独立的草稿记录存储键", () => {
  assert.notEqual(ELEMENT_DRAFTS_KEY, REWRITE_DRAFTS_KEY);
  assert.notEqual(ELEMENT_DRAFTS_KEY, STRUCTURE_DRAFTS_KEY);
  assert.notEqual(REWRITE_DRAFTS_KEY, STRUCTURE_DRAFTS_KEY);
});

test("结构仿写草稿会保留所属模式", () => {
  const [draft] = createDraftCollection([
    { id: "structure-1", title: "结构任务", mode: "structure", project: {} },
  ]);
  assert.equal(draft.mode, "structure");
  assert.equal(getDraftModeLabel(draft.mode), "结构仿写");
});

test("保存草稿可新增和更新同一条记录", () => {
  const first = saveDraft([], { mode: "element", project: { videoName: "原片.mp4" } }, "draft-1", "2026-09-27T10:00:00.000Z");
  assert.equal(first.length, 1);
  assert.equal(first[0].title, "原片.mp4");
  const updated = saveDraft(first, { mode: "element", project: { videoName: "新版.mp4" } }, "draft-1", "2026-09-27T11:00:00.000Z");
  assert.equal(updated.length, 1);
  assert.equal(updated[0].project.videoName, "新版.mp4");
});

test("草稿记录支持搜索、重命名、置顶和删除", () => {
  const drafts = createDraftCollection([
    { id: "a", title: "瓶装产品演示", mode: "element", updatedAt: "昨天", project: {} },
    { id: "b", title: "故事仿写", mode: "element", updatedAt: "刚刚", project: {} },
  ]);
  assert.deepEqual(filterDrafts(drafts, "瓶装").map((item) => item.id), ["a"]);
  assert.equal(updateDraftTitle(drafts, "a", "新版瓶装")[0].title, "新版瓶装");
  assert.equal(toggleDraftPin(drafts, "b")[0].id, "b");
  assert.deepEqual(deleteDraft(drafts, "a").map((item) => item.id), ["b"]);
});
