import { useId, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { Handle, Position, useStore, type Node, type NodeProps } from '@xyflow/react'
import type { CanvasNodeData } from '../canvas/canvasAdapters'
import { useCanvasSessionStore } from '../../stores/useCanvasSessionStore'
import { useCanvasInteractionStore } from '../../stores/useCanvasInteractionStore'
import { duplicateCanvasNodes } from '../canvas/useCanvasKeyboard'
import { LocalMediaPicker } from '../media/LocalMediaPicker'
import { PromptComposer } from '../content/PromptComposer'
import { AssetPickerButton } from '../assets/AssetPickerDialog'
import { ImageGenerationPanel } from '../generation/ImageGenerationPanel'
import { VideoGenerationPanel } from '../generation/VideoGenerationPanel'
import { TaskStatusPanel } from '../generation/TaskStatusPanel'
import { cancelGeneration, startGeneration } from '../generation/runGeneration'
import type { ContentType, MediaOperation } from '../../domain/canvas/types'
import { MediaOperationMenu } from '../processing/MediaOperationMenu'
import { ImageProcessingPanel } from '../processing/ImageProcessingPanel'
import { VideoProcessingPanel } from '../processing/VideoProcessingPanel'
import '../processing/processing.css'
import { cancelMediaOperationBranch } from '../tasks/runMediaOperation'
import { retryProcessingBranch } from '../processing/startProcessing'

const typeLabels = { text: '文本', image: '图片', video: '视频', audio: '音频' }
type IconName = ContentType | 'image-placeholder' | 'video-placeholder' | 'upload' | 'library' | 'sparkles' | 'expand' | 'tray' | 'settings' | 'microphone' | 'send'

function NodeIcon({ name }: { name: IconName }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const paths: Record<IconName, ReactNode> = {
    text: <><path {...common} d="M7 4.5h7l3 3V19.5H7z"/><path {...common} d="M14 4.5v3h3M9.5 11h5M9.5 14h5"/></>,
    image: <><rect {...common} x="4" y="6" width="16" height="12" rx="1.5"/><path {...common} d="m5.5 16 4.5-4 3 2.5 2-2 3.5 3.5"/><circle {...common} cx="15.5" cy="9.5" r="1"/></>,
    video: <><rect {...common} x="3.5" y="6" width="12" height="12" rx="2"/><path {...common} d="m15.5 10 5-3v10l-5-3z"/></>,
    audio: <><path {...common} d="M5 10v4h3l4 3V7L8 10zM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/></>,
    'image-placeholder': <><rect {...common} x="3" y="5" width="18" height="14" rx="2"/><path {...common} d="m5 17 5-5 3 3 2.5-2.5L20 17"/><circle {...common} cx="16" cy="9" r="1.2"/></>,
    'video-placeholder': <><rect {...common} x="3" y="5" width="13" height="14" rx="2"/><path {...common} d="m16 10 5-3v10l-5-3z"/></>,
    upload: <><path {...common} d="M12 16V4m0 0L8 8m4-4 4 4"/><path {...common} d="M5 14v5h14v-5"/></>,
    library: <><path {...common} d="M4 8h6l2-2h8v12H4z"/><path {...common} d="M9 13h6m-3-3v6"/></>,
    sparkles: <><path {...common} d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2zM18 14l.7 2.3L21 17l-2.3.7L18 20l-.7-2.3L15 17l2.3-.7z"/></>,
    expand: <><path {...common} d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5"/></>,
    tray: <><path {...common} d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/></>,
    settings: <><path {...common} d="M5 7h14M5 12h14M5 17h14"/><circle cx="9" cy="7" r="1.5" fill="currentColor"/><circle cx="15" cy="12" r="1.5" fill="currentColor"/><circle cx="11" cy="17" r="1.5" fill="currentColor"/></>,
    microphone: <><rect {...common} x="9" y="3" width="6" height="12" rx="3"/><path {...common} d="M6 11a6 6 0 0 0 12 0M12 17v4"/></>,
    send: <><path {...common} d="M12 19V5m0 0L7 10m5-5 5 5"/></>,
  }
  return <svg className="canvas-node__icon" data-icon={name} viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

function DisabledControl({ name, explanation }: { name: string; explanation: string }) {
  const descriptionId = useId()
  return (
    <>
      <button type="button" className="canvas-node__control nodrag nopan" disabled aria-describedby={descriptionId}>{name}</button>
      <span id={descriptionId} hidden>{explanation}</span>
    </>
  )
}

function NodeBody({ data }: { data: CanvasNodeData }) {
  const exists = useCanvasSessionStore((state) => Boolean(state.snapshot.nodesById[data.nodeId]))
  const input = useCanvasSessionStore((state) => state.snapshot.nodesById[data.nodeId]?.input)
  const hasGeneratedMedia = useCanvasSessionStore((state) => Boolean(state.snapshot.nodesById[data.nodeId]?.currentVersionId))
  const hasMedia = Boolean(input?.media || hasGeneratedMedia)
  switch (data.contentType) {
    case 'text':
      return <><textarea className="canvas-node__text-editor nodrag nopan" aria-label="文本内容"
        placeholder="请输入您的指令、提示词或脚本等..." value={exists ? input?.body ?? '' : ''} readOnly />
        <span className="canvas-node__detail">{input?.body.length ?? 0} 字</span></>
    case 'image':
      return (
        <>
          {!hasMedia && <div className="canvas-node__preview" role="img" aria-label="图片预览"><NodeIcon name="image-placeholder"/><span className="canvas-node__sr-detail">暂无图片</span></div>}
          {exists && <LocalMediaPicker nodeId={data.nodeId} type="image" />}
          <div className="canvas-node__controls">
            {!exists && <DisabledControl name="本地选择" explanation={data.disabledCopy.content} />}
            {exists ? <AssetPickerButton purpose="replace-media" nodeId={data.nodeId} label="资产库" />
              : <DisabledControl name="资产库" explanation={data.disabledCopy.assets} />}
          </div>
        </>
      )
    case 'video':
      return (
        <>
          {!hasMedia && <div className="canvas-node__preview canvas-node__video-preview" role="img" aria-label="视频预览（16:9）"><NodeIcon name="video-placeholder"/><span className="canvas-node__sr-detail">00:00</span></div>}
          {exists && <LocalMediaPicker nodeId={data.nodeId} type="video" />}
          {!exists && <DisabledControl name="播放视频" explanation={data.disabledCopy.playback} />}
          {exists && <div className="canvas-node__controls"><AssetPickerButton purpose="replace-media" nodeId={data.nodeId} label="资产库" /></div>}
        </>
      )
    case 'audio':
      return (
        <>
          <svg className="canvas-node__waveform" viewBox="0 0 240 48" role="img" aria-label="音频波形预览">
            <path d="M8 20v8 M20 15v18 M32 19v10 M44 7v34 M56 15v18 M68 3v42 M80 11v26 M92 18v12 M104 7v34 M116 15v18 M128 11v26 M140 3v42 M152 15v18 M164 19v10 M176 7v34 M188 11v26 M200 17v14 M212 15v18 M224 20v8" />
          </svg>
          {exists ? <LocalMediaPicker nodeId={data.nodeId} type="audio" />
            : <div className="canvas-node__controls"><DisabledControl name="播放音频" explanation={data.disabledCopy.playback} /><span className="canvas-node__detail">00:00</span></div>}
          {exists && <div className="canvas-node__controls"><AssetPickerButton purpose="replace-media" nodeId={data.nodeId} label="资产库" /></div>}
        </>
      )
  }
}

function NodeToolbar({ type, wordCount }: { type: ContentType; wordCount: number }) {
  if (type === 'audio') return null
  if (type === 'text') return <div className="canvas-node__toolbar nodrag nopan" role="toolbar" aria-label="文本快捷操作">
    <button type="button" aria-label={`${wordCount} 字`}>{wordCount} 字</button>
    <button type="button" aria-label="帮我写"><NodeIcon name="sparkles"/>帮我写</button>
    <button type="button" aria-label="展开"><NodeIcon name="expand"/>展开</button>
  </div>
  return <div className="canvas-node__toolbar nodrag nopan" role="toolbar" aria-label={`${typeLabels[type]}快捷操作`}>
    <button type="button" aria-label="上传" onClick={(event) => event.currentTarget.closest('article')?.querySelector<HTMLInputElement>('.canvas-node__file-input')?.click()}><NodeIcon name="upload"/>上传</button>
    <button type="button" aria-label="从资产库选择" onClick={(event) => event.currentTarget.closest('article')?.querySelector<HTMLButtonElement>('.canvas-node__asset-trigger')?.click()}><NodeIcon name="library"/>从资产库选择</button>
  </div>
}

export function CanvasNode({ data, selected, isConnectable }: NodeProps<Node<CanvasNodeData, 'canvasNode'>>) {
  const [operation, setOperation] = useState<MediaOperation | null>(null)
  const [longPressDragging, setLongPressDragging] = useState(false)
  const zoom = useStore((state) => state.transform[2])
  const dragRef = useRef<{ timer: number; pointerId: number; start: { x: number; y: number }; origin: { x: number; y: number }; active: boolean } | null>(null)
  const stateId = useId()
  const label = typeLabels[data.contentType]
  const exists = useCanvasSessionStore((state) => Boolean(state.snapshot.nodesById[data.nodeId]))
  const taskId = useCanvasSessionStore((state) => state.snapshot.nodesById[data.nodeId]?.taskId)
  const wordCount = useCanvasSessionStore((state) => state.snapshot.nodesById[data.nodeId]?.input?.body.length ?? 0)
  const promptCopy = data.contentType === 'text'
    ? '可连线添加素材并 @引用，描述你想生成的文本。例如：提炼这款保温杯的核心卖点，写成适合电商详情页的短文。'
    : data.contentType === 'image'
      ? '可连线添加素材并 @引用，描述你想生成或编辑的图片。例如：生成一张电商主图，突出商品质感、使用场景和促销氛围。'
      : '可连线添加素材并 @引用，描述你想生成的视频。例如：制作 15 秒商品卖点视频，展示开箱、细节特写和使用效果。'
  function finishLongPressDrag(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    window.clearTimeout(drag.timer)
    dragRef.current = null
    if (!drag.active) return
    const interaction = useCanvasInteractionStore.getState()
    const position = interaction.nodePreviewPositions.get(data.nodeId)
    interaction.clearNodePreviewPosition(data.nodeId)
    setLongPressDragging(false)
    if (position) useCanvasSessionStore.getState().executeCommand({ type: 'move-nodes', positions: { [data.nodeId]: position }, now: new Date().toISOString() })
  }
  return (
    <article
      className={`canvas-node nodrag${selected ? ' canvas-node--selected' : ''}${data.locked ? ' canvas-node--locked' : ''}${longPressDragging ? ' canvas-node--long-press-dragging' : ''}`}
      aria-label={`${data.name} · ${label}节点`} aria-describedby={stateId}
      data-layout={data.expanded ? 'expanded' : 'compact'} data-content-type={data.contentType}
      onPointerDown={(event) => {
        if (event.button !== 0 || data.locked || !isConnectable || !(event.target instanceof Element)
          || event.target.closest('button, select, input, .react-flow__handle, .canvas-node__toolbar, .canvas-node__expanded')) return
        const origin = useCanvasSessionStore.getState().snapshot.nodesById[data.nodeId]?.position
        if (!origin) return
        const element = event.currentTarget
        const drag = { timer: 0, pointerId: event.pointerId, start: { x: event.clientX, y: event.clientY }, origin: { ...origin }, active: false }
        drag.timer = window.setTimeout(() => {
          drag.active = true
          setLongPressDragging(true)
          element.setPointerCapture?.(drag.pointerId)
        }, 50)
        dragRef.current = drag
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current
        if (!drag?.active || drag.pointerId !== event.pointerId) return
        event.preventDefault()
        useCanvasInteractionStore.getState().previewNodePosition(data.nodeId, {
          x: drag.origin.x + (event.clientX - drag.start.x) / zoom,
          y: drag.origin.y + (event.clientY - drag.start.y) / zoom,
        })
      }}
      onPointerUp={finishLongPressDrag}
      onPointerCancel={(event) => {
        const drag = dragRef.current
        if (!drag || drag.pointerId !== event.pointerId) return
        window.clearTimeout(drag.timer)
        dragRef.current = null
        useCanvasInteractionStore.getState().clearNodePreviewPosition(data.nodeId)
        setLongPressDragging(false)
      }}
    >
      {selected && <NodeToolbar type={data.contentType} wordCount={wordCount} />}
      <Handle id="target" type="target" position={Position.Left} isConnectable={!data.locked && isConnectable}
        isConnectableStart={!data.locked && isConnectable} isConnectableEnd={!data.locked && isConnectable}
        role={data.locked ? undefined : 'button'} aria-hidden={data.locked || undefined}
        tabIndex={!data.locked && isConnectable ? 0 : -1} aria-label={`${data.name}：接受连接`} aria-disabled={data.locked || !isConnectable}
        onKeyDown={(event) => { if (!data.locked && isConnectable && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.currentTarget.click() } }}><span aria-hidden="true">+</span></Handle>
      <Handle id="source" type="source" position={Position.Right} isConnectable={!data.locked && isConnectable}
        isConnectableStart={!data.locked && isConnectable} isConnectableEnd={!data.locked && isConnectable}
        role={data.locked ? undefined : 'button'} aria-hidden={data.locked || undefined}
        tabIndex={!data.locked && isConnectable ? 0 : -1} aria-label={`${data.name}：发起连接`} aria-disabled={data.locked || !isConnectable}
        onKeyDown={(event) => { if (!data.locked && isConnectable && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.currentTarget.click() } }}><span aria-hidden="true">+</span></Handle>
      <header className="canvas-node__header">
        <span className="canvas-node__type-symbol"><NodeIcon name={data.contentType}/></span>
        <span className="canvas-node__name" title={data.name}>{data.name}</span>
      </header>
      <div className="canvas-node__body" role="region" aria-label="节点媒体主体" data-content-type={data.contentType}><NodeBody data={data} /></div>
      <span id={stateId} hidden>{selected ? '已选中' : '未选中'}；{data.locked ? '已锁定，无法移动、连接或删除' : '未锁定'}</span>
      {data.expanded && (
        <section className="canvas-node__expanded nodrag nopan" aria-label="节点生成面板">
          {!exists && <div className="canvas-node__prompt-copy">{promptCopy}</div>}
          <div className="canvas-node__prompt-tools" aria-label="生成面板工具">
            <button type="button" aria-label="展开生成面板"><NodeIcon name="expand"/></button>
            <button type="button" aria-label="素材"><NodeIcon name="tray"/></button>
            <button type="button" aria-label="参数"><NodeIcon name="settings"/></button>
          </div>
          {exists ? <PromptComposer nodeId={data.nodeId} showBody={data.contentType === 'text'} placeholder={promptCopy} /> : <>
            <p>{data.disabledCopy.content}</p>
            <DisabledControl name={`生成${label}`} explanation={data.disabledCopy.content} />
          </>}
          {exists && data.contentType !== 'text' && <div className="canvas-node__model-summary">
            <NodeIcon name="sparkles"/>{data.contentType === 'image' ? 'LC Image 2.5 Pro' : 'Seedance-2.5'}
          </div>}
          {exists && data.contentType === 'image' && !taskId && <ImageGenerationPanel nodeId={data.nodeId} />}
          {exists && data.contentType === 'video' && !taskId && <VideoGenerationPanel nodeId={data.nodeId} />}
          {exists && !taskId && <MediaOperationMenu type={data.contentType} onSelect={setOperation} />}
          {exists && !taskId && operation?.startsWith('image-') && data.contentType === 'image' && <ImageProcessingPanel nodeId={data.nodeId} initialOperation={operation as Extract<MediaOperation, `image-${string}`>} />}
          {exists && !taskId && operation && data.contentType === 'video' && <VideoProcessingPanel nodeId={data.nodeId} operation={operation} />}
          {exists && taskId && <TaskStatusPanel taskId={taskId}
            onCancel={(current) => current.request?.operation ? cancelMediaOperationBranch(current.id) : cancelGeneration(current.id)}
            onRetry={(current) => {
              const request = current.request
              if (current.sourceNodeId && request?.generationConfig) startGeneration(current.sourceNodeId, request.generationConfig, 'success', request, (current.attempt ?? 1) + 1)
              else if (request?.operation) retryProcessingBranch(current)
            }}
            onModify={(current) => { if (current.sourceNodeId) useCanvasInteractionStore.getState().replaceSelection([current.sourceNodeId]) }} />}
          {exists && <div className="canvas-node__controls canvas-node__reference-controls">
            <AssetPickerButton purpose="add-reference" nodeId={data.nodeId} label="添加参考" />
            {data.contentType === 'video' && <AssetPickerButton purpose="select-voice-target" nodeId={data.nodeId} label="选择目标音色" />}
            {data.contentType === 'video' && <button type="button" className="canvas-node__control" onClick={() => useCanvasInteractionStore.getState().openEditor(data.nodeId, 'clip')}>剪辑视频</button>}
          </div>}
          <div className="canvas-node__prompt-actions" aria-hidden="true"><span>✦ 计算中... / 条</span><NodeIcon name="microphone"/><span className="canvas-node__send"><NodeIcon name="send"/></span></div>
          <div className="canvas-node__controls" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="canvas-node__control nodrag nopan" onClick={() => {
              const locked = !data.locked
              if (useCanvasSessionStore.getState().executeCommand({ type: 'set-node-lock', nodeIds: [data.nodeId], locked, now: new Date().toISOString() })) {
                useCanvasInteractionStore.getState().announce(`${locked ? '已锁定' : '已解锁'}${data.name}`)
              }
            }}>{data.locked ? '解锁节点' : '锁定节点'}</button>
            <button type="button" className="canvas-node__control nodrag nopan" onClick={(event) => {
              const canvas = event.currentTarget.closest<HTMLElement>('.canvas-surface')
              if (duplicateCanvasNodes([data.nodeId])) canvas?.focus({ preventScroll: true })
            }}>创建副本</button>
          </div>
        </section>
      )}
    </article>
  )
}
