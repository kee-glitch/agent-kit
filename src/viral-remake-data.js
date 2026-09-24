import { segmentMarkdownDocuments } from "./viral-remake-segments.js";

export const modes = [
  { id: 'element', index: '01', title: '元素替换', subtitle: '最贴近原片动作镜头', description: '保留原视频的镜头、运镜、动作、时长和口播节奏，只替换人物、产品或场景。', active: true },
  { id: 'rewrite', index: '02', title: '原片仿写', subtitle: '中等自由度', description: '学习原片镜头、动作与叙事节奏，对整体画面进行重新绘制。', active: false },
  { id: 'structure', index: '03', title: '结构仿写', subtitle: '最高自由度', description: '提取开场钩子、镜头顺序与剪辑骨架，自由改写人物、台词和场景。', active: false },
]

export const steps = ['拆解视频', '替换素材', '替换结果', '提取片段']

export const demoRequest = '根据视频拆解脚本进行元素替换：人物和服饰参考 @图片1，手持产品参考 @图片2，手持胶囊替换成 @图片3，其他镜头、动作、运镜、时长和口播节奏保持不变。'

export const demoAssets = [
  { id: 'person', name: '人物形象.jpg', role: '图片1', type: 'image', sourceId: 'person', path: './viral-remake-demo/person.jpg' },
  { id: 'product', name: '产品外观.jpg', role: '图片2', type: 'image', sourceId: 'product-bottle', path: './viral-remake-demo/product.jpg' },
  { id: 'gummy', name: '产品方糖心态.png', role: '图片3', type: 'image', sourceId: 'product-detail', path: './viral-remake-demo/gummy.png' },
]

export const originalReplacementResources = [
  {
    id: 'person',
    type: 'person',
    role: '图片1',
    title: '人物1',
    description: '讲述者／男青年／深肤色／黑色卷发／略带胡茬／面部表情丰富／讲话时频繁摆动右手食指。',
  },
  {
    id: 'product-detail',
    type: 'detail',
    role: '图片3',
    title: '产品1-单粒特写',
    description: '补剂／白色胶囊／手持特写。',
  },
  {
    id: 'product-bottle',
    type: 'bottle',
    role: '图片2',
    title: '产品1-瓶装',
    description: '补剂／黑色圆柱药瓶／银色与青色反光标签／标签印有 ADAM 字样／手持展示。',
  },
]

export const originalBoards = [1, 2, 3].map(index => `./viral-remake-demo/original-${index}.jpg`)
export const replacedBoards = [1, 2, 3].map(index => `./viral-remake-demo/replaced-${index}.png`)

export const breakdownText = "## 01｜视频定位\r\n\r\n* **总时长：** 00:42；00:00-00:06问题抛出，00:06-00:14痛点共鸣与方案引出，00:14-00:26原理背书，00:26-00:42稀缺促单。\r\n* **内容类型：** 电商带货；痛点切入配合成分科普引导购买补剂。\r\n* **呈现形式：** 真人出镜单人口播，配合顶部画中画视觉说明。\r\n* **视觉风格：** 日常家居环境，自然光，无复杂打光，视觉重点集中于人物动作与贴图。\r\n* **情绪弧线：** 揭示真相 → 痛点共鸣回忆 → 自信推荐 → 紧迫促单。\r\n* **语言与声音：** 法语；男声，快语速，语气肯定、急促、充满激情。\r\n* **一句话策略：** 用【痛点回忆与过程分享】串联【精力状态变化】，通过【成分背书与血管扩张原理演示】回应【疲劳与血流不畅的痛点】，推动【点击左下角链接抢购】。\r\n\r\n## 02｜脚本资源\r\n\r\n* **【人物1】**：讲述者/男青年/深肤色/黑色卷发/略带胡茬/面部表情丰富/讲话时频繁挥动右手食指。\r\n* **【产品1-单粒特写】**：补剂/白色胶囊/手持特写。\r\n* **【产品1-瓶装】**：补剂/黑色圆柱药瓶/银色与青色反光标签/标签印有ADAM字样/手持展示。\r\n\r\n## 03｜转化逻辑\r\n\r\n* **目标人群：** 感到日常疲劳、精力不济，希望改善血液循环的男性群体。\r\n* **核心痛点：** 持续疲惫，精力极度匮乏（“坚持不到2分钟”）。\r\n* **核心承诺：** 每天5分钟坚持一个月，即可100%改善血液循环。\r\n* **信任依据：** 公开硬核成分（玛卡、南非醉茄、瓜氨酸、精氨酸），配合血管扩张的视觉动画解释原理，强调美国原装配方。\r\n* **行动目标：** 趁库存未空，立即点击视频左下角链接购买。\r\n\r\n## 04｜吸引力机制\r\n\r\n* **开场钩子：** 00:00-00:06，通过“没人告诉你的秘密”配合红绿对比的血管画中画，制造猎奇与悬念。\r\n* **留人机制：** 讲述极具共鸣的“极度疲惫”痛点，随即在00:12直接掏出方案实体，满足好奇。\r\n* **理解机制：** 画中画直观展示变窄与变宽的血管对比，将晦涩的“血管扩张”名词视觉化。\r\n* **信任机制：** 罗列多种知名植物提取物与氨基酸成分，利用“美国进口”标签建立功效信任。\r\n* **欲望机制：** 将产品描述为解决精力问题的“神奇配方”，直击生活核心困扰。\r\n* **CTA机制：** 极致的稀缺性打法（经常断货、美国发货难买），配合红色动态箭头与免邮承诺，消除决策阻力。\r\n\r\n## 05｜叙事编排\r\n\r\n| 时间范围 | 阶段任务 | 进入时状态 | 关键变化 | 离开时状态 |\r\n| --- | --- | --- | --- | --- |\r\n| 00:00-00:06 | 问题建立 | 悬念与猎奇 | 揭示血液循环的盲区真相 | 产生兴趣 |\r\n| 00:06-00:11 | 痛点展开 | 产生兴趣 | 回忆并共鸣极度疲惫的个人状态 | 痛点共鸣 |\r\n| 00:11-00:14 | 方案出现 | 痛点共鸣 | 引入具体胶囊补剂方案 | 看到希望 |\r\n| 00:14-00:26 | 价值解释 | 看到希望 | 科普核心成分与血管扩张原理 | 建立信任 |\r\n| 00:26-00:42 | 行动转化 | 建立信任 | 强调常年断货并指引点击链接抢购 | 紧迫购买 |\r\n\r\n## 06｜场景规划\r\n\r\n| 时间范围 | 空间环境 | 色彩光线 | 核心焦点 | 主要动作 | 情绪功能 | 信息功能 | 场景关系 |\r\n| --- | --- | --- | --- | --- | --- | --- | --- |\r\n| 00:00-00:11 | 卧室背景，白色墙面，可见深色床铺 | 自然面光，色彩日常真实 | `[人物1]` | 直视镜头口播，右手食指频频指向头部与画中画 | 引发好奇与共鸣 | 抛出循环问题与疲劳痛点 | 开场破冰，建立问题 |\r\n| 00:11-00:14 | 同上 | 同上 | `[人物1]`、`[产品1-单粒特写]` | 右手捏住胶囊在额前展示 | 豁然开朗 | 引入具体解决方案 | 痛点到方案的转折 |\r\n| 00:14-00:26 | 同上 | 同上 | `[人物1]`、`[产品1-瓶装]` | 举起药瓶摇晃，配合血管扩张画中画进行手部比划 | 专业自信 | 解释成分与生效原理 | 理性背书，支撑希望 |\r\n| 00:26-00:42 | 同上 | 同上 | `[人物1]`、`[产品1-瓶装]` | 持续举瓶展示，手指随红色箭头向下指向左下角 | 紧迫催促 | 传递稀缺性并引导点击 | 信任到转化的临门一脚 |\r\n\r\n## 07｜分镜执行\r\n\r\n| 时间码 | 景别／角度／运镜 | 画面／动作 | 情绪／眼神 | 时序／物理／连续性 | 口播／台词 | 贴图 / 画中画 / 字幕 / 画面文字 | 音效／BGM | 剪辑／转场 | 内容作用 |\r\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\r\n| 00:00-00:06 | 中近景/平视/固定 | `[人物1]`直视镜头，右手食指指向脑侧并随节奏挥动。上方展示血管对比图 | 严肃/肯定 | 动作连贯自然 | Ce que personne ne vous dit, c'est que ça prend 5 minutes par jour pendant un mois pour améliorer à 100% votre seule circulation sanguine. | 画中画：顶部红底白字框显示\"Ce que personne ne vous dit... 😔\"，下方左侧窄血管图配\"❌\"，右侧宽血管图配\"✅\"。字幕：屏幕居中单行逐字显示，无底色。 | 人声直出 | 硬切进入 | 制造悬念，锁定视觉注意力 |\r\n| 00:06-00:11 | 中近景/平视/跳剪轻微放大 | `[人物1]`继续口播，右手在胸前用力比划 | 略带疲惫回忆 | 画面微跳，焦点不变 | À quelques mois j'étais exactement comme ça, j'étais tout le temps fatigué, j'avais pas d'énergie, je tenais à peine 2 minutes. | 字幕同上 | 无 | 跳剪 | 痛点共鸣，代入自身经历 |\r\n| 00:11-00:14 | 中近景/平视/跳剪 | `[人物1]`右手拇指与食指捏着`[产品1-单粒特写]`在额头前展示 | 推荐/肯定 | 胶囊突然出现 | Ça fait quelques mois que je prends ça deux fois par jour, une le midi, une le soir. | 字幕同上 | 无 | 跳剪 | 实体介入，满足前序悬念 |\r\n| 00:14-00:23 | 中近景/平视/跳剪 | `[人物1]`右手举起`[产品1-瓶装]`并随语速轻微摇晃展示 | 充满自信 | 胶囊变药瓶 | En gros ça c'est une formule qui a été fait exprès pour améliorer la circulation sanguine. Déjà il y a les classiques shilajit, ashwagandha et maca, mais en plus de ça, ils ont mis de la citrulline et de l'arginine qui sont en fait des vasodilatateurs. | 字幕同上 | 无 | 跳剪 | 展示全貌，硬核成分背书 |\r\n| 00:23-00:26 | 中近景/平视/跳剪 | `[人物1]`单手比划，画面上方出现两条血管对比的画中画动画 | 解释/专业 | 贴图与手势同步 | C'est à dire qu'ils vont augmenter le diamètre des veines et améliorer l'afflux sanguin. | 画中画：两条红色血管3D图，展示扩张状态。字幕同上 | 无 | 跳剪 | 将专业名词进行视觉化翻译 |\r\n| 00:26-00:35 | 中近景/平视/跳剪 | `[人物1]`再次举起`[产品1-瓶装]`展示并摇晃 | 坚定/夸赞 | 动作紧凑 | C'est vraiment une formule incroyable et évidemment c'est un produit américain, il y a que eux pour nous faire ça. C'est une cure de 1 mois mais le problème avec ces cures là, c'est qu'elles sont tout le temps en rupture de stock. Vu que ça vient directement des États-Unis, c'est très dur d'en avoir. | 字幕同上 | 无 | 跳剪 | 制造美国原装与极度稀缺的价值感 |\r\n| 00:35-00:42 | 中近景/平视/跳剪 | `[人物1]`右手拿着`[产品1-瓶装]`，画面出现向下的红箭头，目光与动作引导看向左下角 | 紧迫/催促 | 箭头指向准确对应平台挂车位 | Si tu vois un petit lien en bas à gauche de la vidéo, c'est qu'il reste des stocks, je te conseille de foncer là-dessus avant qu'il n'y en ait plus. Ça part vraiment très vite, si tu vois encore le lien fonce là-dessus, il y a la livraison qui est gratuite. | 画面文字：红色向下粗箭头\"⬇️\"出现在胸前位置。字幕同上 | 无 | 跳剪 | 指引行动，消除邮费顾虑，完成收割 |";

export { latestStoryboardText as storyboardText };

export const segmentDocuments = [
  { id: 'segment-1', title: '片段 01', time: '00:00–00:15', duration: '15s', shots: '镜头 1–4', summary: '人物完成血管对比钩子与痛点口播，依次展示红色方糖形软糖和产品罐。', content: segmentMarkdownDocuments[0] },
  { id: 'segment-2', title: '片段 02', time: '00:15–00:30', duration: '15s', shots: '镜头 5–7', summary: '人物手持产品罐讲解成分、血管扩张原理与产品价值，保持医学图解和标签稳定。', content: segmentMarkdownDocuments[1] },
  { id: 'segment-3', title: '片段 03', time: '00:30–00:41', duration: '11s', shots: '镜头 8–9', summary: '人物手持产品罐强化缺货风险，并指向左下方购物链接完成免邮催单。', content: segmentMarkdownDocuments[2] },
]
import { storyboardText as latestStoryboardText } from "./viral-remake-storyboard.js";
