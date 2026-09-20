# 爆款复刻前端 Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Agent Kit 中实现方案 A 的五步「元素替换」可点击高保真 PC Demo。

**Architecture:** 新增独立 `ViralRemake` 业务组件和作用域样式，通过现有 `src/index.jsx` 路由挂载。用一个纯状态模块统一管理步骤推进、编辑持久化和模拟生成状态，静态 Demo 素材放入 `public/viral-remake-demo/`，不引入后端与新状态库。

**Tech Stack:** React、Vite、lucide-react、现有 Agent Kit CSS 令牌、Node 内置测试运行器、Playwright 浏览器验收。

**Spec:** `docs/superpowers/specs/2026-09-20-viral-remake-demo.md`

## Global Constraints

- 只实现「元素替换」，另两种模式仅展示即将上线。
- 首次进入必须显示三张模式卡片，进入元素替换后从空白上传态开始。
- 脚本与故事面板支持直接编辑、保存和重新生成。
- 不调用真实模型；所有执行状态均为前端可逆演示。
- 颜色、字体、图标、间距、圆角与阴影遵循 `kit.md`，不直接编辑 `dist/`。
- PC 优先并兼顾窄屏；所有关键操作具备可读标签、焦点态和键盘访问。

## Review Focus

- 刷新后已保存文本应恢复，损坏的 localStorage 数据应回退到 Demo 默认值。
- 未加载视频或需求为空时不能推进到拆解步骤，并显示明确提示。
- 连续点击重新生成或批量生成不能创建重叠计时器或错误完成状态。
- 返回模式首页再进入元素替换时应保留已保存草稿，但提供清空重置操作。
- 窄屏下分镜对照、模式卡和步骤条不得产生不可访问的横向内容。

---

### Task 1: 状态模型与 Demo 数据

**Files:**
- Create: `src/viral-remake-state.js`
- Create: `src/viral-remake-state.test.js`
- Create: `src/viral-remake-data.js`
- Modify: `package.json`

**Interfaces:**
- Produces: `createInitialProject(saved)`, `canAdvance(project)`, `advanceStep(project)`, `updateDocument(project, key, value)`, `serializeProject(project)`。
- Consumes: 无。

- [ ] **Step 1: 写失败测试**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { createInitialProject, canAdvance, advanceStep, updateDocument } from './viral-remake-state.js'

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
```

- [ ] **Step 2: 运行测试并确认因模块不存在而失败**

Run: `node --test src/viral-remake-state.test.js`
Expected: FAIL，错误包含 `ERR_MODULE_NOT_FOUND` 或缺少导出。

- [ ] **Step 3: 实现最小纯状态模块和 Demo 文本数据**

```js
export function createInitialProject(saved = {}) {
  return { step: 1, videoName: '', request: '', model: 'seedance-2.0', documents: {}, ...saved }
}
export const canAdvance = project => Boolean(project.videoName && project.request.trim())
export const advanceStep = project => canAdvance(project) ? { ...project, step: Math.min(5, project.step + 1) } : project
export const updateDocument = (project, key, value) => ({ ...project, documents: { ...project.documents, [key]: value } })
export const serializeProject = project => JSON.stringify(project)
```

- [ ] **Step 4: 运行测试并确认通过**

Run: `node --test src/viral-remake-state.test.js`
Expected: PASS，3 tests，0 failures。

- [ ] **Step 5: 在 `package.json` 增加测试脚本**

```json
"test": "node --test src/*.test.js"
```

### Task 2: 五步工作台与完整交互

**Files:**
- Create: `src/ViralRemake.jsx`
- Create: `src/viral-remake.css`
- Modify: `src/index.jsx`
- Copy: `C:/Users/17608/Downloads/需要复刻的模板视频.mp4` → `public/viral-remake-demo/template.mp4`
- Copy: 用户提供的 9 张图片 → `public/viral-remake-demo/`

**Interfaces:**
- Consumes: Task 1 的状态函数与 `viral-remake-data.js`。
- Produces: `<ViralRemake />` 页面组件与 `#/remake` 路由。

- [ ] **Step 1: 扩充失败测试覆盖步骤上限、已完成步骤回看和损坏存储回退**

```js
test('步骤不会超过生成视频', () => {
  const project = createInitialProject({ step: 5, videoName: 'demo.mp4', request: '替换' })
  assert.equal(advanceStep(project).step, 5)
})

test('损坏的保存内容回退为空项目', () => {
  assert.equal(createInitialProject('{bad json').step, 1)
})
```

- [ ] **Step 2: 运行测试并确认损坏 JSON 用例失败**

Run: `pnpm test`
Expected: FAIL，损坏 JSON 不能正确回退。

- [ ] **Step 3: 实现模式首页、步骤条、五步内容、编辑保存、重新生成、单段/批量生成与详情弹层**

实现细则：`ViralRemake` 只维护页面状态与计时器；模式卡、步骤头、分镜对照、文档编辑器和片段卡均为同文件内局部组件，不建立一次性抽象层。所有图标来自 `lucide-react`，所有色值使用现有语义令牌。

- [ ] **Step 4: 接入 `#/remake` 并将默认入口指向该页面**

在 `src/index.jsx` 的路由集合中加入 `remake`，导航标签为「爆款复刻」，默认 hash 改为 `#/remake`，其他现有页面保持可访问。

- [ ] **Step 5: 运行单元测试与构建**

Run: `pnpm test && pnpm build`
Expected: tests 全部 PASS，Vite build exit 0。

### Task 3: 浏览器验收与交互修正

**Files:**
- Modify: `src/ViralRemake.jsx`
- Modify: `src/viral-remake.css`
- Modify: `src/viral-remake-state.test.js`

**Interfaces:**
- Consumes: Task 2 完整页面。
- Produces: 可交付的桌面和窄屏 Demo。

- [ ] **Step 1: 启动 Vite 并用真实浏览器验证桌面流程**

Run: `pnpm dev --host 127.0.0.1`
Expected: 首页显示三张模式卡；元素替换进入空白上传态；加载 Demo 后可顺序走完五步；编辑保存、重新生成、详情、单段生成和批量生成均有可见反馈。

- [ ] **Step 2: 验证刷新持久化与清空重置**

修改故事面板并保存后刷新页面，内容保持；点击「重新开始」后回到模式首页，项目草稿按确认弹层选择清空。

- [ ] **Step 3: 验证 1280px 桌面与 900px 窄屏**

Expected: 无遮挡关键按钮的溢出；步骤条可完整访问；分镜对照改为单列；弹层在视口内可滚动。

- [ ] **Step 4: 针对发现的问题先添加失败测试，再进行一次修正**

任何状态逻辑问题先写入 `src/viral-remake-state.test.js` 并观察 RED，再修改状态模块或组件至 GREEN；纯视觉问题直接修正 CSS 并重新截图检查。

- [ ] **Step 5: 最终验证**

Run: `pnpm test && pnpm build`
Expected: tests 0 failures，build exit 0；浏览器控制台无错误，Demo 关键流程全部可点击。

