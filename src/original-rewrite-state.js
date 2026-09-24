import { rewriteDemo, rewriteSegments } from "./original-rewrite-data.js";
import { ASPECT_RATIOS } from "./viral-remake-state.js";

export const REWRITE_STORAGE_KEY = "shulan.original-rewrite.project.v1";
export const REWRITE_MODELS = ["seedance 2.0 mini", "seedance 2.0 fast", "seedance 2.0", "seedance 2.5"];

const EMPTY_DOCUMENTS = { breakdown: "", rewrite: "" };
const EMPTY_PROJECT = { step: 1, maxStep: 1, videoName: "", videoPath: "", model: "seedance 2.0", aspectRatio: "9:16", request: "", references: [], documents: EMPTY_DOCUMENTS, segments: [], savedAt: "" };
const validStatus = (status) => status === "done" || status === "idle" ? status : "idle";
const cleanAsset = (asset) => ({ id: String(asset.id || asset.sourceId || asset.role), sourceId: String(asset.sourceId || ""), role: String(asset.role || ""), name: String(asset.name || ""), ...(typeof asset.path === "string" ? { path: asset.path } : {}), ...(typeof asset.preview === "string" ? { preview: asset.preview } : {}) });
const cleanString = (value, fallback = "") => typeof value === "string" ? value : fallback;
const cleanNumber = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const cleanSegment = (segment, fallback = {}) => ({
  ...fallback,
  id: cleanString(segment.id, fallback.id || ""),
  number: cleanNumber(segment.number, fallback.number),
  title: cleanString(segment.title, fallback.title),
  time: cleanString(segment.time, fallback.time),
  shotCount: cleanNumber(segment.shotCount, fallback.shotCount),
  document: cleanString(segment.document, fallback.document || ""),
  redrawPath: cleanString(segment.redrawPath, fallback.redrawPath),
  videoPath: cleanString(segment.videoPath, fallback.videoPath),
  selected: segment.selected !== false,
  redrawStatus: validStatus(segment.redrawStatus),
  videoStatus: validStatus(segment.videoStatus),
});

export function createRewriteProject(saved = {}) {
  let value = saved;
  if (typeof saved === "string") { try { value = JSON.parse(saved); } catch { value = {}; } }
  if (!value || typeof value !== "object" || Array.isArray(value)) value = {};
  const rawSegments = Array.isArray(value.segments) ? value.segments : [];
  const maxStep = Number.isInteger(value.maxStep) && value.maxStep >= 1 && value.maxStep <= 6 ? value.maxStep : 1;
  const savedStep = Number.isInteger(value.step) && value.step >= 1 && value.step <= maxStep ? value.step : 1;
  const hasMissingLocalVideo = typeof value.videoName === "string" && value.videoName && !(typeof value.videoPath === "string" && value.videoPath && !value.videoPath.startsWith("blob:"));
  const step = hasMissingLocalVideo ? 1 : savedStep;
  return {
    ...EMPTY_PROJECT,
    step,
    maxStep,
    videoName: typeof value.videoName === "string" ? value.videoName : "",
    videoPath: typeof value.videoPath === "string" && !value.videoPath.startsWith("blob:") ? value.videoPath : "",
    model: REWRITE_MODELS.includes(value.model) ? value.model : EMPTY_PROJECT.model,
    aspectRatio: ASPECT_RATIOS.includes(value.aspectRatio) ? value.aspectRatio : EMPTY_PROJECT.aspectRatio,
    request: typeof value.request === "string" ? value.request : "",
    references: Array.isArray(value.references) ? value.references.filter((item) => item && typeof item === "object").map(cleanAsset) : [],
    documents: { breakdown: typeof value.documents?.breakdown === "string" ? value.documents.breakdown : "", rewrite: typeof value.documents?.rewrite === "string" ? value.documents.rewrite : "" },
    segments: rawSegments.filter((item) => item && typeof item === "object" && /^segment-[1-4]$/.test(item.id || "")).map((item) => cleanSegment(item, rewriteSegments.find((candidate) => candidate.id === item.id))),
    savedAt: typeof value.savedAt === "string" ? value.savedAt : "",
  };
}

export function loadRewriteDemo(project) {
  return { ...project, videoName: rewriteDemo.videoName, videoPath: rewriteDemo.videoPath, request: rewriteDemo.request, references: rewriteDemo.referenceAssets.map(cleanAsset), documents: { breakdown: rewriteDemo.breakdown, rewrite: rewriteDemo.rewriteDocument }, segments: rewriteSegments.map((item) => cleanSegment(item, item)) };
}

export function replaceRewriteVideo(project, video = {}) {
  return { ...project, step: 1, maxStep: 1, videoName: String(video.name || ""), videoPath: String(video.preview || video.path || ""), documents: { ...EMPTY_DOCUMENTS }, segments: [] };
}
export const clearRewriteVideo = (project) => replaceRewriteVideo(project);
export function setRewriteStep(project, requested) { return { ...project, step: Math.max(1, Math.min(project.maxStep, requested)) }; }

export function canAdvanceRewrite(project) {
  if (project.step === 1) return Boolean(project.videoName.trim());
  if (project.step === 2) return Boolean(project.documents.breakdown);
  if (project.step === 3) return Boolean(project.documents.rewrite);
  if (project.step === 4) return project.segments.length > 0;
  if (project.step === 5) return project.segments.length > 0 && project.segments.every((item) => item.redrawStatus === "done");
  return false;
}
export function advanceRewriteStep(project) { if (!canAdvanceRewrite(project)) return project; const step = Math.min(6, project.step + 1); return { ...project, step, maxStep: Math.max(project.maxStep, step) }; }
export function updateRewriteDocument(project, key, value) { return { ...project, documents: { ...project.documents, [key]: value } }; }
export function upsertRewriteReference(project, asset) { return { ...project, references: [...project.references.filter((item) => item.sourceId !== asset.sourceId), cleanAsset(asset)] }; }
export function removeRewriteReference(project, sourceId) { return { ...project, references: project.references.filter((item) => item.sourceId !== sourceId) }; }
export function updateRewriteSegmentDocument(project, id, document) { return { ...project, segments: project.segments.map((item) => item.id === id ? { ...item, document } : item) }; }
export function toggleRewriteSelection(project, id) { return { ...project, segments: project.segments.map((item) => item.id === id ? { ...item, selected: !item.selected } : item) }; }
export function toggleAllRewriteSelections(project) { const all = project.segments.length > 0 && project.segments.every((item) => item.selected); return { ...project, segments: project.segments.map((item) => ({ ...item, selected: !all })) }; }
export function setRewriteJobStatus(project, kind, id, status) { const key = kind === "video" ? "videoStatus" : "redrawStatus"; return { ...project, segments: project.segments.map((item) => item.id === id ? { ...item, [key]: status } : item) }; }
export function queueRewriteJobs(project, kind, ids) { const key = kind === "video" ? "videoStatus" : "redrawStatus"; const known = new Set(project.segments.map((item) => item.id)); const started = ids.filter((id, index) => known.has(id) && ids.indexOf(id) === index && project.segments.find((item) => item.id === id)?.[key] !== "running"); return { started, project: started.reduce((value, id) => setRewriteJobStatus(value, kind, id, "running"), project) }; }
export function clearRewriteRunningStatuses(project) { return { ...project, segments: project.segments.map((item) => ({ ...item, redrawStatus: item.redrawStatus === "running" ? "idle" : item.redrawStatus, videoStatus: item.videoStatus === "running" ? "idle" : item.videoStatus })) }; }

export function serializeRewriteProject(project) {
  const removePreview = (item) => { const copy = { ...item }; if (typeof copy.preview === "string" && (copy.preview.startsWith("data:") || copy.preview.startsWith("blob:"))) delete copy.preview; return copy; };
  return JSON.stringify({ ...clearRewriteRunningStatuses(project), videoPath: project.videoPath?.startsWith("blob:") ? "" : project.videoPath, references: project.references.map(removePreview), savedAt: new Date().toISOString() });
}
export function persistRewriteProject(storage, project) { storage.setItem(REWRITE_STORAGE_KEY, serializeRewriteProject(project)); }
