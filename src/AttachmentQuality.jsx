import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { LoaderCircle, Pencil } from 'lucide-react'
import { cortisolImageDetails } from './cortisol-demo'

function QualityItem({ image, index, onPreview }) {
  const uploaded = image.startsWith('blob:')
  const detail = cortisolImageDetails[image]
  const [title, setTitle] = useState(detail?.title ?? (uploaded ? '请输入商品图片名称' : `商品细节图 ${String(index + 1).padStart(2, '0')}`))
  const [analysis, setAnalysis] = useState({ status: uploaded ? 'loading' : 'done', score: uploaded ? null : 90, description: detail?.description ?? (uploaded ? '' : '展示商品细节与使用场景，主体清晰，构图完整') })
  useEffect(() => {
    if (!uploaded) return
    setAnalysis({ status: 'loading', score: null, description: '' })
    // Prototype interaction: simulate analysis after the upload completes.
    const timer = setTimeout(() => {
      setTitle(`商品展示图 ${String(index + 1).padStart(2, '0')}`)
      setAnalysis({ status: 'done', score: 90, description: '主体清晰，构图完整，适合作为商品展示素材' })
    }, 1800)
    return () => clearTimeout(timer)
  }, [image, uploaded])
  const [draft, setDraft] = useState(title)
  const [editing, setEditing] = useState(false)
  const save = () => { setTitle(draft.trim() || title); setEditing(false) }
  return <article className="attachment-quality-card">
    <button type="button" className="attachment-quality-preview" onClick={onPreview} aria-label={`预览${title}`}><img src={image} alt={title} referrerPolicy="no-referrer"/></button>
    <div className="attachment-quality-copy">
      <span className="attachment-quality-badge" role="status">质量评分｜{analysis.status === 'loading' ? <><LoaderCircle className="product-loading-icon"/>分析中</> : `${analysis.score}分`}</span>
      <div className="attachment-quality-title">{editing ? <input autoFocus aria-label="评分图片标题" maxLength={80} value={draft} onChange={event => setDraft(event.target.value)} onBlur={save} onKeyDown={event => {
        if (event.key === 'Enter') { event.preventDefault(); save() }
        if (event.key === 'Escape') { event.preventDefault(); setEditing(false) }
      }}/> : <><strong>{title}</strong><button type="button" disabled={analysis.status === 'loading'} aria-label={`修改${title}标题`} onClick={() => { setDraft(title); setEditing(true) }}><Pencil/></button></>}</div>
      <p aria-live="polite">{analysis.status === 'loading' ? '正在分析素材质量，请稍候' : analysis.description}</p>
    </div>
  </article>
}

export default function AttachmentQuality({ images, activeImage, loading, onPreview }) {
  const bubble = useRef(null)
  useLayoutEffect(() => {
    const section = bubble.current
    const attachments = section?.closest('.product-attachments')
    if (!attachments) return
    const updatePointer = () => {
      const selected = attachments.querySelector('.product-attachment-preview[aria-pressed="true"]')
      if (!selected) return
      const thumbnail = selected.getBoundingClientRect()
      const panel = section.getBoundingClientRect()
      const x = Math.max(20, Math.min(panel.width - 20, thumbnail.left + thumbnail.width / 2 - panel.left))
      section.style.setProperty('--attachment-pointer-x', `${x}px`)
    }
    updatePointer()
    const observer = new ResizeObserver(updatePointer)
    observer.observe(attachments)
    attachments.addEventListener('scroll', updatePointer, true)
    window.addEventListener('resize', updatePointer)
    return () => {
      observer.disconnect()
      attachments.removeEventListener('scroll', updatePointer, true)
      window.removeEventListener('resize', updatePointer)
    }
  }, [activeImage, images, loading])
  return <section ref={bubble} className={`attachment-quality${!loading && images.length ? ' attachment-quality-bubble' : ''}`} aria-label="当前图片质量评分">
    {loading ? <p className="attachment-quality-empty" role="status">正在加载附件…</p> : images.length ? <div className="attachment-quality-list">{images.map((image, index) => <div key={image} hidden={image !== activeImage}><QualityItem image={image} index={index} onPreview={() => onPreview({ image, index })}/></div>)}</div> : <p className="attachment-quality-empty">添加图片后，在此查看质量评分。</p>}
  </section>
}
