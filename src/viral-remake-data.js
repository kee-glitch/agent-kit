export const modes = [
  { id: 'element', index: '01', title: '元素替换', subtitle: '最贴近原片动作镜头', description: '保留原视频的镜头、运镜、动作、时长和口播节奏，只替换人物、产品或场景。', active: true },
  { id: 'rewrite', index: '02', title: '原片仿写', subtitle: '中等自由度', description: '学习原片镜头、动作与叙事节奏，对整体画面进行重新绘制。', active: false },
  { id: 'structure', index: '03', title: '结构仿写', subtitle: '最高自由度', description: '提取开场钩子、镜头顺序与剪辑骨架，自由改写人物、台词和场景。', active: false },
]

export const steps = ['接收需求', '拆解视频', '替换元素', '提取片段', '生成视频']

export const demoRequest = '根据视频拆解脚本进行元素替换：人物和服饰替换成人物形象，手持产品替换成 Gold Shilajit Gummies，手持胶囊替换成红色方糖软糖，其他镜头、动作、运镜、时长和口播节奏保持不变。'

export const demoAssets = [
  { id: 'person', name: '人物形象.jpg', role: '人物与服饰', path: './viral-remake-demo/person.jpg' },
  { id: 'product', name: '产品外观.jpg', role: '手持产品', path: './viral-remake-demo/product.jpg' },
  { id: 'gummy', name: '产品方糖心态.png', role: '胶囊 / 方糖', path: './viral-remake-demo/gummy.png' },
]

export const originalBoards = [1, 2, 3].map(index => `./viral-remake-demo/original-${index}.jpg`)
export const replacedBoards = [1, 2, 3].map(index => `./viral-remake-demo/replaced-${index}.png`)

export const breakdownText = `# 视频拆解与复刻框架

## 全局信息
- 时长：41 秒
- 画幅：TikTok 9:16 竖屏
- 结构：真人口播 + 信息图钩子 + 产品展示
- 节奏：前 10 秒建立痛点，11–26 秒解释方案，27–41 秒强化产品与行动引导

## 镜头拆解
1. 0–9s：人物正对镜头，用手指向顶部血管对比图，快速建立“没人告诉你”的信息差。
2. 10–15s：手持单颗胶囊靠近镜头，强调服用频率与时间。
3. 16–24s：切换为产品瓶展示，保持人物口播和轻微手持运动。
4. 25–26s：短暂出现血流示意图，作为功效解释的视觉证据。
5. 27–35s：回到产品瓶，多次调整瓶身位置以维持画面节奏。
6. 36–42s：产品和单颗胶囊交替出现，完成结论与行动引导。`

export const storyboardText = `# 替换后的故事面板

## 片段 01 · 0–15s
镜头 1：新人物坐在原场景中，保持正面自拍构图，指向顶部血管对比信息图。
镜头 2：人物用拇指和食指夹住红色方糖软糖，位置、手势和视线与原片一致。
镜头 3：近景强调方糖尺寸，口播节奏与字幕切换保持不变。

## 片段 02 · 15–30s
镜头 4：人物举起黑色 Gold Shilajit Gummies 产品罐，标签朝向镜头。
镜头 5：产品罐在画面左上方轻微移动，保留原片手持抖动和停顿。
镜头 6：顶部插入血流示意图，人物继续口播并用手势强调。

## 片段 03 · 30–41s
镜头 7：人物再次展示产品罐，保持肩部、视线和背景不变。
镜头 8：产品罐降低到胸前，字幕节奏延续原片。
镜头 9：人物举起红色方糖软糖作为收尾，停留至最后一帧。`

export const segmentDocuments = [
  { id: 'segment-1', title: '片段 01', time: '00:00–00:15', duration: '15s', shots: '镜头 1–3', content: '保持原片开场钩子和指向动作。将人物与服饰替换为参考人物；将手持胶囊替换为红色方糖软糖。顶部血管对比图、背景、机位和字幕节奏不变。' },
  { id: 'segment-2', title: '片段 02', time: '00:15–00:30', duration: '15s', shots: '镜头 4–6', content: '人物举起 Gold Shilajit Gummies 黑色产品罐，标签朝向镜头。保持产品移动轨迹、人物口播、血流示意图出现时间与原片一致。' },
  { id: 'segment-3', title: '片段 03', time: '00:30–00:41', duration: '11s', shots: '镜头 7–9', content: '继续使用参考人物与黑色产品罐，复刻原片抬起、降低和再次展示的动作。末尾用红色方糖软糖替代胶囊并保持最后停顿。' },
]
