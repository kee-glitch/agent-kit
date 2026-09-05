import React, { useEffect, useLayoutEffect, useId, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, Box, Captions, Check, ChevronDown, CircleAlert, Clock3,
  Copy, FileText, Film, Image, Languages, Layers3, Library, Link2, LoaderCircle, Lock, Mic2,
  MonitorPlay, MoreHorizontal, Package, Palette, Pencil, PersonStanding, Play, Plus, Ratio, RefreshCw, Search, Settings2, ShieldAlert, Shirt, Sparkles, Target, Trash2, Unlock, Upload, UserRound,
  Video, WandSparkles, X
} from 'lucide-react'
import './form-components.css'
import './video-workspace.css'
import { mockPreviewImages } from './AssetWorkspace'
import StoryPanel from './StoryPanel'
import CreativeHome from './CreativeHome'

const steps = [
  ['brief', FileText, '创作需求', '已完成'],
  ['script', Sparkles, '剧本创作', '已完成'],
  ['assets', Library, '资源绑定', '待确认'],
  ['preferences', Settings2, '拍摄偏好', '未开始'],
  ['storyboard', Layers3, '故事面板', '未开始'],
  ['generate', Video, '视频生成', '未开始']
]

function createDemoAudio() {
  const rate=8000, count=rate*2, bytes=new Uint8Array(44+count*2), view=new DataView(bytes.buffer)
  const write=(offset,text)=>{for(let i=0;i<text.length;i++)bytes[offset+i]=text.charCodeAt(i)}
  write(0,'RIFF');view.setUint32(4,36+count*2,true);write(8,'WAVE');write(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);write(36,'data');view.setUint32(40,count*2,true)
  for(let i=0;i<count;i++)view.setInt16(44+i*2,Math.sin(2*Math.PI*(i<rate?440:660)*i/rate)*6000*Math.sin(Math.PI*(i%rate)/rate)**2,true)
  return 'data:audio/wav;base64,'+btoa(Array.from(bytes,byte=>String.fromCharCode(byte)).join(''))
}

const initialCoreAssets = [
  { id: 1, type: '主体', title: '拟人化三维卡通骷髅开箱博主', description: '成年人体型，象牙白骨骼，眼窝深邃但具有清晰情绪变化，颌骨活动自然，手部骨节完整，动作带有疲惫、迟疑和真实用户生成内容的生活感。声线为成年意大利用户：前段音量偏低、气息略沉、语速稍快并带疲惫感；中段放缓且稳定清楚；结尾加快但吐字完整，保留自然呼吸和轻微停顿。', thumbnail: mockPreviewImages[6], skill: '人物一致性', icon: UserRound, state: 'bound' },
  { id: 2, type: '服饰', title: '深灰色针织家居套装', description: '深灰色针织家居上衣，柔软棉质纹理，宽松剪裁，搭配深色居家长裤，整体呈现长期居家办公的简洁生活风格。', thumbnail: mockPreviewImages[2], skill: '服饰参考生成', icon: Box, state: 'bound' },
  { id: 3, type: '场景', title: '米兰现代公寓室内', description: '前景为木质办公桌与办公用品，中景为骷髅角色和办公椅，远景为简洁墙面、餐桌、花瓶与暖色花朵；空间从冷蓝灰紫办公区域逐渐过渡到米白暖粉的餐桌开箱区域。', thumbnail: mockPreviewImages[3], skill: '场景参考生成', icon: Image, state: 'bound' },
  { id: 4, type: '道具', title: 'WindBoss Cortisol-A 粉色瓶', description: '九十粒日间配方，圆柱形塑料瓶，粉色瓶身与清晰稳定的产品标签，默认位于暖色餐桌中央。', thumbnail: mockPreviewImages[4], skill: '商品主图生成', icon: Package, state: 'bound' },
  { id: 5, type: '声音', title: '轻柔提示音 · 音频 Demo', description: '用于预览音频播放的合成提示音，点击缩略图展开播放器后试听。', thumbnail: '', mediaType: 'audio', mediaSrc: createDemoAudio(), skill: '', icon: Mic2, state: 'bound' },
  { id: 6, type: '视频', title: '竖屏视频 · Demo', description: '竖屏视频示例素材，悬停预览，点击播放。', thumbnail: '/demo-videos/demo-video-01.mp4', mediaType: 'video', skill: '', icon: Video, state: 'bound' }
]

const coreAssetSkills=['商品主图生成','人物一致性','服饰参考生成','场景参考生成','通用视觉生成']
const assetTypeOptions=[['产品',Package],['主体',PersonStanding],['人物',UserRound],['服饰',Shirt],['场景',Image],['声音',Mic2],['视频',Video],['道具',Box]]

function AssetTypeSelect({ value, onChange }) {
  const [open,setOpen]=useState(false)
  const rootRef=useRef(null)
  const selected=assetTypeOptions.find(([name])=>name===value)||assetTypeOptions[0]
  const SelectedIcon=selected[1]
  useEffect(()=>{if(!open)return;const close=event=>{if(!rootRef.current?.contains(event.target))setOpen(false)};const closeOnEscape=event=>{if(event.key==='Escape')setOpen(false)};document.addEventListener('pointerdown',close);document.addEventListener('keydown',closeOnEscape);return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',closeOnEscape)}},[open])
  return <div className={`asset-type-select ${open?'is-open':''}`} ref={rootRef}><button type="button" className="asset-type-trigger" onClick={()=>setOpen(current=>!current)} aria-haspopup="listbox" aria-expanded={open}><SelectedIcon/><span>{value}</span><ChevronDown/></button>{open&&<div className="asset-type-menu" role="listbox" aria-label="资产类型">{assetTypeOptions.map(([name,Icon])=><button type="button" role="option" aria-selected={value===name} className={value===name?'active':''} onClick={()=>{onChange(name);setOpen(false)}} key={name}><Icon/><span>{name}</span>{value===name&&<Check/>}</button>)}</div>}</div>
}

function CoreSkillSelect({ value, onChange }) {
  const options=['暂未绑定技能',...coreAssetSkills]
  const selectedValue=value||'暂未绑定技能'
  const [open,setOpen]=useState(false)
  const rootRef=useRef(null)
  const currentIndex=Math.max(0,options.indexOf(selectedValue))
  useEffect(()=>{const close=event=>{if(!rootRef.current?.contains(event.target))setOpen(false)};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close)},[])
  const choose=option=>{onChange(option==='暂未绑定技能'?'':option);setOpen(false)}
  const onKeyDown=event=>{if(event.key==='Escape'){setOpen(false);return}if(event.key==='Enter'||event.key===' '){event.preventDefault();setOpen(current=>!current);return}if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();const step=event.key==='ArrowDown'?1:-1;choose(options[(currentIndex+step+options.length)%options.length])}}
  return <div className={`single-select core-skill-single-select ${open?'open':''}`} ref={rootRef}><button type="button" className="single-select-trigger" aria-label="绑定技能" aria-haspopup="listbox" aria-expanded={open} onClick={()=>setOpen(current=>!current)} onKeyDown={onKeyDown}><i className="single-select-leading"><WandSparkles/></i><span>{selectedValue}</span><ChevronDown/></button>{open&&<div className="single-select-menu" role="listbox" aria-label="绑定技能">{options.map(option=><button type="button" role="option" aria-selected={option===selectedValue} className={option===selectedValue?'selected':''} key={option} onClick={()=>choose(option)}><span>{option}</span>{option===selectedValue&&<Check/>}</button>)}</div>}</div>
}

const shotCopy = [
  ['钩子', '早晨赶时间，她把昂贵咖啡倒进水槽', '人物、厨房、咖啡杯'],
  ['痛点', '镜头扫过排队中的咖啡店和手表', '人物、街道场景'],
  ['解决方案', '产品展开并完成一次快速冲泡', '人物、产品、厨房'],
  ['效果证明', '咖啡液流入透明杯，展示细腻油脂', '产品、透明杯、微距'],
  ['行动引导', '人物拿起咖啡出门，产品收入通勤包', '人物、产品、通勤包']
]

function Workflow({ active, onChange }) {
  return <aside className="video-flow-nav horizontal-steps" aria-label="视频创作步骤">
    <div className="video-flow-title"><WandSparkles/><div><strong>快捷生成视频</strong><span>竖屏产品种草视频</span></div></div>
    <nav>{steps.map(([id, Icon, label], index) => {
      const status = index < active ? '已完成' : index === active ? '创作中' : '未创作'
      const statusClass = index < active ? 'done' : index === active ? 'active' : 'pending'
      return <button className={statusClass} aria-label={`${label}，${status}`} title={`${label} · ${status}`} aria-current={index === active ? 'step' : undefined} onClick={() => onChange(index)} key={id}>
      <span className="flow-step-icon">{index < active ? <Check/> : index === active ? <Clock3/> : <Icon/>}</span>
      <span className="flow-step-copy"><b>{label}</b></span>
    </button>})}</nav>
    <div className="video-flow-help"><CircleAlert/><span>所有内容均为 Demo 数据，可自由切换步骤查看。</span></div>
  </aside>
}

const initialCreationTasks=[
  ['task-1','WindBoss 日夜双瓶种草视频','故事面板 · 刚刚',mockPreviewImages[4]],
  ['task-2','便携咖啡器产品演示','创作需求 · 10:45',mockPreviewImages[1]],
  ['task-3','深色针织家居服短片','核心资产 · 昨天',mockPreviewImages[2]],
  ['task-4','米兰公寓生活方式视频','拍摄偏好 · 周一',mockPreviewImages[3]],
  ['task-5','新品竖屏广告方案','视频生成 · 8 月 28 日',mockPreviewImages[6]]
]

function CreationTaskHistory({ tasks, selected, onSelect, onNew }) {
  const [query,setQuery]=useState('')
  const shown=tasks.filter(([,title,meta])=>`${title} ${meta}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  return <aside className="creation-task-history" aria-label="任务记录"><header><strong>任务记录</strong></header><button type="button" className="creation-task-new" onClick={()=>{setQuery('');onNew()}}><Plus/>新建任务</button><label className="creation-task-search"><Search/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="搜索任务" aria-label="搜索任务记录"/></label><div className="creation-task-list">{shown.map(([id,title,meta,thumbnail])=><article className={selected===id?'active':''} key={id}><button type="button" onClick={()=>onSelect(id)}><img src={thumbnail} alt=""/><span><b>{title}</b><small>{meta}</small></span></button><button type="button" aria-label={`${title}更多操作`}><MoreHorizontal/></button></article>)}{!shown.length&&<div className="creation-task-empty">没有匹配的任务</div>}</div></aside>
}

const briefOptions = {
  product: ['个人商品', '团队商品', '自由创作'],
  platform: ['TikTok', 'Instagram Reels', 'YouTube Shorts', 'Amazon Video', '独立站广告', '通用竖屏视频'],
  market: ['美国 · English (US)', '英国 · English (UK)', '加拿大 · English', '日本 · 日本語', '韩国 · 한국어', '中国大陆 · 简体中文', '中国台湾 · 繁體中文', '德国 · Deutsch', '法国 · Français', '西班牙 · Español'],
  duration: ['15 秒', '30 秒', '45 秒', '60 秒', '90 秒', '自定义时长'],
  speechRate: ['慢速 · 120 WPM', '标准 · 150 WPM', '快速 · 180 WPM'],
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
const speechRateDescriptions = {
  '慢速 · 120 WPM': '语气舒缓、重点清晰，适合讲解型内容',
  '标准 · 150 WPM': '自然日常，适合大多数短视频口播',
  '快速 · 180 WPM': '节奏紧凑，适合信息密集的短视频'
}

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
  { name: '美国城市混合办公人群', summary: '需要在家、办公室与通勤场景间切换的咖啡饮用者', targetAudience: '营销假设：25–34 岁、居住在美国城市、每周往返办公室且重视咖啡品质与便携性的上班族', painPoint: '办公室咖啡体验不稳定，传统冲煮设备不便携带、收纳和清洁', result: '用一套可收纳进随行杯的器具，在约 2 分钟内完成冲煮与清洁', originalSellingPoint: '8 oz 单杯容量、整套收纳进随行杯、约 2 分钟完成冲煮与清洁', buyerContent: '从工作包中取出整套器具，在办公桌完成冲煮，清洁后重新收进随行杯', materialDirection: '办公室咖啡与新鲜冲煮前后对比、桌面顶拍操作、微滤细节、清洁与收纳连续动作' },
  { name: '美国户外旅行人群', summary: '露营、徒步和自驾场景中的便携咖啡需求', targetAudience: '20–40 岁、喜欢露营、自驾和轻户外活动的美国旅行人群', painPoint: '户外设备空间有限，难以随时喝到口感稳定的新鲜咖啡', result: '用轻量器具在营地、车边或旅途中快速完成一杯咖啡', originalSellingPoint: '轻量便携、无需复杂设备、耐用易收纳', buyerContent: '一套装进背包，到哪里都能快速冲泡自己的咖啡', materialDirection: '户外开包、营地冲泡、产品尺寸对比与旅行收纳展示' },
  { name: '英国办公室咖啡用户', summary: '关注效率、口感与日常成本的办公室人群', targetAudience: '25–45 岁、经常在办公室饮用咖啡的英国职场用户', painPoint: '办公室速溶咖啡口感不足，外购咖啡长期成本高且需要等待', result: '以更低的日常成本在工位快速获得干净稳定的咖啡口感', originalSellingPoint: '快速冲泡、稳定萃取、高性价比', buyerContent: '无需咖啡机，在工位也能轻松完成一杯品质咖啡', materialDirection: '办公室工位实拍、成本对比、冲泡过程和咖啡液微距' },
  { name: '日本精致生活人群', summary: '偏好小巧设计与生活仪式感的都市用户', targetAudience: '25–39 岁、重视居家品质和整洁收纳的日本都市生活人群', painPoint: '传统咖啡设备占空间、步骤复杂，容易破坏紧凑空间的整洁感', result: '用小巧器具完成具有仪式感的日常冲泡，并轻松收纳', originalSellingPoint: '小巧收纳、简洁设计、操作方便', buyerContent: '不占台面空间，也能每天享受认真冲泡咖啡的片刻', materialDirection: '极简桌面、安静冲泡、材质细节和收纳前后画面' }
]

const preferenceGroupOf = item => shootingPreferenceGroups.find(([, items]) => items.includes(item))?.[0]

const shootingRecommendations = {
  'UGC 真人口播': ['正对镜头口播', '半身近景', '自拍视角', '手持跟拍'],
  '产品功能演示': ['核心功能演示', '产品微距', '桌面顶拍', '固定机位', '主体锁焦'],
  '开箱体验': ['开箱拆封', '自然抓拍', '半身近景', '桌面顶拍', '固定机位'],
  '生活方式短片': ['多场景使用', '自然抓拍', '环境全景', '平视机位', '平行跟拍'],
  '产品测评': ['使用效果对比', '情绪反应', '半身近景', '固定机位', '前后对比剪辑']
}

const shootingRecommendationFillers = ['核心功能演示', '手部操作', '自然抓拍', '边用边讲', '产品微距', '半身近景', '平视机位', '桌面顶拍', '固定机位', '手持跟拍', '主体锁焦', '背景虚化', '匹配剪辑', '定格强调']

const durationPreferenceLimits = { '15 秒': 6, '30 秒': 8, '45 秒': 10, '60 秒': 10, '90 秒': 12 }
const preferenceLimitForDuration = duration => durationPreferenceLimits[duration] ?? 12

const recommendShootingPreferences = (format, requirement, duration) => {
  const recommendations = [...(shootingRecommendations[format] || shootingRecommendations['生活方式短片'])]
  if (/对比|反差|前后/.test(requirement)) recommendations.push('前后对比剪辑')
  if (/便携|随身|收纳/.test(requirement)) recommendations.unshift('便携收纳展示')
  if (/步骤|操作|使用|功能/.test(requirement)) recommendations.unshift('手部操作')
  const suggestedLimit = preferenceLimitForDuration(duration)
  const categoryCounts = {}
  const unique = [...new Set([...recommendations, ...shootingRecommendationFillers])].filter(item => {
    const category = preferenceGroupOf(item)
    if (!category || (categoryCounts[category] || 0) >= 2) return false
    categoryCounts[category] = (categoryCounts[category] || 0) + 1
    return true
  })
  return unique.slice(0, suggestedLimit)
}

function CustomSelect({ icon: Icon, label, value, defaultValue, options, onChange, className = '', optionDescriptions = {}, optionImages = {} }) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? options[0])
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef(null)
  const searchRef = useRef(null)
  const menuRef = useRef(null)
  const [placement, setPlacement] = useState({ above: false, height: 280 })
  const listId = useId()
  const currentValue = value ?? internalValue
  const searchable = options.length >= 4
  const filteredOptions = query.trim() ? options.filter(option => `${option} ${optionDescriptions[option] || ''}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) : options
  useLayoutEffect(() => {
    if (!open) return
    const update = () => {
      const trigger = rootRef.current?.querySelector('.video-custom-select-trigger')
      if (!trigger || !menuRef.current) return
      const rect = trigger.getBoundingClientRect()
      const below = Math.max(0, window.innerHeight - rect.bottom - 12)
      const above = Math.max(0, rect.top - 12)
      const desired = Math.min(280, menuRef.current.scrollHeight)
      const upward = below < desired && above > below
      setPlacement({ above: upward, height: Math.min(280, upward ? above : below) })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => { window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true) }
  }, [open, query])
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
      {open && <div ref={menuRef} style={{top:placement.above?'auto':'calc(100% + var(--space-2))',bottom:placement.above?'calc(100% + var(--space-2))':'auto',maxHeight:placement.height}} className="video-custom-select-menu" id={listId} role="listbox" aria-label={label}>{searchable && <div className="video-custom-select-search"><Search/><input ref={searchRef} value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') { setOpen(false); setQuery('') } }} placeholder={`搜索${label}`} aria-label={`搜索${label}`}/>{query && <button type="button" onClick={() => { setQuery(''); searchRef.current?.focus() }} aria-label="清空搜索"><X/></button>}</div>}<div className="video-custom-select-options">{filteredOptions.map(option => <button type="button" role="option" aria-selected={option === currentValue} className={`${option === currentValue ? 'selected' : ''} ${optionDescriptions[option] ? 'has-description' : ''}`} onClick={() => choose(option)} key={option}>{optionImages[option] && <img className="video-select-option-thumb" src={optionImages[option]} alt="" referrerPolicy="no-referrer"/>}<span className="option-copy"><span>{option}</span>{optionDescriptions[option] && <small>{optionDescriptions[option]}</small>}</span>{option === currentValue && <Check/>}</button>)}{filteredOptions.length === 0 && <div className="video-custom-select-empty">未找到匹配选项</div>}</div></div>}
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

const creationEntryOptions = [
  ['free', Sparkles, '自由创作', '从一个想法开始，不绑定商品库，自由上传参考素材。'],
  ['personal', Package, '个人商品创作', '选择个人商品库中的商品，快速带入商品与素材信息。'],
  ['team', Library, '团队商品创作', '使用团队共享商品与品牌资产，保持多人协作一致。']
]

function CreationStartPage({ onChoose }) {
  return <section className="creation-start-page"><div className="creation-orbit" aria-hidden="true"><i className="orbit-spark"><Sparkles/></i><i className="orbit-frame"><Image/></i><i className="orbit-film"><Film/></i><i className="orbit-product"><Package/></i><i className="orbit-pencil"><Pencil/></i></div><div className="creation-start-heading"><span>SHULAN · CREATIVE STUDIO</span><h2>让想法，<br/>成为下一支好作品。</h2><p>从灵感出发，或让你的商品成为主角。<br/>选择一个起点，把故事交给创作。</p></div><div className="creation-entry-grid">{creationEntryOptions.map(([id,Icon,title,description],index)=><button type="button" onClick={()=>onChoose(id)} key={id}><span className="creation-entry-index">0{index+1}</span><i><Icon/></i><strong>{title}</strong><small>{description}</small><span className="creation-entry-action">开始创作<ArrowRight/></span></button>)}</div></section>
}

function BriefPanel({ onChange, blank = false, initialMode = '' }) {
  const initialProductSource=initialMode==='free'?'自由创作':initialMode==='team'?'团队商品':initialMode==='personal'?'个人商品':blank?'请选择商品来源':briefOptions.product[0]
  const [productSource, setProductSource] = useState(initialProductSource)
  const [selectedProductName, setSelectedProductName] = useState(blank ? '请选择商品' : 'AeroPress Go 便携咖啡器')
  const [selectedMarketingGroup, setSelectedMarketingGroup] = useState(blank ? '请选择营销组别' : '美国城市混合办公人群')
  const [productImages, setProductImages] = useState(blank ? [] : productCatalog[0].images)
  const [productDragging, setProductDragging] = useState(false)
  const [productImagesLoading, setProductImagesLoading] = useState(false)
  const [productImagesUploading, setProductImagesUploading] = useState(false)
  const [pendingProductImageCount, setPendingProductImageCount] = useState(0)
  const [previewProductImage, setPreviewProductImage] = useState(null)
  const [selectedDuration, setSelectedDuration] = useState(blank ? '请选择时长' : '45 秒')
  const [platform, setPlatform] = useState(blank ? '请选择目标平台' : 'TikTok')
  const [ratio, setRatio] = useState(blank ? '请选择画面比例' : '9:16 竖屏')
  const [market, setMarket] = useState(blank ? '请选择市场与语言' : '美国 · English (US)')
  const [speechRate, setSpeechRate] = useState(blank ? '请选择口播语速' : '标准 · 150 WPM')
  const [videoRequirement, setVideoRequirement] = useState(blank ? '' : '制作一条 45 秒 TikTok 竖屏英文短视频，面向需要在通勤、家庭与办公室之间切换的美国城市上班族。前三秒用普通办公室咖啡与新鲜冲煮形成反差；随后展示整套器具从随行杯中取出、加入咖啡粉与热水、搅拌按压、清洁并重新收纳。只使用可验证卖点：8 oz 单杯容量、整套可收纳进随行杯、微滤减少咖啡渣、冲煮与清洁约 2 分钟。')
  const [creativeDirection, setCreativeDirection] = useState(blank ? { goal: '请选择营销目标', format: '请选择视频形式', style: '请选择视觉风格' } : { goal: '解释核心卖点', format: '产品功能演示', style: '原生自然' })
  const [aiGenerating, setAiGenerating] = useState('')
  const [aiGenerated, setAiGenerated] = useState('')
  const aiGenerationTimer = useRef(null)
  useEffect(() => () => clearTimeout(aiGenerationTimer.current), [])
  const generateBusinessParameters = () => {
    if (aiGenerating) return
    setAiGenerating('business')
    setAiGenerated('')
    aiGenerationTimer.current = window.setTimeout(() => {
      const context = `${videoRequirement} ${activeMarketingGroup?.buyerContent || ''} ${activeMarketingGroup?.materialDirection || ''}`
      const goal = /购买|转化|种草|下单/.test(context) ? '促进购买转化' : /信任|证言/.test(context) ? '建立用户信任' : /卖点|功能|解释/.test(context) ? '解释核心卖点' : '建立产品认知'
      const format = /开箱/.test(context) ? '开箱体验' : /测评|对比/.test(context) ? '产品测评' : /功能|操作|步骤|演示/.test(context) ? '产品功能演示' : /口播/.test(context) ? 'UGC 真人口播' : '生活方式短片'
      const style = /科技|专业|效率/.test(context) ? '冷静科技' : /温暖|治愈/.test(context) ? '温暖治愈' : '原生自然'
      setCreativeDirection({ goal, format, style })
      setAiGenerating('')
      setAiGenerated('business')
    }, 800)
  }
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
  const usesCommodityAssets = productSource !== '请选择商品来源' && productSource !== '自由创作'
  const commodityLibraryName = productSource === '团队商品' ? '团队商品库' : '个人商品库'
  const activeMarketingGroup = marketingGroups.find(group => group.name === selectedMarketingGroup)
  useEffect(() => onChange?.({ productSource, product: selectedProductName, productImages, marketingGroup: selectedMarketingGroup, marketingSummary: activeMarketingGroup?.summary || '', audience: activeMarketingGroup?.targetAudience || '', painPoint: activeMarketingGroup?.painPoint || '', result: activeMarketingGroup?.result || '', originalSellingPoint: activeMarketingGroup?.originalSellingPoint || '', buyerContent: activeMarketingGroup?.buyerContent || '', materialDirection: activeMarketingGroup?.materialDirection || '', videoRequirement, platform, duration: selectedDuration, ratio, market, speechRate, ...creativeDirection }), [productSource, selectedProductName, productImages, selectedMarketingGroup, activeMarketingGroup, videoRequirement, platform, selectedDuration, ratio, market, speechRate, creativeDirection, onChange])
  return <div className="video-form-grid">
    <div className="brief-section-heading span-2"><span>01</span><div><h3>基础商品与人群配置</h3><p>确定商品、目标人群和可用于生成的参考素材</p></div></div>
    <CustomSelect icon={Package} label="商品来源" value={productSource} options={briefOptions.product} onChange={changeProductSource} className={productSource === '自由创作' ? 'span-2' : ''}/>
    {usesCommodityAssets && (
      <CustomSelect icon={Package} label="绑定商品" value={selectedProductName} options={productCatalog.map(product => product.name)} optionImages={Object.fromEntries(productCatalog.map(product => [product.name, product.images[0]]))} onChange={productName => { const product = productCatalog.find(item => item.name === productName) || productCatalog[0]; productImages.forEach(image => image.startsWith('blob:') && URL.revokeObjectURL(image)); setSelectedProductName(product.name); setSelectedMarketingGroup('请选择营销组别'); loadCatalogImages(product) }}/>
    )}
    {usesCommodityAssets && selectedProductName !== '请选择商品' && <div className="marketing-group-config span-2"><CustomSelect label="分人群营销" value={selectedMarketingGroup} options={marketingGroups.map(group => group.name)} optionDescriptions={Object.fromEntries(marketingGroups.map(group => [group.name, group.summary]))} onChange={setSelectedMarketingGroup}/><small className="marketing-group-source">来自分人群营销实验库 · 用于确定这条视频重点说服的人群</small>{activeMarketingGroup && <article className="marketing-group-card"><header><div><strong>{activeMarketingGroup.name}</strong><span>{activeMarketingGroup.summary}</span></div><button type="button" onClick={() => setSelectedMarketingGroup('请选择营销组别')}>清除</button></header><dl><div><dt><UserRound/>目标人群</dt><dd>{activeMarketingGroup.targetAudience}</dd></div><div><dt><ShieldAlert/>核心痛点</dt><dd>{activeMarketingGroup.painPoint}</dd></div><div><dt><Check/>核心结果</dt><dd>{activeMarketingGroup.result}</dd></div><div><dt><Box/>对应原始卖点</dt><dd>{activeMarketingGroup.originalSellingPoint}</dd></div><div><dt><Settings2/>对应买点内容</dt><dd>{activeMarketingGroup.buyerContent}</dd></div><div><dt><Film/>素材方向</dt><dd>{activeMarketingGroup.materialDirection}</dd></div></dl></article>}</div>}
    <div className={`product-attachments span-2 ${productDragging ? 'is-dragging' : ''} ${productImagesLoading || productImagesUploading ? 'is-loading' : ''}`} tabIndex="0" onDragEnter={event => { event.preventDefault(); if (!productImagesLoading && !productImagesUploading) setProductDragging(true) }} onDragOver={event => event.preventDefault()} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setProductDragging(false) }} onDrop={event => { event.preventDefault(); setProductDragging(false); addProductImages(event.dataTransfer.files) }} onPaste={event => addProductImages(event.clipboardData.files)} aria-busy={productImagesLoading || productImagesUploading} aria-label={usesCommodityAssets ? '商品素材附件' : '创作参考图片'}><input ref={productImageInput} hidden type="file" accept="image/*" multiple onChange={event => { addProductImages(event.target.files); event.target.value = '' }}/><div className="product-attachments-heading">{productImagesLoading || productImagesUploading ? <LoaderCircle className="product-loading-icon"/> : <Upload/>}<div><span>{usesCommodityAssets ? '商品素材附件' : '创作参考图片'}</span><small>{productImagesLoading ? `正在从${commodityLibraryName}加载图片…` : productImagesUploading ? `正在上传 ${pendingProductImageCount} 张图片…` : usesCommodityAssets ? `${productImages.length} 张图片 · 已引用${commodityLibraryName}素材，可继续添加、删除或拖拽粘贴` : productImages.length ? `${productImages.length} 张图片 · 将作为自由创作参考，可继续拖拽或粘贴` : '不引用商品库图片，支持点击、拖拽或粘贴图片'}</small></div><button type="button" disabled={productImagesLoading || productImagesUploading} onClick={() => productImageInput.current?.click()}>{productImagesLoading ? '加载中' : productImagesUploading ? '上传中' : '选择图片'}</button></div>{productImagesLoading ? <div className="product-attachment-skeletons" aria-hidden="true">{[1,2,3,4].map(item => <i key={item}/>)}</div> : (productImages.length > 0 || productImagesUploading) && <div className="product-attachment-strip" aria-label={usesCommodityAssets ? '商品素材附件列表' : '创作参考图片列表'}>{productImages.map((image, index) => <div className="product-attachment-item" key={`${image}-${index}`}><button type="button" className="product-attachment-preview" onClick={() => setPreviewProductImage({ image, index })} aria-label={`查看图片附件 ${index + 1}`}><img src={image} alt="" referrerPolicy="no-referrer"/></button><button type="button" className="product-attachment-remove" onClick={() => { if (image.startsWith('blob:')) URL.revokeObjectURL(image); setProductImages(value => value.filter((_, itemIndex) => itemIndex !== index)) }} aria-label={`删除图片附件 ${index + 1}`}><X/></button></div>)}{productImagesUploading && Array.from({ length: pendingProductImageCount }).map((_, index) => <span className="product-upload-skeleton" role="status" aria-label={`图片 ${index + 1} 上传中`} key={`uploading-${index}`}><LoaderCircle/><small>上传中</small></span>)}</div>}</div>
    <div className="brief-section-heading span-2"><span>02</span><div><h3>视频基础需求</h3><p>定义投放环境、成片规格与语言字幕</p></div></div>
    <label className="span-2"><span>视频需求描述</span><textarea value={videoRequirement} onChange={event => setVideoRequirement(event.target.value)}/></label>
    <BriefSelect label="目标平台" value={platform} onChange={setPlatform} options={briefOptions.platform}/>
    <BriefSelect label="画面比例" value={ratio} onChange={setRatio} options={briefOptions.ratio}/>
    <BriefSelect icon={Clock3} label="成片目标时长" value={selectedDuration} options={briefOptions.duration} onChange={setSelectedDuration}/>
    <BriefSelect label="目标市场与语言" value={market} onChange={setMarket} options={briefOptions.market}/>
    <div className="video-field-with-help"><BriefSelect icon={Mic2} label="口播语速（WPM）" value={speechRate} onChange={setSpeechRate} options={briefOptions.speechRate} optionDescriptions={speechRateDescriptions}/><small>WPM 表示每分钟口播的英文单词数；标准 150 WPM 适合大多数短视频。</small></div>
    <div className="brief-section-heading span-2"><span>03</span><div><h3>业务输出参数</h3><p>营销目标、视频形式与视觉风格</p></div></div>
    <div className="asset-ai-actions asset-ai-generation-bridge span-2"><button type="button" className="asset-ai-generate" onClick={generateBusinessParameters} disabled={Boolean(aiGenerating)} aria-busy={aiGenerating === 'business'} title="根据基础商品与人群配置和视频基础需求生成业务输出参数">{aiGenerating === 'business' ? <LoaderCircle className="product-loading-icon" aria-hidden="true"/> : <Sparkles aria-hidden="true"/>}{aiGenerating === 'business' ? '生成中…' : 'AI 生成'}</button><span role="status">{aiGenerating === 'business' ? '正在生成业务输出参数…' : aiGenerated === 'business' ? '已生成业务输出参数，可继续手动调整' : '根据基础商品与人群配置和视频基础需求生成'}</span></div>
    <BriefSelect label="营销目标" value={creativeDirection.goal} onChange={goal => setCreativeDirection(value => ({ ...value, goal }))} options={briefOptions.goal}/>
    <BriefSelect label="视频形式" value={creativeDirection.format} onChange={format => setCreativeDirection(value => ({ ...value, format }))} options={briefOptions.format}/>
    <BriefSelect label="视觉风格" value={creativeDirection.style} onChange={style => setCreativeDirection(value => ({ ...value, style }))} options={['原生自然', '明亮清新', '温暖治愈', '冷静科技', '高级纪实', '极简商业', '高饱和活力', '美式复古 90s', '现代 3D 动画']}/>
{previewProductImage && <div className="product-image-modal" role="dialog" aria-modal="true" aria-label="图片附件预览" onClick={() => setPreviewProductImage(null)}><div className="product-image-modal-content" onClick={event => event.stopPropagation()}><header><div><strong>图片附件预览</strong><span>{previewProductImage.index + 1} / {productImages.length}</span></div><button type="button" onClick={() => setPreviewProductImage(null)} aria-label="关闭图片预览"><X/></button></header><div><img src={previewProductImage.image} alt={`图片附件 ${previewProductImage.index + 1} 大图预览`} referrerPolicy="no-referrer"/></div></div></div>}
  </div>
}

const initialScriptSections = {
  summary: '一位采用混合办公模式的城市上班族端起普通办公室咖啡，喝了一口后露出失望表情。她从工作包里取出收纳在随行杯中的 AeroPress Go，在办公桌上依次完成加粉、注水、搅拌和按压。镜头用微距展示过滤后的咖啡，再呈现推出咖啡渣、冲洗和重新收纳的过程。结尾以她带着咖啡开始工作收束，突出便携、完整收纳、8 oz 单杯容量，以及约 2 分钟完成冲煮与清洁。',
  hook: 'She takes one sip of the office coffee and pauses. Cut to the AeroPress Go unpacking from its own mug: “Okay—let’s make a fresh cup.”',
  oral: 'My commute starts early, and the office coffee never tastes quite right. So I keep the AeroPress Go in my work bag. The press, scoop, stirrer, filters, and mug pack together as one compact kit. At my desk, I add medium-fine coffee and hot water, stir, then press. The micro-filter keeps grit out, and the whole brew-and-clean routine takes about two minutes. When I’m finished, everything packs back into the mug. If you want fresh coffee without a countertop machine, try the AeroPress Go.',
  cta: 'Pack better coffee for your workday. Explore the AeroPress Go.'
}

const scriptElements = [
  ['人物', UserRound, ['美国城市混合办公女性']],
  ['场景', Image, ['办公室工位']],
  ['道具', Box, ['AeroPress Go', '随行杯']]
]

function ScriptPanel({ onNotice, onChange, onEditBrief, brief }) {
  const [sections, setSections] = useState(initialScriptSections)
  const [editing, setEditing] = useState('')
  const [locked, setLocked] = useState(['summary'])
  const [previewProductImage, setPreviewProductImage] = useState(null)
  const oralWordCount = sections.oral.trim().split(/\s+/).filter(Boolean).length
  const speechRateWpm = Number.parseInt(brief.speechRate, 10) || 150
  const estimatedOralSeconds = Math.ceil(oralWordCount / (speechRateWpm / 60))
  const sectionMeta = [
    ['summary', '故事梗概', '中文策划说明'],
    ['hook', '前三秒钩子', 'English (US)'],
    ['oral', '完整口播文案', `${oralWordCount} words · 约 ${estimatedOralSeconds} 秒`],
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
  const productTitle = brief.product && brief.product !== '请选择商品' ? brief.product : '自由创作'
  const overviewImages = brief.productImages?.length ? brief.productImages : productCatalog.find(product => product.name === productTitle)?.images || []
  const targetSeconds = Number.parseInt(brief.duration, 10) || 0
  const demonstrationSeconds = Math.max(0, targetSeconds - estimatedOralSeconds)
  const durationValid = targetSeconds >= estimatedOralSeconds
  useEffect(() => {
    if (!previewProductImage) return
    const closeOnEscape = event => event.key === 'Escape' && setPreviewProductImage(null)
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [previewProductImage])
  return <div className="script-layout">
    <section className="script-overview" aria-labelledby="script-product-title"><div className="script-overview-product"><div className="script-overview-copy"><small>{brief.productSource || '自由创作'}</small><h3 id="script-product-title">{productTitle}</h3><div className="script-overview-audience"><UserRound/><span>分人群营销</span><b>{brief.marketingGroup || '未选择人群'}</b></div></div><button className="script-overview-edit" type="button" onClick={onEditBrief}>修改需求</button></div><dl>{[['营销目标', brief.goal, Target], ['视频形式', brief.format, Film], ['视觉风格', brief.style, Palette], ['市场与语言', brief.market, Languages], ['目标平台', brief.platform, MonitorPlay], ['画面比例', brief.ratio, Ratio], ['成片时长', brief.duration, Clock3]].map(([label, value, Icon]) => <div key={label}><dt><Icon/>{label}</dt><dd>{value}</dd></div>)}</dl><div className="script-overview-assets" aria-label="素材附件缩略图">{overviewImages.length ? overviewImages.slice(0, 6).map((image, index) => <button type="button" onClick={() => setPreviewProductImage({ image, index })} aria-label={`查看素材附件 ${index + 1}`} key={`${image}-${index}`}><img src={image} alt=""/></button>) : <span>暂无素材附件</span>}</div></section>
    <section className="script-main" aria-labelledby="script-content-title">
      <div className="script-pane-heading"><div><small>CONTENT</small><h3 id="script-content-title">剧本内容</h3></div><span>可逐段编辑、复制、重写或锁定</span></div>
      <div className="section-heading"><div><small>剧本标题 · English (US)</small><h3>Better Office Coffee, Packed in One Mug</h3></div><button type="button" onClick={rewriteUnlocked}><RefreshCw/>重新生成未锁定内容</button></div>
      <article className="script-elements"><header><strong>内容要素</strong><small>人物、场景与道具</small></header><div>{scriptElements.map(([label, Icon, items]) => <section key={label}><h4><Icon/>{label}</h4><div>{items.map(item => <span key={item}>{item}</span>)}</div></section>)}</div></article>
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
    <aside className="script-insights" aria-label="剧本分析"><section><h3>创作策略</h3><dl><div><dt>叙事结构</dt><dd>钩子 → 痛点 → 演示 → CTA</dd></div><div><dt>角色立场</dt><dd>目标用户视角</dd></div></dl></section><section><h3>时长检查</h3><dl><div><dt>目标时长</dt><dd>{brief.duration}</dd></div><div><dt>口播词数</dt><dd>{oralWordCount} words</dd></div><div><dt>口播语速</dt><dd>{speechRateWpm} WPM</dd></div><div><dt>预计口播</dt><dd>约 {estimatedOralSeconds} 秒</dd></div><div><dt>演示余量</dt><dd>约 {demonstrationSeconds} 秒</dd></div></dl><div className={`duration-check ${durationValid ? '' : 'is-warning'}`}>{durationValid ? <Check/> : <CircleAlert/>}<span><b>{durationValid ? '时长校验通过' : '口播超过目标时长'}</b><small>{durationValid ? '口播与产品演示均有充足空间' : '请精简口播或延长成片时长'}</small></span></div></section></aside>{previewProductImage && <div className="product-image-modal" role="dialog" aria-modal="true" aria-label="素材附件预览" onClick={() => setPreviewProductImage(null)}><div className="product-image-modal-content" onClick={event => event.stopPropagation()}><header><div><strong>素材附件预览</strong><span>{previewProductImage.index + 1} / {overviewImages.length}</span></div><button type="button" onClick={() => setPreviewProductImage(null)} aria-label="关闭素材附件预览"><X/></button></header><div><img src={previewProductImage.image} alt={`素材附件 ${previewProductImage.index + 1} 大图预览`}/></div></div></div>}
  </div>
}

function CoreAssetEditor({ asset, onSave, onClose }) {
  const [draft,setDraft]=useState(()=>({...asset}))
  const [generating,setGenerating]=useState(false)
  const [error,setError]=useState('')
  const fileInput=useRef(null)
  const update=(key,value)=>setDraft(current=>({...current,[key]:value}))
  const uploadThumbnail=event=>{const file=event.target.files?.[0];event.target.value='';if(!file)return;if(!file.type.startsWith('image/')){setError('请选择图片文件');return}if(file.size>50*1024*1024){setError('缩略图不能超过 50 MB');return}setError('');update('thumbnail',URL.createObjectURL(file))}
  const generate=()=>{if(!draft.skill){setError('请先绑定一个生成技能');return}if(!draft.description.trim()){setError('请先填写资产描述或生成提示词');return}setError('');setGenerating(true);window.setTimeout(()=>{const skillIndex=Math.max(0,coreAssetSkills.indexOf(draft.skill));setDraft(current=>({...current,thumbnail:mockPreviewImages[(asset.id+skillIndex)%mockPreviewImages.length],state:'bound'}));setGenerating(false)},900)}
  const save=event=>{event.preventDefault();if(!draft.title.trim()){setError('请输入资产标题');return}onSave({...draft,title:draft.title.trim(),description:draft.description.trim(),state:draft.thumbnail||draft.type==='声音'?'bound':'missing'})}
  return <article className="core-asset-inline-editor">
    <form onSubmit={save}>
      <div className="inline-asset-media">{draft.thumbnail?<img src={draft.thumbnail} alt="资产缩略图预览"/>:<div><Image/><span>暂无缩略图</span></div>}<input ref={fileInput} hidden type="file" accept="image/*" onChange={uploadThumbnail}/><button type="button" onClick={()=>fileInput.current?.click()}><Upload/>更换缩略图</button></div>
      <div className="inline-asset-fields"><label><span>标题</span><input autoFocus value={draft.title} onChange={event=>update('title',event.target.value)} placeholder="输入资产标题"/></label><label><span>类型</span><AssetTypeSelect value={draft.type} onChange={value=>update('type',value)}/></label><label><span>描述 / 生成提示词</span><textarea value={draft.description} onChange={event=>update('description',event.target.value)} placeholder="描述主体、外观、材质、场景、光线与风格"/></label><label><span>绑定技能</span><select value={draft.skill} onChange={event=>update('skill',event.target.value)}><option value="">暂未绑定技能</option>{coreAssetSkills.map(skill=><option key={skill}>{skill}</option>)}</select></label>{error&&<p className="inline-asset-error" role="alert">{error}</p>}</div>
      <footer><button type="button" onClick={onClose} disabled={generating}><X/>取消</button><button type="button" onClick={generate} disabled={generating}>{generating?<LoaderCircle className="product-loading-icon"/>:<Sparkles/>}{generating?'生成中…':'技能生成'}</button><button className="save" disabled={generating}><Check/>保存</button></footer>
    </form>
  </article>
}

function InlineAssetText({ value, onCommit, label, multiline=false }) {
  const [editing,setEditing]=useState(false)
  const [draft,setDraft]=useState(value)
  const textareaRef=useRef(null)
  useLayoutEffect(()=>{
    const element=textareaRef.current
    if(!editing||!element)return
    const resize=()=>{element.style.height='auto';element.style.height=`${element.scrollHeight+element.offsetHeight-element.clientHeight}px`}
    resize()
    let width=element.getBoundingClientRect().width
    const observer=new ResizeObserver(()=>{const nextWidth=element.getBoundingClientRect().width;if(nextWidth!==width){width=nextWidth;resize()}})
    observer.observe(element)
    return()=>observer.disconnect()
  },[editing,draft])
  useEffect(()=>setDraft(value),[value])
  const commit=()=>{const next=draft.trim();onCommit(next||value);setDraft(next||value);setEditing(false)}
  const cancel=()=>{setDraft(value);setEditing(false)}
  const onKeyDown=event=>{if(event.key==='Escape'){event.preventDefault();cancel()}else if(!multiline&&event.key==='Enter'){event.preventDefault();event.currentTarget.blur()}else if(multiline&&event.key==='Enter'&&(event.metaKey||event.ctrlKey)){event.preventDefault();event.currentTarget.blur()}}
  if(editing)return multiline?<textarea ref={textareaRef} rows={1} className="asset-inline-description" value={draft} onChange={event=>setDraft(event.target.value)} onBlur={commit} onKeyDown={onKeyDown} autoFocus aria-label={label}/>:<input className="asset-inline-title" value={draft} onChange={event=>setDraft(event.target.value)} onBlur={commit} onKeyDown={onKeyDown} autoFocus aria-label={label}/>
  return <button type="button" className={`asset-inline-copy ${multiline?'is-description':'is-title'}`} onClick={()=>setEditing(true)} aria-label={`修改${label}`}><span>{value}</span><Pencil aria-hidden="true"/></button>
}

function CoreAssetPreview({ asset }) {
  const [open,setOpen]=useState(false)
  const dialogRef=useRef(null)
  const closeRef=useRef(null)
  const kind=asset.mediaType||'image', source=asset.mediaSrc||asset.thumbnail
  useEffect(()=>{if(open){dialogRef.current?.showModal();closeRef.current?.focus()}},[open])
  const close=()=>{dialogRef.current?.close();setOpen(false)}
  return <div className="core-media-preview">
    <button type="button" className="reference-asset-thumbnail" aria-label={`预览${asset.title}`} aria-haspopup="dialog" onClick={()=>setOpen(true)} disabled={!source}>{kind==='audio'?<Mic2/>:kind==='video'?<video src={source} preload="metadata" muted/>:source?<img src={source} alt=""/>:<Image/>}</button>
    {open&&<dialog ref={dialogRef} className="core-media-dialog" aria-label={asset.title} onCancel={close} onClose={()=>setOpen(false)} onClick={event=>{if(event.target===event.currentTarget){const rect=event.currentTarget.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)close()}}}><header><strong>{asset.title}</strong><button ref={closeRef} type="button" onClick={close} aria-label="关闭预览"><X/></button></header><div className="core-media-dialog-body">{kind==='audio'?<audio src={source} controls preload="metadata"/>:kind==='video'?<video src={source} controls playsInline preload="metadata"/>:<img src={source} alt={asset.title}/>}</div></dialog>}
  </div>
}

function CoreAssetRow({ asset, onUpdate, onDelete, onNotice }) {
  const fileInput=useRef(null)
  const [generating,setGenerating]=useState(false)
  const Icon=assetTypeOptions.find(([name])=>name===asset.type)?.[1]||Image
  const upload=event=>{const file=event.target.files?.[0];event.target.value='';if(!file)return;if(!file.type.startsWith('image/')&&!file.type.startsWith('video/')){onNotice?.('请选择图片或视频文件');return}if(file.size>50*1024*1024){onNotice?.('上传文件不能超过 50 MB');return}onUpdate({...asset,thumbnail:URL.createObjectURL(file),mediaType:file.type.startsWith('video/')?'video':'image',state:'bound'});onNotice?.('资产已上传')}
  const generate=()=>{if(!asset.skill){onNotice?.('请先绑定一个生成技能');return}if(!asset.description.trim()){onNotice?.('请先填写资产描述或生成提示词');return}setGenerating(true);window.setTimeout(()=>{const skillIndex=Math.max(0,coreAssetSkills.indexOf(asset.skill));onUpdate({...asset,thumbnail:mockPreviewImages[(asset.id+skillIndex)%mockPreviewImages.length],mediaType:'image',state:'bound'});setGenerating(false);onNotice?.('资产已生成')},900)}
  return <article className="core-asset-row reference-list-card"><CoreAssetPreview asset={asset}/><div className="core-asset-copy"><div className="inline-asset-type"><AssetTypeSelect value={asset.type} onChange={type=>onUpdate({...asset,type})}/></div><strong><FileText aria-hidden="true"/><InlineAssetText value={asset.title} label="资产标题" onCommit={title=>onUpdate({...asset,title})}/></strong><p><Link2 aria-hidden="true"/><InlineAssetText multiline value={asset.description} label="资产描述" onCommit={description=>onUpdate({...asset,description})}/></p></div><div className="reference-row-status"><CoreSkillSelect value={asset.skill} onChange={skill=>onUpdate({...asset,skill})}/><input ref={fileInput} hidden type="file" accept="image/*,video/*" onChange={upload}/><button type="button" className="asset-row-tool" onClick={()=>fileInput.current?.click()}><Upload/>上传</button><button type="button" className="asset-row-tool is-generate" onClick={generate} disabled={generating}>{generating?<LoaderCircle className="product-loading-icon"/>:<Sparkles/>}{generating?'生成中':'生成'}</button></div><div className="reference-row-actions"><button type="button" onClick={()=>onDelete(asset)} aria-label={`删除${asset.title}`}><Trash2/></button></div></article>
}


function AssetProductionSettings({ brief, settings, setSettings }) {
  const {subtitleStyle,subtitleFont,shootingPreferences}=settings
  const setSubtitleStyle=value=>setSettings(current=>({...current,subtitleStyle:value}))
  const setSubtitleFont=value=>setSettings(current=>({...current,subtitleFont:value}))
  const setShootingPreferences=value=>setSettings(current=>({...current,shootingPreferences:value}))
  const [preferenceHint,setPreferenceHint]=useState('')
  const [aiGenerating,setAiGenerating]=useState('')
  const [aiGenerated,setAiGenerated]=useState('')
  const aiGenerationTimer=useRef(null)
  useEffect(()=>()=>clearTimeout(aiGenerationTimer.current),[])
  const selectedDuration=brief.duration
  const videoRequirement=brief.videoRequirement
  const creativeDirection=brief
  const recommendedPreferenceLimit=preferenceLimitForDuration(selectedDuration)
  const generateShootingPreferences = () => {
    if (aiGenerating) return
    setAiGenerating('preferences')
    setAiGenerated('')
    aiGenerationTimer.current = window.setTimeout(() => {
      const context = `${videoRequirement} ${brief.buyerContent || ''} ${brief.materialDirection || ''}`
      setShootingPreferences(recommendShootingPreferences(creativeDirection.format, context, selectedDuration))
      setPreferenceHint('')
      setAiGenerating('')
      setAiGenerated('preferences')
    }, 800)
  }

  return <section className="video-form-grid asset-production-settings">
    <div className="brief-section-heading span-2"><div><h3>生成设置</h3><p>配置生成模型与字幕样式</p></div></div>
    <SubtitleStylePicker value={subtitleStyle} onChange={setSubtitleStyle} font={subtitleFont} onFontChange={setSubtitleFont}/>
    <CustomSelect icon={Video} label="生成模型" value={settings.generationModel||'Seedance 2.0-标准版'} options={['Seedance 2.0-标准版','Seedance 2.0-Mini','Seedance 2.0-Fast','Seedance 2.5']} onChange={generationModel=>setSettings(current=>({...current,generationModel}))}/>
    <div className="brief-section-heading span-2"><div><h3>拍摄偏好</h3><p>整片级偏好池，生成分镜时按镜头择优分配</p></div></div>
    <div className="asset-ai-actions asset-ai-generation-bridge span-2"><button type="button" className="asset-ai-generate" onClick={generateShootingPreferences} disabled={Boolean(aiGenerating)} aria-busy={aiGenerating === 'preferences'} title="根据前三组配置和成片目标时长生成拍摄偏好">{aiGenerating === 'preferences' ? <LoaderCircle className="product-loading-icon" aria-hidden="true"/> : <Sparkles aria-hidden="true"/>}{aiGenerating === 'preferences' ? '生成中…' : 'AI 生成'}</button><span role="status">{aiGenerating === 'preferences' ? '正在生成拍摄偏好…' : aiGenerated === 'preferences' ? `已根据 ${selectedDuration} 生成 ${shootingPreferences.length} 项拍摄偏好` : '根据基础配置、视频需求、业务参数和目标时长生成'}</span></div>
    <fieldset className="shooting-preferences span-2"><legend>偏好选择 <span>支持手动调整</span></legend><div className="preference-count"><span>为整条视频选择偏好，生成分镜时将按镜头择优分配</span><b className={shootingPreferences.length > recommendedPreferenceLimit ? 'limit' : ''}>已选 {shootingPreferences.length} 项</b></div><div className="preference-groups">{shootingPreferenceGroups.map(([group, items]) => <section key={group}><strong>{group}</strong><div>{items.map(item => {
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
    })}</div></section>)}</div><div className="preference-rule"><Layers3/><span>可跨类别组合，同类最多选择 2 项；系统会在生成分镜时处理镜头级冲突，每个镜头只采用一种主要运镜。</span></div>{shootingPreferences.length > recommendedPreferenceLimit && <div className="preference-volume-note strong"><CircleAlert/><span>{selectedDuration}建议选择不超过 {recommendedPreferenceLimit} 项；当前已选择 {shootingPreferences.length} 项，系统仍会按镜头择优采用，未采用的偏好不会强行加入。</span></div>}{preferenceHint && <div className="preference-warning"><CircleAlert/>{preferenceHint}</div>}</fieldset>
  </section>
}

function AssetsPanel({ onNotice }) {
  const [items,setItems]=useState(initialCoreAssets)
  const [editing,setEditing]=useState(null)
  const [deleting,setDeleting]=useState(null)
  const ready=items.filter(item=>item.state==='bound').length
  const save=item=>{setItems(current=>current.some(entry=>entry.id===item.id)?current.map(entry=>entry.id===item.id?item:entry):[...current,item]);setEditing(null);onNotice?.('核心资产已保存')}
  const add=()=>setEditing({id:Date.now(),type:'场景',title:'',description:'',thumbnail:'',skill:'场景参考生成',icon:Image,state:'missing'})
  return <div className="asset-config-list"><div className="asset-callout"><Library/><div><strong>分镜前锁定核心资产</strong><span>{ready===items.length?'核心资产已经就绪，可以继续生成分镜。':`系统从剧本中识别出 ${items.length} 项核心资产，仍有 ${items.length-ready} 项需要处理。`}</span></div><b>{ready} / {items.length}</b></div><div className="core-asset-toolbar"><div><strong>核心资产</strong><span>可添加、修改或删除，图片资产支持绑定技能生成。</span></div><button type="button" onClick={add}><Plus/>添加资产</button></div>
    {items.map(asset=>editing?.id===asset.id?<CoreAssetEditor key={asset.id} asset={editing} onSave={save} onClose={()=>setEditing(null)}/>:<CoreAssetRow key={asset.id} asset={asset} onUpdate={updated=>setItems(current=>current.map(item=>item.id===updated.id?updated:item))} onDelete={setDeleting} onNotice={onNotice}/>)}
    {!items.length&&<div className="core-asset-empty"><Library/><strong>还没有核心资产</strong><span>添加产品、人物或场景资产，为分镜保持视觉一致性。</span><button type="button" onClick={add}><Plus/>添加资产</button></div>}
    {editing&&!items.some(item=>item.id===editing.id)&&<CoreAssetEditor asset={editing} onSave={save} onClose={()=>setEditing(null)}/>} {deleting&&<div className="core-delete-backdrop"><section role="alertdialog" aria-modal="true" aria-labelledby="core-delete-title"><Trash2/><h3 id="core-delete-title">删除“{deleting.title}”？</h3><p>该资产会从当前视频项目的核心资产中移除。</p><div><button type="button" onClick={()=>setDeleting(null)}>取消</button><button type="button" className="danger" onClick={()=>{setItems(current=>current.filter(item=>item.id!==deleting.id));setDeleting(null);onNotice?.('核心资产已删除')}}>确认删除</button></div></section></div>}
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

export default function VideoWorkspace({ homeRequest = 0 }) {
  const [tasks,setTasks]=useState(initialCreationTasks)
  const [selectedTask,setSelectedTask]=useState(null)
  useEffect(()=>{setSelectedTask(null)},[homeRequest])
  const [taskModes,setTaskModes]=useState({})
  const [active, setActive] = useState(2)
  const [model, setModel] = useState('2.0')
  const [generated, setGenerated] = useState([0, 1])
  const [productionSettings,setProductionSettings]=useState({subtitleStyle:'outlined-white',subtitleFont:'自动匹配',shootingPreferences:['核心功能演示','便携收纳展示','边用边讲','自然抓拍','产品微距','半身近景','桌面顶拍','固定机位','主体锁焦','前后对比剪辑']})
  const [notice, setNotice] = useState('')
  const [scriptConfirmed, setScriptConfirmed] = useState(false)
  const [briefParameters, setBriefParameters] = useState({ productSource: '个人商品', product: 'AeroPress Go 便携咖啡器', marketingGroup: '美国城市混合办公人群', marketingSummary: '需要在家、办公室与通勤场景间切换的咖啡饮用者', audience: '营销假设：25–34 岁、居住在美国城市、每周往返办公室且重视咖啡品质与便携性的上班族', painPoint: '办公室咖啡体验不稳定，传统冲煮设备不便携带、收纳和清洁', result: '用一套可收纳进随行杯的器具，在约 2 分钟内完成冲煮与清洁', originalSellingPoint: '8 oz 单杯容量、整套收纳进随行杯、约 2 分钟完成冲煮与清洁', buyerContent: '从工作包中取出整套器具，在办公桌完成冲煮，清洁后重新收进随行杯', materialDirection: '办公室咖啡与新鲜冲煮前后对比、桌面顶拍操作、微滤细节、清洁与收纳连续动作', videoRequirement: '制作一条 45 秒 TikTok 竖屏英文短视频，面向需要在通勤、家庭与办公室之间切换的美国城市上班族。前三秒用普通办公室咖啡与新鲜冲煮形成反差；随后展示整套器具从随行杯中取出、加入咖啡粉与热水、搅拌按压、清洁并重新收纳。只使用可验证卖点：8 oz 单杯容量、整套可收纳进随行杯、微滤减少咖啡渣、冲煮与清洁约 2 分钟。', platform: 'TikTok', duration: '45 秒', ratio: '9:16 竖屏', market: '美国 · English (US)', goal: '解释核心卖点', format: '产品功能演示', style: '原生自然', subtitle: '黑描边白字字幕', shootingPreferences: ['核心功能演示', '便携收纳展示', '边用边讲', '自然抓拍', '产品微距', '半身近景', '桌面顶拍', '固定机位', '主体锁焦', '前后对比剪辑'] })
  const isBlankTask=selectedTask?.startsWith('task-new-')
  const currentTaskMode=selectedTask?taskModes[selectedTask]||'':''
  const panels = useMemo(() => [<BriefPanel blank={isBlankTask} initialMode={currentTaskMode} onChange={setBriefParameters}/>, <ScriptPanel brief={briefParameters} onNotice={setNotice} onChange={() => setScriptConfirmed(false)} onEditBrief={() => setActive(0)}/>, <AssetsPanel onNotice={setNotice}/>, <div className="short-preferences-page"><AssetProductionSettings brief={briefParameters} settings={productionSettings} setSettings={setProductionSettings}/></div>, <StoryPanel settings={productionSettings} onNotice={setNotice}/>, <GeneratePanel generated={generated} onGenerate={id => { setGenerated(value => [...value, id]); setNotice(`片段 ${id + 1} 已生成`) }}/>], [model, generated, briefParameters, productionSettings, isBlankTask, currentTaskMode])
  useEffect(()=>{if(!notice)return;const timer=window.setTimeout(()=>setNotice(''),2400);return()=>window.clearTimeout(timer)},[notice])
  const [, , label] = steps[active]
  const openTaskCreator=()=>{setSelectedTask(null);setActive(0);setNotice('')}
  const createTask=mode=>{
    const id=`task-new-${Date.now()}`
    const number=tasks.length-initialCreationTasks.length+1
    const task=[id,`新建视频任务 ${number}`,'创作需求 · 刚刚',mockPreviewImages[0]]
    setTasks(current=>[task,...current])
    setTaskModes(current=>({...current,[id]:mode}))
    setSelectedTask(id)
    setActive(0)
    setGenerated([])
    setScriptConfirmed(false)
    setProductionSettings({subtitleStyle:'outlined-white',subtitleFont:'自动匹配',shootingPreferences:[]})
    setNotice('新任务已创建，请填写创作需求')
  }
  return <main className="video-workspace horizontal-workflow"><CreationTaskHistory tasks={tasks} selected={selectedTask} onSelect={setSelectedTask} onNew={openTaskCreator}/><section className="video-work-area">
    {selectedTask===null?<><header className="video-work-header creation-start-header"><div><span>SHULAN / CREATIVE STUDIO</span><h1>创意中心</h1></div></header><div className="creation-start-stage"><CreativeHome onChoose={createTask}/></div></>:
    <>
    <header className="video-work-header"><div><span>快捷生成视频 / 新建项目</span><h1>{label}</h1></div><Workflow active={active} onChange={setActive}/><div><button className="quiet-button">保存草稿</button><button className="primary-button" onClick={() => { if (active === steps.length - 1) { setNotice('视频生成流程已完成'); return }; if (active === 1) { setScriptConfirmed(true); setNotice('剧本已确认，可用于准备核心资产') }; setActive(value => Math.min(steps.length - 1, value + 1)) }}>{active === steps.length - 1 ? '完成' : active === 1 && !scriptConfirmed ? '确认剧本并继续' : '继续'}{active === steps.length - 1 ? <Check/> : <ArrowRight/>}</button></div></header>
    <div className="video-stage">
      <div className="stage-content" key={selectedTask}>{panels[active]}</div>
    </div></>}
  </section>{notice && <div className="asset-toast video-toast"><Check/>{notice}</div>}</main>
}
