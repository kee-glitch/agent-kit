import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, AudioLines, Check, CheckCircle2, FilePenLine, Image as ImageIcon, LoaderCircle, Maximize2, Play, Plus, RefreshCw, RotateCcw, Save, Trash2, Upload, Video, WandSparkles } from "lucide-react";
import { AssetMarkdown, MentionEditor } from "./AssetMentions";
import { rewriteDemo, rewriteReferences, rewriteSegments, rewriteSteps } from "./original-rewrite-data";
import { REWRITE_MODELS, REWRITE_STORAGE_KEY, addRewriteReferences, advanceRewriteStep, clearRewriteVideo, createRewriteProject, loadRewriteDemo, persistRewriteProject, queueRewriteJobs, removeRewriteAsset, removeRewriteReference, replaceRewriteReference, replaceRewriteVideo, setRewriteJobStatus, setRewriteStep, toggleAllRewriteSelections, toggleRewriteSelection, updateRewriteDocument, upsertRewriteReference } from "./original-rewrite-state";
import { ASPECT_RATIOS, GENERAL_ASSET_ACCEPT, beginLatestRequest, getMediaType, getTrappedFocusTarget, isBackdropSelfClick, isLatestRequest } from "./viral-remake-state";
import "./original-rewrite.css";

const readFile = (file) => new Promise((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(file); });
const statusText = { idle: "待生成", running: "生成中", done: "已完成" };
const REQUEST_LIMIT = 1000;

function RewriteModal({ modal, onClose }) {
  const closeRef = useRef(null);
  const cardRef = useRef(null);
  useEffect(() => {
    if (!modal) return undefined;
    const previous = document.activeElement;
    const keydown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const focusable = [...cardRef.current.querySelectorAll('button:not([disabled]), textarea, input, select, video[controls]')];
        const target = getTrappedFocusTarget(focusable, document.activeElement, event.shiftKey);
        if (target) { event.preventDefault(); target.focus(); }
      }
    };
    document.addEventListener("keydown", keydown);
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => closeRef.current?.focus());
    return () => { document.removeEventListener("keydown", keydown); document.body.style.overflow = ""; previous?.focus?.(); };
  }, [modal, onClose]);
  if (!modal) return null;
  return <div className="remake-modal" role="dialog" aria-modal="true" aria-label={modal.title} onMouseDown={(event) => isBackdropSelfClick(event.target, event.currentTarget) && onClose()}><div ref={cardRef} className={modal.segment ? "remake-markdown-modal" : "remake-segment-modal"}><header className={modal.segment ? "remake-segment-modal-header" : undefined}>{modal.segment ? <><span>{String(modal.segment.number).padStart(2, "0")}</span><h2>片段 {String(modal.segment.number).padStart(2, "0")}</h2><p>{modal.segment.time} · {modal.segment.duration} · {modal.segment.shots}</p></> : <><h2>{modal.title}</h2>{modal.subtitle && <p>{modal.subtitle}</p>}</>}</header>{modal.segment ? modal.content : <div className="remake-modal-body">{modal.content}</div>}<footer className="remake-modal-footer"><button ref={closeRef} className="remake-modal-close" onClick={onClose}>关闭</button></footer></div></div>;
}

const StageHeading = ({ step, title, description, action }) => <header className="rewrite-stage-heading"><div><span className="remake-kicker">STEP {String(step).padStart(2, "0")}</span><h1>{title}</h1><p>{description}</p></div>{action}</header>;
const Footer = ({ back, next, nextLabel = "继续", disabled = false }) => <footer className="rewrite-stage-footer">{back ? <button className="secondary" onClick={back}>返回上一步</button> : <span />}<button className="primary" disabled={disabled} onClick={next}>{nextLabel}<ArrowRight /></button></footer>;
const RewriteSteps = ({ project, onStep }) => <nav className="rewrite-steps" aria-label="原片仿写项目进度">{rewriteSteps.map((label, index) => { const number = index + 1; const complete = number < project.step; return <button key={label} className={number === project.step ? "active" : complete ? "complete" : ""} disabled={number > project.maxStep} onClick={() => onStep(number)}><span>{complete ? <Check /> : number}</span><b>{label}</b>{index < rewriteSteps.length - 1 && <i aria-hidden="true" />}</button>; })}</nav>;

function DocumentCard({ title, value, onSave, editLabel, assets = [], emptyAction }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);
  return <article className="rewrite-document"><header><div><FilePenLine /><div><strong>{title}</strong><small>Markdown 故事面板</small></div></div>{value && <button onClick={() => setEditing((current) => !current)}>{editing ? "取消编辑" : "编辑"}</button>}</header>{!value ? <div className="rewrite-document-empty"><FilePenLine /><strong>尚未生成故事面板</strong><small>配置仿写需求后生成完整故事面板</small>{emptyAction && <button className="primary" onClick={emptyAction}><WandSparkles />生成仿写结果</button>}</div> : editing ? <><textarea aria-label={editLabel} value={draft} onChange={(event) => setDraft(event.target.value)} /><div className="rewrite-document-actions"><button className="primary" onClick={() => { onSave(draft); setEditing(false); }}>保存修改</button></div></> : <div className="rewrite-markdown"><AssetMarkdown value={value} assets={assets} /></div>}</article>;
}

function ReadyVideoCard({ project, onReplace, onRemove }) {
  return <div className="rewrite-video-ready"><span><Play /></span><div><strong>{project.videoName}</strong><small>{project.videoPath ? "原视频已就绪" : "需要重新选择原视频"}</small></div><div><label><input aria-label="替换原视频" type="file" accept="video/mp4,video/quicktime,.mp4,.mov" onChange={(event) => event.target.files?.[0] && onReplace(event.target.files[0])} /><Upload />替换视频</label><button className="rewrite-delete" onClick={onRemove}><Trash2 />删除</button></div></div>;
}

function RewriteAdditionalAssetRow({ asset, onReplace, onRemove }) {
  const MediaIcon = asset.type === "audio" ? AudioLines : asset.type === "video" ? Video : ImageIcon;
  return <article className="remake-asset-row"><div className={`remake-asset-preview ${asset.type}`}>{asset.type === "image" && (asset.preview || asset.path) ? <img src={asset.preview || asset.path} alt="" /> : asset.type === "video" && (asset.preview || asset.path) ? <video src={asset.preview || asset.path} muted /> : <MediaIcon />}</div><div className="remake-asset-copy"><b>{asset.role}</b><small>{asset.name}</small></div><div className="remake-row-actions"><label className="remake-file-action"><input type="file" accept={GENERAL_ASSET_ACCEPT} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) onReplace(file); }} /><Upload />替换素材</label><button type="button" className="remake-delete-action" aria-label={`删除${asset.role}`} onClick={onRemove}><Trash2 />删除</button></div></article>;
}

function RewriteReferenceAssets({ project, onChooseReference, onClearReference, onAddAssets, onReplaceAsset, onRemoveAsset }) {
  return <div className="rewrite-reference-grid"><h3 className="rewrite-reference-heading">替换资源</h3>{rewriteReferences.map((resource) => { const asset = project.references.find((item) => item.sourceId === resource.id); const source = asset?.preview || asset?.path; return <article key={resource.id} data-source-id={resource.id}><div className="rewrite-reference-preview">{source ? <img src={source} alt={resource.title} /> : <><ImageIcon /><small>重新选择图片</small></>}</div><div><strong>{resource.role} · {resource.title}</strong><small>{asset ? asset.name : "素材已删除 / 尚未上传"}</small></div><label><input type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && onChooseReference(resource.id, event.target.files[0])} /><Upload />{asset ? "替换" : "上传"}</label>{asset && <button aria-label={`清空${resource.title}`} onClick={() => onClearReference(resource.id)}><Trash2 /></button>}</article>; })}{project.references.filter((asset) => !asset.sourceId).map((asset) => <div className="remake-other-asset" key={asset.id}><RewriteAdditionalAssetRow asset={asset} onReplace={(file) => onReplaceAsset(asset.id, file)} onRemove={() => onRemoveAsset(asset.id)} /></div>)}<label className="remake-add-asset remake-add-other-asset"><input type="file" accept={GENERAL_ASSET_ACCEPT} multiple onChange={onAddAssets} /><Plus />新增其他素材</label></div>;
}

function RewriteSegmentCard({ segment, assets, onSelect, onOpen }) {
  const label = `片段 ${String(segment.number).padStart(2, "0")}`;
  return <article className={`remake-segment-card${segment.selected ? " selected" : ""}`}><header onClick={(event) => { if (!event.target.closest("button")) onSelect(); }}><button type="button" className="remake-segment-selection-target" aria-pressed={segment.selected} aria-label={`${segment.selected ? "取消选择" : "选择"}${label}`} onClick={onSelect}><span>{String(segment.number).padStart(2, "0")}</span><span className="remake-segment-heading"><h2>{label}</h2><p>{segment.time} · {segment.duration} · {segment.shots}</p></span></button></header><div className="remake-segment-preview" onClick={onOpen} role="button" tabIndex={0} aria-label={`查看${label}完整内容`} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen(); } }}><AssetMarkdown value={segment.document} assets={assets} /></div><footer><div className="remake-segment-footer-meta"><span><FilePenLine />故事面板已就绪</span><span>{segment.document.length} 字</span></div><button type="button" className="remake-segment-more" onClick={onOpen}>More <Maximize2 /></button></footer></article>;
}


export default function OriginalRewrite({ onBack, notify }) {
  const [project, setProject] = useState(() => createRewriteProject(localStorage.getItem(REWRITE_STORAGE_KEY)));
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState("");
  const timers = useRef(new Set());
  const operationEpoch = useRef(0);
  const latestReferenceRequest = useRef(new Map());
  const projectRef = useRef(project);
  projectRef.current = project;
  const invalidateOperations = () => { operationEpoch.current += 1; timers.current.forEach(window.clearTimeout); timers.current.clear(); latestReferenceRequest.current.clear(); setBusy(""); };
  useEffect(() => () => { operationEpoch.current += 1; timers.current.forEach(window.clearTimeout); timers.current.clear(); }, []);
  const later = (callback, delay = 650) => { const epoch = operationEpoch.current; const timer = window.setTimeout(() => { timers.current.delete(timer); if (epoch === operationEpoch.current) callback(); }, delay); timers.current.add(timer); };
  const goBack = () => setProject((value) => setRewriteStep(value, value.step - 1));
  const next = () => setProject((value) => advanceRewriteStep(value));
  const loadDemo = () => { invalidateOperations(); setProject((value) => ({ ...loadRewriteDemo(value), step: 1, maxStep: 1 })); notify("完整原片仿写 Demo 已载入"); };
  const runStage = (name, updater, message) => { if (busy) return; setBusy(name); later(() => { setProject((value) => updater(value)); setBusy(""); notify(message); }); };
  const scheduleJobs = (kind, ids) => { const result = queueRewriteJobs(projectRef.current, kind, ids); setProject(result.project); result.started.forEach((id) => later(() => setProject((value) => setRewriteJobStatus(value, kind, id, "done")), 720)); };
  const chooseReference = async (sourceId, file) => { const request = beginLatestRequest(latestReferenceRequest.current, sourceId); const preview = await readFile(file); if (!isLatestRequest(latestReferenceRequest.current, sourceId, request)) return; const definition = rewriteReferences.find((item) => item.id === sourceId); setProject((value) => upsertRewriteReference(value, { id: sourceId, sourceId, role: definition.role, name: file.name, preview })); };
  const clearReference = (sourceId) => { beginLatestRequest(latestReferenceRequest.current, sourceId); setProject((value) => removeRewriteReference(value, sourceId)); };
  const makeAssetId = () => globalThis.crypto?.randomUUID?.() || `rewrite-asset-${Date.now()}`;
  const addOtherAssets = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    const additions = await Promise.all(files.map(async (file) => ({ id: makeAssetId(), type: getMediaType(file), name: file.name, preview: await readFile(file) })));
    setProject((value) => addRewriteReferences(value, additions));
  };
  const replaceOtherAsset = async (id, file) => {
    const request = beginLatestRequest(latestReferenceRequest.current, id);
    const preview = await readFile(file);
    if (!isLatestRequest(latestReferenceRequest.current, id, request)) return;
    setProject((value) => replaceRewriteReference(value, id, { type: getMediaType(file), name: file.name, preview, path: undefined }));
  };
  const removeOtherAsset = (id) => { beginLatestRequest(latestReferenceRequest.current, id); setProject((value) => removeRewriteAsset(value, id)); };
  const selectedIds = project.segments.filter((item) => item.selected).map((item) => item.id);
  const allVideosDone = project.segments.length === 4 && project.segments.every((item) => item.videoStatus === "done");
  const referenceAssets = project.references;
  const generateRewrite = () => runStage("rewrite", (value) => ({ ...value, documents: { ...value.documents, rewrite: value.documents.rewrite || rewriteDemo.rewriteDocument } }), project.documents.rewrite ? "故事面板已重新生成" : "仿写结果已生成");
  const activeSegment = modal?.type === "segment" ? project.segments.find((item) => item.id === modal.id) : null;
  const resolvedModal = activeSegment ? { title: `片段 ${String(activeSegment.number).padStart(2, "0")}故事面板`, segment: activeSegment, content: <AssetMarkdown value={activeSegment.document} assets={referenceAssets} /> } : modal;
  const replaceVideo = (file) => { invalidateOperations(); setProject((value) => replaceRewriteVideo(value, { name: file.name, preview: URL.createObjectURL(file) })); };
  const removeVideo = () => { invalidateOperations(); setProject((value) => clearRewriteVideo(value)); };
  const resetProject = () => { invalidateOperations(); setModal(null); setProject(createRewriteProject()); };

  let stage;
  if (project.step === 1) stage = <section className="rewrite-stage"><StageHeading step={1} title="上传原视频" description="上传要仿写的视频，并设置生成模型与最终画幅。" action={<button className="secondary" onClick={loadDemo}><WandSparkles />加载 Demo</button>} />{project.videoName ? <ReadyVideoCard project={project} onReplace={replaceVideo} onRemove={removeVideo} /> : <label className="rewrite-upload"><input aria-label="上传原视频" type="file" accept="video/mp4,video/quicktime,.mp4,.mov" onChange={(event) => event.target.files?.[0] && replaceVideo(event.target.files[0])} /><Video /><strong>上传原视频</strong><small>支持 MP4、MOV</small></label>}<div className="rewrite-options"><label>生成模型<select value={project.model} onChange={(event) => setProject((value) => ({ ...value, model: event.target.value }))}>{REWRITE_MODELS.map((model) => <option key={model}>{model}</option>)}</select></label><label>画面比例<select value={project.aspectRatio} onChange={(event) => setProject((value) => ({ ...value, aspectRatio: event.target.value }))}>{ASPECT_RATIOS.map((ratio) => <option key={ratio}>{ratio}</option>)}</select></label></div><Footer disabled={!project.videoName || !project.videoPath || busy === "breakdown"} nextLabel={busy === "breakdown" ? "正在拆解" : "开始原片仿写"} next={() => runStage("breakdown", (value) => advanceRewriteStep({ ...value, documents: { ...value.documents, breakdown: value.documents.breakdown || rewriteDemo.breakdown } }), "视频拆解完成")} /></section>;
  else if (project.step === 2) stage = <section className="rewrite-stage rewrite-compose-stage"><StageHeading step={2} title="原片仿写" description="查看原片拆解和逐秒分镜，配置素材与仿写需求。" action={<div className="rewrite-heading-actions"><button className="secondary" disabled={busy === "breakdown"} onClick={() => runStage("breakdown", (value) => ({ ...value, documents: { ...value.documents, breakdown: rewriteDemo.breakdown } }), "已重新完成拆解")}><RefreshCw className={busy === "breakdown" ? "spin" : ""} />重新拆解</button><button className="primary" disabled={busy === "rewrite"} onClick={generateRewrite}><WandSparkles />{project.documents.rewrite ? "重新生成仿写结果" : "生成仿写结果"}</button></div>} /><div className="rewrite-compose-grid"><div className="rewrite-compose-column rewrite-compose-source"><DocumentCard title="视频拆解与复刻框架" value={project.documents.breakdown} editLabel="编辑视频拆解报告" onSave={(document) => setProject((value) => updateRewriteDocument(value, "breakdown", document))} /><section className="rewrite-storyboard-section"><header><div><strong>原视频逐秒分镜</strong><small>点击查看大图</small></div><span>59 秒</span></header><article className="rewrite-storyboard-card"><button aria-label="查看逐秒拆解大图" onClick={() => setModal({ title: "逐秒拆解分镜", content: <img src={rewriteDemo.storyboardPath} alt="逐秒拆解分镜" /> })}><img src={rewriteDemo.storyboardPath} alt="逐秒拆解缩略图" /><Maximize2 /></button></article></section></div><div className="rewrite-compose-column rewrite-compose-settings"><RewriteReferenceAssets project={project} onChooseReference={chooseReference} onClearReference={clearReference} onAddAssets={addOtherAssets} onReplaceAsset={replaceOtherAsset} onRemoveAsset={removeOtherAsset} /><div className="rewrite-request"><span>仿写需求 <small>输入 @ 可引用已上传素材</small></span><MentionEditor value={project.request} assets={referenceAssets} maxLength={REQUEST_LIMIT} ariaLabel="仿写需求" placeholder="输入仿写需求，输入 @ 引用上方素材" onChange={(request) => setProject((value) => ({ ...value, request }))} /></div></div></div><Footer back={goBack} disabled={!project.documents.rewrite} next={next} nextLabel="展示仿写结果" /></section>;
  else if (project.step === 3) stage = <section className="rewrite-stage"><StageHeading step={3} title="展示仿写结果" description="查看并编辑根据原片拆解、参考素材和仿写需求生成的故事面板。" action={<button className="primary" disabled={busy === "rewrite"} onClick={generateRewrite}><WandSparkles />重新生成仿写结果</button>} /><DocumentCard title="原片仿写结果" value={project.documents.rewrite} assets={referenceAssets} emptyAction={generateRewrite} editLabel="编辑原片仿写故事面板" onSave={(document) => setProject((value) => updateRewriteDocument(value, "rewrite", document))} /><Footer back={goBack} disabled={!project.documents.rewrite} next={() => setProject((value) => advanceRewriteStep({ ...value, segments: value.segments.length ? value.segments : rewriteSegments.map((item) => ({ ...item })) }))} nextLabel="确认并提取片段" /></section>;
  else if (project.step === 4) stage = <section className="rewrite-stage"><StageHeading step={4} title="提取片段" description="校对四段故事面板，选择后进入逐秒重绘。" action={<div className="rewrite-heading-actions"><button className="secondary" disabled={busy === "extract"} onClick={() => runStage("extract", (value) => value, "片段已重新提取，已保留你的编辑")}><RefreshCw />重新提取片段</button><button className="secondary" onClick={() => setProject((value) => toggleAllRewriteSelections(value))}>{project.segments.every((item) => item.selected) ? "取消全选" : "全选"}</button></div>} /><div className="remake-segment-editors rewrite-segment-list">{project.segments.map((segment) => <RewriteSegmentCard key={segment.id} segment={segment} assets={referenceAssets} onSelect={() => setProject((value) => toggleRewriteSelection(value, segment.id))} onOpen={() => setModal({ type: "segment", id: segment.id })} />)}</div><Footer back={goBack} next={next} disabled={!project.segments.length} nextLabel="进入逐秒重绘" /></section>;
  else if (project.step === 5) stage = <section className="rewrite-stage"><StageHeading step={5} title="逐秒重绘" description="按片段生成逐秒分镜，并检查角色与商品稳定性。" action={<button className="primary" disabled={!selectedIds.length} onClick={() => scheduleJobs("redraw", selectedIds)}><WandSparkles />批量生成重绘</button>} /><div className="rewrite-output-grid">{project.segments.map((segment) => <article key={segment.id}><button className="rewrite-output-media" onClick={() => segment.redrawStatus === "done" && setModal({ title: `${segment.title}重绘分镜`, content: <img src={segment.redrawPath} alt={`${segment.title}重绘分镜`} /> })}>{segment.redrawStatus === "done" ? <img src={segment.redrawPath} alt={`${segment.title}重绘`} /> : <ImageIcon />}</button><div><span className={`rewrite-status ${segment.redrawStatus}`}>{statusText[segment.redrawStatus]}</span><strong>{segment.title}</strong><small>{segment.time}</small><button disabled={segment.redrawStatus === "running"} onClick={() => scheduleJobs("redraw", [segment.id])}>{segment.redrawStatus === "running" ? <LoaderCircle className="spin" /> : <RefreshCw />}{segment.redrawStatus === "done" ? "重新生成" : "生成重绘"}</button></div></article>)}</div><Footer back={goBack} next={next} disabled={!project.segments.every((item) => item.redrawStatus === "done")} nextLabel="进入视频生成" /></section>;
  else stage = <section className="rewrite-stage"><StageHeading step={6} title="生成视频" description="生成并预览四段成片，完成原片仿写项目。" action={<button className="primary" disabled={!selectedIds.length} onClick={() => scheduleJobs("video", selectedIds)}><Play />批量生成视频</button>} />{allVideosDone && <div className="rewrite-complete"><CheckCircle2 /><div><strong>项目已完成</strong><small>4 个片段 · 59秒 · {project.aspectRatio} · {project.model}</small></div></div>}<div className="rewrite-video-grid">{project.segments.map((segment) => <article key={segment.id}>{segment.videoStatus === "done" ? <video src={segment.videoPath} controls preload="metadata" aria-label={`片段${segment.number}生成视频`} /> : <div className="rewrite-video-pending"><Video /><span>{statusText[segment.videoStatus]}</span></div>}<div><span className={`rewrite-status ${segment.videoStatus}`}>{statusText[segment.videoStatus]}</span><strong>{segment.title}</strong><small>{segment.time}</small><button disabled={segment.videoStatus === "running"} onClick={() => scheduleJobs("video", [segment.id])}>{segment.videoStatus === "running" ? <LoaderCircle className="spin" /> : <RefreshCw />}{segment.videoStatus === "done" ? "重新生成" : "生成视频"}</button></div></article>)}</div><footer className="rewrite-stage-footer"><button className="secondary" onClick={goBack}>返回上一步</button><span /></footer></section>;

  return <section className="original-rewrite"><header className="rewrite-project-header"><div><button aria-label="返回模式选择" onClick={onBack}><ArrowLeft /></button><span>爆款复刻 / 原片仿写</span><strong>{project.videoName || "未命名项目"}</strong></div><div><button onClick={resetProject}><RotateCcw />重新开始</button><button className="primary" onClick={() => { persistRewriteProject(localStorage, project); notify("原片仿写草稿已保存"); }}><Save />保存草稿</button></div></header><RewriteSteps project={project} onStep={(number) => setProject((value) => setRewriteStep(value, number))} />{stage}<RewriteModal modal={resolvedModal} onClose={() => setModal(null)} /></section>;
}
