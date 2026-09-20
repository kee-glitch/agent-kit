import test from 'node:test'
import assert from 'node:assert/strict'
import {
  addReplacementAsset,
  advanceStep,
  canAdvance,
  clearVideo,
  createInitialProject,
  persistProject,
  serializeProject,
  queueGeneration,
  removeReplacementAsset,
  replaceVideo,
  getMediaType,
  nextAssetLabel,
  findMentionCandidates,
  addSequencedAssets,
  keepWithinTextLimit,
  clearRunningStatuses,
  setCurrentStep,
  setGenerationStatus,
  updateReplacementAsset,
  updateDocument,
} from './viral-remake-state.js'
import { demoAssets, originalBoards, replacedBoards } from './viral-remake-data.js'

test('空白需求不能进入拆解步骤', () => {
  const project = createInitialProject()
  assert.equal(canAdvance(project), false)
})

test('加载模板视频和需求后进入拆解步骤', () => {
  const project = createInitialProject({ videoName: 'demo.mp4', request: '替换人物与产品' })
  assert.equal(advanceStep(project).step, 2)
})

test('编辑故事面板返回不可变的新状态', () => {
  const project = createInitialProject()
  const next = updateDocument(project, 'storyboard', '新内容')
  assert.equal(next.documents.storyboard, '新内容')
  assert.notEqual(next, project)
})

test('不能跳转到尚未解锁的步骤', () => {
  const project = createInitialProject({ step: 2, maxStep: 2, videoName: 'demo.mp4', request: '替换产品' })
  assert.equal(setCurrentStep(project, 5).step, 2)
  assert.equal(setCurrentStep(project, 1).step, 1)
})

test('片段生成状态独立更新', () => {
  const project = createInitialProject()
  const next = setGenerationStatus(project, 'segment-2', 'running')
  assert.equal(next.generation['segment-2'], 'running')
  assert.equal(next.generation['segment-1'], undefined)
})

test('Demo 素材使用兼容开发和构建部署的相对地址', () => {
  const paths = [...demoAssets.map(item => item.path), ...originalBoards, ...replacedBoards]
  assert.equal(paths.every(path => path.startsWith('./viral-remake-demo/')), true)
})

test('保存项目会写入指定存储并可恢复', () => {
  const values = new Map()
  const storage = { setItem: (key, value) => values.set(key, value) }
  const project = createInitialProject({ videoName: 'demo.mp4', request: '替换产品' })
  persistProject(storage, project)
  assert.equal(createInitialProject(values.get('shulan.viral-remake.project.v1')).videoName, 'demo.mp4')
})

test('保存草稿不会把本地媒体二进制写入 localStorage', () => {
  const project = createInitialProject({ assets: [{
    id: 'video-1', role: '视频1', type: 'video', name: 'large.mp4', preview: 'data:video/mp4;base64,AAAA',
  }] })
  const saved = serializeProject(project)
  assert.equal(saved.includes('data:video'), false)
  assert.equal(JSON.parse(saved).assets[0].name, 'large.mp4')
})

test('合法 JSON 中的损坏字段会回退为安全值', () => {
  const project = createInitialProject(JSON.stringify({
    videoName: 12,
    request: 42,
    assets: [null, { role: '人物与服饰' }],
    documents: { storyboard: { broken: true } },
    generation: { 'segment-1': 'running', 'segment-2': 'unknown' },
  }))
  assert.equal(project.videoName, '')
  assert.equal(project.request, '')
  assert.deepEqual(project.assets, [])
  assert.deepEqual(project.documents, {})
  assert.deepEqual(project.generation, { 'segment-1': 'idle' })
})

test('输入被清空后不能通过顶部步骤回到拆解页', () => {
  const project = createInitialProject({ step: 1, maxStep: 5, videoName: 'demo.mp4', request: '' })
  assert.equal(setCurrentStep(project, 2).step, 1)
})

test('批量排队只启动尚未运行的片段并可统一回退', () => {
  const project = { ...createInitialProject(), generation: { 'segment-1': 'running' } }
  const queued = queueGeneration(project, ['segment-1', 'segment-2', 'segment-3'])
  assert.deepEqual(queued.started, ['segment-2', 'segment-3'])
  assert.equal(queued.project.generation['segment-1'], 'running')
  assert.equal(queued.project.generation['segment-2'], 'running')
  assert.deepEqual(clearRunningStatuses(queued.project).generation, {
    'segment-1': 'idle', 'segment-2': 'idle', 'segment-3': 'idle',
  })
})

test('三个 Demo 素材使用图片序列名称', () => {
  assert.deepEqual(demoAssets.map(item => item.role), ['图片1', '图片2', '图片3'])
})

test('根据文件类型分别生成稳定的下一个素材序号', () => {
  const assets = [
    { role: '图片1', type: 'image' },
    { role: '图片3', type: 'image' },
    { role: '音频1', type: 'audio' },
  ]
  assert.equal(nextAssetLabel(assets, 'image'), '图片4')
  assert.equal(nextAssetLabel(assets, 'audio'), '音频2')
  assert.equal(nextAssetLabel(assets, 'video'), '视频1')
})

test('从 MIME 类型或扩展名识别替换素材类型', () => {
  assert.equal(getMediaType({ type: 'image/png', name: 'a.bin' }), 'image')
  assert.equal(getMediaType({ type: '', name: 'voice.mp3' }), 'audio')
  assert.equal(getMediaType({ type: '', name: 'clip.mov' }), 'video')
})

test('输入 @ 后可按序列名称筛选引用素材', () => {
  const assets = [{ role: '图片1' }, { role: '图片2' }, { role: '音频1' }]
  assert.deepEqual(findMentionCandidates(assets, '').map(item => item.role), ['图片1', '图片2', '音频1'])
  assert.deepEqual(findMentionCandidates(assets, '图片').map(item => item.role), ['图片1', '图片2'])
})

test('删除最高编号后新增素材不会复用旧编号', () => {
  const project = createInitialProject({ assets: [
    { id: '1', role: '图片1', type: 'image', name: '1.png' },
    { id: '3', role: '图片3', type: 'image', name: '3.png' },
  ] })
  const withoutThree = removeReplacementAsset(project, '3')
  const next = addSequencedAssets(withoutThree, [{ id: '4', type: 'image', name: '4.png' }])
  assert.equal(next.assets.at(-1).role, '图片4')
  assert.equal(next.assetCounters.image, 4)
})

test('连续批次上传基于最新状态原子分配编号', () => {
  const first = addSequencedAssets(createInitialProject(), [{ id: '1', type: 'image', name: '1.png' }])
  const second = addSequencedAssets(first, [
    { id: '2', type: 'image', name: '2.png' },
    { id: 'a1', type: 'audio', name: '1.mp3' },
  ])
  assert.deepEqual(second.assets.map(item => item.role), ['图片1', '图片2', '音频1'])
})

test('超限编辑会保留上一次完整文本而不截断素材引用', () => {
  const previous = `${'a'.repeat(493)} @图片1`
  const attempted = `新增文字${previous}`
  assert.equal(keepWithinTextLimit(previous, attempted, 500), previous)
  assert.equal(keepWithinTextLimit(previous, '正常内容 @图片1', 500), '正常内容 @图片1')
})

test('可新增任意替换对象且不会覆盖已有素材', () => {
  const project = createInitialProject({ assets: [{ id: 'person', role: '人物', name: 'person.jpg' }] })
  const next = addReplacementAsset(project, { id: 'scene', role: '卧室背景', name: 'room.png' })
  assert.deepEqual(next.assets.map(item => item.role), ['人物', '卧室背景'])
})

test('可按素材 id 修改名称和替换文件', () => {
  const project = createInitialProject({ assets: [
    { id: 'person', role: '人物', name: 'old.jpg' },
    { id: 'product', role: '产品', name: 'jar.jpg' },
  ] })
  const next = updateReplacementAsset(project, 'person', { role: '人物与服饰', name: 'new.jpg' })
  assert.deepEqual(next.assets, [
    { id: 'person', role: '人物与服饰', name: 'new.jpg', type: 'image' },
    { id: 'product', role: '产品', name: 'jar.jpg', type: 'image' },
  ])
})

test('删除单个替换素材不会影响其他素材', () => {
  const project = createInitialProject({ assets: [
    { id: 'person', role: '人物', name: 'person.jpg' },
    { id: 'product', role: '产品', name: 'jar.jpg' },
  ] })
  assert.deepEqual(removeReplacementAsset(project, 'person').assets.map(item => item.id), ['product'])
})

test('删除模板视频会保留替换需求和素材', () => {
  const project = createInitialProject({
    step: 5,
    maxStep: 5,
    videoName: 'demo.mp4',
    request: '替换人物',
    assets: [{ id: 'person', role: '人物', name: 'person.jpg' }],
    documents: { storyboard: '旧故事面板' },
    generation: { 'segment-1': 'done' },
  })
  const next = clearVideo(project)
  assert.equal(next.videoName, '')
  assert.equal(next.request, '替换人物')
  assert.equal(next.assets.length, 1)
  assert.equal(next.step, 1)
  assert.equal(next.maxStep, 1)
  assert.deepEqual(next.documents, {})
  assert.deepEqual(next.generation, {})
})

test('替换模板视频会使旧拆解和生成结果失效', () => {
  const project = createInitialProject({
    step: 5,
    maxStep: 5,
    videoName: 'old.mp4',
    request: '替换产品',
    documents: { breakdown: '旧拆解' },
    generation: { 'segment-1': 'done' },
  })
  const next = replaceVideo(project, 'new.mp4')
  assert.equal(next.videoName, 'new.mp4')
  assert.equal(next.request, '替换产品')
  assert.equal(next.step, 1)
  assert.equal(next.maxStep, 1)
  assert.deepEqual(next.documents, {})
  assert.deepEqual(next.generation, {})
})
