import React, { useRef, useState, useEffect, useId, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { renderToStaticMarkup } from 'react-dom/server'
import { Box, UserRound, Shirt, Image, Video, Mic2, Clock3, Layers3, Sparkles, Pencil, Check, X, Settings2, Film, Timer } from 'lucide-react'
import { storyResources, storyShots } from './story-demo'
import { mockPreviewImages } from './AssetWorkspace'
import { createDemoAudio } from './demo-audio'
import './story-panel.css'

const icons={主体:UserRound,服饰:Shirt,场景:Image,产品:Box,道具:Box,视频:Video,声音:Mic2}
const demoAudio=createDemoAudio()
function ResourcePill({ resource, label }) {
  const [position,setPosition]=useState(null)
  const trigger=useRef(null),timer=useRef(null),id=useId()
  const previewRef=useRef(null)
  const mediaKind=resource.type==='声音'?'audio':resource.type==='视频'?'video':'image'
  const mediaSrc=mediaKind==='audio'?demoAudio:mediaKind==='video'?`${import.meta.env.BASE_URL}demo-videos/demo-video-01.mp4`:mockPreviewImages[resource.type==='主体'?6:resource.type==='场景'?3:4]
  const Icon=icons[resource.type]||Box
  const hide=()=>{clearTimeout(timer.current);setPosition(null)}
  const scheduleHide=()=>{timer.current=setTimeout(()=>setPosition(null),120)}
  const show=()=>{clearTimeout(timer.current);const rect=trigger.current.getBoundingClientRect();const width=Math.min(290,window.innerWidth-24);const above=window.innerHeight-rect.bottom<400&&rect.top>window.innerHeight-rect.bottom;setPosition({left:Math.max(12,Math.min(rect.left,window.innerWidth-width-12)),top:rect.bottom+8,width,above,bottom:window.innerHeight-rect.top+8,maxHeight:Math.max(100,(above?rect.top:window.innerHeight-rect.bottom)-20)})}
  useEffect(()=>{if(!position)return;const escape=event=>{if(event.key==='Escape')hide()};window.addEventListener('keydown',escape);window.addEventListener('scroll',hide,true);window.addEventListener('resize',hide);return()=>{window.removeEventListener('keydown',escape);window.removeEventListener('scroll',hide,true);window.removeEventListener('resize',hide)}},[position])
  useEffect(()=>()=>clearTimeout(timer.current),[])
  return <><button ref={trigger} className="story-resource-pill" type="button" onMouseEnter={show} onMouseLeave={scheduleHide} onFocus={show} onBlur={event=>{if(!previewRef.current?.contains(event.relatedTarget))scheduleHide()}} onClick={show} aria-controls={position?id:undefined} aria-expanded={Boolean(position)}>{mediaKind==='image'?<img className="story-pill-thumb" src={mediaSrc} alt=""/>:mediaKind==='video'?<video className="story-pill-thumb" src={mediaSrc} preload="metadata" muted aria-hidden="true"/>:<span className="story-pill-audio" aria-hidden="true">{[4,9,13,7,11].map((height,index)=><i key={index} style={{height}}/>)}</span>}{label}</button>{position&&createPortal(<div ref={previewRef} id={id} role="dialog" aria-label={`${resource.name}预览`} tabIndex={-1} onFocus={()=>clearTimeout(timer.current)} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget)&&event.relatedTarget!==trigger.current)hide()}} className="story-resource-preview" style={{left:position.left,width:position.width,maxHeight:position.maxHeight,...(position.above?{bottom:position.bottom}:{top:position.top})}} onMouseEnter={()=>clearTimeout(timer.current)} onMouseLeave={()=>{if(!previewRef.current?.contains(document.activeElement))scheduleHide()}}><div className={`story-preview-media is-${mediaKind}`}>{mediaKind==='image'?<img src={mediaSrc} alt={`${resource.name}示例预览`}/>:mediaKind==='video'?<video src={mediaSrc} controls playsInline preload="metadata"/>:<audio src={mediaSrc} controls preload="metadata"/>}</div><div className="story-preview-caption">{resource.name}</div></div>,document.querySelector('.index-app')||document.body)}</>
}

function StoryText({ text, overrides={} }) {
  const parts=text.split(/(<(?:主体|服饰)\d+>|\((?:场景|道具)\d+\)|<音效内容：[^>]+>|\(音乐内容：[^)]+\))/g)
  return parts.map((part,index)=>{
    const key=part.slice(1,-1),resource=overrides[key]||storyResources[key]
    if(resource)return <span key={index} contentEditable={false} data-story-token={part}><ResourcePill label={key} resource={resource}/></span>
    if(key.startsWith('音效内容：')||key.startsWith('音乐内容：'))return <span key={index} contentEditable={false} data-story-token={part}><ResourcePill label={key.startsWith('音效')?'音效':'音乐'} resource={overrides[key]||{type:'声音',name:key.startsWith('音效')?'镜头音效':'背景音乐',description:key.slice(5)}}/></span>
    return part
  })
}

const referenceUses={主体:'参考五官、骨骼形象和体态',服饰:'参考款式、颜色和材质',场景:'仅参考空间、陈设和光线，不采用图中人物',产品:'参考外观、颜色、包装和材质',道具:'参考外观、结构和材质',视频:'参考动作、运镜和节奏',声音:'参考音色、音效和环境声'}
function SegmentResources({ shots, overrides, onSave }) {
  const references=new Map()
  for(const shot of shots){
    for(const match of shot.text.matchAll(/<(?:主体|服饰)\d+>|\((?:场景|道具)\d+\)|<音效内容：[^>]+>|\(音乐内容：[^)]+\)/g)){
      const key=match[0].slice(1,-1)
      if(storyResources[key])references.set(key,{label:key,resource:storyResources[key]})
      else if(!references.has(key))references.set(key,{label:key.startsWith('音效')?'音效':'音乐',resource:{type:'声音',name:key.slice(5),description:key.slice(5)}})
    }
  }
  for(const [key,item] of references)if(overrides[key])references.set(key,{...item,resource:overrides[key]})
  const counts={image:0,video:0,audio:0}
  return <section className="story-segment-resources" aria-label="当前片段引用资源"><header><strong>引用资源</strong></header><div>{Array.from(references.entries()).map(([key,{label,resource}])=>{const kind=resource.type==='声音'?'audio':resource.type==='视频'?'video':'image';const number=++counts[kind];const save=(field,value)=>onSave({...overrides,[key]:{...resource,[field]:value}});return <div className="story-reference-definition" key={key}><ResourcePill resource={resource} label={`@${kind==='audio'?'音频':kind==='video'?'视频':'图片'}${number} · ${label}`}/><span><b><InlineEdit label="附件名称" value={resource.name} onSave={value=>save('name',value)}/></b><small><InlineEdit label="参考用途" value={resource.use??referenceUses[resource.type]} onSave={value=>save('use',value)}/></small></span></div>})}</div></section>
}


function InlineEdit({ value, onSave, label, children, className='', inline=false }) {
  const [draft,setDraft]=useState(null)
  const input=useRef(null)
  useLayoutEffect(()=>{
    if(draft===null)return
    const element=input.current
    const resize=()=>{element.style.height='0px';element.style.height=element.scrollHeight+'px'}
    resize()
    const observer=new ResizeObserver(resize)
    observer.observe(element)
    return()=>observer.disconnect()
  },[draft])
  const Tag=inline?'span':'div'
  if(draft!==null)return <textarea ref={input} autoFocus rows={1} aria-label={label} className={`story-click-input ${className}`} value={draft} onChange={event=>setDraft(event.target.value)} onBlur={()=>{onSave(draft);setDraft(null)}} onKeyDown={event=>{if(event.nativeEvent.isComposing)return;if(event.key==='Escape'){event.preventDefault();setDraft(null)}else if(event.key==='Enter'&&(inline||event.ctrlKey||event.metaKey)){event.preventDefault();event.currentTarget.blur()}}}/>
  return <Tag className={`story-click-edit ${className}`} tabIndex={0} aria-label={`编辑${label}`} title="单击编辑，点击其他位置保存" onClick={event=>{if(event.target.closest('button'))return;setDraft(value)}} onKeyDown={event=>{if(event.target!==event.currentTarget)return;if(event.key==='Enter'||event.key===' '){event.preventDefault();setDraft(value)}}}>{children??(value||'点击编辑')}</Tag>
}
function ShotTextEditor({ text, overrides, onSave }) {
  const editor=useRef(null)
  const [mention,setMention]=useState(null)
  const [active,setActive]=useState(0)
  const mentionRange=useRef(null)
  const candidates=Object.entries({...storyResources,...overrides}).filter(([key,resource])=>!mention?.query||`${key} ${resource.name}`.toLowerCase().includes(mention.query.toLowerCase()))
  const detect=()=>{
    const selection=window.getSelection()
    if(!selection?.rangeCount||!selection.isCollapsed)return setMention(null)
    const range=selection.getRangeAt(0),node=range.startContainer
    if(node.nodeType!==3||!editor.current.contains(node)||node.parentElement.closest('[data-story-token]'))return setMention(null)
    const match=node.textContent.slice(0,range.startOffset).match(/@([^@\\s]*)$/)
    if(!match)return setMention(null)
    const target=range.cloneRange();target.setStart(node,range.startOffset-match[0].length)
    mentionRange.current=target
    const rect=range.getBoundingClientRect(),fallback=editor.current.getBoundingClientRect()
    setMention({query:match[1],left:Math.max(12,Math.min(rect.left||fallback.left,window.innerWidth-302)),top:Math.max(12,Math.min(rect.bottom||fallback.top+24,window.innerHeight-290))})
    setActive(0)
  }
  const choose=entry=>{
    if(!entry||!mentionRange.current)return
    const [key,resource]=entry
    const token=key.startsWith('音效内容：')?`<${key}>`:key.startsWith('音乐内容：')?`(${key})`:/^(主体|服饰)/.test(key)?`<${key}>`:`(${key})`
    const range=mentionRange.current
    range.deleteContents()
    const chip=document.createElement('span')
    chip.contentEditable='false';chip.dataset.storyToken=token
    chip.innerHTML=renderToStaticMarkup(<ResourcePill resource={resource} label={key.startsWith('音效内容')?'音效':key.startsWith('音乐内容')?'音乐':key}/>)
    range.insertNode(chip)
    const space=document.createTextNode(' ')
    chip.after(space)
    range.setStartAfter(space);range.collapse(true)
    const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range)
    setMention(null);editor.current.focus()
  }
  const [editing,setEditing]=useState(false)
  const [revision,setRevision]=useState(0)
  const finish=()=>{
    setMention(null)
    const clone=editor.current.cloneNode(true)
    clone.querySelectorAll('[data-story-token]').forEach(node=>node.replaceWith(document.createTextNode(node.dataset.storyToken)))
    const read=node=>node.nodeType===3?node.textContent:node.nodeName==='BR'?'\n':Array.from(node.childNodes).map(child=>read(child)+(child.nodeName==='DIV'||child.nodeName==='P'?'\n':'')).join('')
    onSave(read(clone))
    setEditing(false)
    setRevision(value=>value+1)
  }
  return <><div key={revision} ref={editor} onInput={detect} onCompositionEnd={detect} className={`story-shot-text story-click-edit ${editing?'story-rich-editing':''}`} contentEditable suppressContentEditableWarning role="textbox" aria-label="镜头内容" aria-multiline="true" onFocus={()=>setEditing(true)} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))finish()}} onKeyDown={event=>{if(event.nativeEvent.isComposing)return;if(mention){if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();setActive(index=>(index+(event.key==='ArrowDown'?1:-1)+Math.max(1,candidates.length))%Math.max(1,candidates.length));return}if(event.key==='Enter'){event.preventDefault();choose(candidates[active]);return}if(event.key==='Escape'){event.preventDefault();setMention(null);return}}if(event.key==='Escape'){event.preventDefault();setEditing(false);setRevision(value=>value+1)}else if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();event.currentTarget.blur()}}} onPaste={event=>{event.preventDefault();document.execCommand('insertText',false,event.clipboardData.getData('text/plain'))}}><StoryText text={text} overrides={overrides}/></div>{mention&&createPortal(<div className="story-mention-menu" role="listbox" aria-label="选择引用资源" style={{left:mention.left,top:mention.top}} onMouseDown={event=>event.preventDefault()}><strong>引用资源</strong>{candidates.length?candidates.map(([key,resource],index)=><button type="button" role="option" aria-selected={index===active} className={index===active?'active':''} key={key} onMouseEnter={()=>setActive(index)} onClick={()=>choose([key,resource])}>{resource.type==='声音'?<Mic2 className="story-mention-thumb" aria-hidden="true"/>:resource.type==='视频'?<video className="story-mention-thumb" src={`${import.meta.env.BASE_URL}demo-videos/demo-video-01.mp4`} preload="metadata" muted aria-hidden="true"/>:<img className="story-mention-thumb" src={mockPreviewImages[resource.type==='主体'?6:resource.type==='场景'?3:4]} alt=""/>}<span>{key.startsWith('音效内容')?'音效':key.startsWith('音乐内容')?'音乐':key}</span><small>{resource.name}</small></button>):<small>没有匹配的资源</small>}</div>,document.querySelector('.index-app')||document.body)}</>
}
function ShotCard({ shot, number, overrides, onSave, onRegenerate }) {
  return <article className="story-shot"><header><span className="story-shot-number">{String(number).padStart(2,'0')}</span><div><small>镜头 {number} · <InlineEdit inline label="镜头主题" value={shot.theme} onSave={theme=>onSave({...shot,theme})}/></small><h3><InlineEdit label="镜头标题" value={shot.title} onSave={title=>onSave({...shot,title})}/></h3></div><button type="button" className="story-edit-button" onClick={()=>onRegenerate?.(number)}><Sparkles/>AI重新生成</button></header><ShotTextEditor text={shot.text} overrides={overrides} onSave={text=>onSave({...shot,text})}/></article>
}
function ConstraintsEditor({ text, onSave }) {
  return <section className="story-generation-constraints"><header className="story-constraints-heading"><h3>生成约束</h3></header><InlineEdit label="生成约束" value={text} onSave={onSave}>{text.split('\n').map((paragraph,index)=><p key={index}>{paragraph}</p>)}</InlineEdit></section>
}

export default function StoryPanel({ settings, onNotice }) {
  const [segment,setSegment]=useState(0)
  const [shots,setShots]=useState(storyShots)
  const [resources,setResources]=useState({})
  const [constraints,setConstraints]=useState({})
  const subtitles={'pop-in':'弹出式字幕','white-card':'白底黑字字幕','comment-reply':'引用评论字幕','ktv-lyrics':'KTV 歌词字幕','outlined-white':'黑描边白字字幕'}
  const defaultConstraints=[`当前片段时长 15 秒，按镜头 ${segment*2+1}、${segment*2+2} 的顺序生成。全程保持人物和商品一致；商品外观、颜色、包装、Logo 和文字不变；动作自然、镜头连贯、画面清晰。不要新增无关人物或商品，不要变形、闪烁、水印和错误文字。`,settings?.subtitleStyle?`字幕：使用${subtitles[settings.subtitleStyle]||settings.subtitleStyle}，字体为${settings.subtitleFont||'自动匹配'}；字幕内容与当前镜头台词一致，不添加额外文案。`:'字幕：无字幕，不添加屏幕文字；保留产品包装和镜头指定界面的原有文字。',(segment===2?'声音：镜头 5 背景音乐短暂抽离，仅保留指定空气停顿声和呼吸声；镜头 6 恢复温暖钢琴、贝斯及洛菲电子节拍。':'声音：使用当前镜头指定的背景音乐和音效，保持片段内声音衔接，不添加无关配音或音效。')+'旁白时颌骨保持静止；面对镜头说话时口型与意大利语台词同步。'].join('\n')
  return <div className="story-panel"><div className="segment-settings"><div><Settings2/><span><small>生成模型</small><strong>{settings?.generationModel||'Seedance 2.0-标准版'}</strong></span></div><div><Clock3/><span><small>单段硬上限</small><strong>{settings?.generationModel==='Seedance 2.5'?30:15} 秒</strong></span></div><div><Film/><span><small>智能分段</small><strong>{Math.ceil(shots.length/2)} 个片段</strong></span></div><div><Timer/><span><small>总时长</small><strong>{Math.ceil(shots.length/2)*15} 秒</strong></span></div></div>
    <nav className="story-segment-tabs" aria-label="故事片段">{['一','二','三','四','五'].map((name,index)=><button type="button" aria-pressed={segment===index} className={segment===index?'active':''} onClick={()=>setSegment(index)} key={name}><strong>片段{name}</strong><span>15 秒 · 镜头 {index*2+1}–{index*2+2}</span></button>)}</nav>
    <SegmentResources key={`resources-${segment}`} shots={shots.slice(segment*2,segment*2+2)} overrides={resources[segment]||{}} onSave={value=>setResources(current=>({...current,[segment]:value}))}/>
    <section className="story-segment-content" aria-label={`片段${segment+1}`}>{shots.slice(segment*2,segment*2+2).map((shot,index)=><ShotCard key={segment*2+index} shot={shot} onRegenerate={number=>onNotice?.(`镜头 ${number}：Demo 暂未接入 AI 重新生成服务，已保留当前内容`)} number={segment*2+index+1} overrides={resources[segment]||{}} onSave={value=>setShots(current=>current.map((item,i)=>i===segment*2+index?value:item))}/>)}</section>
    <ConstraintsEditor key={`constraints-${segment}`} text={constraints[segment]??defaultConstraints} onSave={value=>setConstraints(current=>({...current,[segment]:value}))}/>
  </div>
}
