# 爆款复刻前端 Demo 现状对齐 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让现有爆款复刻 Demo 的有效代码、四阶段产品事实和项目文档完全一致，并保留当前全部用户行为。

**Architecture:** 页面主体已经完成，本计划不重新实现功能，也不引入新抽象。先删除 `ViralRemake.jsx` 中未挂载的旧 `StepFive`，再为旧五步规格和计划添加明确的历史版本提示，最后用现有单元测试、生产构建和真实浏览器流程验证四阶段现状。

**Tech Stack:** React、Vite、Node.js 内置测试运行器、Playwright 浏览器验收、Markdown 文档。

**Spec:** `docs/superpowers/specs/2026-09-25-viral-remake-current-state-design.md`

## Global Constraints

- 页面入口保持为 `#/remake`。
- 首屏继续展示三张模式卡片，仅「元素替换」可进入。
- 有效工作台保持四阶段：拆解视频、替换素材、替换结果、提取片段。
- STEP 04 继续同时承担片段故事面板和模拟视频生成，不恢复独立第五步。
- 不改变素材绑定、序列编号、`@素材` 引用、草稿保存或模拟生成行为。
- 不接入真实模型、FFmpeg、后端任务队列、云端存储或其他复刻模式。
- 不新增运行时依赖、测试依赖或状态管理库。
- 不修改 `public/viral-remake-demo/` 中的 Demo 媒体。
- 不提交 `output/`、`.playwright-cli/`、构建产物或浏览器临时文件。

## Review Focus

- 恢复的旧草稿即使保存了 `step: 5` 或 `maxStep: 5`，也必须归一化到当前四阶段流程；由 Task 1 的定向回归测试覆盖。
- 删除 `StepFive` 后，STEP 04 的单段生成、批量生成和重新生成必须保持可用；由 Task 1 的完整测试和 Task 2 的浏览器流程覆盖。
- 固定槽位异步上传时，较早完成的文件读取不能覆盖用户最后一次选择；由 Task 1 的完整测试覆盖。
- 保存草稿时不能将本地媒体 Data URL 写入 `localStorage`；由 Task 1 的完整测试覆盖。
- 1050px、820px 和 620px 附近不能出现遮挡关键操作的横向溢出，长内容弹层只能滚动正文区域；由 Task 2 的浏览器验收覆盖。

---

### Task 1: 删除未挂载的旧第五步组件

**Files:**
- Modify: `src/ViralRemake.jsx:1675-1820`
- Test: `src/viral-remake-state.test.js`

**Interfaces:**
- Consumes: `steps = ['拆解视频', '替换素材', '替换结果', '提取片段']`、`advanceStep(project)` 和 `setCurrentStep(project, requestedStep)`。
- Produces: 只包含 `ModeSelection`、`StepOne`、`StepTwo`、`StepThree`、`StepFour` 和根组件 `ViralRemake` 的有效页面组件集合；不改变任何导出接口。

- [ ] **Step 1: 确认四阶段行为已有回归保护**

Run:

```powershell
node --test --test-name-pattern="复刻流程只保留四个步骤|项目流程不会进入已移除的第五步|批量生成视频只提交已选择且存在的片段" src/viral-remake-state.test.js
```

Expected: 3 个匹配测试通过，0 failures。第一个测试锁定四个步骤名称，第二个测试锁定旧第五步归一化，第三个测试锁定 STEP 04 的选择生成行为。

- [ ] **Step 2: 证明 `StepFive` 是未引用的本地声明**

Run:

```powershell
rg -n "^function StepFive|<StepFive|step === 5" src/ViralRemake.jsx
```

Expected: 只输出 `function StepFive` 声明行；没有 `<StepFive` 挂载，也没有 `step === 5` 渲染分支。

- [ ] **Step 3: 删除完整的 `StepFive` 函数组件**

在 `src/ViralRemake.jsx` 中删除从以下声明开始：

```jsx
function StepFive({ project, setProject, notify, openSegment }) {
```

到紧邻以下根组件声明之前的整个函数闭包：

```jsx
export default function ViralRemake() {
```

删除后不要移动 `StepFour` 中的生成逻辑；单段生成、批量生成、选择状态和计时器仍由 `StepFour` 负责。

- [ ] **Step 4: 确认旧第五步源码已经消失**

Run:

```powershell
rg -n "StepFive|step === 5|STEP 05|生成复刻视频" src/ViralRemake.jsx
```

Expected: exit code 1，无匹配结果。

- [ ] **Step 5: 运行完整单元测试**

Run:

```powershell
pnpm test
```

Expected: 63 tests，63 pass，0 fail。

- [ ] **Step 6: 运行生产构建**

Run:

```powershell
pnpm build
```

Expected: Vite build exit 0；生成 `dist/index.html` 和对应静态资源；无 unresolved import 或 JSX 编译错误。

- [ ] **Step 7: 提交死代码清理**

```powershell
git add src/ViralRemake.jsx
git commit -m "refactor: remove legacy fifth remake step"
```

### Task 2: 将旧五步文档标记为历史版本

**Files:**
- Modify: `docs/superpowers/specs/2026-09-20-viral-remake-demo.md:1`
- Modify: `docs/superpowers/plans/2026-09-20-viral-remake-demo.md:1`
- Reference: `docs/superpowers/specs/2026-09-25-viral-remake-current-state-design.md`
- Reference: `docs/superpowers/plans/2026-09-25-viral-remake-current-state-alignment.md`

**Interfaces:**
- Consumes: 已确认的现状版规格和本实施计划。
- Produces: 旧文档顶部的历史版本提示，使读者不会再把五步方案当作当前页面事实。

- [ ] **Step 1: 在旧规格顶部加入替代文档提示**

在 `docs/superpowers/specs/2026-09-20-viral-remake-demo.md` 标题之前加入：

```markdown
> [!WARNING]
> 此文档记录早期五步 Demo 方案，已不代表当前页面。当前四阶段设计以 [`2026-09-25-viral-remake-current-state-design.md`](./2026-09-25-viral-remake-current-state-design.md) 为准。

```

- [ ] **Step 2: 在旧实施计划顶部加入替代计划提示**

在 `docs/superpowers/plans/2026-09-20-viral-remake-demo.md` 标题之前加入：

```markdown
> [!WARNING]
> 此计划对应早期五步 Demo，已不作为当前执行依据。当前现状对齐计划以 [`2026-09-25-viral-remake-current-state-alignment.md`](./2026-09-25-viral-remake-current-state-alignment.md) 为准。

```

- [ ] **Step 3: 验证新旧文档链接存在且提示位于首行**

Run:

```powershell
$files = @(
  'docs/superpowers/specs/2026-09-20-viral-remake-demo.md',
  'docs/superpowers/plans/2026-09-20-viral-remake-demo.md',
  'docs/superpowers/specs/2026-09-25-viral-remake-current-state-design.md',
  'docs/superpowers/plans/2026-09-25-viral-remake-current-state-alignment.md'
)
$files | ForEach-Object { if (-not (Test-Path -LiteralPath $_)) { throw "Missing: $_" } }
if ((Get-Content $files[0] -TotalCount 1) -ne '> [!WARNING]') { throw 'Old spec warning missing' }
if ((Get-Content $files[1] -TotalCount 1) -ne '> [!WARNING]') { throw 'Old plan warning missing' }
```

Expected: exit 0，无错误输出。

- [ ] **Step 4: 提交文档版本提示**

```powershell
git add docs/superpowers/specs/2026-09-20-viral-remake-demo.md docs/superpowers/plans/2026-09-20-viral-remake-demo.md
git commit -m "docs: retire legacy five-step remake docs"
```

### Task 3: 执行完整浏览器回归验收

**Files:**
- Verify: `src/ViralRemake.jsx`
- Verify: `src/viral-remake-state.js`
- Verify: `src/viral-remake-data.js`
- Verify: `src/viral-remake.css`
- Verify: `src/viral-remake-state.test.js`
- Verify: `public/viral-remake-demo/`

**Interfaces:**
- Consumes: Task 1 的四阶段源码和 Task 2 的单一文档基线。
- Produces: 可合并的验证证据；不新增产品代码或运行时依赖。

- [ ] **Step 1: 启动真实开发服务器**

Run:

```powershell
pnpm dev --host 127.0.0.1
```

Expected: Vite 输出本地地址，访问 `http://127.0.0.1:5173/#/remake` 时页面正常加载，控制台无运行时错误。

- [ ] **Step 2: 验证模式选择和空白项目**

在 1440×900 视口执行：

1. 打开 `#/remake`。
2. 确认三张模式卡片均可见。
3. 确认只有「元素替换」按钮可用。
4. 进入元素替换。
5. 确认顶部只有四个阶段。
6. 确认未上传视频时「开始拆解视频」不可用。

Expected: 页面与六项检查完全一致。

- [ ] **Step 3: 验证模板视频生命周期**

1. 上传任意 MP4 或 MOV 文件。
2. 确认可以替换该视频。
3. 确认可以删除该视频。
4. 点击「加载 Demo 素材」。
5. 确认模板视频、模型、比例和 Demo 素材均显示正确。

Expected: 每次操作都有可见反馈；删除视频后停留或返回第一阶段，后续阶段不可访问。

- [ ] **Step 4: 验证替换素材与 `@素材` 引用**

1. 进入 STEP 02。
2. 确认拆解文档和三张原视频分镜可见。
3. 分别替换并清空一个固定槽位素材。
4. 新增一张图片、一个音频和一个视频。
5. 确认它们获得图片、音频和视频序列名称。
6. 在替换需求中输入 `@`，使用上下键和回车插入引用。
7. 替换并删除一个普通素材。

Expected: 固定槽位不产生重复素材；普通素材可以新增、替换和删除；`@` 候选和插入结果与当前素材一致。

- [ ] **Step 5: 验证替换结果、草稿和弹层**

1. 进入 STEP 03。
2. 确认原片与替换后分镜对照位于故事面板之前。
3. 打开并关闭一个分镜大图。
4. 编辑故事面板并保存。
5. 点击「保存草稿」后刷新页面。
6. 确认编辑内容仍然存在。
7. 打开完整故事面板弹层，依次用 Esc、遮罩和关闭按钮验证关闭行为。

Expected: 保存内容可恢复；弹层锁定背景滚动，关闭后焦点返回触发控件。

- [ ] **Step 6: 验证片段选择和生成**

1. 进入 STEP 04。
2. 确认三个片段故事面板均可查看。
3. 取消一个片段后执行批量生成。
4. 确认只生成仍被选择的片段。
5. 单独生成未选择的片段。
6. 等待完成后点击重新生成。
7. 在生成中重复点击，确认不会创建重复任务。

Expected: `idle`、`running` 和 `done` 状态转换清晰，批量生成范围正确。

- [ ] **Step 7: 验证响应式和长内容弹层**

依次使用 1050×900、820×900 和 620×900 视口检查：

- STEP 02 在 1050px 以下改为上下排列。
- 四阶段步骤条在 820px 以下可以横向访问。
- 模式卡、分镜和生成卡在窄屏下改为单列或规定的两列。
- 底部主操作在 620px 以下占满宽度。
- 长内容弹层只有正文区域滚动，头部和底部操作仍可见。
- 页面不存在遮挡关键按钮的横向溢出。

Expected: 六项检查全部通过。

- [ ] **Step 8: 执行最终自动化验证**

Run:

```powershell
pnpm test
pnpm build
git diff --check
git status --short
```

Expected: 63 tests 全部通过；Vite build exit 0；`git diff --check` 无输出；状态中不包含 `output/`、`.playwright-cli/` 或 `dist/` 的已暂存文件。

- [ ] **Step 9: 若浏览器验收未产生代码或文档修正，则不创建空提交**

Run:

```powershell
git status --short
```

Expected: Task 1 和 Task 2 的提交均已存在；没有为了记录“测试通过”而创建空提交。
