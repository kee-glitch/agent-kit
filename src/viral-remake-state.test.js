import test from 'node:test'
import assert from 'node:assert/strict'
import {
  advanceStep,
  canAdvance,
  createInitialProject,
  persistProject,
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
  const project = createInitialProject({ step: 2, maxStep: 2 })
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
