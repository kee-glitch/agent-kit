import { segmentMarkdownDocuments } from "./viral-remake-segments.js";
import {
  structureSegmentDocuments,
  structureStyleGuide,
  structureStoryboardText,
} from "./structure-remake-storyboard.js";
import latestBreakdownText from "./video-breakdown-demo.js";

export const modes = [
  { id: 'element', index: '01', title: '元素替换', subtitle: '最贴近原片动作镜头', description: '保留原视频的镜头、运镜、动作、时长和口播节奏，只替换人物、产品或场景。', active: true },
  { id: 'rewrite', index: '02', title: '原片仿写', subtitle: '中等自由度', description: '学习原片镜头、动作与叙事节奏，对整体画面进行重新绘制。', active: true },
  { id: 'structure', index: '03', title: '结构仿写', subtitle: '最高自由度', description: '提取开场钩子、镜头顺序与剪辑骨架，自由改写人物、台词和场景。', active: true },
]

export const steps = ['拆解视频', '替换素材', '替换结果', '提取片段']

export const demoRequest = '根据视频拆解脚本进行元素替换：人物和服饰参考 @图片1，手持产品参考 @图片2，手持胶囊替换成 @图片3，其他镜头、动作、运镜、时长和口播节奏保持不变。'

export const demoAssets = [
  { id: 'person', name: '人物形象.jpg', role: '图片1', type: 'image', sourceId: 'person', path: './viral-remake-demo/person.jpg' },
  { id: 'product', name: '产品外观.jpg', role: '图片2', type: 'image', sourceId: 'product-bottle', path: './viral-remake-demo/product.jpg' },
  { id: 'gummy', name: '产品方糖心态.png', role: '图片3', type: 'image', sourceId: 'product-detail', path: './viral-remake-demo/gummy.png' },
]

export const scriptResources = [
  {
    id: 'person',
    type: 'person',
    role: '图片1',
    title: '人物1',
    description: '卷发男主，真人出镜口播，直视镜头并配合手势。',
  },
  {
    id: 'product-detail',
    type: 'product',
    role: '图片3',
    title: '产品1-单粒特写',
    description: '纯白色胶囊，手持特写。',
  },
  {
    id: 'product-bottle',
    type: 'product',
    role: '图片2',
    title: '产品1-瓶装',
    description: '黑色瓶身、银蓝标签、印有 ADAM 字样的营养补充剂。',
  },
]

export const originalReplacementResources = scriptResources;

const structureStyleResource = {
  id: 'style-reference',
  type: 'style',
  role: '图片4',
  title: '风格参考',
  description: '提取叙事骨架：开场钩子、镜头顺序、剪辑节奏、分镜逻辑；可改写画面、人物、台词、场景。',
}

const structureStyleAsset = {
  id: 'style-reference',
  name: '结构分镜参考.jpg',
  role: '图片4',
  type: 'image',
  sourceId: 'style-reference',
  path: './viral-remake-demo/structure-storyboard.jpg',
}

const structureResourceRoles = {
  person: '图片3',
  'product-detail': '图片1',
  'product-bottle': '图片2',
}

const structureReplacementResources = originalReplacementResources.map((resource) => ({
  ...resource,
  role: structureResourceRoles[resource.id],
}))

const structureAssets = demoAssets.map((asset) => ({
  ...asset,
  role: structureResourceRoles[asset.sourceId],
}))

export const structureDemo = {
  aspectRatio: '1:1',
  referenceImage: './viral-remake-demo/structure-storyboard.jpg',
  request: '参考 @图片4 提取叙事骨架：保留开场钩子、镜头顺序、剪辑节奏和分镜逻辑；画面、人物、台词、场景可自由改写。',
  replacementResources: [...structureReplacementResources, structureStyleResource],
  assets: [...structureAssets, structureStyleAsset],
  storyboard: structureStoryboardText,
  styleGuide: structureStyleGuide,
  segments: structureSegmentDocuments,
}

export const originalBoards = [1, 2, 3].map(index => `./viral-remake-demo/original-${index}.jpg`)
export const replacedBoards = [1, 2, 3].map(index => `./viral-remake-demo/replaced-${index}.png`)

export const breakdownText = latestBreakdownText;

export { latestStoryboardText as storyboardText };

export const segmentDocuments = [
  { id: 'segment-1', title: '片段 01', time: '00:00–00:15', duration: '15s', shots: '镜头 1–4', summary: '人物完成血管对比钩子与痛点口播，依次展示红色方糖形软糖和产品罐。', content: segmentMarkdownDocuments[0] },
  { id: 'segment-2', title: '片段 02', time: '00:15–00:30', duration: '15s', shots: '镜头 5–7', summary: '人物手持产品罐讲解成分、血管扩张原理与产品价值，保持医学图解和标签稳定。', content: segmentMarkdownDocuments[1] },
  { id: 'segment-3', title: '片段 03', time: '00:30–00:41', duration: '11s', shots: '镜头 8–9', summary: '人物手持产品罐强化缺货风险，并指向左下方购物链接完成免邮催单。', content: segmentMarkdownDocuments[2] },
]
import { storyboardText as latestStoryboardText } from "./viral-remake-storyboard.js";
