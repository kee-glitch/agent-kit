export const ELEMENT_DRAFTS_KEY = "shulan.element-remake.drafts.v1";
export const ELEMENT_COLUMNS_DRAFTS_KEY = "shulan.element-columns-remake.drafts.v1";
export const REWRITE_DRAFTS_KEY = "shulan.original-rewrite.drafts.v1";
export const STRUCTURE_DRAFTS_KEY = "shulan.structure-remake.drafts.v1";
export const STRUCTURE_COLUMNS_DRAFTS_KEY = "shulan.structure-columns-remake.drafts.v1";
export const REWRITE_COLUMNS_DRAFTS_KEY = "shulan.rewrite-columns-remake.drafts.v1";

const DRAFT_MODE_LABELS = { element: "元素替换", "element-columns": "元素替换（四屏）", rewrite: "原片仿写", structure: "结构仿写", "structure-columns": "结构仿写（四列）", "rewrite-columns": "原片仿写（四屏）" };
export const getDraftModeLabel = (mode) => DRAFT_MODE_LABELS[mode] || DRAFT_MODE_LABELS.element;

const cleanDraft = (value) => ({
  id: String(value?.id || ""),
  title: String(value?.title || "未命名项目"),
  mode: ["element", "element-columns", "rewrite", "structure", "structure-columns", "rewrite-columns"].includes(value?.mode) ? value.mode : "element",
  pinned: value?.pinned === true,
  updatedAt: String(value?.updatedAt || "刚刚"),
  project: value?.project && typeof value.project === "object" && !Array.isArray(value.project) ? value.project : {},
});

export function createDraftCollection(saved = []) {
  let value = saved;
  if (typeof saved === "string") { try { value = JSON.parse(saved); } catch { value = []; } }
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item === "object" && item.id).map(cleanDraft);
}

const sortDrafts = (drafts) => [...drafts].sort((a, b) => Number(b.pinned) - Number(a.pinned));

export function saveDraft(drafts, { mode, project }, id, now = new Date().toISOString()) {
  const draftId = id || `draft-${Date.now()}`;
  const current = drafts.find((item) => item.id === draftId);
  const next = cleanDraft({
    ...current,
    id: draftId,
    mode,
    title: current?.title || project.videoName || "未命名项目",
    pinned: current?.pinned,
    updatedAt: now,
    project,
  });
  return sortDrafts([next, ...drafts.filter((item) => item.id !== draftId)]);
}

export const filterDrafts = (drafts, query) => {
  const keyword = String(query || "").trim().toLocaleLowerCase();
  return keyword ? drafts.filter((item) => item.title.toLocaleLowerCase().includes(keyword)) : drafts;
};
export const updateDraftTitle = (drafts, id, title) => drafts.map((item) => item.id === id ? { ...item, title: String(title).trim() || item.title } : item);
export const toggleDraftPin = (drafts, id) => sortDrafts(drafts.map((item) => item.id === id ? { ...item, pinned: !item.pinned } : item));
export const deleteDraft = (drafts, id) => drafts.filter((item) => item.id !== id);
export const persistDrafts = (storage, key, drafts) => storage.setItem(key, JSON.stringify(drafts));
