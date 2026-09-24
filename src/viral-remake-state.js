export const STORAGE_KEY = "shulan.viral-remake.project.v1";
export const BOUND_ASSET_ACCEPT = "image/*";
export const GENERAL_ASSET_ACCEPT = "image/*,audio/*,video/*";

const EMPTY_PROJECT = {
  step: 1,
  maxStep: 1,
  videoName: "",
  request: "",
  model: "seedance 2.0",
  aspectRatio: "9:16",
  assets: [],
  assetCounters: { image: 3, audio: 0, video: 0 },
  documents: {},
  generation: {},
};

export const ASPECT_RATIOS = [
  "9:16",
  "16:9",
  "21:9",
  "3:4",
  "4:3",
  "1:1",
  "adaptive",
];

const MEDIA_LABELS = { image: "图片", audio: "音频", video: "视频" };

export function getMediaType(file = {}) {
  const mime = typeof file.type === "string" ? file.type.toLowerCase() : "";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  const extension =
    typeof file.name === "string"
      ? file.name.split(".").pop()?.toLowerCase()
      : "";
  if (["jpg", "jpeg", "png", "webp", "gif", "avif"].includes(extension))
    return "image";
  if (["mp3", "wav", "m4a", "aac", "ogg", "flac"].includes(extension))
    return "audio";
  if (["mp4", "mov", "webm", "mkv", "avi"].includes(extension)) return "video";
  return "image";
}

export function nextAssetLabel(assets, type, counters = {}) {
  const prefix = MEDIA_LABELS[type] || MEDIA_LABELS.image;
  const highest = assets.reduce(
    (max, asset) => {
      const match =
        typeof asset.role === "string"
          ? asset.role.match(new RegExp(`^${prefix}(\\d+)$`))
          : null;
      return match ? Math.max(max, Number(match[1])) : max;
    },
    Number.isInteger(counters[type]) ? counters[type] : 0,
  );
  return `${prefix}${highest + 1}`;
}

export function addSequencedAssets(project, additions) {
  const counters = { ...EMPTY_PROJECT.assetCounters, ...project.assetCounters };
  counters.image = Math.max(3, counters.image || 0);
  const assets = [...project.assets];
  additions.forEach((addition) => {
    const type = ["image", "audio", "video"].includes(addition.type)
      ? addition.type
      : "image";
    const role =
      typeof addition.role === "string" && addition.role
        ? addition.role
        : nextAssetLabel(assets, type, counters);
    const number = Number(role.match(/\d+$/)?.[0] || 0);
    counters[type] = Math.max(counters[type] || 0, number);
    assets.push({ ...addition, type, role });
  });
  return { ...project, assets, assetCounters: counters };
}

export function findBoundReplacementAsset(assets, sourceId) {
  return assets.find((asset) => asset.sourceId === sourceId);
}

export function beginLatestRequest(latestByKey, key) {
  const request = (latestByKey.get(key) || 0) + 1;
  latestByKey.set(key, request);
  return request;
}

export function isLatestRequest(latestByKey, key, request) {
  return latestByKey.get(key) === request;
}

export function upsertBoundReplacementAsset(project, addition) {
  const existing = findBoundReplacementAsset(project.assets, addition.sourceId);
  if (!existing) return addSequencedAssets(project, [addition]);
  return updateReplacementAsset(project, existing.id, {
    ...addition,
    id: existing.id,
    role: existing.role,
    sourceId: existing.sourceId,
  });
}

export function findMentionCandidates(assets, query = "") {
  const normalized = query.trim().toLowerCase();
  return assets.filter(
    (asset) => !normalized || asset.role.toLowerCase().includes(normalized),
  );
}

export function splitAssetMentions(text = "") {
  return String(text)
    .split(/(@(?:图片|音频|视频)\d+)/g)
    .filter(Boolean)
    .map((value) => {
      const match = value.match(/^@((?:图片|音频|视频)\d+)$/);
      return match
        ? { type: "mention", value, role: match[1] }
        : { type: "text", value };
    });
}

export function parseAssetReferenceHref(href = "") {
  if (!href.startsWith("#asset-")) return null;
  try {
    const role = decodeURIComponent(href.slice(7));
    return /^(?:图片|音频|视频)\d+$/.test(role) ? role : null;
  } catch {
    return null;
  }
}

export function moveMentionSelection(current, direction, count) {
  if (!count) return 0;
  return (current + direction + count) % count;
}

export function getMentionMenuPosition(
  caret,
  containerWidth,
  menuWidth = 320,
  gap = 6,
  inset = 16,
) {
  const availableWidth = Math.max(0, containerWidth - inset * 2);
  const actualMenuWidth = Math.min(menuWidth, availableWidth);
  return {
    left: Math.max(
      inset,
      Math.min(caret.right + gap, containerWidth - actualMenuWidth - inset),
    ),
    top: Math.max(inset, caret.bottom + gap),
  };
}

export function isMentionClickOutside(container, target) {
  return Boolean(container && !container.contains(target));
}

export function isBackdropSelfClick(target, currentTarget) {
  return Boolean(target && target === currentTarget);
}

export function getTrappedFocusTarget(focusable, activeElement, shiftKey) {
  if (!focusable.length) return null;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (shiftKey && activeElement === first) return last;
  if (!shiftKey && activeElement === last) return first;
  return null;
}

export function keepWithinTextLimit(previous, attempted, limit = 500) {
  return attempted.length <= limit ? attempted : previous;
}

export function createInitialProject(saved = {}) {
  let value = saved;
  if (typeof saved === "string") {
    try {
      value = JSON.parse(saved);
    } catch {
      value = {};
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) value = {};
  const assets = Array.isArray(value.assets)
    ? value.assets
        .filter(
          (item) =>
            item &&
            typeof item === "object" &&
            typeof item.role === "string" &&
            typeof item.name === "string",
        )
      .map((item) => ({
          id:
            typeof item.id === "string" ? item.id : `${item.role}-${item.name}`,
          role: item.role,
          name: item.name,
        type: ["image", "audio", "video"].includes(item.type)
          ? item.type
          : getMediaType(item),
        ...(typeof item.sourceId === "string" ? { sourceId: item.sourceId } : {}),
        ...(typeof item.path === "string" ? { path: item.path } : {}),
          ...(typeof item.preview === "string"
            ? { preview: item.preview }
            : {}),
        }))
      : [];
  const legacySourceIds = new Map([
    ["图片1", "person"],
    ["图片2", "product-bottle"],
    ["图片3", "product-detail"],
  ]);
  const migratedSourceIds = new Set(
    assets.flatMap((asset) => (asset.sourceId ? [asset.sourceId] : [])),
  );
  assets.forEach((asset) => {
    if (asset.sourceId || asset.type !== "image") return;
    const sourceId = legacySourceIds.get(asset.role);
    if (!sourceId || migratedSourceIds.has(sourceId)) return;
    asset.sourceId = sourceId;
    migratedSourceIds.add(sourceId);
  });
  const documents =
    value.documents &&
    typeof value.documents === "object" &&
    !Array.isArray(value.documents)
      ? Object.fromEntries(
          Object.entries(value.documents).filter(
            ([, document]) => typeof document === "string",
          ),
        )
      : {};
  const generation =
    value.generation &&
    typeof value.generation === "object" &&
    !Array.isArray(value.generation)
      ? Object.fromEntries(
          Object.entries(value.generation).flatMap(([id, status]) =>
            status === "done" || status === "idle"
              ? [[id, status]]
              : status === "running"
                ? [[id, "idle"]]
                : [],
          ),
        )
      : {};
  const assetCounters = { ...EMPTY_PROJECT.assetCounters };
  if (value.assetCounters && typeof value.assetCounters === "object")
    Object.keys(assetCounters).forEach((type) => {
      if (
        Number.isInteger(value.assetCounters[type]) &&
        value.assetCounters[type] >= 0
      )
        assetCounters[type] = Math.max(
          EMPTY_PROJECT.assetCounters[type],
          value.assetCounters[type],
        );
    });
  assets.forEach((asset) => {
    const prefix = MEDIA_LABELS[asset.type];
    const match = asset.role.match(new RegExp(`^${prefix}(\\d+)$`));
    if (match)
      assetCounters[asset.type] = Math.max(
        assetCounters[asset.type],
        Number(match[1]),
      );
  });
  return {
    ...EMPTY_PROJECT,
    step: Number.isInteger(value.step)
      ? Math.min(4, Math.max(1, value.step))
      : 1,
    maxStep: Number.isInteger(value.maxStep)
      ? Math.min(4, Math.max(1, value.maxStep))
      : 1,
    videoName: typeof value.videoName === "string" ? value.videoName : "",
    request: typeof value.request === "string" ? value.request : "",
    model:
      typeof value.model === "string" &&
      [
        "seedance 2.0 mini",
        "seedance 2.0 fast",
        "seedance 2.0",
        "seedance 2.5",
      ].includes(value.model)
        ? value.model
        : EMPTY_PROJECT.model,
    aspectRatio: ASPECT_RATIOS.includes(value.aspectRatio)
      ? value.aspectRatio
      : EMPTY_PROJECT.aspectRatio,
    assets,
    assetCounters,
    documents,
    generation,
  };
}

export function canAdvance(project) {
  if (project.step === 1) {
    return Boolean(
      typeof project.videoName === "string" && project.videoName.trim(),
    );
  }
  return true;
}

export function advanceStep(project) {
  if (!canAdvance(project)) return project;
  const step = Math.min(4, project.step + 1);
  return { ...project, step, maxStep: Math.max(project.maxStep, step) };
}

export function updateDocument(project, key, value) {
  return { ...project, documents: { ...project.documents, [key]: value } };
}

export function addReplacementAsset(project, asset) {
  return { ...project, assets: [...project.assets, asset] };
}

export function updateReplacementAsset(project, assetId, patch) {
  return {
    ...project,
    assets: project.assets.map((asset) =>
      asset.id === assetId ? { ...asset, ...patch } : asset,
    ),
  };
}

export function replaceSequencedAsset(project, assetId, patch) {
  const current = project.assets.find((asset) => asset.id === assetId);
  if (!current) return project;
  const type = ["image", "audio", "video"].includes(patch.type)
    ? patch.type
    : current.type;
  if (type === current.type) {
    return updateReplacementAsset(project, assetId, { ...patch, type });
  }
  const role = nextAssetLabel(
    project.assets.filter((asset) => asset.id !== assetId),
    type,
    project.assetCounters,
  );
  const number = Number(role.match(/\d+$/)?.[0] || 0);
  return {
    ...updateReplacementAsset(project, assetId, { ...patch, type, role }),
    assetCounters: {
      ...project.assetCounters,
      [type]: Math.max(project.assetCounters?.[type] || 0, number),
    },
  };
}

export function removeReplacementAsset(project, assetId) {
  return {
    ...project,
    assets: project.assets.filter((asset) => asset.id !== assetId),
  };
}

export function clearVideo(project) {
  return replaceVideo(project, "");
}

export function replaceVideo(project, videoName) {
  return {
    ...project,
    step: 1,
    maxStep: 1,
    videoName,
    documents: {},
    generation: {},
  };
}

export function setCurrentStep(project, requestedStep) {
  if (requestedStep > 1 && !project.videoName) {
    return { ...project, step: 1 };
  }
  const step = Math.min(project.maxStep, Math.max(1, requestedStep));
  return { ...project, step };
}

export function setGenerationStatus(project, segmentId, status) {
  return {
    ...project,
    generation: { ...project.generation, [segmentId]: status },
  };
}

export function getSelectedSegmentIds(selectedIds, availableIds) {
  const selected = selectedIds instanceof Set ? selectedIds : new Set(selectedIds);
  return availableIds.filter((id) => selected.has(id));
}

export function toggleAllSegmentSelections(selectedIds, availableIds) {
  const selected = getSelectedSegmentIds(selectedIds, availableIds);
  return selected.length === availableIds.length
    ? new Set()
    : new Set(availableIds);
}

export function queueGeneration(project, segmentIds) {
  const started = segmentIds.filter(
    (id) => project.generation[id] !== "running",
  );
  return {
    started,
    project: {
      ...project,
      generation: {
        ...project.generation,
        ...Object.fromEntries(started.map((id) => [id, "running"])),
      },
    },
  };
}

export function clearRunningStatuses(project) {
  return {
    ...project,
    generation: Object.fromEntries(
      Object.entries(project.generation).map(([id, status]) => [
        id,
        status === "running" ? "idle" : status,
      ]),
    ),
  };
}

export function serializeProject(project) {
  return JSON.stringify({
    ...project,
    assets: project.assets.map((asset) => {
      if (
        typeof asset.preview !== "string" ||
        !asset.preview.startsWith("data:")
      )
        return asset;
      const { preview, ...savedAsset } = asset;
      return savedAsset;
    }),
  });
}

export function persistProject(storage, project) {
  storage.setItem(STORAGE_KEY, serializeProject(project));
}
