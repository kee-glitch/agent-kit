import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, Box, Captions, Check, ChevronDown, CircleAlert, Clock3,
  Copy, FileText, Film, Image, Layers3, Library, Link2, LoaderCircle, Lock, Mic2,
  Package, Pencil, Play, Plus, RefreshCw, Search, Settings2, ShieldAlert, Sparkles, Unlock, Upload, UserRound,
  Video, WandSparkles, X
} from 'lucide-react'
import './video-workspace.css'
import { mockPreviewImages } from './AssetWorkspace'

const steps = [
  ['brief', FileText, '创作需求', '已完成'],
  ['script', Sparkles, '剧本', '已完成'],
  ['assets', Library, '核心资产', '待确认'],
  ['storyboard', Layers3, '分镜脚本', '未开始'],
  ['generate', Video, '视频生成', '未开始'],
  ['export', Film, '合成导出', '未开始']
]

const assets = [
  { id: 1, type: '产品', name: 'AeroPress Go 便携咖啡器', meta: '产品库 · 6 张参考图', icon: Package, state: 'bound' },
  { id: 2, type: '人物', name: '城市通勤女性 01', meta: '人物库 · 已锁定形象', icon: UserRound, state: 'bound' },
  { id: 3, type: '服饰', name: '燕麦色通勤套装', meta: '服饰库 · 已锁定', icon: Box, state: 'bound' },
  { id: 4, type: '场景', name: '现代公寓厨房', meta: '需要生成场景参考图', icon: Image, state: 'missing' },
  { id: 5, type: '声音', name: '自然、轻快的女性声线', meta: '声音库 · 中文普通话', icon: Mic2, state: 'bound' }
]

const shotCopy = [
  ['钩子', '早晨赶时间，她把昂贵咖啡倒进水槽', '人物、厨房、咖啡杯'],
  ['痛点', '镜头扫过排队中的咖啡店和手表', '人物、街道场景'],
  ['解决方案', '产品展开并完成一次快速冲泡', '人物、产品、厨房'],
  ['效果证明', '咖啡液流入透明杯，展示细腻油脂', '产品、透明杯、微距'],
  ['行动引导', '人物拿起咖啡出门，产品收入通勤包', '人物、产品、通勤包']
]

function Workflow({ active, onChange }) {
  return <aside className="video-flow-nav" aria-label="视频创作步骤">
    <div className="video-flow-title"><WandSparkles/><div><strong>快捷生成视频</strong><span>竖屏产品种草视频</span></div></div>
    <nav>{steps.map(([id, Icon, label, state], index) => <button className={active === index ? 'active' : index < active ? 'done' : ''} onClick={() => onChange(index)} key={id}>
      <span className="flow-step-icon">{index < active ? <Check/> : <Icon/>}</span>
      <span><b>{label}</b><small>{index < active ? '已完成' : state}</small></span>
      <em>{String(index + 1).padStart(2, '0')}</em>
    </button>)}</nav>
    <div className="video-flow-help"><CircleAlert/><span>所有内容均为 Demo 数据，可自由切换步骤查看。</span></div>
  </aside>
}

const briefOptions = {
  product: ['个人商品', '团队商品', '自由创作'],
  platform: ['TikTok', 'Instagram Reels', 'YouTube Shorts', 'Amazon Video', '独立站广告', '通用竖屏视频'],
  market: ['美国 · English (US)', '英国 · English (UK)', '加拿大 · English', '日本 · 日本語', '韩国 · 한국어', '中国大陆 · 简体中文', '中国台湾 · 繁體中文', '德国 · Deutsch', '法国 · Français', '西班牙 · Español'],
  duration: ['15 秒', '30 秒', '45 秒', '60 秒', '90 秒', '自定义时长'],
  ratio: ['9:16 竖屏', '16:9 横屏', '1:1 方形', '4:5 竖版', '3:4 竖版'],
  format: ['UGC 真人口播', '产品功能演示', '产品测评', '开箱体验', '情景剧情', '生活方式短片', '知识科普', '纯产品展示', '用户证言', '品牌故事'],
  goal: ['促进购买转化', '建立产品认知', '解释核心卖点', '建立用户信任', '展示使用效果', '宣传新品上市', '推广优惠活动', '引导关注或互动']
}

const subtitleStyles = [
  { id: 'pop-in', name: '弹出式字幕', meta: '重点词放大弹出', image: `${import.meta.env.BASE_URL}subtitle-previews/pop-in.png` },
  { id: 'white-card', name: '白底黑字字幕', meta: '白色色块底板 · 清晰易读', image: `${import.meta.env.BASE_URL}subtitle-previews/white-card.png` },
  { id: 'comment-reply', name: '引用评论字幕', meta: '评论卡片与回复内容', image: `${import.meta.env.BASE_URL}subtitle-previews/comment-reply.png` },
  { id: 'ktv-lyrics', name: 'KTV 歌词字幕', meta: '逐词变色高亮', image: `${import.meta.env.BASE_URL}subtitle-previews/ktv-lyrics.png` },
  { id: 'outlined-white', name: '黑描边白字字幕', meta: '通用口播字幕', image: `${import.meta.env.BASE_URL}subtitle-previews/outlined-white.png` }
]

const subtitleFonts = ['自动匹配', '经典粗体', '运动斜体', '厚重无衬线', '紧凑标题体', '窄体大字']

const shootingPreferenceGroups = [
  ['产品表现', ['手部操作', '开箱拆封', '核心功能演示', '使用步骤展示', '使用效果展示', '使用效果对比', '材质细节', '尺寸比例展示', '360 度展示', '便携收纳展示', '多场景使用', '配件组合展示', '包装与清单展示', '品牌标识特写']],
  ['人物表现', ['正对镜头口播', '侧面对话', '采访回答', '边走边说', '边用边讲', '情景演绎', '自然抓拍', '无台词表演', '情绪反应', '多人互动', '局部出镜', '画外音配合']],
  ['景别构图', ['产品微距', '人物特写', '半身近景', '全身中景', '环境全景', '中心构图', '三分构图', '对称构图', '留白构图']],
  ['视角机位', ['平视机位', '第一视角', '自拍视角', '俯拍视角', '低机位仰拍', '过肩视角', '桌面顶拍', '贴地机位']],
  ['运镜倾向', ['手持跟拍', '平行跟拍', '固定机位', '缓慢推近', '缓慢拉远', '横向摇摄', '升降运镜', '环绕运镜']],
  ['焦点表现', ['焦点转移', '浅景深跟焦', '主体锁焦', '前景虚化', '背景虚化']],
  ['节奏表现', ['前后对比剪辑', '慢动作', '延时摄影', '速度渐变', '快速转场', '甩镜转场', '匹配剪辑', '定格强调', '分屏对比', '一镜到底']]
]

const productCatalog = [
  { name: 'AeroPress Go 便携咖啡器', category: '咖啡器具', images: mockPreviewImages.slice(0, 4) },
  { name: 'Breeze Mini 随行风扇', category: '便携电器', images: mockPreviewImages.slice(3, 7) },
  { name: 'LumaCare 智能护眼灯', category: '智能家居', images: mockPreviewImages.slice(6, 10) },
  { name: 'PureSip 随行净水杯', category: '生活用品', images: mockPreviewImages.slice(9, 13) }
]

const marketingGroups = [
  { name: '美国年轻通勤女性', summary: '早晨时间紧张、重视效率的城市通勤者', targetAudience: '25–34 岁、工作节奏快、每天有咖啡需求的美国城市通勤女性', painPoint: '早晨排队买咖啡耗时，普通咖啡器具又不方便携带和清洗', result: '在家或办公室快速获得稳定口感的现磨咖啡，为早晨节省时间', originalSellingPoint: '快速冲泡、容易清洗、便携设计', buyerContent: '不用排队，几十秒完成冲泡，用完一冲即可放进通勤包', materialDirection: '通勤早晨前后对比、手部快速冲泡、清洗与装包连续动作' },
  { name: '美国户外旅行人群', summary: '露营、徒步和自驾场景中的便携咖啡需求', targetAudience: '20–40 岁、喜欢露营、自驾和轻户外活动的美国旅行人群', painPoint: '户外设备空间有限，难以随时喝到口感稳定的新鲜咖啡', result: '用轻量器具在营地、车边或旅途中快速完成一杯咖啡', originalSellingPoint: '轻量便携、无需复杂设备、耐用易收纳', buyerContent: '一套装进背包，到哪里都能快速冲泡自己的咖啡', materialDirection: '户外开包、营地冲泡、产品尺寸对比与旅行收纳展示' },
  { name: '英国办公室咖啡用户', summary: '关注效率、口感与日常成本的办公室人群', targetAudience: '25–45 岁、经常在办公室饮用咖啡的英国职场用户', painPoint: '办公室速溶咖啡口感不足，外购咖啡长期成本高且需要等待', result: '以更低的日常成本在工位快速获得干净稳定的咖啡口感', originalSellingPoint: '快速冲泡、稳定萃取、高性价比', buyerContent: '无需咖啡机，在工位也能轻松完成一杯品质咖啡', materialDirection: '办公室工位实拍、成本对比、冲泡过程和咖啡液微距' },
  { name: '日本精致生活人群', summary: '偏好小巧设计与生活仪式感的都市用户', targetAudience: '25–39 岁、重视居家品质和整洁收纳的日本都市生活人群', painPoint: '传统咖啡设备占空间、步骤复杂，容易破坏紧凑空间的整洁感', result: '用小巧器具完成具有仪式感的日常冲泡，并轻松收纳', originalSellingPoint: '小巧收纳、简洁设计、操作方便', buyerContent: '不占台面空间，也能每天享受认真冲泡咖啡的片刻', materialDirection: '极简桌面、安静冲泡、材质细节和收纳前后画面' }
]

const preferenceGroupOf = item => shootingPreferenceGroups.find(([, items]) => items.includes(item))?.[0]

function CustomSelect({ icon: Icon, label, value, defaultValue, options, onChange, className = '', optionDescriptions = {}, optionImages = {} }) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? options[0])
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef(null)
  const searchRef = useRef(null)
  const listId = useId()
  const currentValue = value ?? internalValue
  const searchable = options.length >= 4
  const filteredOptions = query.trim() ? options.filter(option => `${option} ${optionDescriptions[option] || ''}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) : options
  useEffect(() => {
    const close = event => { if (!rootRef.current?.contains(event.target)) { setOpen(false); setQuery('') } }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])
  useEffect(() => {
    if (open && searchable) window.requestAnimationFrame(() => searchRef.current?.focus())
  }, [open, searchable])
  const choose = option => {
    if (value === undefined) setInternalValue(option)
    onChange?.(option)
    setOpen(false)
    setQuery('')
  }
  const move = direction => {
    const currentIndex = options.indexOf(currentValue)
    choose(options[(currentIndex + direction + options.length) % options.length])
  }
  return <div className={`video-field ${className}`} ref={rootRef}>
    <span>{label}</span>
    <div className={`video-custom-select ${open ? 'is-open' : ''}`}>
      <button type="button" className="video-custom-select-trigger" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} onClick={() => setOpen(value => !value)} onKeyDown={event => {
        if (event.key === 'Escape') { setOpen(false); setQuery('') }
        if (event.key === 'ArrowDown') { event.preventDefault(); move(1) }
        if (event.key === 'ArrowUp') { event.preventDefault(); move(-1) }
      }}>{optionImages[currentValue] ? <img className="video-select-trigger-thumb" src={optionImages[currentValue]} alt="" referrerPolicy="no-referrer"/> : Icon && <Icon/>}<span>{currentValue}</span><ChevronDown/></button>
      {open && <div className="video-custom-select-menu" id={listId} role="listbox" aria-label={label}>{searchable && <div className="video-custom-select-search"><Search/><input ref={searchRef} value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') { setOpen(false); setQuery('') } }} placeholder={`搜索${label}`} aria-label={`搜索${label}`}/>{query && <button type="button" onClick={() => { setQuery(''); searchRef.current?.focus() }} aria-label="清空搜索"><X/></button>}</div>}<div className="video-custom-select-options">{filteredOptions.map(option => <button type="button" role="option" aria-selected={option === currentValue} className={`${option === currentValue ? 'selected' : ''} ${optionDescriptions[option] ? 'has-description' : ''}`} onClick={() => choose(option)} key={option}>{optionImages[option] && <img className="video-select-option-thumb" src={optionImages[option]} alt="" referrerPolicy="no-referrer"/>}<span className="option-copy"><span>{option}</span>{optionDescriptions[option] && <small>{optionDescriptions[option]}</small>}</span>{option === currentValue && <Check/>}</button>)}{filteredOptions.length === 0 && <div className="video-custom-select-empty">未找到匹配选项</div>}</div></div>}
    </div>
  </div>
}

function BriefSelect(props) {
  return <CustomSelect {...props}/>
}

function SubtitleStylePicker({ value, onChange, font, onFontChange }) {
  const [open, setOpen] = useState(false)
  const [hoveredStyle, setHoveredStyle] = useState('')
  const rootRef = useRef(null)
  const selected = subtitleStyles.find(style => style.id === value)
  const hoveredPreset = subtitleStyles.find(style => style.id === hoveredStyle)
  useEffect(() => {
    const close = event => { if (!rootRef.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])
  return <div className="video-field subtitle-field" ref={rootRef}><span>字幕</span><div className={`subtitle-picker ${open ? 'is-open' : ''}`}><button type="button" className="subtitle-picker-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(current => !current)} onKeyDown={event => { if (event.key === 'Escape') setOpen(false) }}><Captions/><span><strong>{selected?.name || '关闭字幕'}</strong><small>{selected ? `${selected.meta} · ${font}` : '成片不嵌入字幕'}</small></span><ChevronDown/></button>{open && <div className="subtitle-picker-menu" role="listbox" aria-label="字幕样式" onMouseLeave={() => setHoveredStyle('')}><button type="button" role="option" aria-selected={!value} className={`subtitle-style-option ${!value ? 'selected' : ''}`} onMouseEnter={() => setHoveredStyle('')} onFocus={() => setHoveredStyle('')} onClick={() => { onChange(''); setOpen(false) }}><span><strong>关闭字幕</strong><small>成片不嵌入字幕</small></span>{!value && <Check/>}</button>{subtitleStyles.map(style => <button type="button" role="option" aria-selected={style.id === value} className={`subtitle-style-option ${style.id === value ? 'selected' : ''}`} onMouseEnter={() => setHoveredStyle(style.id)} onFocus={() => setHoveredStyle(style.id)} onClick={() => onChange(style.id)} key={style.id}><span><strong>{style.name}</strong><small>{style.meta}</small></span>{style.id === value && <Check/>}</button>)}{value && <section className="subtitle-font-panel"><header><div><strong>字幕字体</strong><small>选择内嵌字幕使用的字体</small></div></header><div>{subtitleFonts.map(option => <button type="button" className={font === option ? 'selected' : ''} onMouseEnter={() => setHoveredStyle('')} onClick={() => onFontChange(option)} key={option}>{option}{font === option && <Check/>}</button>)}</div></section>}{hoveredPreset && <aside className="subtitle-hover-preview" aria-hidden="true"><img src={hoveredPreset.image} alt=""/><div><strong>{hoveredPreset.name}</strong><span>{hoveredPreset.meta}</span></div></aside>}</div>}</div></div>
}

function BriefPanel() {
  const [productSource, setProductSource] = useState(briefOptions.product[0])
  const [selectedProductName, setSelectedProductName] = useState('AeroPress Go 便携咖啡器')
  const [selectedMarketingGroup, setSelectedMarketingGroup] = useState('美国年轻通勤女性')
  const [productImages, setProductImages] = useState(productCatalog[0].images)
  const [productDragging, setProductDragging] = useState(false)
  const [productImagesLoading, setProductImagesLoading] = useState(false)
  const [productImagesUploading, setProductImagesUploading] = useState(false)
  const [pendingProductImageCount, setPendingProductImageCount] = useState(0)
  const [previewProductImage, setPreviewProductImage] = useState(null)
  const [selectedDuration, setSelectedDuration] = useState('45 秒')
  const [subtitleStyle, setSubtitleStyle] = useState('outlined-white')
  const [subtitleFont, setSubtitleFont] = useState('自动匹配')
  const [shootingPreferences, setShootingPreferences] = useState(['产品微距', '手持跟拍'])
  const [preferenceHint, setPreferenceHint] = useState('')
  const productImageInput = useRef(null)
  const productLoadTimer = useRef(null)
  const productUploadTimer = useRef(null)
  const pendingProductUrls = useRef([])
  const productImagesRef = useRef(productImages)
  useEffect(() => { productImagesRef.current = productImages }, [productImages])
  useEffect(() => {
    if (!previewProductImage) return
    const closeOnEscape = event => event.key === 'Escape' && setPreviewProductImage(null)
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [previewProductImage])
  useEffect(() => () => { clearTimeout(productLoadTimer.current); clearTimeout(productUploadTimer.current); pendingProductUrls.current.forEach(URL.revokeObjectURL); productImagesRef.current.forEach(image => image.startsWith('blob:') && URL.revokeObjectURL(image)) }, [])
  const loadCatalogImages = product => {
    clearTimeout(productLoadTimer.current)
    setProductImagesLoading(true)
    setProductImages([])
    productLoadTimer.current = window.setTimeout(() => {
      setProductImages(product.images)
      setProductImagesLoading(false)
    }, 650)
  }
  const addProductImages = fileList => {
    const added = Array.from(fileList).filter(file => file.type.startsWith('image/')).map(file => URL.createObjectURL(file))
    if (!added.length || productImagesLoading || productImagesUploading) return
    clearTimeout(productUploadTimer.current)
    pendingProductUrls.current = added
    setProductImagesUploading(true)
    setPendingProductImageCount(added.length)
    productUploadTimer.current = window.setTimeout(() => {
      setProductImages(value => [...value, ...added])
      pendingProductUrls.current = []
      setProductImagesUploading(false)
      setPendingProductImageCount(0)
    }, 650)
  }
  const changeProductSource = nextSource => {
    clearTimeout(productUploadTimer.current)
    pendingProductUrls.current.forEach(URL.revokeObjectURL)
    pendingProductUrls.current = []
    setProductImagesUploading(false)
    setPendingProductImageCount(0)
    productImages.filter(image => image.startsWith('blob:')).forEach(image => URL.revokeObjectURL(image))
    setProductSource(nextSource)
    setSelectedProductName('请选择商品')
    setSelectedMarketingGroup('请选择营销组别')
    clearTimeout(productLoadTimer.current)
    setProductImagesLoading(false)
    setProductImages([])
  }
  const usesCommodityAssets = productSource !== '自由创作'
  const commodityLibraryName = productSource === '团队商品' ? '团队商品库' : '个人商品库'
  const activeMarketingGroup = marketingGroups.find(group => group.name === selectedMarketingGroup)
  const recommendedPreferenceLimit = ({ '15 秒': 6, '30 秒': 8, '45 秒': 10, '60 秒': 10, '90 秒': 12, '自定义时长': 12 })[selectedDuration] || 10
  return <div className="video-form-grid">
    <CustomSelect icon={Package} label="商品来源" value={productSource} options={briefOptions.product} onChange={changeProductSource} className={productSource === '自由创作' ? 'span-2' : ''}/>
    {usesCommodityAssets && <CustomSelect icon={Package} label="商品" value={selectedProductName} options={productCatalog.map(product => product.name)} optionImages={Object.fromEntries(productCatalog.map(product => [product.name, product.images[0]]))} onChange={productName => { const product = productCatalog.find(item => item.name === productName) || productCatalog[0]; productImages.forEach(image => image.startsWith('blob:') && URL.revokeObjectURL(image)); setSelectedProductName(product.name); setSelectedMarketingGroup('请选择营销组别'); loadCatalogImages(product) }}/>} 
    {usesCommodityAssets && selectedProductName !== '请选择商品' && <div className="marketing-group-config span-2"><CustomSelect label="分人群营销" value={selectedMarketingGroup} options={marketingGroups.map(group => group.name)} optionDescriptions={Object.fromEntries(marketingGroups.map(group => [group.name, group.summary]))} onChange={setSelectedMarketingGroup}/><small className="marketing-group-source">来自分人群营销实验库 · 用于确定这条视频重点说服的人群</small>{activeMarketingGroup && <article className="marketing-group-card"><header><div><strong>{activeMarketingGroup.name}</strong><span>{activeMarketingGroup.summary}</span></div><button type="button" onClick={() => setSelectedMarketingGroup('请选择营销组别')}>清除</button></header><dl><div><dt><UserRound/>目标人群</dt><dd>{activeMarketingGroup.targetAudience}</dd></div><div><dt><ShieldAlert/>核心痛点</dt><dd>{activeMarketingGroup.painPoint}</dd></div><div><dt><Check/>核心结果</dt><dd>{activeMarketingGroup.result}</dd></div><div><dt><Box/>对应原始卖点</dt><dd>{activeMarketingGroup.originalSellingPoint}</dd></div><div><dt><Settings2/>对应买点内容</dt><dd>{activeMarketingGroup.buyerContent}</dd></div><div><dt><Film/>素材方向</dt><dd>{activeMarketingGroup.materialDirection}</dd></div></dl></article>}</div>}
    <div className={`product-attachments span-2 ${productDragging ? 'is-dragging' : ''} ${productImagesLoading || productImagesUploading ? 'is-loading' : ''}`} tabIndex="0" onDragEnter={event => { event.preventDefault(); if (!productImagesLoading && !productImagesUploading) setProductDragging(true) }} onDragOver={event => event.preventDefault()} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setProductDragging(false) }} onDrop={event => { event.preventDefault(); setProductDragging(false); addProductImages(event.dataTransfer.files) }} onPaste={event => addProductImages(event.clipboardData.files)} aria-busy={productImagesLoading || productImagesUploading} aria-label={usesCommodityAssets ? '商品素材附件' : '创作参考图片'}><input ref={productImageInput} hidden type="file" accept="image/*" multiple onChange={event => { addProductImages(event.target.files); event.target.value = '' }}/><div className="product-attachments-heading">{productImagesLoading || productImagesUploading ? <LoaderCircle className="product-loading-icon"/> : <Upload/>}<div><span>{usesCommodityAssets ? '商品素材附件' : '创作参考图片'}</span><small>{productImagesLoading ? `正在从${commodityLibraryName}加载图片…` : productImagesUploading ? `正在上传 ${pendingProductImageCount} 张图片…` : usesCommodityAssets ? `${productImages.length} 张图片 · 已引用${commodityLibraryName}素材，可继续添加、删除或拖拽粘贴` : productImages.length ? `${productImages.length} 张图片 · 将作为自由创作参考，可继续拖拽或粘贴` : '不引用商品库图片，支持点击、拖拽或粘贴图片'}</small></div><button type="button" disabled={productImagesLoading || productImagesUploading} onClick={() => productImageInput.current?.click()}>{productImagesLoading ? '加载中' : productImagesUploading ? '上传中' : '选择图片'}</button></div>{productImagesLoading ? <div className="product-attachment-skeletons" aria-hidden="true">{[1,2,3,4].map(item => <i key={item}/>)}</div> : (productImages.length > 0 || productImagesUploading) && <div className="product-attachment-strip" aria-label={usesCommodityAssets ? '商品素材附件列表' : '创作参考图片列表'}>{productImages.map((image, index) => <div className="product-attachment-item" key={`${image}-${index}`}><button type="button" className="product-attachment-preview" onClick={() => setPreviewProductImage({ image, index })} aria-label={`查看图片附件 ${index + 1}`}><img src={image} alt="" referrerPolicy="no-referrer"/></button><button type="button" className="product-attachment-remove" onClick={() => { if (image.startsWith('blob:')) URL.revokeObjectURL(image); setProductImages(value => value.filter((_, itemIndex) => itemIndex !== index)) }} aria-label={`删除图片附件 ${index + 1}`}><X/></button></div>)}{productImagesUploading && Array.from({ length: pendingProductImageCount }).map((_, index) => <span className="product-upload-skeleton" role="status" aria-label={`图片 ${index + 1} 上传中`} key={`uploading-${index}`}><LoaderCircle/><small>上传中</small></span>)}</div>}</div>
    <label className="span-2"><span>视频需求</span><textarea defaultValue="为便携咖啡器制作一条真实生活化的产品种草视频。突出早晨节省时间、容易清洗和随身携带，前三秒需要有强烈反差。"/></label>
    <BriefSelect label="目标平台" defaultValue="TikTok" options={briefOptions.platform}/>
    <BriefSelect icon={Clock3} label="成片目标时长" value={selectedDuration} options={briefOptions.duration} onChange={setSelectedDuration}/>
    <BriefSelect label="画面比例" defaultValue="9:16 竖屏" options={briefOptions.ratio}/>
    <BriefSelect label="目标市场与语言" defaultValue="美国 · English (US)" options={briefOptions.market}/>
    <BriefSelect label="营销目标" defaultValue="促进购买转化" options={briefOptions.goal}/>
    <BriefSelect label="视频形式" defaultValue="生活方式短片" options={briefOptions.format}/>
    <BriefSelect label="视觉风格" defaultValue="原生自然" options={['原生自然', '明亮清新', '温暖治愈', '冷静科技', '高级纪实', '极简商业', '高饱和活力', '美式复古 90s', '现代 3D 动画']}/>
    <SubtitleStylePicker value={subtitleStyle} onChange={setSubtitleStyle} font={subtitleFont} onFontChange={setSubtitleFont}/>
    <fieldset className="shooting-preferences span-2"><legend>拍摄偏好 <span>整片级偏好池</span></legend><div className="preference-count"><span>为整条视频选择偏好，生成分镜时将按镜头择优分配</span><b className={shootingPreferences.length > recommendedPreferenceLimit ? 'limit' : ''}>已选 {shootingPreferences.length} 项</b></div><div className="preference-groups">{shootingPreferenceGroups.map(([group, items]) => <section key={group}><strong>{group}</strong><div>{items.map(item => {
      const selected = shootingPreferences.includes(item)
      return <button type="button" className={selected ? 'selected' : ''} aria-pressed={selected} onClick={() => {
        if (selected) {
          const next = shootingPreferences.filter(entry => entry !== item)
          setShootingPreferences(next)
          setPreferenceHint('')
          return
        }
        const group = preferenceGroupOf(item)
        const groupCount = shootingPreferences.filter(entry => preferenceGroupOf(entry) === group).length
        if (groupCount >= 2) { setPreferenceHint(`“${group}”最多选择 2 项，请先取消一项。`); return }
        const next = [...shootingPreferences, item]
        setShootingPreferences(next)
        setPreferenceHint('')
      }} key={item}>{selected && <Check/>}{item}</button>
    })}</div></section>)}</div><div className="preference-rule"><Layers3/><span>可跨类别组合，同类最多选择 2 项；系统会在生成分镜时处理镜头级冲突，每个镜头只采用一种主要运镜。</span></div>{shootingPreferences.length > recommendedPreferenceLimit && <div className="preference-volume-note strong"><CircleAlert/><span>{selectedDuration}建议选择不超过 {recommendedPreferenceLimit} 项；当前已选择 {shootingPreferences.length} 项，系统仍会按镜头择优采用，未采用的偏好不会强行加入。</span></div>}{preferenceHint && <div className="preference-warning"><CircleAlert/>{preferenceHint}</div>}</fieldset>{previewProductImage && <div className="product-image-modal" role="dialog" aria-modal="true" aria-label="图片附件预览" onClick={() => setPreviewProductImage(null)}><div className="product-image-modal-content" onClick={event => event.stopPropagation()}><header><div><strong>图片附件预览</strong><span>{previewProductImage.index + 1} / {productImages.length}</span></div><button type="button" onClick={() => setPreviewProductImage(null)} aria-label="关闭图片预览"><X/></button></header><div><img src={previewProductImage.image} alt={`图片附件 ${previewProductImage.index + 1} 大图预览`} referrerPolicy="no-referrer"/></div></div></div>}
  </div>
}

const initialScriptSections = {
  summary: '清晨，一位赶着上班的年轻女性发现常去的咖啡店还没有营业。她回到公寓，用 AeroPress Go 快速完成冲泡，简单清理后将器具收进通勤包，拿着咖啡轻松出门。故事用等待咖啡店开门与随时自己冲泡的反差，突出省时、易清洁和便携三个核心利益。',
  hook: 'A closed coffee shop door cuts immediately to a fresh cup being pressed at home: “The coffee shop isn’t even open, and mine is already ready.”',
  oral: 'I used to leave twenty minutes early just to wait for coffee. Now I make mine before I head out. I add coffee and hot water, give it a quick stir, then press directly into the cup. Cleanup is simple, and everything packs back into my bag when I’m done. I can use it at home, at the office, or while traveling, without bringing a bulky machine. My morning coffee fits into my routine instead of slowing it down. If you want an easier way to make coffee wherever the day takes you, take a look at the AeroPress Go.',
  cta: 'Make your morning coffee on your schedule. Explore the AeroPress Go.'
}

function ScriptPanel({ onNotice, onChange }) {
  const [sections, setSections] = useState(initialScriptSections)
  const [editing, setEditing] = useState('')
  const [locked, setLocked] = useState(['summary'])
  const sectionMeta = [
    ['summary', '故事梗概', '中文策划说明'],
    ['hook', '前三秒钩子', 'English (US)'],
    ['oral', '完整口播文案', '100 words · 约 33 秒'],
    ['cta', '行动引导 CTA', 'English (US)']
  ]
  const updateSection = (id, value) => { setSections(current => ({ ...current, [id]: value })); onChange?.() }
  const rewriteSection = id => {
    if (locked.includes(id)) return
    const suffix = id === 'summary' ? ' 全片保持自然生活化表达，并将产品操作作为主要叙事动作。' : ''
    updateSection(id, `${initialScriptSections[id]}${suffix}`)
    onNotice?.(`${sectionMeta.find(item => item[0] === id)?.[1]}已重新生成`)
  }
  const copySection = async id => {
    await navigator.clipboard?.writeText(sections[id])
    onNotice?.(`${sectionMeta.find(item => item[0] === id)?.[1]}已复制`)
  }
  const rewriteUnlocked = () => {
    setSections(current => Object.fromEntries(Object.entries(current).map(([id, value]) => [id, locked.includes(id) ? value : initialScriptSections[id]])))
    setEditing('')
    onChange?.()
    onNotice?.(`已重新生成 ${sectionMeta.length - locked.length} 项未锁定内容`)
  }
  return <div className="script-layout">
    <section className="script-main">
      <div className="script-source-summary"><div><small>生成依据</small><strong>AeroPress Go · TikTok · 45 秒 · 美国英语 · 生活方式短片</strong></div><button type="button" onClick={() => onNotice?.('请返回创作需求修改生成参数')}>修改需求</button></div>
      <div className="section-heading"><div><small>剧本标题 · English (US)</small><h3>The Coffee Shop Isn’t Open, and Mine Is Already Ready</h3></div><button type="button" onClick={rewriteUnlocked}><RefreshCw/>重新生成未锁定内容</button></div>
      {sectionMeta.map(([id, label, meta]) => <article className={`script-block ${locked.includes(id) ? 'is-locked' : ''}`} key={id}>
        <header><span>{label}<small>{meta}</small></span><div className="script-block-actions">
          <button type="button" onClick={() => setEditing(editing === id ? '' : id)} aria-label={`编辑${label}`}><Pencil/></button>
          <button type="button" onClick={() => copySection(id)} aria-label={`复制${label}`}><Copy/></button>
          <button type="button" disabled={locked.includes(id)} onClick={() => rewriteSection(id)} aria-label={`重新生成${label}`}><RefreshCw/></button>
          <button type="button" onClick={() => setLocked(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])} aria-label={`${locked.includes(id) ? '解锁' : '锁定'}${label}`}>{locked.includes(id) ? <Lock/> : <Unlock/>}</button>
        </div></header>
        {editing === id ? <textarea value={sections[id]} onChange={event => updateSection(id, event.target.value)} onBlur={() => setEditing('')} autoFocus aria-label={label}/> : <p>{sections[id]}</p>}
      </article>)}
    </section>
    <aside className="script-insights"><section><h3>需求匹配</h3><ul className="requirement-checks"><li><Check/><span><b>核心卖点</b><small>省时、易清洁、便携均已覆盖</small></span></li><li><Check/><span><b>前三秒反差</b><small>关门咖啡店与成品咖啡对比</small></span></li><li><Check/><span><b>目标语言</b><small>口播为 English (US)</small></span></li><li><Layers3/><span><b>拍摄偏好</b><small>产品微距、手持跟拍将在分镜应用</small></span></li></ul></section><section><h3>创作策略</h3><dl><div><dt>叙事结构</dt><dd>钩子 → 痛点 → 演示 → CTA</dd></div><div><dt>角色立场</dt><dd>真实用户</dd></div><div><dt>视觉风格</dt><dd>原生生活化</dd></div></dl></section><section><h3>时长检查</h3><dl><div><dt>目标时长</dt><dd>45 秒</dd></div><div><dt>口播词数</dt><dd>100 words</dd></div><div><dt>预计口播</dt><dd>约 33 秒</dd></div><div><dt>演示余量</dt><dd>约 12 秒</dd></div></dl><div className="duration-check"><Check/><span><b>时长校验通过</b><small>口播与产品演示均有充足空间</small></span></div></section></aside>
  </div>
}

function AssetsPanel({ bound, onBind }) {
  return <div className="asset-config-list"><div className="asset-callout"><Library/><div><strong>分镜前锁定核心资产</strong><span>{bound ? '5 项核心资产已经就绪，可以继续生成分镜。' : '系统从剧本中识别出 5 项核心资产，仍有 1 项需要处理。'}</span></div><b>{bound ? '5 / 5' : '4 / 5'}</b></div>
    {assets.map(({ id, type, name, meta, icon: Icon, state }) => <article key={id}>
      <span className="asset-kind"><Icon/></span><div><small>{type}</small><strong>{name}</strong><p>{meta}</p></div>
      {state === 'bound' || bound ? <span className="asset-bound"><Check/>已绑定</span> : <div className="asset-actions"><button><Upload/>上传</button><button className="solid" onClick={onBind}><Sparkles/>生成资产</button></div>}
    </article>)}
  </div>
}

function StoryboardPanel({ model, setModel }) {
  const limit = model === '2.0' ? 15 : 30
  const segmentCount = model === '2.0' ? 4 : 2
  return <div className="storyboard-panel"><div className="segment-settings"><div><Settings2/><span><small>生成模型</small><strong>Seedance {model}</strong></span></div><div><Clock3/><span><small>单段硬上限</small><strong>{limit} 秒</strong></span></div><div><Film/><span><small>智能分段</small><strong>{segmentCount} 个片段</strong></span></div><div className="model-toggle" role="group" aria-label="Seedance 版本"><button className={model === '2.0' ? 'active' : ''} onClick={() => setModel('2.0')}>2.0</button><button className={model === '2.5' ? 'active' : ''} onClick={() => setModel('2.5')}>2.5</button></div></div>
    <div className="timeline-ruler"><span>00:00</span><i/><span>00:15</span><i/><span>00:30</span><i/><span>00:45</span></div>
    <div className={`segment-track segments-${segmentCount}`}>{Array.from({ length: segmentCount }).map((_, index) => <button key={index}><span>片段 {index + 1}</span><strong>{model === '2.0' ? [12, 11, 13, 9][index] : [26, 19][index]} 秒</strong></button>)}</div>
    <div className="shot-list">{shotCopy.map(([node, title, refs], index) => <article key={node}><span className="shot-number">{String(index + 1).padStart(2, '0')}</span><div><small>{node}</small><strong>{title}</strong><p><Link2/>{refs}</p></div><button>编辑镜头</button></article>)}</div>
  </div>
}

function GeneratePanel({ generated, onGenerate }) {
  return <div className="generation-grid">{[12, 11, 13, 9].map((duration, index) => <article key={index} className={generated.includes(index) ? 'complete' : ''}>
    <div className="generation-preview"><video src={`/demo-videos/demo-video-0${index + 1}.mp4`} muted loop playsInline/><span><Play/></span><em>{duration}s</em></div>
    <div className="generation-meta"><div><small>片段 {index + 1}</small><strong>{['钩子与痛点','产品出现','使用演示','结果与行动引导'][index]}</strong></div>{generated.includes(index) ? <span className="generation-success"><Check/>已生成</span> : <button onClick={() => onGenerate(index)}><Sparkles/>生成</button>}</div>
  </article>)}</div>
}

function ExportPanel() {
  return <div className="export-panel"><div className="export-preview"><video src="/demo-videos/demo-video-01.mp4" controls playsInline/><span>9:16 · 45 秒</span></div><div className="export-options"><h3>合成设置</h3>{[['自动字幕','跟随配音生成中文字幕'],['背景音乐','轻快原声 · 20% 音量'],['片段转场','自然切换 · 0.2 秒'],['品牌片尾','产品 Logo + 行动引导']].map(([name, desc]) => <label key={name}><input type="checkbox" defaultChecked/><span><b>{name}</b><small>{desc}</small></span></label>)}<button className="export-button"><Film/>开始合成完整视频</button></div></div>
}

export default function VideoWorkspace() {
  const [active, setActive] = useState(2)
  const [model, setModel] = useState('2.0')
  const [bound, setBound] = useState(false)
  const [generated, setGenerated] = useState([0, 1])
  const [notice, setNotice] = useState('')
  const [scriptConfirmed, setScriptConfirmed] = useState(false)
  const panels = useMemo(() => [<BriefPanel/>, <ScriptPanel onNotice={setNotice} onChange={() => setScriptConfirmed(false)}/>, <AssetsPanel bound={bound} onBind={() => { setBound(true); setNotice('场景资产已生成并绑定') }}/>, <StoryboardPanel model={model} setModel={setModel}/>, <GeneratePanel generated={generated} onGenerate={id => { setGenerated(value => [...value, id]); setNotice(`片段 ${id + 1} 已生成`) }}/>, <ExportPanel/>], [model, generated, bound])
  const [, , label] = steps[active]
  return <main className="video-workspace"><Workflow active={active} onChange={setActive}/><section className="video-work-area">
    <header className="video-work-header"><div><span>快捷生成视频 / 新建项目</span><h1>{label}</h1></div><div><button className="quiet-button">保存草稿</button><button className="primary-button" onClick={() => { if (active === 1) { setScriptConfirmed(true); setNotice('剧本已确认，可用于准备核心资产') }; setActive(value => Math.min(steps.length - 1, value + 1)) }}>{active === steps.length - 1 ? '导出设置' : active === 1 && !scriptConfirmed ? '确认剧本并继续' : '继续'}<ArrowRight/></button></div></header>
    <div className="video-stage"><div className="stage-intro"><div><span>步骤 {active + 1} / {steps.length}</span><h2>{label}</h2><p>{['描述本次视频的目标、产品与投放环境。','确认故事、口播和营销方向后再准备资产。','锁定影响人物、产品和场景一致性的核心资源。','根据模型时长上限，把完整剧本转换为可执行片段。','逐段生成、检查并只重试不满意的部分。','统一声音、字幕和转场，输出完整成片。'][active]}</p></div>{active > 0 && <button className="back-button" onClick={() => setActive(active - 1)}><ArrowLeft/>上一步</button>}</div>
      <div className="stage-content">{panels[active]}</div>
    </div>
  </section>{notice && <div className="video-toast"><Check/>{notice}</div>}{bound && <div className="demo-binding-indicator"><Check/>资产已补齐</div>}</main>
}
