import main from './assets/cortisol-demo/main.jpg'
import red from './assets/cortisol-demo/red.png'
import blue from './assets/cortisol-demo/blue.png'
import scale from './assets/cortisol-demo/scale.png'

// User-supplied demo inputs; efficacy statements are not verified product claims.
export const cortisolMarketingGroup = {
  name: 'PCOS 确诊及疑似多囊女性',
  summary: '美国市场 · 关注月经周期与排卵功能的女性',
  targetAudience: 'PCOS 确诊及疑似多囊女性',
  painPoint: '长期胰岛素抵抗与雄激素过高，会造成月经稀发甚至闭经，进而出现严重的痤疮与脱发，同时伴随排卵障碍，一步步引发“多囊综合征候群”。',
  result: '恢复规律月经周期与排卵功能',
  originalSellingPoint: 'MYO-INOSITOL FULL SPECTRUM FORMULA, D-CHIRO INOSITOL, BERBERINE, VITAMIN D3 + K2',
  buyerContent: '买点 01：利用 40:1 黄金比例肌醇与小檗碱协同作用，从源头改善胰岛素敏感性，重启卵巢正常排卵机制',
  materialDirection: ''
}
export const cortisolProduct = { name: '皮质醇软糖', category: '营养补充剂', images: [main, red, blue, scale] }
export const cortisolDemo = {
  productSource: '个人商品', product: cortisolProduct.name,
  marketingGroup: cortisolMarketingGroup.name, productImages: cortisolProduct.images,
  platform: 'TikTok', ratio: '9:16 竖屏', duration: '60 秒',
  market: '美国 · English (US)', speechRate: '快速 · 180 WPM',
  creativeDirection: { goal: '解释核心卖点', format: 'UGC 真人口播', style: '原生自然' },
  videoRequirement: '制作一条面向美国市场的 60 秒 TikTok 竖屏演示视频，比例 9:16，使用美式英语口播，语速偏快（180 WPM）。围绕 PCOS 确诊及疑似多囊女性的关注点组织内容：前 5 秒以周期管理困扰引入，5–15 秒展示产品与包装，15–35 秒以红瓶 MYO-INOSITOL 标签说明配方信息，35–50 秒展示瓶身细节及手持比例，50–60 秒引导查看产品详情。采用自然居家 UGC 口播、产品微距和清晰英文字幕，绑定四张参考图片。演示名称沿用“皮质醇软糖”；包装实际标注 60 SOFTGELS，红蓝瓶配方不同，蓝瓶和比例图仅作为包装参考。以上功效买点为用户提供的待核验演示输入，不将恢复排卵、40:1 配比或改善胰岛素敏感性作为已证实功效进行口播。'
}
export const cortisolImageDetails = Object.fromEntries([
  [main, '产品双瓶主图', '展示蓝色 CORTISOL-HEALTH 与红色 MYO-INOSITOL 双瓶组合、金色瓶盖及包装标签。'],
  [red, 'MYO-INOSITOL 红瓶正面', '清晰展示肌醇配方标签与 60 SOFTGELS 标识，作为本条演示的主要配方参考。'],
  [blue, 'CORTISOL-HEALTH 蓝瓶正面', '蓝瓶包装参考；其配方与红瓶不同，画面制作时注意区分。'],
  [scale, '产品手持比例参考', '展示人物手持瓶身的相对大小，供画面构图与产品比例参考。']
].map(([url, title, description]) => [url, { title, description }]))

export const cortisolWorkflow = {
  scriptTitle: 'Read the Label. Know Your Routine.',
  lines: [
    'Living with PCOS, or wondering about your cycle? You deserve clear information, not another promise of an overnight fix.',
    'Before adding any supplement, start with the label. This is the red WindBoss Myo Inositol bottle in our product demo.',
    'The front lists myo inositol, D chiro inositol, berberine, and vitamins D three and K two. Check the supplement facts.',
    'Ingredients do not guarantee results. Ask your healthcare professional whether this formula fits your needs and current medications.',
    'Notice the packaging says sixty softgels. The blue bottle is a different formula, so do not assume these two products are interchangeable.',
    'See the bottle up close and beside a hand for scale. Read the directions before making a decision.',
    'Tracking symptoms and bringing questions to an appointment can help make that conversation more useful. A supplement does not replace an individual care plan.',
    'Want a closer look? Open the product details, review the full label, and make an informed choice with your healthcare professional.'
  ],
  summary: '60 秒、9:16、美式英语 UGC 演示。成年女性从周期管理的信息需求出发，展示 MYO-INOSITOL 红瓶标签，说明成分阅读方式，区分蓝瓶配方与软胶囊包装，再通过手持比例和产品详情完成行动引导。产品功效输入保留在需求页，口播不承诺治疗或恢复排卵。',
  preferences: { subtitleStyle: 'outlined-white', subtitleFont: '自动匹配', generationModel: 'Seedance 2.0-标准版', shootingPreferences: ['正对镜头口播', '手部操作', '产品微距', '半身近景', '自拍视角', '桌面顶拍', '固定机位', '缓慢推近', '主体锁焦', '匹配剪辑'] },
  resources: {
    '主体1': { type: '人物', name: '美国成年女性 UGC 讲述者', description: '成年女性，自然妆容与真实肤质，神态平静友好；面对镜头时保持自然手势，使用清晰的美式英语口型。', thumbnail: '' },
    '服饰1': { type: '服饰', name: '米白色日常上衣', description: '米白色日常长袖上衣，纯色无图案，面料柔软自然，不出现可识别品牌标识；所有出镜镜头保持款式与颜色一致。', thumbnail: '' },
    '场景1': { type: '场景', name: '美国居家明亮桌面', description: '靠窗的明亮居家桌面，使用自然柔光、浅色台面与简洁生活化背景；不增加无关人物或杂乱陈设。', thumbnail: '' },
    '道具1': { type: '产品', name: 'MYO-INOSITOL 红瓶', description: '金色瓶盖、红色瓶身、60 SOFTGELS。保持原标签与瓶身比例，不增加成分或配比标识。', thumbnail: red },
    '道具2': { type: '产品', name: 'CORTISOL-HEALTH 蓝瓶', description: '金色瓶盖、蓝色瓶身、60 SOFTGELS；与红瓶配方不同，仅用于包装区分镜头。', thumbnail: blue },
    '道具3': { type: '产品', name: '产品双瓶主图', description: '用户提供的红蓝双瓶主图，展示两款产品包装。', thumbnail: main },
    '道具4': { type: '道具', name: '产品手持比例参考', description: '用户提供的人台手持产品比例图，仅参考瓶身与手部的相对大小，不作为人物或服饰素材。', thumbnail: scale }
  }
}
export const cortisolScript = {
  summary: cortisolWorkflow.summary,
  hook: cortisolWorkflow.lines[0],
  oral: cortisolWorkflow.lines.join(' '),
  cta: cortisolWorkflow.lines[7]
}
const cortisolShotPlans = [
  ['信息共鸣', '受众引入', '0–7 秒，<主体1> 身穿 <服饰1> 在 (场景1) 平视镜头，以自然手势引入周期信息需求。半身近景、柔和日光，不展示身体缺陷或诊断画面。'],
  ['红瓶进入画面', '产品展示', '7–15 秒，<主体1> 将 (道具1) 举至胸前，标签完整朝向镜头。固定机位轻微推近，保留瓶盖和瓶底。'],
  ['配方标签微距', '成分阅读', '15–23 秒，镜头切至 (道具1) 标签微距，手指沿原有配方文字移动。不新增 40:1 或其他包装未显示的文字。'],
  ['回到理性选择', '信任说明', '23–30 秒，<主体1> 将 (道具1) 放回 (场景1) 桌面，面对镜头解释阅读信息的价值。自然口型、无医生服饰。'],
  ['双瓶区别', '包装区分', '30–38 秒，(道具1) 与 (道具2) 并排放置，先对焦红瓶再对焦蓝瓶，清晰呈现不同标签和 60 SOFTGELS 标识。'],
  ['手持比例', '细节参考', '38–45 秒，<主体1> 手持 (道具1)，参照 (道具4) 的真实相对比例构图。标签正向，不改变包装、不演示吞服。'],
  ['生活化收束', '需求回应', '45–53 秒，<主体1> 身穿 <服饰1> 回到 (场景1) 半身镜头，轻轻点头并收拢双手，表达清楚了解产品信息的态度。'],
  ['产品详情引导', '行动引导', '53–60 秒，以 (道具1) 为前景、(道具2) 为背景，镜头缓慢推近红瓶标签，留出英文字幕安全区；不添加折扣、疗效或虚构评价。']
]
export const cortisolShots = cortisolShotPlans.map(([title, theme, visual], index) => ({title, theme, text: `${visual} 9:16 竖屏、自然 UGC 质感。美式英语口播，偏快但清晰，约 180 WPM：{${cortisolWorkflow.lines[index]}}。轻柔无歌词背景音乐，产品落桌轻响，英文字幕与口播一致。`}))
