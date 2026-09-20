export const STORAGE_KEY = 'shulan.viral-remake.project.v1'

const EMPTY_PROJECT = {
  step: 1,
  maxStep: 1,
  videoName: '',
  request: '',
  model: 'seedance-2.0',
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
  return {
    ...EMPTY_PROJECT,
    ...value,
    step: Number.isInteger(value.step) ? Math.min(5, Math.max(1, value.step)) : 1,
    maxStep: Number.isInteger(value.maxStep) ? Math.min(5, Math.max(1, value.maxStep)) : 1,
    assets: Array.isArray(value.assets) ? value.assets : [],
    documents: value.documents && typeof value.documents === 'object' ? value.documents : {},
    generation: value.generation && typeof value.generation === 'object' ? value.generation : {},
  }
}

export function canAdvance(project) {
  if (project.step !== 1) return true
  return Boolean(project.videoName && project.request.trim())
}

export function advanceStep(project) {
  if (!canAdvance(project)) return project
  const step = Math.min(5, project.step + 1)
  return { ...project, step, maxStep: Math.max(project.maxStep, step) }
}

export function updateDocument(project, key, value) {
  return { ...project, documents: { ...project.documents, [key]: value } }
}

export function serializeProject(project) {
  return JSON.stringify(project)
}

