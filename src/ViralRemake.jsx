import React, { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, AtSign, AudioLines, Check, CheckCircle2, ChevronRight, CircleHelp, Clock3,
  FilePenLine, FileText, Film, Image as ImageIcon, Layers3, LoaderCircle, Lock,
  Maximize2, Play, Plus, RefreshCw, RotateCcw, Save, Sparkles, Trash2, Upload, Video, WandSparkles, X,
} from 'lucide-react'
import {
  breakdownText, demoAssets, demoRequest, modes, originalBoards, replacedBoards,
  segmentDocuments, steps, storyboardText,
} from './viral-remake-data'
import {
  STORAGE_KEY, addSequencedAssets, advanceStep, canAdvance, clearRunningStatuses, clearVideo,
  createInitialProject, findMentionCandidates, getMediaType, keepWithinTextLimit, nextAssetLabel, persistProject,
  queueGeneration, removeReplacementAsset, setCurrentStep, setGenerationStatus, replaceVideo,
  updateDocument, updateReplacementAsset,
} from './viral-remake-state'
import './viral-remake.css'

const MODELS = ['seedance 2.0 mini', 'seedance 2.0 fast', 'seedance 2.0', 'seedance 2.5']

function ModeSelection({ onSelect, notify }) {
  return <main className="remake-mode-page">
    <header className="remake-mode-header"><div><span className="remake-kicker">VIRAL REMAKE</span><h1>选择复刻模式</h1><p>从原片镜头到叙事结构，选择最适合当前素材的复刻方式。</p></div><button className="remake-help" onClick={() => notify('元素替换最适合需要高度还原原片动作的任务')}><CircleHelp/>如何选择</button></header>
    <section className="remake-mode-grid" aria-label="复刻模式">
      {modes.map((mode) => <article className={`remake-mode-card ${mode.active ? 'available' : 'locked'}`} key={mode.id}>
        <div className="remake-mode-card-top"><span>{mode.index}</span>{mode.active ? <em><Sparkles/>当前可用</em> : <em><Lock/>即将上线</em>}</div>
        <div className="remake-mode-icon">{mode.id === 'element' ? <Layers3/> : mode.id === 'rewrite' ? <WandSparkles/> : <Film/>}</div>
        <h2>{mode.title}</h2><strong>{mode.subtitle}</strong><p>{mode.description}</p>
        <button disabled={!mode.active} onClick={() => mode.active && onSelect()}>{mode.active ? <>开始创建<ArrowRight/></> : '暂不可用'}</button>
      </article>)}
    </section>
    <footer className="remake-mode-footer"><span>当前仅开放元素替换模式</span><i/><span>所有处理均为前端 Demo 演示</span></footer>
  </main>
}

function WorkflowHeader({ project, onBack, onStep, onSave, onReset }) {
  return <><header className="remake-project-header"><div className="remake-project-title"><button aria-label="返回模式选择" onClick={onBack}><ArrowLeft/></button><div><span>爆款复刻 / 元素替换</span><strong>{project.videoName || '未命名项目'}</strong></div></div><div className="remake-header-actions"><button onClick={onReset}><RotateCcw/>重新开始</button><button className="primary" onClick={onSave}><Save/>保存草稿</button></div></header>
    <nav className="remake-steps" aria-label="项目进度">{steps.map((label, index) => { const number = index + 1; const complete = number < project.step; const active = number === project.step; const unlocked = number <= project.maxStep; return <button key={label} className={`${active ? 'active' : ''} ${complete ? 'complete' : ''}`} disabled={!unlocked} onClick={() => onStep(number)}><span>{complete ? <Check/> : number}</span><b>{label}</b>{index < steps.length - 1 && <i/>}</button> })}</nav></>
}

function UploadCard({ icon: Icon, title, note, accept, onChange }) {
  return <label className="remake-upload-card"><input type="file" accept={accept} onChange={onChange}/><span><Icon/></span><div><b>{title}</b><small>{note}</small></div><Upload className="upload-arrow"/></label>
}

const readFile = file => new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(file) })

function ReplacementAssetRow({ asset, onReplace, onRemove }) {
  const chooseFile = event => {
    const file = event.target.files?.[0]
    if (file) onReplace(file)
    event.target.value = ''
  }
  const MediaIcon = asset.type === 'audio' ? AudioLines : asset.type === 'video' ? Video : ImageIcon
  return <article className="remake-asset-row">
    <div className={`remake-asset-preview ${asset.type}`}>{asset.type === 'image' && (asset.preview || asset.path) ? <img src={asset.preview || asset.path} alt=""/> : asset.type === 'video' && asset.preview ? <video src={asset.preview} muted/> : <MediaIcon/>}</div>
    <div className="remake-asset-copy"><b>{asset.role}</b><small>{asset.name}</small></div>
    <div className="remake-row-actions"><label className="remake-file-action"><input type="file" accept="image/*,audio/*,video/*" onChange={chooseFile}/><Upload/>替换素材</label><button type="button" className="remake-delete-action" onClick={onRemove} aria-label={`删除${asset.role}`}><Trash2/>删除</button></div>
  </article>
}

function MentionEditor({ value, assets, onChange }) {
  const editorRef = useRef(null)
  const rangeRef = useRef(null)
  const [query, setQuery] = useState(null)
  const candidates = query === null ? [] : findMentionCandidates(assets, query)
  const renderValue = (force = false, nextValue = value) => {
    const editor = editorRef.current
    if (!editor || (!force && document.activeElement === editor)) return
    editor.replaceChildren()
    nextValue.split(/(@(?:图片|音频|视频)\d+)/g).filter(Boolean).forEach(part => {
      if (!/^@(图片|音频|视频)\d+$/.test(part)) return editor.append(document.createTextNode(part))
      const found = assets.some(asset => `@${asset.role}` === part)
      const token = document.createElement('span')
      token.className = `remake-mention-token${found ? '' : ' missing'}`
      token.contentEditable = 'false'
      token.dataset.reference = part
      token.textContent = part
      editor.append(token)
    })
  }
  useEffect(renderValue, [value, assets])
  const serializeEditor = editor => editor.innerText
  const sync = () => {
    const editor = editorRef.current
    const selection = window.getSelection()
    if (!editor || !selection?.rangeCount) return
    const range = selection.getRangeAt(0)
    rangeRef.current = range.cloneRange()
    const attempted = serializeEditor(editor).replace(/\u00a0/g, ' ')
    const text = keepWithinTextLimit(value, attempted)
    if (text !== attempted) {
      renderValue(true, value)
      const end = document.createRange()
      end.selectNodeContents(editor); end.collapse(false)
      selection.removeAllRanges(); selection.addRange(end)
      rangeRef.current = end.cloneRange()
    }
    onChange(text)
    const before = range.cloneRange()
    before.selectNodeContents(editor)
    before.setEnd(range.endContainer, range.endOffset)
    const match = before.toString().match(/@([^@\s]*)$/)
    setQuery(match ? match[1] : null)
  }
  const insertMention = asset => {
    const range = rangeRef.current
    const editor = editorRef.current
    if (!range || !editor) return
    const removeLength = (query?.length || 0) + 1
    const currentText = serializeEditor(editor).replace(/\u00a0/g, ' ')
    const nextLength = currentText.length - removeLength + asset.role.length + 2
    if (nextLength > 500) { setQuery(null); return }
    if (range.startContainer.nodeType === Node.TEXT_NODE && range.startOffset >= removeLength) range.setStart(range.startContainer, range.startOffset - removeLength)
    range.deleteContents()
    const token = document.createElement('span')
    token.className = 'remake-mention-token'
    token.contentEditable = 'false'
    token.textContent = `@${asset.role}`
    token.dataset.reference = `@${asset.role}`
    const space = document.createTextNode('\u00a0')
    range.insertNode(space)
    range.insertNode(token)
    range.setStartAfter(space)
    range.collapse(true)
    const selection = window.getSelection()
    selection.removeAllRanges(); selection.addRange(range)
    editor.focus()
    setQuery(null)
    onChange(serializeEditor(editor).replace(/\u00a0/g, ' '))
  }
  return <div className="remake-mention-wrap"><div ref={editorRef} className="remake-mention-editor" contentEditable role="textbox" aria-label="替换需求" aria-multiline="true" data-placeholder="输入替换需求，输入 @ 引用左侧素材" onInput={sync} onKeyUp={event => event.key !== 'Escape' && sync()} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); setQuery(null) } if (event.key === 'Enter' && query !== null && candidates[0]) { event.preventDefault(); insertMention(candidates[0]) } }}/>{query !== null && <div className="remake-mention-menu" role="listbox" aria-label="引用替换素材">{candidates.length ? candidates.map(asset => <button type="button" role="option" key={asset.id} onMouseDown={event => event.preventDefault()} onClick={() => insertMention(asset)}><span className={`remake-mention-thumb ${asset.type}`}>{asset.type === 'image' && (asset.preview || asset.path) ? <img src={asset.preview || asset.path} alt=""/> : asset.type === 'audio' ? <AudioLines/> : <Video/>}</span><b>@{asset.role}</b><small>{asset.name}</small></button>) : <p>没有匹配的素材</p>}</div>}<small className="remake-request-count">{value.length}/500</small><span className="remake-at-hint"><AtSign/>输入 @ 引用素材</span></div>
}

function StepOne({ project, setProject, onDemo, onNext, notify }) {
  const makeAssetId = () => globalThis.crypto?.randomUUID?.() || `asset-${Date.now()}`
  const addAssets = async event => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (!files.length) return
    const descriptors = files.map(file => {
      const type = getMediaType(file)
      return { file, asset: { id: makeAssetId(), type, name: file.name } }
    })
    const added = await Promise.all(descriptors.map(async ({ file, asset }) => ({ ...asset, preview: await readFile(file) })))
    setProject(value => addSequencedAssets(value, added))
  }
  const replaceAsset = async (id, file) => {
    const preview = await readFile(file)
    setProject(value => {
      const current = value.assets.find(asset => asset.id === id)
      if (!current) return value
      const type = getMediaType(file)
      const role = type === current.type ? current.role : nextAssetLabel(value.assets.filter(asset => asset.id !== id), type, value.assetCounters)
      const next = updateReplacementAsset(value, id, { role, type, name: file.name, preview, path: undefined })
      if (type === current.type) return next
      return { ...next, assetCounters: { ...value.assetCounters, [type]: Number(role.match(/\d+$/)?.[0] || 0) } }
    })
  }
  const removeAsset = id => setProject(value => removeReplacementAsset(value, id))
  const chooseVideo = event => { const file = event.target.files?.[0]; if (file) setProject(value => replaceVideo(value, file.name)); event.target.value = '' }
  return <section className="remake-stage"><div className="remake-stage-heading"><div><span className="remake-kicker">STEP 01</span><h1>准备复刻素材</h1><p>上传模板视频和替换素材，再通过 @ 将素材引用到替换需求中。</p></div><button className="remake-demo-button" onClick={onDemo}><Sparkles/>加载 Demo 素材</button></div>
    <div className="remake-form-grid"><div className="remake-panel remake-source-panel"><div className="remake-panel-title"><span><Video/></span><div><h2>模板视频</h2><p>支持 MP4 / MOV，建议 9:16 竖屏</p></div></div>{project.videoName ? <div className="remake-selected-file"><span><Play/></span><div><b>{project.videoName}</b><small>模板视频已就绪</small></div><div className="remake-row-actions"><label className="remake-file-action"><input type="file" accept="video/*" onChange={chooseVideo}/><Upload/>替换视频</label><button type="button" className="remake-delete-action" onClick={() => setProject(value => clearVideo(value))}><Trash2/>删除</button></div></div> : <UploadCard icon={Play} title="上传需要复刻的视频" note="点击选择 MP4 / MOV 文件" accept="video/*" onChange={chooseVideo}/>}<div className="remake-subsection-title"><span><Layers3/></span><div><h2>替换素材</h2><p>支持图片、音频和视频，系统将按类型自动编号</p></div></div><div className="remake-asset-uploads">{project.assets.length ? project.assets.map(asset => <ReplacementAssetRow key={asset.id} asset={asset} onReplace={file => replaceAsset(asset.id, file)} onRemove={() => removeAsset(asset.id)}/>) : <div className="remake-assets-empty"><ImageIcon/><b>暂未添加替换素材</b><span>上传后将自动命名为图片1、音频1或视频1。</span></div>}<label className="remake-add-asset"><input type="file" accept="image/*,audio/*,video/*" multiple onChange={addAssets}/><Plus/>新增替换素材</label></div></div>
      <div className="remake-panel remake-request-panel"><div className="remake-panel-title"><span><AtSign/></span><div><h2>替换需求</h2><p>输入 @ 可引用左侧已经上传的素材</p></div></div><MentionEditor value={project.request} assets={project.assets} onChange={request => setProject(value => ({ ...value, request }))}/><div className="remake-field"><label htmlFor="video-model">视频生成模型</label><select id="video-model" value={project.model} onChange={event => setProject(value => ({ ...value, model: event.target.value }))}>{MODELS.map(model => <option key={model}>{model}</option>)}</select><p className="remake-field-hint">Seedance 2.5 将按每 30 秒拆分生成，其余模型按每 15 秒拆分。</p></div></div></div>
    <div className="remake-stage-footer"><span>{!canAdvance(project) ? '请先上传模板视频并填写替换需求' : `已准备 ${project.assets.filter(asset => asset.role.trim() && asset.name).length} 项替换素材`}</span><button className="remake-primary" disabled={!canAdvance(project)} onClick={() => canAdvance(project) ? onNext() : notify('请先补充模板视频与替换需求')}>开始拆解视频<ArrowRight/></button></div></section>
}

function BoardGallery({ originals = false, onOpen }) {
  const list = originals ? originalBoards : replacedBoards
  return <div className="remake-board-grid">{list.map((src, index) => <button className="remake-board" key={src} onClick={() => onOpen(src, originals ? `原视频分镜 ${index + 1}` : `替换后分镜 ${index + 1}`)}><img src={src} alt={originals ? `原视频第 ${index + 1} 张逐秒分镜` : `替换后第 ${index + 1} 张逐秒分镜`}/><span>{index * 15 + 1}–{index === 2 ? 42 : (index + 1) * 15} 秒</span><i><Maximize2/></i></button>)}</div>
}

function DocumentEditor({ title, meta, value, onChange, onSave, onRegenerate, regenerating }) {
  return <article className="remake-document"><header><div><span><FileText/></span><div><h2>{title}</h2><p>{meta}</p></div></div><div><button onClick={onRegenerate} disabled={regenerating}>{regenerating ? <LoaderCircle className="spin"/> : <RefreshCw/>}{regenerating ? '生成中' : '重新生成'}</button><button className="primary" onClick={onSave}><Save/>保存</button></div></header><textarea aria-label={title} value={value} onChange={event => onChange(event.target.value)}/></article>
}

function StepTwo({ project, setProject, onNext, onOpen, save, notify }) {
  const value = project.documents.breakdown ?? breakdownText
  return <section className="remake-stage"><div className="remake-stage-heading"><div><span className="remake-kicker">STEP 02</span><h1>视频拆解完成</h1><p>Gemini 3.1 Pro 已理解叙事结构，FFmpeg 已按秒提取 42 个关键画面。</p></div><span className="remake-status success"><CheckCircle2/>拆解完成 · 41 秒</span></div><div className="remake-analysis-summary"><div><span><WandSparkles/></span><b>Gemini 3.1 Pro</b><small>分镜脚本与动作分析</small></div><ChevronRight/><div><span><Film/></span><b>FFmpeg</b><small>逐秒抽帧 · 3 张总览</small></div><ChevronRight/><div><span><Check/></span><b>42 个画面</b><small>已建立时间轴映射</small></div></div><DocumentEditor title="视频拆解与复刻框架" meta="视频拆解prompt.md · 已识别 9 个叙事镜头" value={value} onChange={text => setProject(current => updateDocument(current, 'breakdown', text))} onSave={save} onRegenerate={() => notify('已重新分析模板视频')} /><div className="remake-section-title"><div><h2>原视频逐秒分镜</h2><p>每 15 秒生成一张总览图，点击查看大图。</p></div><span>3 张 · 42 帧</span></div><BoardGallery originals onOpen={onOpen}/><div className="remake-stage-footer"><button className="remake-secondary" onClick={() => setProject(value => setCurrentStep(value, 1))}><ArrowLeft/>返回修改需求</button><button className="remake-primary" onClick={onNext}>开始替换元素<ArrowRight/></button></div></section>
}

function StepThree({ project, setProject, onNext, onOpen, save, regenerate, regenerating }) {
  const value = project.documents.storyboard ?? storyboardText
  return <section className="remake-stage"><div className="remake-stage-heading"><div><span className="remake-kicker">STEP 03</span><h1>校对替换结果</h1><p>人物、产品与方糖已写入新故事面板，并生成逐秒画面对照。</p></div><span className="remake-status"><Sparkles/>GPT-5.6 Sol + Image 2.5</span></div><DocumentEditor title="替换后的故事面板" meta="9 个镜头 · 3 个生成片段 · 支持直接编辑" value={value} onChange={text => setProject(current => updateDocument(current, 'storyboard', text))} onSave={save} onRegenerate={regenerate} regenerating={regenerating}/><div className="remake-section-title"><div><h2>逐秒分镜对照</h2><p>动作、构图和时间保持不变，仅替换指定画面元素。</p></div><span className="remake-status success"><Check/>一致性检查通过</span></div><div className="remake-comparison"><div><header><b>原视频分镜</b><span>Before</span></header><BoardGallery originals onOpen={onOpen}/></div><div><header><b>替换后分镜</b><span>After</span></header><BoardGallery onOpen={onOpen}/></div></div><div className="remake-stage-footer"><button className="remake-secondary" onClick={() => setProject(value => setCurrentStep(value, 2))}><ArrowLeft/>返回视频拆解</button><button className="remake-primary" onClick={onNext}>提取生成片段<ArrowRight/></button></div></section>
}

function StepFour({ project, setProject, onNext, save, regenerate, regenerating }) {
  return <section className="remake-stage"><div className="remake-stage-heading"><div><span className="remake-kicker">STEP 04</span><h1>片段故事面板</h1><p>已按模型能力切分为 3 个片段。每段可独立编辑、保存和重新提取。</p></div><button className="remake-outline" onClick={regenerate} disabled={regenerating}>{regenerating ? <LoaderCircle className="spin"/> : <RefreshCw/>}重新提取全部</button></div><div className="remake-segment-editors">{segmentDocuments.map((segment, index) => { const key = segment.id; const value = project.documents[key] ?? segment.content; return <article key={key}><header><span>0{index + 1}</span><div><h2>{segment.title}</h2><p>{segment.time} · {segment.duration} · {segment.shots}</p></div><button onClick={save}><Save/>保存</button></header><textarea value={value} onChange={event => setProject(current => updateDocument(current, key, event.target.value))} aria-label={`${segment.title}脚本`}/><footer><span><FilePenLine/>故事面板已就绪</span><span>{value.length} 字</span></footer></article> })}</div><div className="remake-stage-footer"><button className="remake-secondary" onClick={() => setProject(value => setCurrentStep(value, 3))}><ArrowLeft/>返回替换结果</button><button className="remake-primary" onClick={onNext}>进入视频生成<ArrowRight/></button></div></section>
}

function StepFive({ project, setProject, notify, openSegment }) {
  const timers = useRef(new Map())
  const inFlight = useRef(new Set())
  useEffect(() => () => {
    timers.current.forEach(clearTimeout)
    timers.current.clear()
    inFlight.current.clear()
    setProject(value => clearRunningStatuses(value))
  }, [setProject])
  const beginGeneration = (ids) => {
    const started = ids.filter(id => !inFlight.current.has(id))
    if (!started.length) { notify('所选片段已在生成中'); return }
    started.forEach(id => inFlight.current.add(id))
    setProject(value => queueGeneration(value, started).project)
    started.forEach((id, index) => {
      const timer = window.setTimeout(() => {
        inFlight.current.delete(id)
        timers.current.delete(id)
        setProject(value => setGenerationStatus(value, id, 'done'))
        notify(`${segmentDocuments.find(item => item.id === id)?.title}生成完成`)
      }, 1400 + index * 220)
      timers.current.set(id, timer)
    })
  }
  const generate = id => beginGeneration([id])
  const batch = () => beginGeneration(segmentDocuments.map(item => item.id))
  return <section className="remake-stage"><div className="remake-stage-heading"><div><span className="remake-kicker">STEP 05</span><h1>生成复刻视频</h1><p>检查每段故事面板后单独生成，或一次性提交全部片段。</p></div><button className="remake-primary" onClick={batch}><Sparkles/>批量生成全部</button></div><div className="remake-generation-overview"><div><b>3</b><span>生成片段</span></div><div><b>41s</b><span>合成后时长</span></div><div><b>9:16</b><span>TikTok 画幅</span></div><div><b>{project.model}</b><span>视频模型</span></div></div><div className="remake-generate-list">{segmentDocuments.map((segment, index) => { const status = project.generation[segment.id] || 'idle'; const thumb = replacedBoards[index]; return <article key={segment.id}><button className="remake-video-thumb" onClick={() => openSegment(segment)}><img src={thumb} alt={`${segment.title}预览`}/><span><Play/></span><i>{segment.duration}</i></button><div className="remake-video-info"><header><div><span>0{index + 1}</span><div><h2>{segment.title}</h2><p>{segment.time} · {segment.shots}</p></div></div><em className={status}>{status === 'done' ? '已完成' : status === 'running' ? '生成中' : '待生成'}</em></header><p>{project.documents[segment.id] ?? segment.content}</p><footer><button onClick={() => openSegment(segment)}><FileText/>查看故事面板</button><button className="primary" disabled={status === 'running'} onClick={() => generate(segment.id)}>{status === 'running' ? <LoaderCircle className="spin"/> : status === 'done' ? <RefreshCw/> : <Video/>}{status === 'done' ? '重新生成' : status === 'running' ? '生成中' : '生成视频'}</button></footer></div></article> })}</div><div className="remake-stage-footer"><button className="remake-secondary" onClick={() => setProject(value => setCurrentStep(value, 4))}><ArrowLeft/>返回片段编辑</button><span>生成结果仅用于前端流程演示</span></div></section>
}

export default function ViralRemake() {
  const [selected, setSelected] = useState(false)
  const [project, setProject] = useState(() => createInitialProject(localStorage.getItem(STORAGE_KEY) || {}))
  const [notice, setNotice] = useState('')
  const [viewer, setViewer] = useState(null)
  const [segmentDetail, setSegmentDetail] = useState(null)
  const [regenerating, setRegenerating] = useState(false)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  const notify = message => { setNotice(message); window.setTimeout(() => setNotice(''), 2200) }
  const save = () => { persistProject(localStorage, project); notify('草稿已保存到当前浏览器') }
  const next = () => setProject(value => advanceStep(value))
  const loadDemo = () => { setProject(value => ({ ...value, videoName: '需要复刻的模板视频.mp4', request: demoRequest, model: 'seedance 2.0', assets: demoAssets, assetCounters: { image: 3, audio: 0, video: 0 }, documents: { ...value.documents, breakdown: breakdownText, storyboard: storyboardText, ...Object.fromEntries(segmentDocuments.map(item => [item.id, item.content])) } })); notify('Demo 素材已加载') }
  const regenerate = () => { if (regenerating) return; clearTimeout(timer.current); setRegenerating(true); timer.current = window.setTimeout(() => { setRegenerating(false); notify('已生成一个新版本，原编辑内容已保留') }, 1300) }
  const reset = () => { if (!window.confirm('确定清空当前草稿并重新开始吗？')) return; localStorage.removeItem(STORAGE_KEY); setProject(createInitialProject()); setSelected(false); notify('项目已重置') }
  return <main className="viral-remake-shell">{!selected ? <ModeSelection onSelect={() => setSelected(true)} notify={notify}/> : <div className="remake-workspace"><WorkflowHeader project={project} onBack={() => setSelected(false)} onStep={step => setProject(value => setCurrentStep(value, step))} onSave={save} onReset={reset}/>{project.step === 1 && <StepOne project={project} setProject={setProject} onDemo={loadDemo} onNext={next} notify={notify}/>} {project.step === 2 && <StepTwo project={project} setProject={setProject} onNext={next} onOpen={(src,title) => setViewer({src,title})} save={save} notify={notify}/>} {project.step === 3 && <StepThree project={project} setProject={setProject} onNext={next} onOpen={(src,title) => setViewer({src,title})} save={save} regenerate={regenerate} regenerating={regenerating}/>} {project.step === 4 && <StepFour project={project} setProject={setProject} onNext={next} save={save} regenerate={regenerate} regenerating={regenerating}/>} {project.step === 5 && <StepFive project={project} setProject={setProject} notify={notify} openSegment={setSegmentDetail}/>}</div>}
    {notice && <div className="remake-toast"><CheckCircle2/>{notice}</div>}
    {viewer && <div className="remake-modal" role="dialog" aria-modal="true" aria-label={viewer.title}><button className="remake-modal-close" onClick={() => setViewer(null)} aria-label="关闭预览"><X/></button><div className="remake-image-viewer"><header><h2>{viewer.title}</h2><span>点击关闭按钮返回工作台</span></header><img src={viewer.src} alt={viewer.title}/></div></div>}
    {segmentDetail && <div className="remake-modal" role="dialog" aria-modal="true" aria-label={`${segmentDetail.title}故事面板`}><button className="remake-modal-close" onClick={() => setSegmentDetail(null)} aria-label="关闭详情"><X/></button><div className="remake-segment-modal"><span className="remake-kicker">STORY PANEL</span><h2>{segmentDetail.title}</h2><p>{segmentDetail.time} · {segmentDetail.duration} · {segmentDetail.shots}</p><div>{project.documents[segmentDetail.id] ?? segmentDetail.content}</div><button className="remake-primary" onClick={() => setSegmentDetail(null)}>确认并返回</button></div></div>}
  </main>
}
