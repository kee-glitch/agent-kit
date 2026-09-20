import test from 'node:test'
import assert from 'node:assert/strict'
import {
  advanceStep,
  canAdvance,
  createInitialProject,
  setCurrentStep,
  setGenerationStatus,
  updateDocument,
} from './viral-remake-state.js'

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
