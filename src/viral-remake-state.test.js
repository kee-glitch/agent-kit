import test from 'node:test'
import assert from 'node:assert/strict'
import {
  advanceStep,
  canAdvance,
  createInitialProject,
  persistProject,
  queueGeneration,
  clearRunningStatuses,
  setCurrentStep,
  setGenerationStatus,
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

test('三个 Demo 素材角色与上传槽一一对应', () => {
  assert.deepEqual(demoAssets.map(item => item.role), ['人物与服饰', '手持产品', '胶囊 / 方糖'])
})
