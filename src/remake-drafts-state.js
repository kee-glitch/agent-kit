export const ELEMENT_DRAFTS_KEY = "shulan.element-remake.drafts.v1";
export const REWRITE_DRAFTS_KEY = "shulan.original-rewrite.drafts.v1";

const cleanDraft = (value) => ({
  id: String(value?.id || ""),
  title: String(value?.title || "未命名项目"),
  mode: value?.mode === "rewrite" ? "rewrite" : "element",
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
