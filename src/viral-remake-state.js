export const STORAGE_KEY = 'shulan.viral-remake.project.v1'

const EMPTY_PROJECT = {
  step: 1,
  maxStep: 1,
  videoName: '',
  request: '',
  model: 'seedance 2.0',
  assets: [],
  documents: {},
  generation: {},
}

export function createInitialProject(saved = {}) {
  let value = saved
  if (typeof saved === 'string') {
    try { value = JSON.parse(saved) } catch { value = {} }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) value = {}
  const assets = Array.isArray(value.assets) ? value.assets.filter(item => item && typeof item === 'object' && typeof item.role === 'string' && typeof item.name === 'string').map(item => ({
    id: typeof item.id === 'string' ? item.id : `${item.role}-${item.name}`,
    role: item.role,
    name: item.name,
    ...(typeof item.path === 'string' ? { path: item.path } : {}),
    ...(typeof item.preview === 'string' ? { preview: item.preview } : {}),
  })) : []
  const documents = value.documents && typeof value.documents === 'object' && !Array.isArray(value.documents)
    ? Object.fromEntries(Object.entries(value.documents).filter(([, document]) => typeof document === 'string'))
    : {}
  const generation = value.generation && typeof value.generation === 'object' && !Array.isArray(value.generation)
    ? Object.fromEntries(Object.entries(value.generation).flatMap(([id, status]) => status === 'done' || status === 'idle' ? [[id, status]] : status === 'running' ? [[id, 'idle']] : []))
    : {}
  return {
    ...EMPTY_PROJECT,
    step: Number.isInteger(value.step) ? Math.min(5, Math.max(1, value.step)) : 1,
    maxStep: Number.isInteger(value.maxStep) ? Math.min(5, Math.max(1, value.maxStep)) : 1,
    videoName: typeof value.videoName === 'string' ? value.videoName : '',
    request: typeof value.request === 'string' ? value.request : '',
    model: typeof value.model === 'string' && ['seedance 2.0 mini', 'seedance 2.0 fast', 'seedance 2.0', 'seedance 2.5'].includes(value.model) ? value.model : EMPTY_PROJECT.model,
    assets,
    documents,
    generation,
  }
}

export function canAdvance(project) {
  if (project.step !== 1) return true
  return Boolean(typeof project.videoName === 'string' && project.videoName && typeof project.request === 'string' && project.request.trim())
}

export function advanceStep(project) {
  if (!canAdvance(project)) return project
  const step = Math.min(5, project.step + 1)
  return { ...project, step, maxStep: Math.max(project.maxStep, step) }
}

export function updateDocument(project, key, value) {
  return { ...project, documents: { ...project.documents, [key]: value } }
}

export function addReplacementAsset(project, asset) {
  return { ...project, assets: [...project.assets, asset] }
}

export function updateReplacementAsset(project, assetId, patch) {
  return { ...project, assets: project.assets.map(asset => asset.id === assetId ? { ...asset, ...patch } : asset) }
}

export function removeReplacementAsset(project, assetId) {
  return { ...project, assets: project.assets.filter(asset => asset.id !== assetId) }
}

export function clearVideo(project) {
  return replaceVideo(project, '')
}

export function replaceVideo(project, videoName) {
  return { ...project, step: 1, maxStep: 1, videoName, documents: {}, generation: {} }
}

export function setCurrentStep(project, requestedStep) {
  if (requestedStep > 1 && !Boolean(project.videoName && typeof project.request === 'string' && project.request.trim())) return { ...project, step: 1 }
  const step = Math.min(project.maxStep, Math.max(1, requestedStep))
  return { ...project, step }
}

export function setGenerationStatus(project, segmentId, status) {
  return { ...project, generation: { ...project.generation, [segmentId]: status } }
}

export function queueGeneration(project, segmentIds) {
  const started = segmentIds.filter(id => project.generation[id] !== 'running')
  return {
    started,
    project: {
      ...project,
      generation: { ...project.generation, ...Object.fromEntries(started.map(id => [id, 'running'])) },
    },
  }
}

export function clearRunningStatuses(project) {
  return {
    ...project,
    generation: Object.fromEntries(Object.entries(project.generation).map(([id, status]) => [id, status === 'running' ? 'idle' : status])),
  }
}

export function serializeProject(project) {
  return JSON.stringify(project)
}

export function persistProject(storage, project) {
  storage.setItem(STORAGE_KEY, serializeProject(project))
}
