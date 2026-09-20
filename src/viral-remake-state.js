export const STORAGE_KEY = 'shulan.viral-remake.project.v1'

const EMPTY_PROJECT = {
  step: 1,
  maxStep: 1,
  videoName: '',
  request: '',
  model: 'seedance 2.0',
  assets: [],
  assetCounters: { image: 0, audio: 0, video: 0 },
  documents: {},
  generation: {},
}

const MEDIA_LABELS = { image: '图片', audio: '音频', video: '视频' }

export function getMediaType(file = {}) {
  const mime = typeof file.type === 'string' ? file.type.toLowerCase() : ''
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.startsWith('video/')) return 'video'
  const extension = typeof file.name === 'string' ? file.name.split('.').pop()?.toLowerCase() : ''
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'].includes(extension)) return 'image'
  if (['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'].includes(extension)) return 'audio'
  if (['mp4', 'mov', 'webm', 'mkv', 'avi'].includes(extension)) return 'video'
  return 'image'
}

export function nextAssetLabel(assets, type, counters = {}) {
  const prefix = MEDIA_LABELS[type] || MEDIA_LABELS.image
  const highest = assets.reduce((max, asset) => {
    const match = typeof asset.role === 'string' ? asset.role.match(new RegExp(`^${prefix}(\\d+)$`)) : null
    return match ? Math.max(max, Number(match[1])) : max
  }, Number.isInteger(counters[type]) ? counters[type] : 0)
  return `${prefix}${highest + 1}`
}

export function addSequencedAssets(project, additions) {
  const counters = { ...EMPTY_PROJECT.assetCounters, ...project.assetCounters }
  const assets = [...project.assets]
  additions.forEach(addition => {
    const type = ['image', 'audio', 'video'].includes(addition.type) ? addition.type : 'image'
    const role = nextAssetLabel(assets, type, counters)
    const number = Number(role.match(/\d+$/)?.[0] || 0)
    counters[type] = number
    assets.push({ ...addition, type, role })
  })
  return { ...project, assets, assetCounters: counters }
}

export function findMentionCandidates(assets, query = '') {
  const normalized = query.trim().toLowerCase()
  return assets.filter(asset => !normalized || asset.role.toLowerCase().includes(normalized))
}

export function keepWithinTextLimit(previous, attempted, limit = 500) {
  return attempted.length <= limit ? attempted : previous
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
    type: ['image', 'audio', 'video'].includes(item.type) ? item.type : getMediaType(item),
    ...(typeof item.path === 'string' ? { path: item.path } : {}),
    ...(typeof item.preview === 'string' ? { preview: item.preview } : {}),
  })) : []
  const documents = value.documents && typeof value.documents === 'object' && !Array.isArray(value.documents)
    ? Object.fromEntries(Object.entries(value.documents).filter(([, document]) => typeof document === 'string'))
    : {}
  const generation = value.generation && typeof value.generation === 'object' && !Array.isArray(value.generation)
    ? Object.fromEntries(Object.entries(value.generation).flatMap(([id, status]) => status === 'done' || status === 'idle' ? [[id, status]] : status === 'running' ? [[id, 'idle']] : []))
    : {}
  const assetCounters = { ...EMPTY_PROJECT.assetCounters }
  if (value.assetCounters && typeof value.assetCounters === 'object') Object.keys(assetCounters).forEach(type => { if (Number.isInteger(value.assetCounters[type]) && value.assetCounters[type] >= 0) assetCounters[type] = value.assetCounters[type] })
  assets.forEach(asset => {
    const prefix = MEDIA_LABELS[asset.type]
    const match = asset.role.match(new RegExp(`^${prefix}(\\d+)$`))
    if (match) assetCounters[asset.type] = Math.max(assetCounters[asset.type], Number(match[1]))
  })
  return {
    ...EMPTY_PROJECT,
    step: Number.isInteger(value.step) ? Math.min(5, Math.max(1, value.step)) : 1,
    maxStep: Number.isInteger(value.maxStep) ? Math.min(5, Math.max(1, value.maxStep)) : 1,
    videoName: typeof value.videoName === 'string' ? value.videoName : '',
    request: typeof value.request === 'string' ? value.request : '',
    model: typeof value.model === 'string' && ['seedance 2.0 mini', 'seedance 2.0 fast', 'seedance 2.0', 'seedance 2.5'].includes(value.model) ? value.model : EMPTY_PROJECT.model,
    assets,
    assetCounters,
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
  return JSON.stringify({
    ...project,
    assets: project.assets.map(asset => {
      if (typeof asset.preview !== 'string' || !asset.preview.startsWith('data:')) return asset
      const { preview, ...savedAsset } = asset
      return savedAsset
    }),
  })
}

export function persistProject(storage, project) {
  storage.setItem(STORAGE_KEY, serializeProject(project))
}
