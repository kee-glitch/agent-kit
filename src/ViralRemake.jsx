import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AssetMarkdown, MentionEditor } from "./AssetMentions";
import {
  ArrowLeft,
  ArrowRight,
  AtSign,
  AudioLines,
  Check,
  CheckCircle2,
  CircleHelp,
  Clock3,
  FilePenLine,
  FileText,
  Film,
  Image as ImageIcon,
  Layers3,
  LoaderCircle,
  Lock,
  Maximize2,
  Play,
  Plus,
  RectangleVertical,
  RefreshCw,
  Save,
  ScanLine,
  Sparkles,
  Trash2,
  Upload,
  Video,
  WandSparkles,
  X,
} from "lucide-react";
import {
  breakdownText,
  demoAssets,
  demoRequest,
  modes,
  originalBoards,
  originalReplacementResources,
  replacedBoards,
  segmentDocuments,
  steps,
  storyboardText,
  structureDemo,
} from "./viral-remake-data";
import {
  ASPECT_RATIOS,
  GENERAL_ASSET_ACCEPT,
  OUTPUT_QUALITIES,
  STORAGE_KEY,
  getStorageKey,
  addSequencedAssets,
  advanceStep,
  beginLatestRequest,
  canAdvance,
  clearRunningStatuses,
  clearVideo,
  completeWorkflowStep,
  createInitialProject,
  finishColumnsBreakdown,
  findBoundReplacementAsset,
  formatGenerationTimestamp,
  getColumnsBreakdownStatus,
  getTrappedFocusTarget,
  isBackdropSelfClick,
  isLatestRequest,
  getMediaType,
  getPendingRedrawSegmentIds,
  getRedrawReadySegmentIds,
  getSelectedSegmentIds,
  toggleRedrawReadySelection,
  toggleAllSegmentSelections,
  nextAssetLabel,
  persistProject,
  serializeProject,
  startColumnsBreakdown,
  queueGeneration,
  removeReplacementAsset,
  replaceSequencedAsset,
  setCurrentStep,
  setGenerationStatus,
  setBoundReplacementAsset,
  replaceVideo,
  updateReplacementAsset,
} from "./viral-remake-state";
import BoundReplacementRow from "./BoundReplacementRow";
import VideoPreviewModal from "./VideoPreviewModal";
import "./viral-remake.css";
import RemakeDraftSidebar, { useRemakeDrafts } from "./RemakeDraftSidebar";
import { ELEMENT_COLUMNS_DRAFTS_KEY, ELEMENT_DRAFTS_KEY, REWRITE_COLUMNS_DRAFTS_KEY, STRUCTURE_COLUMNS_DRAFTS_KEY, STRUCTURE_DRAFTS_KEY } from "./remake-drafts-state";
import { createReplacementAssetsSnapshot, createReplacementResultLog, createVideoBreakdownLog, logRemakeFlow } from "./remake-flow-debug";
import { rewriteDemo, rewriteSegments } from "./original-rewrite-data";

const MODELS = [
  "seedance 2.0 mini",
  "seedance 2.0 fast",
  "seedance 2.0",
  "seedance 2.5",
];

const rewriteColumnsDemo = {
  aspectRatio: "9:16",
  referenceImage: rewriteDemo.storyboardPath,
  request: rewriteDemo.request,
  replacementResources: rewriteDemo.referenceAssets.map((asset) => ({
    id: asset.sourceId,
    role: asset.role,
    title: asset.label,
    description: asset.name,
  })),
  assets: rewriteDemo.referenceAssets.map((asset) => ({ ...asset, type: "image" })),
  storyboard: rewriteDemo.rewriteDocument,
  styleGuide: rewriteDemo.rewriteDocument.split("### 2. 分镜卡片")[0].trim(),
  segments: rewriteSegments.map((segment) => ({
    ...segment,
    summary: segment.title,
    content: segment.document,
    video: segment.videoPath,
  })),
  breakdown: rewriteDemo.breakdown,
};

const elementColumnsDemo = {
  aspectRatio: "9:16",
  referenceImage: originalBoards[0],
  request: demoRequest,
  replacementResources: originalReplacementResources,
  assets: demoAssets,
  storyboard: storyboardText,
  styleGuide: storyboardText.split("### 2. 分镜卡片")[0].trim(),
  segments: segmentDocuments,
  breakdown: breakdownText,
};

function ModeSelection({ onSelect, notify }) {
  return (
    <main className="remake-mode-page">
      <header className="remake-mode-header">
        <div>
          <span className="remake-kicker">VIRAL REMAKE</span>
          <h1>选择复刻模式</h1>
          <p>从原片镜头到叙事结构，选择最适合当前素材的复刻方式。</p>
        </div>
        <button
          className="remake-help"
          onClick={() => notify("元素替换最适合需要高度还原原片动作的任务")}
        >
          <CircleHelp />
          如何选择
        </button>
      </header>
      <section className="remake-mode-grid" aria-label="复刻模式">
        {modes.map((mode) => (
          <article
            className={`remake-mode-card ${mode.active ? "available" : "locked"}`}
            key={mode.id}
          >
            <div className="remake-mode-card-top">
              {mode.active ? (
                <em>
                  <Sparkles />
                  当前可用
                </em>
              ) : (
                <em>
                  <Lock />
                  即将上线
                </em>
              )}
            </div>
            <div className="remake-mode-icon">
              {mode.id === "element" || mode.id === "element-columns" ? (
                <Layers3 />
              ) : mode.id === "rewrite-columns" ? (
                <WandSparkles />
              ) : (
                <Film />
              )}
            </div>
            <h2>{mode.title}</h2>
            <strong>{mode.subtitle}</strong>
            <p>{mode.description}</p>
            <button
              disabled={!mode.active}
              onClick={() => mode.active && onSelect(mode.id)}
            >
              {mode.active ? (
                <>
                  开始创建
                  <ArrowRight />
                </>
              ) : (
                "暂不可用"
              )}
            </button>
          </article>
        ))}
      </section>
      <footer className="remake-mode-footer">
        <span>当前开放元素替换、结构仿写与原片仿写</span>
        <i />
        <span>所有处理均为前端 Demo 演示</span>
      </footer>
    </main>
  );
}

function WorkflowHeader({ project, mode, onBack, onStep, onSave }) {
  return (
    <>
      <header className="remake-project-header">
        <div className="remake-project-title">
          <button aria-label="返回模式选择" onClick={onBack}>
            <ArrowLeft />
          </button>
          <div>
            <span>爆款复刻 / {mode === "structure" ? "结构仿写" : "元素替换"}</span>
            <strong>{project.videoName || "未命名项目"}</strong>
          </div>
        </div>
        <div className="remake-header-actions">
          <button className="primary" onClick={onSave}>
            <Save />
            保存草稿
          </button>
        </div>
      </header>
      <nav className="remake-steps" aria-label="项目进度">
        {steps.map((label, index) => {
          const number = index + 1;
          const complete = number < project.step;
          const active = number === project.step;
          const unlocked = number <= project.maxStep;
          return (
            <button
              key={label}
              className={`${active ? "active" : ""} ${complete ? "complete" : ""}`}
              disabled={!unlocked}
              onClick={() => onStep(number)}
            >
              <span>{complete ? <Check /> : number}</span>
              <b>{label}</b>
              {index < steps.length - 1 && <i />}
            </button>
          );
        })}
      </nav>
    </>
  );
}

function UploadCard({ icon: Icon, title, note, accept, onChange }) {
  return (
    <label className="remake-upload-card">
      <input type="file" accept={accept} onChange={onChange} />
      <span>
        <Icon />
      </span>
      <div>
        <b>{title}</b>
        <small>{note}</small>
      </div>
      <Upload className="upload-arrow" />
    </label>
  );
}

const readFile = (file) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });

function ReplacementAssetRow({ asset, onReplace, onRemove }) {
  const chooseFile = (event) => {
    const file = event.target.files?.[0];
    if (file) onReplace(file);
    event.target.value = "";
  };
  const MediaIcon =
    asset.type === "audio"
      ? AudioLines
      : asset.type === "video"
        ? Video
        : ImageIcon;
  return (
    <article className="remake-asset-row">
      <div className={`remake-asset-preview ${asset.type}`}>
        {asset.type === "image" && (asset.preview || asset.path) ? (
          <img src={asset.preview || asset.path} alt="" />
        ) : asset.type === "video" && asset.preview ? (
          <video src={asset.preview} muted />
        ) : (
          <MediaIcon />
        )}
      </div>
      <div className="remake-asset-copy">
        <b>{asset.role}</b>
        <small>{asset.name}</small>
      </div>
      <div className="remake-row-actions">
        <label className="remake-file-action">
          <input
            type="file"
            accept={GENERAL_ASSET_ACCEPT}
            onChange={chooseFile}
          />
          <Upload />
          替换素材
        </label>
        <button
          type="button"
          className="remake-delete-action"
          onClick={onRemove}
          aria-label={`删除${asset.role}`}
        >
          <Trash2 />
          删除
        </button>
      </div>
    </article>
  );
}

function StepOne({ project, setProject, onDemo, onNext, notify }) {
  const chooseVideo = (event) => {
    const file = event.target.files?.[0];
    if (file) setProject((value) => replaceVideo(value, file.name));
    event.target.value = "";
  };

  return (
    <section className="remake-stage step-one">
      <div className="remake-stage-heading">
        <div>
          <span className="remake-kicker">STEP 01</span>
          <h1>拆解视频</h1>
          <p>上传需要复刻的视频，并选择复刻模型与最终画面比例。</p>
        </div>
        <button className="remake-demo-button" onClick={onDemo}>
          <Sparkles />
          加载 Demo 素材
        </button>
      </div>
      <div className="remake-form-grid single-panel">
        <div className="remake-panel remake-source-panel">
          <div className="remake-panel-title">
            <span>
              <Video />
            </span>
            <div>
              <h2>模板视频</h2>
              <p>支持 MP4 / MOV，建议 9:16 竖屏</p>
            </div>
          </div>
          {project.videoName ? (
            <div className="remake-selected-file">
              <span>
                <Play />
              </span>
              <div>
                <b>{project.videoName}</b>
                <small>模板视频已就绪</small>
              </div>
              <div className="remake-row-actions">
                <label className="remake-file-action">
                  <input type="file" accept="video/*" onChange={chooseVideo} />
                  <Upload />
                  替换视频
                </label>
                <button
                  type="button"
                  className="remake-delete-action"
                  onClick={() => setProject((value) => clearVideo(value))}
                >
                  <Trash2 />
                  删除
                </button>
              </div>
            </div>
          ) : (
            <UploadCard
              icon={Play}
              title="上传需要复刻的视频"
              note="点击选择 MP4 / MOV 文件"
              accept="video/*"
              onChange={chooseVideo}
            />
          )}
          <div className="remake-video-options">
            <div className="remake-field">
              <label htmlFor="video-model">使用什么模型复刻</label>
              <select
                id="video-model"
                value={project.model}
                onChange={(event) =>
                  setProject((value) => ({
                    ...value,
                    model: event.target.value,
                  }))
                }
              >
                {MODELS.map((model) => (
                  <option key={model}>{model}</option>
                ))}
              </select>
              <p className="remake-field-hint">
                Seedance 2.5 将按每 30 秒拆分生成，其余模型按每 15 秒拆分。
              </p>
            </div>
            <div className="remake-field">
              <label htmlFor="aspect-ratio">复刻的画面比例</label>
              <select
                id="aspect-ratio"
                value={project.aspectRatio}
                onChange={(event) =>
                  setProject((value) => ({
                    ...value,
                    aspectRatio: event.target.value,
                  }))
                }
              >
                {ASPECT_RATIOS.map((ratio) => (
                  <option key={ratio}>{ratio}</option>
                ))}
              </select>
            </div>
            <div className="remake-field">
              <label htmlFor="output-quality">清晰度</label>
              <select
                id="output-quality"
                value={project.quality}
                onChange={(event) =>
                  setProject((value) => ({
                    ...value,
                    quality: event.target.value,
                  }))
                }
              >
                {OUTPUT_QUALITIES.map((quality) => (
                  <option key={quality}>{quality}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
      <div className="remake-stage-footer">
        <span>
          {!canAdvance(project)
            ? "请先上传需要复刻的视频"
            : "视频已就绪，可以开始拆解"}
        </span>
        <button
          className="remake-primary"
          disabled={!canAdvance(project)}
          onClick={() =>
            canAdvance(project)
              ? onNext()
              : notify("请先上传需要复刻的视频")
          }
        >
          开始拆解视频
          <ArrowRight />
        </button>
      </div>
    </section>
  );
}

function BoardGallery({ originals = false, onOpen }) {
  const list = originals ? originalBoards : replacedBoards;
  return (
    <div className="remake-board-grid">
      {list.map((src, index) => (
        <button
          className="remake-board"
          key={src}
          onClick={() =>
            onOpen(
              src,
              originals ? `原视频分镜 ${index + 1}` : `替换后分镜 ${index + 1}`,
            )
          }
        >
          <img
            src={src}
            alt={
              originals
                ? `原视频第 ${index + 1} 张逐秒分镜`
                : `替换后第 ${index + 1} 张逐秒分镜`
            }
          />
          <span>
            {index * 15 + 1}–{index === 2 ? 42 : (index + 1) * 15} 秒
          </span>
          <i>
            <Maximize2 />
          </i>
        </button>
      ))}
    </div>
  );
}


function DocumentEditor({
  title,
  value,
  assets,
  onRegenerate,
  regenerating,
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const closeRef = useRef(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus();
    };
  }, [open]);

  return (
    <>
      <article className="remake-document">
        <header>
          <div>
            <span>
              <FileText />
            </span>
            <div>
              <h2>{title}</h2>
            </div>
          </div>
          <div>
            <button onClick={onRegenerate} disabled={regenerating}>
              {regenerating ? <LoaderCircle className="spin" /> : <RefreshCw />}
              {regenerating ? "生成中" : "重新生成"}
            </button>
          </div>
        </header>
        <div
          ref={triggerRef}
          className="remake-storyboard-trigger"
          role="button"
          tabIndex={0}
          aria-label={`阅读完整${title}`}
          onClick={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setOpen(true);
            }
          }}
        >
          <AssetMarkdown
            value={value}
            assets={assets}
            className="remake-storyboard-preview"
          />
          <span className="remake-storyboard-read-more">
            <Maximize2 />
            点击阅读完整内容
          </span>
        </div>
      </article>
      {open && (
        <div
          className="remake-modal"
          role="presentation"
          onMouseDown={(event) => {
            if (isBackdropSelfClick(event.target, event.currentTarget)) {
              setOpen(false);
            }
          }}
        >
          <article
            ref={dialogRef}
            className="remake-markdown-modal remake-storyboard-modal"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setOpen(false);
                return;
              }
              if (event.key !== "Tab") return;
              const focusable = Array.from(
                dialogRef.current?.querySelectorAll(
                  'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
                ) || [],
              ).filter((element) => !element.disabled);
              const target = getTrappedFocusTarget(
                focusable,
                document.activeElement,
                event.shiftKey,
              );
              if (target) {
                event.preventDefault();
                target.focus();
              }
            }}
          >
            <header>
              <h2>{title}</h2>
            </header>
            <AssetMarkdown value={value} assets={assets} />
            <footer className="remake-modal-footer">
              <button
                ref={closeRef}
                type="button"
                className="remake-modal-close"
                aria-label="关闭完整内容"
                onClick={() => setOpen(false)}
              >
                关闭
              </button>
            </footer>
          </article>
        </div>
      )}
    </>
  );
}

function MarkdownDocumentPreview({ title, meta, value, onRegenerate }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const closeRef = useRef(null);
  const dialogRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus();
    };
  }, [open]);
  const markdown = (
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
  );

  return (
    <>
      <article className="remake-document remake-markdown-document">
        <header>
          <div>
            <span>
              <FileText />
            </span>
            <div>
              <h2>{title}</h2>
              <p>{meta}</p>
            </div>
          </div>
          <div>
            <button type="button" onClick={onRegenerate}>
              <RefreshCw />
              重新生成
            </button>
          </div>
        </header>
        <div className="remake-markdown-preview">
          <div className="remake-markdown-body">{markdown}</div>
          <button
            ref={triggerRef}
            type="button"
            className="remake-preview-open"
            aria-label={`查看完整${title}`}
            onClick={() => setOpen(true)}
          >
            <Maximize2 />
            点击阅读完整内容
          </button>
        </div>
      </article>

      {open && (
        <div
          ref={dialogRef}
          className="remake-modal"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onKeyDown={(event) => {
            if (event.key !== "Tab") return;
            const focusable = Array.from(
              dialogRef.current?.querySelectorAll(
                'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
              ) || [],
            ).filter((element) => !element.disabled);
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <article className="remake-markdown-modal">
            <header>
              <h2>{title}</h2>
            </header>
            <div className="remake-markdown-body">{markdown}</div>
            <footer className="remake-modal-footer">
              <button
                ref={closeRef}
                type="button"
                className="remake-modal-close"
                aria-label="关闭完整内容"
                onClick={() => setOpen(false)}
              >
                关闭
              </button>
            </footer>
          </article>
        </div>
      )}
    </>
  );
}

function StepTwo({ project, mode, setProject, onNext, onOpen, notify }) {
  const value = project.documents.breakdown ?? breakdownText;
  const replacementResources = mode === "structure"
    ? structureDemo.replacementResources
    : originalReplacementResources;
  const latestBoundRequestRef = useRef(new Map());
  const latestAssetRequestRef = useRef(new Map());
  const projectRef = useRef(project);
  projectRef.current = project;
  const commitAssets = (action, updater) => {
    const next = updater(projectRef.current);
    projectRef.current = next;
    setProject(next);
    logRemakeFlow(
      mode,
      2,
      "替换素材变更",
      { 操作: action },
      createReplacementAssetsSnapshot(replacementResources, next.assets),
    );
  };
  const makeAssetId = () =>
    globalThis.crypto?.randomUUID?.() || `asset-${Date.now()}`;
  const addAssets = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    const added = await Promise.all(
      files.map(async (file) => ({
        id: makeAssetId(),
        type: getMediaType(file),
        name: file.name,
        preview: await readFile(file),
      })),
    );
    commitAssets("新增其他素材", (current) => addSequencedAssets(current, added));
  };
  const chooseBoundAsset = async (resource, event) => {
    const { id: sourceId, role } = resource;
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const request = beginLatestRequest(latestBoundRequestRef.current, sourceId);
    const preview = await readFile(file);
    if (!isLatestRequest(latestBoundRequestRef.current, sourceId, request)) return;
    const addition = {
      id: makeAssetId(),
      sourceId,
      role,
      type: getMediaType(file),
      name: file.name,
      preview,
    };
    commitAssets("上传替换素材", (current) => setBoundReplacementAsset(current, resource, addition));
  };
  const clearBoundAsset = (resource) => {
    beginLatestRequest(latestBoundRequestRef.current, resource.id);
    commitAssets("清空替换素材", (current) => setBoundReplacementAsset(current, resource, null));
  };
  const replaceAsset = async (id, file) => {
    const request = beginLatestRequest(latestAssetRequestRef.current, id);
    const preview = await readFile(file);
    if (!isLatestRequest(latestAssetRequestRef.current, id, request)) return;
    commitAssets("替换其他素材", (currentProject) => {
      const current = currentProject.assets.find((asset) => asset.id === id);
      if (!current) return currentProject;
      return replaceSequencedAsset(currentProject, id, {
        type: getMediaType(file),
        name: file.name,
        preview,
        path: undefined,
      });
    });
  };
  const removeAsset = (id, action = "删除其他素材") => {
    beginLatestRequest(latestAssetRequestRef.current, id);
    commitAssets(action, (current) => removeReplacementAsset(current, id));
  };
  return (
    <section className="remake-stage">
      <div className="remake-stage-heading">
        <div>
          <span className="remake-kicker">STEP 02</span>
          <h1>选择替换素材</h1>
          <p>
            视频已完成拆解。上传替换素材，并通过 @ 将素材引用到替换需求中。
          </p>
        </div>
        <span className="remake-status success">
          <CheckCircle2 />
          拆解完成 · 41 秒
        </span>
      </div>
      <div className="remake-step-two-workspace">
        <div className="remake-step-two-analysis">
      <MarkdownDocumentPreview
        title="视频拆解与复刻框架"
        meta="视频拆解prompt.md · 已识别 9 个叙事镜头"
        value={value}
        onRegenerate={() => notify("已重新分析模板视频")}
      />
      <div className="remake-section-title">
        <div>
          <h2>{mode === "structure" ? "原视频结构分镜" : "原视频逐秒分镜"}</h2>
          <p>{mode === "structure" ? "以 1:1 总览图呈现原片镜头结构，点击查看大图。" : "每 15 秒生成一张总览图，点击查看大图。"}</p>
        </div>
        <span>{mode === "structure" ? "1 张 · 42 镜头" : "3 张 · 42 帧"}</span>
      </div>
      {mode === "structure" ? (
        <button
          className="remake-structure-board"
          onClick={() => onOpen(structureDemo.referenceImage, "原视频结构分镜")}
          aria-label="查看原视频结构分镜大图"
        >
          <img src={structureDemo.referenceImage} alt="原视频结构分镜" />
          <span><Maximize2 />查看大图</span>
        </button>
      ) : <BoardGallery originals onOpen={onOpen} />}
        </div>

        <aside className="remake-step-two-sidebar" aria-label="替换配置">
      <div className="remake-replacement-setup">
        <div className="remake-panel">
          <div className="remake-panel-title">
            <span><Layers3 /></span>
            <div>
              <h2>替换素材</h2>
              <p>支持图片、音频和视频，可一次选择多个文件</p>
            </div>
          </div>
          <div className="remake-replacement-columns">
            <h3 className="remake-replacement-list-heading">上传替换素材</h3>
            {replacementResources.map((resource) => {
              const asset = findBoundReplacementAsset(project.assets, resource.id);
              return (
                <BoundReplacementRow
                  key={resource.id}
                  resource={resource}
                  asset={asset}
                  onChoose={(event) => chooseBoundAsset(resource, event)}
                  onClear={() => asset && clearBoundAsset(resource)}
                />
              );
            })}
            {project.assets.filter((asset) => !asset.sourceId).map((asset) => (
              <div className="remake-other-asset" key={asset.id}>
                <ReplacementAssetRow
                  asset={asset}
                  onReplace={(file) => replaceAsset(asset.id, file)}
                  onRemove={() => removeAsset(asset.id)}
                />
              </div>
            ))}
            <label className="remake-add-asset remake-add-other-asset">
              <input
                type="file"
                accept="image/*,audio/*,video/*"
                multiple
                onChange={addAssets}
              />
              <Plus />
              新增其他素材
            </label>
          </div>
        </div>
        <div className="remake-panel remake-request-panel">
          <div className="remake-panel-title">
            <span><AtSign /></span>
            <div>
              <h2>
                {mode === "structure" ? "结构仿写需求" : "替换需求"}{" "}
                <span className="remake-optional-label">非必填</span>
              </h2>
                <p>输入 @ 可引用已上传的素材</p>
            </div>
          </div>
          <MentionEditor
            value={project.request}
            assets={project.assets}
            onChange={(request) =>
              setProject((current) => ({ ...current, request }))
            }
          />
        </div>
      </div>
        </aside>
      </div>

      <div className="remake-stage-footer">
        <button
          className="remake-secondary"
          onClick={() => setProject((value) => setCurrentStep(value, 1))}
        >
          <ArrowLeft />
          返回修改视频
        </button>
        <button
          className="remake-primary"
          disabled={!canAdvance(project)}
          onClick={() =>
            canAdvance(project) ? onNext() : notify("请先填写替换需求")
          }
        >
          生成替换结果
          <ArrowRight />
        </button>
      </div>
    </section>
  );
}

function StepThree({
  project,
  mode,
  setProject,
  onNext,
  onOpen,
  save,
  regenerate,
  regenerating,
}) {
  const value = project.documents.storyboard ?? storyboardText;
  return (
    <section className="remake-stage">
      <div className="remake-stage-heading">
        <div>
          <span className="remake-kicker">STEP 03</span>
          <h1>{mode === "structure" ? "校对结构仿写结果" : "校对替换结果"}</h1>
          <p>{mode === "structure" ? "新的叙事结构已写入故事面板，请确认内容后提取片段。" : "人物、产品与方糖已写入新故事面板，并生成逐秒画面对照。"}</p>
        </div>
      </div>
      {mode !== "structure" && <article className="remake-document remake-comparison-card">
        <header>
          <div>
            <span>
              <ImageIcon />
            </span>
            <div>
              <h2>逐秒分镜对照</h2>
              <p>动作、构图和时间保持不变，仅替换指定画面元素。</p>
            </div>
          </div>
        </header>
        <div className="remake-comparison">
        <div>
          <header>
            <b>原视频分镜</b>
            <span>Before</span>
          </header>
          <BoardGallery originals onOpen={onOpen} />
        </div>
        <div>
          <header>
            <b>替换后分镜</b>
            <span>After</span>
          </header>
          <BoardGallery onOpen={onOpen} />
        </div>
        </div>
      </article>}
      <DocumentEditor
        title={mode === "structure" ? "结构仿写故事面板" : "替换后的故事面板"}
        value={value}
        assets={project.assets}
        onRegenerate={regenerate}
        regenerating={regenerating}
      />
      <div className="remake-stage-footer">
        <button
          className="remake-secondary"
          onClick={() => setProject((value) => setCurrentStep(value, 2))}
        >
          <ArrowLeft />
          返回视频拆解
        </button>
        <button className="remake-primary" onClick={onNext}>
          提取生成片段
          <ArrowRight />
        </button>
      </div>
    </section>
  );
}

function SegmentDocumentCard({
  segment,
  index,
  value,
  assets,
  status,
  selected,
  onSelect,
  onGenerate,
}) {
  const [open, setOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const returnFocusRef = useRef(null);
  const closeRef = useRef(null);
  const openModal = (event) => {
    returnFocusRef.current = event.currentTarget;
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      returnFocusRef.current?.focus();
    };
  }, [open]);

  return (
    <article className={`remake-segment-card${selected ? " selected" : ""}`}>
      <header
        onClick={(event) => {
          if (event.target.closest("button")) return;
          onSelect(!selected);
        }}
      >
        <button
          type="button"
          className="remake-segment-selection-target"
          aria-pressed={selected}
          aria-label={`${selected ? "取消选择" : "选择"}${segment.title}`}
          onClick={(event) => {
            event.stopPropagation();
            onSelect(!selected);
          }}
        >
          <span>0{index + 1}</span>
          <span className="remake-segment-heading">
            <h2>{segment.title}</h2>
            <p>{segment.time} · {segment.duration} · {segment.shots}</p>
          </span>
        </button>
        <div className="remake-segment-generation-actions">
          {status === "done" && (
            <button
              type="button"
              className="remake-action-button secondary"
              onClick={() => setVideoOpen(true)}
            >
              <Play /> 查看视频
            </button>
          )}
          <button
            type="button"
            className="remake-action-button primary"
            disabled={status === "running"}
            onClick={onGenerate}
          >
            {status === "running" ? (
              <><LoaderCircle className="spin" /> 生成中</>
            ) : status === "done" ? (
              <><RefreshCw /> 重新生成视频</>
            ) : (
              <><Sparkles /> 生成视频</>
            )}
          </button>
        </div>
      </header>
      <div
        className="remake-segment-preview"
        onClick={openModal}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openModal(event);
          }
        }}
        aria-label={`查看${segment.title}完整内容`}
      >
        <AssetMarkdown value={value} assets={assets} />
      </div>
      <footer>
        <div className="remake-segment-footer-meta">
          <span><FilePenLine /> 故事面板已就绪</span>
          <span>{value.length} 字</span>
        </div>
        <button
          type="button"
          className="remake-segment-more"
          onClick={openModal}
        >
          More <Maximize2 />
        </button>
      </footer>

      {open && (
        <div
          className="remake-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`${segment.title}完整内容`}
          onMouseDown={(event) => {
            if (isBackdropSelfClick(event.target, event.currentTarget)) {
              setOpen(false);
            }
          }}
          onKeyDown={(event) => {
            if (event.key !== "Tab") return;
            const focusable = Array.from(
              event.currentTarget.querySelectorAll(
                'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
              ),
            ).filter((element) => !element.disabled);
            const target = getTrappedFocusTarget(
              focusable,
              document.activeElement,
              event.shiftKey,
            );
            if (!target) return;
            event.preventDefault();
            target.focus();
          }}
        >
        <article className="remake-markdown-modal">
          <header className="remake-segment-modal-header">
            <span>0{index + 1}</span>
            <h2>{segment.title}</h2>
            <p>{segment.time} · {segment.duration} · {segment.shots}</p>
          </header>
          <AssetMarkdown value={value} assets={assets} />
          <footer className="remake-modal-footer">
            <button
              ref={closeRef}
              type="button"
              className="remake-modal-close"
              aria-label="关闭完整内容"
              onClick={() => setOpen(false)}
            >
              关闭
            </button>
          </footer>
        </article>
        </div>
      )}
      <VideoPreviewModal
        open={videoOpen}
        onClose={() => setVideoOpen(false)}
        src={segment.video || "./viral-remake-demo/template.mp4"}
        title={segment.title}
        badge={`0${index + 1}`}
        subtitle={`${segment.time} · ${segment.duration} · ${segment.shots}`}
      />
    </article>
  );
}

function StepFour({
  project,
  mode,
  setProject,
  notify,
}) {
  const activeSegments = mode === "structure" ? structureDemo.segments : segmentDocuments;
  const timers = useRef(new Map());
  const inFlight = useRef(new Set());
  const [selectedSegments, setSelectedSegments] = useState(
    () => new Set(activeSegments.map((segment) => segment.id)),
  );

  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
    inFlight.current.clear();
    setProject((value) => clearRunningStatuses(value));
  }, [setProject]);

  const beginGeneration = (ids) => {
    const started = ids.filter((id) => !inFlight.current.has(id));
    if (!started.length) {
      notify("所选片段已在生成中");
      return;
    }
    started.forEach((id) => inFlight.current.add(id));
    setProject((value) => {
      const result = queueGeneration(value, started).project;
      logRemakeFlow(mode, 4, "生成视频", {
        model: value.model,
        aspectRatio: value.aspectRatio,
        quality: value.quality,
        assets: value.assets,
        segments: activeSegments.filter((segment) => started.includes(segment.id)),
      }, { generation: result.generation });
      return result;
    });
    started.forEach((id, index) => {
      const timer = window.setTimeout(() => {
        inFlight.current.delete(id);
        timers.current.delete(id);
        setProject((value) => {
          const result = setGenerationStatus(value, id, "done");
          logRemakeFlow(mode, 4, "视频生成完成", { segmentId: id }, {
            segmentId: id,
            status: result.generation[id],
          });
          return result;
        });
        notify(`${activeSegments.find((item) => item.id === id)?.title}生成完成`);
      }, 1400 + index * 220);
      timers.current.set(id, timer);
    });
  };

  const availableSegmentIds = activeSegments.map((segment) => segment.id);
  const selectedIds = getSelectedSegmentIds(selectedSegments, availableSegmentIds);
  const allSelected = selectedIds.length === availableSegmentIds.length;
  const batchRunning = selectedIds.some(
    (id) => project.generation[id] === "running",
  );

  const setSegmentSelected = (id, selected) => {
    setSelectedSegments((current) => {
      const next = new Set(current);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  return (
    <section className="remake-stage">
      <div className="remake-stage-heading">
        <div>
          <span className="remake-kicker">STEP 04</span>
          <h1>片段故事面板</h1>
          <p>已按模型能力切分为 3 个片段。点击正文或 More 查看完整内容。</p>
        </div>
        <div className="remake-batch-actions">
          <button
            type="button"
            className="remake-select-all-button"
            onClick={() => {
              setSelectedSegments((current) =>
                toggleAllSegmentSelections(current, availableSegmentIds),
              );
            }}
          >
            <Check />
            {allSelected ? "取消全选" : "全选"}
            <span>{selectedIds.length}/{availableSegmentIds.length}</span>
          </button>
          <button
            className="remake-primary"
            disabled={!selectedIds.length || batchRunning}
            onClick={() => beginGeneration(selectedIds)}
          >
            {batchRunning ? <LoaderCircle className="spin" /> : <Sparkles />}
            {batchRunning ? "批量生成中" : "批量生成视频"}
          </button>
        </div>
      </div>
      <div className="remake-segment-editors">
        {activeSegments.map((segment, index) => {
          const key = segment.id;
          const value = project.documents[key] ?? segment.content;
          return (
            <SegmentDocumentCard
              key={key}
              segment={segment}
              index={index}
              value={value}
              assets={project.assets}
              status={project.generation[key] || "idle"}
              selected={selectedSegments.has(key)}
              onSelect={(selected) => setSegmentSelected(key, selected)}
              onGenerate={() => beginGeneration([key])}
            />
          );
        })}
      </div>
      <div className="remake-stage-footer">
        <button
          className="remake-secondary"
          onClick={() => setProject((value) => setCurrentStep(value, 3))}
        >
          <ArrowLeft />
          返回替换结果
        </button>
      </div>
    </section>
  );
}

function StructureColumnsWorkspace({
  mode,
  project,
  setProject,
  onBack,
  onSave,
  onDemo,
  onOpen,
  notify,
}) {
  const isElementColumns = mode === "element-columns";
  const isRewriteColumns = mode === "rewrite-columns";
  const columnsDemo = isElementColumns ? elementColumnsDemo : isRewriteColumns ? rewriteColumnsDemo : structureDemo;
  const workflowName = isElementColumns ? "元素替换" : isRewriteColumns ? "原片仿写" : "结构仿写";
  const workspaceLabel = isElementColumns ? "元素替换四屏工作区" : isRewriteColumns ? "原片仿写四屏工作区" : "结构仿写四列工作区";
  const storyboardActionLabel = isElementColumns ? "下一步：生成替换故事面板" : isRewriteColumns ? "下一步：生成原片仿写故事面板" : "下一步：生成结构仿写故事面板";
  const storyboardLoadingLabel = isElementColumns ? "正在生成替换故事面板..." : isRewriteColumns ? "正在生成原片仿写故事面板..." : "正在生成结构仿写故事面板...";
  const [videoPreview, setVideoPreview] = useState(null);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [replacementLoading, setReplacementLoading] = useState(false);
  const [replacementConfirmOpen, setReplacementConfirmOpen] = useState(false);
  const [storyboardLoading, setStoryboardLoading] = useState(false);
  const [storyboardConfirmOpen, setStoryboardConfirmOpen] = useState(false);
  const [storyboardOpen, setStoryboardOpen] = useState(false);
  const [segmentExtractionLoading, setSegmentExtractionLoading] = useState(false);
  const [extractedSegments, setExtractedSegments] = useState([]);
  const [extractedSegmentOpen, setExtractedSegmentOpen] = useState(null);
  const [selectedExtractedSegments, setSelectedExtractedSegments] = useState(new Set());
  const [redrawRequiredOpen, setRedrawRequiredOpen] = useState(false);
  const generationRecords = project.generationRecords;
  const redrawResults = isRewriteColumns || isElementColumns ? project.redrawRecords : [];
  const pendingRedrawSegmentIds = getPendingRedrawSegmentIds(extractedSegments);
  const redrawReadySegmentIds = getRedrawReadySegmentIds(extractedSegments);
  const unifiedResults = [
    ...redrawResults.map((record) => ({ kind: "image", record, sortAt: record.generatedAt })),
    ...generationRecords.map((record) => ({ kind: "video", record, sortAt: record.generatedAt || record.createdAt || "" })),
  ].sort((left, right) => (Date.parse(right.sortAt) || 0) - (Date.parse(left.sortAt) || 0));
  const setRedrawRecords = (updater) => setProject((value) => ({
    ...value,
    redrawRecords: typeof updater === "function" ? updater(value.redrawRecords) : updater,
  }));
  const setGenerationRecords = (updater) => setProject((value) => ({
    ...value,
    generationRecords: typeof updater === "function" ? updater(value.generationRecords) : updater,
  }));
  const [generationSnapshotOpen, setGenerationSnapshotOpen] = useState(null);
  const breakdownTimer = useRef(null);
  const replacementTimer = useRef(null);
  const storyboardTimer = useRef(null);
  const segmentExtractionTimer = useRef(null);
  const redrawTimers = useRef(new Set());
  const redrawBatchCounter = useRef(0);
  const generationBatchCounter = useRef(0);
  const batchGenerationTimers = useRef(new Set());
  const breakdownStatus = getColumnsBreakdownStatus(project);
  const breakdownReady = breakdownStatus === "done";
  useEffect(() => () => {
    clearTimeout(breakdownTimer.current);
    clearTimeout(replacementTimer.current);
    clearTimeout(storyboardTimer.current);
    clearTimeout(segmentExtractionTimer.current);
    redrawTimers.current.forEach((timer) => clearTimeout(timer));
    redrawTimers.current.clear();
    batchGenerationTimers.current.forEach((timer) => clearTimeout(timer));
    batchGenerationTimers.current.clear();
  }, []);
  const beginBreakdown = () => {
    if (!project.videoName) {
      notify("请先上传需要拆解的视频");
      return;
    }
    clearTimeout(breakdownTimer.current);
    setProject((value) => startColumnsBreakdown(value));
    breakdownTimer.current = window.setTimeout(() => {
      setProject((value) => finishColumnsBreakdown(value));
      notify("视频拆解完成");
    }, 1200);
  };
  const loadReplacementAssets = (resetCurrent = false) => {
    if (replacementLoading) return;
    if (resetCurrent) {
      setProject((value) => ({ ...value, assets: [], request: "" }));
    }
    setReplacementLoading(true);
    clearTimeout(replacementTimer.current);
    replacementTimer.current = window.setTimeout(() => {
      setProject((value) => {
        const next = completeWorkflowStep(value, 1);
        return resetCurrent ? {
          ...next,
          assets: columnsDemo.assets,
          assetCounters: { image: columnsDemo.assets.length, audio: 0, video: 0 },
          request: columnsDemo.request,
        } : next;
      });
      setReplacementLoading(false);
    }, 1200);
  };
  const requestReplacementAssets = () => {
    if (project.maxStep >= 2) {
      setReplacementConfirmOpen(true);
      return;
    }
    loadReplacementAssets();
  };
  const confirmReplacementReload = () => {
    setReplacementConfirmOpen(false);
    loadReplacementAssets(true);
  };
  const generateStoryboard = () => {
    if (storyboardLoading) return;
    setStoryboardLoading(true);
    clearTimeout(storyboardTimer.current);
    storyboardTimer.current = window.setTimeout(() => {
      const generatedAt = new Date().toISOString();
      redrawBatchCounter.current += 1;
      const batchId = redrawBatchCounter.current;
      const newRedrawRecords = isElementColumns ? columnsDemo.segments.map((segment, index) => ({
        id: `replacement-${batchId}-${segment.id}-${generatedAt}`,
        batchId,
        segmentId: segment.id,
        generatedAt,
        snapshot: {
          ...segment,
          number: index + 1,
          redrawPath: replacedBoards[index],
        },
      })) : [];
      setProject((value) => {
        const next = completeWorkflowStep(value, 2);
        return {
          ...next,
          documents: { ...next.documents, storyboard: columnsDemo.storyboard },
          redrawRecords: [...newRedrawRecords, ...next.redrawRecords],
        };
      });
      setStoryboardLoading(false);
    }, 1200);
  };
  const requestStoryboardGeneration = () => {
    if (project.maxStep >= 3) {
      setStoryboardConfirmOpen(true);
      return;
    }
    generateStoryboard();
  };
  const confirmStoryboardRegeneration = () => {
    setStoryboardConfirmOpen(false);
    generateStoryboard();
  };
  const extractSegments = () => {
    if (segmentExtractionLoading) return;
    setSegmentExtractionLoading(true);
    setExtractedSegments([]);
    setSelectedExtractedSegments(new Set());
    clearTimeout(segmentExtractionTimer.current);
    segmentExtractionTimer.current = window.setTimeout(() => {
      setExtractedSegments(columnsDemo.segments);
      setSegmentExtractionLoading(false);
    }, 1200);
  };
  const toggleExtractedSegment = (segmentId) => {
    if (isRewriteColumns) {
      const result = toggleRedrawReadySelection(selectedExtractedSegments, extractedSegments, segmentId);
      if (result.blocked) {
        setRedrawRequiredOpen(true);
        return;
      }
      setSelectedExtractedSegments(result.selectedIds);
      return;
    }
    setSelectedExtractedSegments((current) => {
      const next = new Set(current);
      if (next.has(segmentId)) next.delete(segmentId);
      else next.add(segmentId);
      return next;
    });
  };
  const toggleAllExtractedSegments = () => {
    const availableIds = isRewriteColumns ? redrawReadySegmentIds : extractedSegments.map((segment) => segment.id);
    setSelectedExtractedSegments((current) =>
      current.size === availableIds.length
        ? new Set()
        : new Set(availableIds),
    );
  };
  const generateRedraws = (ids) => {
    const selectedIds = new Set(ids);
    const selectedSegments = extractedSegments.filter((segment) => selectedIds.has(segment.id));
    redrawBatchCounter.current += 1;
    const batchId = redrawBatchCounter.current;
    setExtractedSegments((current) => current.map((segment) => selectedIds.has(segment.id) ? { ...segment, redrawStatus: "running" } : segment));
    const timer = window.setTimeout(() => {
      setExtractedSegments((current) => current.map((segment) => selectedIds.has(segment.id) ? { ...segment, redrawStatus: "done" } : segment));
      const generatedAt = new Date().toISOString();
      const newRecords = selectedSegments.map((segment) => ({
        id: `redraw-${batchId}-${segment.id}-${generatedAt}`,
        batchId,
        segmentId: segment.id,
        generatedAt,
        snapshot: { ...segment, redrawStatus: "done" },
      }));
      setRedrawRecords((current) => [...newRecords, ...current]);
      redrawTimers.current.delete(timer);
    }, 900);
    redrawTimers.current.add(timer);
  };
  const selectedRedrawsReady = !isRewriteColumns || [...selectedExtractedSegments].every((id) => extractedSegments.find((segment) => segment.id === id)?.redrawStatus === "done");
  const batchGenerateSegments = () => {
    if (selectedExtractedSegments.size === 0) return;
    const selectedIds = [...selectedExtractedSegments];
    generationBatchCounter.current += 1;
    const batchId = generationBatchCounter.current;
    const createdAt = new Date().toISOString();
    const newRecords = selectedIds.map((segmentId) => {
      const segment = columnsDemo.segments.find((item) => item.id === segmentId);
      return {
        id: `${batchId}-${segmentId}`,
        batchId,
        segmentId,
        status: "running",
        createdAt,
        generatedAt: null,
        snapshot: { ...segment },
        assets: (project.assets.length ? project.assets : columnsDemo.assets).map((asset) => ({ ...asset })),
      };
    }).filter((record) => record.snapshot.id);
    setGenerationRecords((current) => [...newRecords, ...current]);
    setProject((value) => completeWorkflowStep(value, 3));
    const timer = window.setTimeout(() => {
      const generatedAt = new Date().toISOString();
      setGenerationRecords((current) => current.map((record) =>
        record.batchId === batchId ? { ...record, status: "done", generatedAt } : record,
      ));
      batchGenerationTimers.current.delete(timer);
    }, 1800);
    batchGenerationTimers.current.add(timer);
  };
  const chooseVideo = (event) => {
    const file = event.target.files?.[0];
    if (file) setProject((value) => replaceVideo(value, file.name));
    event.target.value = "";
  };
  const uploadResource = async (event, resource) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const preview = await readFile(file);
    setProject((value) => setBoundReplacementAsset(value, resource, {
      id: `${resource.id}-${Date.now()}`,
      name: file.name,
      role: resource.role,
      type: getMediaType(file),
      sourceId: resource.id,
      preview,
    }));
    event.target.value = "";
  };
  const readyCount = columnsDemo.replacementResources.filter((resource) =>
    findBoundReplacementAsset(project.assets, resource.id),
  ).length;
  const replacementLocked = project.maxStep < 2 || replacementLoading;
  const storyboardLocked = project.maxStep < 3 || storyboardLoading;
  const breakdownDocument = project.documents.breakdown || columnsDemo.breakdown || breakdownText;
  const breakdownSectionStart = breakdownDocument.indexOf("### 01｜视频定位");
  const breakdownSectionEnd = breakdownDocument.indexOf("### 02｜转化逻辑");
  const breakdownPreview = breakdownDocument
    .slice(
      breakdownSectionStart >= 0 ? breakdownSectionStart : 0,
      breakdownSectionEnd > breakdownSectionStart ? breakdownSectionEnd : breakdownDocument.length,
    )
    .trim()
    .split("\n")
    .slice(0, 6)
    .join("\n");

  return (
    <div className="remake-columns-workspace">
      <header className="remake-project-header remake-columns-header">
        <div className="remake-project-title">
          <button aria-label="返回模式选择" onClick={onBack}><ArrowLeft /></button>
          <div>
            <span>爆款复刻 / {workflowName}</span>
            <strong>{project.videoName || "未命名项目"}</strong>
          </div>
        </div>
        <div className="remake-header-actions">
          <button onClick={onDemo}><Sparkles />加载 Demo</button>
          <button className="primary" onClick={onSave}><Save />保存草稿</button>
        </div>
      </header>

      <div className="remake-four-columns" aria-label={workspaceLabel}>
        <section className="remake-flow-column">
          <header><span>STEP 01</span><i>1</i><h1>视频拆解</h1><p>上传、配置并查看拆解结果</p></header>
          <article className="remake-column-card">
            <h2>原视频与拆解配置</h2>
            <label className={`remake-column-upload${project.videoName ? " has-file" : ""}`}>
              <input type="file" accept="video/*" onChange={chooseVideo} />
              <Video />
              <b>{project.videoName || "上传需要拆解的视频"}</b>
              <small>{project.videoName ? "视频已就绪" : "支持 MP4 / MOV 文件"}</small>
            </label>
            <div className="remake-column-fields">
              <label>拆解模型<select value={project.model} onChange={(event) => setProject((value) => ({ ...value, model: event.target.value }))}>{MODELS.map((model) => <option key={model}>{model}</option>)}</select></label>
              <label>画面比例<select value={project.aspectRatio} onChange={(event) => setProject((value) => ({ ...value, aspectRatio: event.target.value }))}>{ASPECT_RATIOS.map((ratio) => <option key={ratio}>{ratio}</option>)}</select></label>
              <label>清晰度<select value={project.quality} onChange={(event) => setProject((value) => ({ ...value, quality: event.target.value }))}>{OUTPUT_QUALITIES.map((quality) => <option key={quality}>{quality}</option>)}</select></label>
            </div>
            <button className="remake-column-primary" disabled={breakdownStatus === "running"} onClick={beginBreakdown}>
              {breakdownStatus === "running" && <LoaderCircle className="spin" />}
              {breakdownStatus === "running" ? "视频拆解中" : "开始视频拆解"}
              {breakdownStatus !== "running" && <ArrowRight />}
            </button>
          </article>
          {breakdownReady && <>
            <button type="button" className="remake-column-card remake-column-result" onClick={() => setBreakdownOpen(true)}>
              <h2>视频拆解与复刻框架</h2>
              <div className="remake-column-preview"><ReactMarkdown remarkPlugins={[remarkGfm]}>{breakdownPreview}</ReactMarkdown></div>
              <span>点击查看完整内容 <Maximize2 /></span>
            </button>
            {isElementColumns ? <article className="remake-column-card remake-column-gallery">
              <div className="remake-column-gallery-title"><div><h2>原视频逐秒分镜</h2><p>每 15 秒生成一张总览图，点击查看大图。</p></div><span>3 张 · 42 帧</span></div>
              <BoardGallery originals onOpen={onOpen} />
            </article> : <button className="remake-column-board" onClick={() => onOpen(columnsDemo.referenceImage, "原视频结构分镜") }>
              <img src={columnsDemo.referenceImage} alt="原视频结构分镜" />
              <span>原视频结构分镜 · 42 镜头</span>
            </button>}
            <button className="remake-column-primary remake-column-next" disabled={replacementLoading} onClick={requestReplacementAssets}>
              下一步：替换素材 <ArrowRight />
            </button>
          </>}
        </section>

        <section className={`remake-flow-column${replacementLocked ? " locked" : ""}`} aria-disabled={replacementLocked} inert={replacementLocked || undefined}>
          <header><span>STEP 02</span><i>2</i><h1>{isElementColumns ? "替换配置" : "仿写配置"}</h1><p>编辑素材与{workflowName}需求</p></header>
          <article className="remake-column-card">
            <h2>替换素材</h2>
            <div className="remake-column-assets">
              {columnsDemo.replacementResources.map((resource) => {
                const asset = findBoundReplacementAsset(project.assets, resource.id);
                return <div key={resource.id}><span>{asset?.preview ? <img src={asset.preview} alt="" /> : <ImageIcon />}</span><p><b>{resource.title}</b><small>{asset?.name || resource.description}</small></p><label><input type="file" accept={GENERAL_ASSET_ACCEPT} onChange={(event) => uploadResource(event, resource)} /><Upload />上传</label></div>;
              })}
            </div>
            <button className="remake-column-add" onClick={() => notify("可继续添加其他参考素材")}><Plus />新增其他素材</button>
          </article>
          <article className="remake-column-card remake-column-request">
            <h2>{workflowName}需求</h2>
            <MentionEditor value={project.request || columnsDemo.request} assets={project.assets.length ? project.assets : columnsDemo.assets} maxLength={isRewriteColumns ? 1000 : 500} onChange={(request) => setProject((value) => ({ ...value, request }))} placeholder={`描述${workflowName}需求`} />
            <small>已上传 {readyCount} 项素材</small>
          </article>
          <button className="remake-column-primary" disabled={storyboardLoading} onClick={requestStoryboardGeneration}>
            {storyboardActionLabel}
            <ArrowRight />
          </button>
          {replacementLocked && <div className="remake-column-lock">{replacementLoading ? <LoaderCircle className="spin" /> : <Lock />}<b>{replacementLoading ? "正在加载可替换素材..." : "完成视频拆解后开放"}</b></div>}
        </section>

        <section className={`remake-flow-column${storyboardLocked ? " locked" : ""}`} aria-disabled={storyboardLocked} inert={storyboardLocked || undefined}>
          <header><span>STEP 03</span><i>3</i><h1>{isElementColumns ? "替换结果" : "仿写结果"}</h1><p>查看{isElementColumns ? "替换" : "仿写"}故事面板并提取片段</p></header>
          {isElementColumns && <article className="remake-column-card remake-column-gallery">
            <div className="remake-column-gallery-title"><div><h2>替换后逐秒分镜</h2><p>对应三个时间段的替换结果，点击查看大图。</p></div><span>3 张 · 42 帧</span></div>
            <BoardGallery onOpen={onOpen} />
          </article>}
          <button
            type="button"
            className={isElementColumns ? "remake-column-card remake-column-result" : `remake-column-card remake-column-storyboard${isRewriteColumns ? " compact" : ""}`}
            onClick={() => setStoryboardOpen(true)}
          >
            <div className="remake-column-card-title"><h2>{workflowName}故事面板 · 完成版</h2></div>
            <AssetMarkdown className="remake-column-preview" value={columnsDemo.styleGuide} assets={project.assets.length ? project.assets : columnsDemo.assets} />
            <span className="remake-column-read-more">点击查看完整内容 <Maximize2 /></span>
          </button>
          <p className="remake-column-note">从完整故事面板中提取可独立生成的视频片段。</p>
          <button className="remake-column-primary" disabled={segmentExtractionLoading} onClick={extractSegments}>
            {segmentExtractionLoading && <LoaderCircle className="spin" />}
            {segmentExtractionLoading ? "正在提取片段..." : "提取片段"}
            {!segmentExtractionLoading && <ArrowRight />}
          </button>
          {extractedSegments.length > 0 && <div className="remake-column-extracted-segments" aria-label="片段提取结果">
            <div className="remake-column-extracted-header">
              <h2>片段提取结果</h2>
              <div className="remake-column-extracted-actions">
                {isRewriteColumns && <button type="button" disabled={pendingRedrawSegmentIds.length === 0} onClick={() => generateRedraws(pendingRedrawSegmentIds)}>
                  一键生成逐秒分镜图
                </button>}
                <button type="button" onClick={toggleAllExtractedSegments}>
                  {selectedExtractedSegments.size === (isRewriteColumns ? redrawReadySegmentIds.length : extractedSegments.length) && selectedExtractedSegments.size > 0 ? "取消全选" : "全选"}
                </button>
              </div>
            </div>
            {extractedSegments.map((segment, index) => <article
              key={segment.id}
              className={isRewriteColumns
                ? `redraw-layout${selectedExtractedSegments.has(segment.id) ? " selected" : ""}`
                : selectedExtractedSegments.has(segment.id) ? "selected" : ""}
              role="button"
              tabIndex={0}
              aria-label={`查看${segment.title}提取结果`}
              onClick={() => setExtractedSegmentOpen(segment)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setExtractedSegmentOpen(segment);
                }
              }}
            >
              <b>片段 {String(segment.number || index + 1).padStart(2, "0")}｜{segment.duration.replace("s", "秒")}｜{segment.summary.replace(/。$/, "")}</b>
              <span>{segment.time} · {segment.shots}</span>
              {isRewriteColumns && <div className="remake-column-redraw">
                <button
                  type="button"
                  className="remake-column-redraw-preview"
                  aria-label={segment.redrawStatus === "done" ? `查看片段${segment.number}逐秒分镜快照` : `片段${segment.number}逐秒分镜待生成`}
                  disabled={segment.redrawStatus !== "done"}
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpen(segment.redrawPath, `片段${segment.number}逐秒分镜快照`);
                  }}
                >
                  {segment.redrawStatus === "done" ? <img src={segment.redrawPath} alt={`片段${segment.number}逐秒重绘分镜`} /> : segment.redrawStatus === "running" ? <LoaderCircle className="spin" /> : <ImageIcon />}
                </button>
                <button
                  type="button"
                  className="remake-column-redraw-generate"
                  aria-label={segment.redrawStatus === "done" ? "重新生成逐秒分镜" : "生成逐秒分镜"}
                  disabled={segment.redrawStatus === "running"}
                  onClick={(event) => { event.stopPropagation(); generateRedraws([segment.id]); }}
                >
                  {segment.redrawStatus === "running" ? "生成中" : segment.redrawStatus === "done" ? "重新生成" : "生成分镜"}
                </button>
              </div>}
              <button
                type="button"
                className={selectedExtractedSegments.has(segment.id) ? "selected" : ""}
                aria-pressed={selectedExtractedSegments.has(segment.id)}
                onClick={(event) => { event.stopPropagation(); toggleExtractedSegment(segment.id); }}
              >
                {selectedExtractedSegments.has(segment.id) ? "已选择" : "选择"}
              </button>
            </article>)}
            <button className="remake-column-primary remake-column-next" disabled={selectedExtractedSegments.size === 0 || !selectedRedrawsReady} onClick={batchGenerateSegments}>
              批量生成视频
              <ArrowRight />
            </button>
          </div>}
          {storyboardLocked && <div className="remake-column-lock">{storyboardLoading ? <LoaderCircle className="spin" /> : <Lock />}<b>{storyboardLoading ? storyboardLoadingLabel : "完成素材配置后开放"}</b></div>}
        </section>

        <section className="remake-flow-column remake-results-column">
          <header><span>STEP 04</span><i>4</i><h1>生成结果</h1><p>查看全部生成结果</p></header>
          {unifiedResults.length === 0 && <div className="remake-column-empty">暂无生成结果记录</div>}
          {unifiedResults.length > 0 && <div className="remake-column-results">
            {unifiedResults.map(({ kind, record }) => {
              const segment = record.snapshot;
              if (!segment) return null;
              if (kind === "image") return <article className="remake-column-video remake-column-image" key={`image-${record.id}`}>
                <button className="remake-column-image-preview" type="button" onClick={() => onOpen(segment.redrawPath, `片段${segment.number}逐秒分镜快照`)}>
                  <img src={segment.redrawPath} alt={`片段${segment.number}逐秒分镜快照`} />
                </button>
                <h2>片段 {String(segment.number).padStart(2, "0")} · {segment.summary.replace(/。$/, "")}</h2>
                <div className="remake-column-video-meta">
                  <span>生成于 {formatGenerationTimestamp(record.generatedAt)}</span>
                  <span className="remake-column-video-parameters"><span><Clock3 />{segment.duration.toUpperCase()}</span></span>
                </div>
                <button type="button" onClick={() => onOpen(segment.redrawPath, `片段${segment.number}逐秒分镜快照`)}>查看分镜快照</button>
              </article>;
              const running = record.status === "running";
              const done = record.status === "done";
              const segmentIndex = columnsDemo.segments.findIndex((item) => item.id === record.segmentId);
              return <article className="remake-column-video" key={`video-${record.id}`}>
                <button className="remake-column-video-preview" disabled={running} aria-label={`预览${segment.title}`} onClick={() => done && setVideoPreview(segment)}>
                  {done ? <><video src={segment.video} muted /><span className="remake-column-video-play"><Play fill="currentColor" /></span></> : <><LoaderCircle className="spin" /><b>视频生成中...</b></>}
                </button>
                <button type="button" className="remake-column-video-title" onClick={() => setGenerationSnapshotOpen(record)}>
                  片段{["一", "二", "三"][segmentIndex]} · {segment.summary.replace(/。$/, "")}
                </button>
                <div className="remake-column-video-meta">{running ? <span>生成中...</span> : <>
                  <span>生成于 {formatGenerationTimestamp(record.generatedAt)}</span>
                  <span className="remake-column-video-parameters">
                    <span><Clock3 />{segment.duration.toUpperCase()}</span>
                    <span><RectangleVertical />9:16</span>
                    <span><ScanLine />{project.quality}</span>
                  </span>
                </>}</div>
                <button type="button" className="remake-column-snapshot-button" onClick={() => setGenerationSnapshotOpen(record)}>
                  查看脚本快照
                </button>
              </article>;
            })}
          </div>}
        </section>
      </div>
      <VideoPreviewModal
        open={Boolean(videoPreview)}
        onClose={() => setVideoPreview(null)}
        src={videoPreview?.video}
        title={videoPreview?.title || "片段视频"}
      />
      {breakdownOpen && <div className="remake-modal" role="presentation" onMouseDown={(event) => { if (isBackdropSelfClick(event.target, event.currentTarget)) setBreakdownOpen(false); }}>
        <article className="remake-markdown-modal" role="dialog" aria-modal="true" aria-label="视频拆解与复刻框架">
          <header><h2>视频拆解与复刻框架</h2></header>
          <div className="remake-markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{project.documents.breakdown || breakdownText}</ReactMarkdown></div>
          <footer className="remake-modal-footer"><button type="button" className="remake-modal-close" onClick={() => setBreakdownOpen(false)}>关闭</button></footer>
        </article>
      </div>}
      {replacementConfirmOpen && <div className="remake-modal" role="presentation" onMouseDown={(event) => { if (isBackdropSelfClick(event.target, event.currentTarget)) setReplacementConfirmOpen(false); }}>
        <article className="remake-confirm-modal" role="dialog" aria-modal="true" aria-label="是否重新加载可替换素材">
          <header><h2>是否重新加载可替换素材</h2><p>重新加载将清空当前素材配置和{workflowName}需求，此操作不可撤销。</p></header>
          <footer className="remake-modal-footer">
            <button type="button" className="remake-modal-confirm secondary" onClick={() => setReplacementConfirmOpen(false)}>取消</button>
            <button type="button" className="remake-modal-confirm" onClick={confirmReplacementReload}>确认重新加载</button>
          </footer>
        </article>
      </div>}
      {storyboardOpen && <div className="remake-modal" role="presentation" onMouseDown={(event) => { if (isBackdropSelfClick(event.target, event.currentTarget)) setStoryboardOpen(false); }}>
        <article className="remake-markdown-modal" role="dialog" aria-modal="true" aria-label={`${workflowName}故事面板完整内容`}>
          <header><h2>{workflowName}故事面板 · 完成版</h2></header>
          <div className="remake-markdown-body"><AssetMarkdown value={project.documents.storyboard || columnsDemo.storyboard} assets={project.assets.length ? project.assets : columnsDemo.assets} /></div>
          <footer className="remake-modal-footer"><button type="button" className="remake-modal-close" onClick={() => setStoryboardOpen(false)}>关闭</button></footer>
        </article>
      </div>}
      {storyboardConfirmOpen && <div className="remake-modal" role="presentation" onMouseDown={(event) => { if (isBackdropSelfClick(event.target, event.currentTarget)) setStoryboardConfirmOpen(false); }}>
        <article className="remake-confirm-modal" role="dialog" aria-modal="true" aria-label={`是否重新生成${workflowName}故事面板`}>
          <header><h2>是否重新生成{workflowName}故事面板</h2><p>重新生成将替换当前故事面板内容。</p></header>
          <footer className="remake-modal-footer">
            <button type="button" className="remake-modal-confirm secondary" onClick={() => setStoryboardConfirmOpen(false)}>取消</button>
            <button type="button" className="remake-modal-confirm" onClick={confirmStoryboardRegeneration}>确认重新生成</button>
          </footer>
        </article>
      </div>}
      {redrawRequiredOpen && <div className="remake-modal" role="presentation" onMouseDown={(event) => { if (isBackdropSelfClick(event.target, event.currentTarget)) setRedrawRequiredOpen(false); }}>
        <article className="remake-confirm-modal" role="dialog" aria-modal="true" aria-label="请先生成分镜参考图">
          <header><h2>请先生成分镜参考图</h2><p>当前片段生成逐秒分镜图后，才可选择生成视频。</p></header>
          <footer className="remake-modal-footer">
            <button type="button" className="remake-modal-confirm" onClick={() => setRedrawRequiredOpen(false)}>知道了</button>
          </footer>
        </article>
      </div>}
      {extractedSegmentOpen && <div className="remake-modal" role="presentation" onMouseDown={(event) => { if (isBackdropSelfClick(event.target, event.currentTarget)) setExtractedSegmentOpen(null); }}>
        <article className="remake-markdown-modal" role="dialog" aria-modal="true" aria-label={`${extractedSegmentOpen.title}提取结果`}>
          <header className="remake-segment-modal-header">
            <span>{extractedSegmentOpen.duration.replace("s", "秒")}</span>
            <h2>{extractedSegmentOpen.title}</h2>
            <p>{extractedSegmentOpen.time} · {extractedSegmentOpen.shots}</p>
          </header>
          <div className="remake-markdown-body"><AssetMarkdown value={extractedSegmentOpen.content} assets={project.assets.length ? project.assets : columnsDemo.assets} /></div>
          <footer className="remake-modal-footer"><button type="button" className="remake-modal-close" onClick={() => setExtractedSegmentOpen(null)}>关闭</button></footer>
        </article>
      </div>}
      {generationSnapshotOpen && <div className="remake-modal" role="presentation" onMouseDown={(event) => { if (isBackdropSelfClick(event.target, event.currentTarget)) setGenerationSnapshotOpen(null); }}>
        <article className="remake-markdown-modal" role="dialog" aria-modal="true" aria-label="片段生成快照">
          <header className="remake-segment-modal-header">
            <span>{generationSnapshotOpen.snapshot.duration.replace("s", "秒")}</span>
            <h2>{generationSnapshotOpen.snapshot.title}</h2>
            <p>{generationSnapshotOpen.snapshot.time} · {generationSnapshotOpen.snapshot.shots} · 生成于 {generationSnapshotOpen.generatedAt ? formatGenerationTimestamp(generationSnapshotOpen.generatedAt) : "生成中"}</p>
          </header>
          <div className="remake-markdown-body"><AssetMarkdown value={generationSnapshotOpen.snapshot.content} assets={generationSnapshotOpen.assets} /></div>
          <footer className="remake-modal-footer"><button type="button" className="remake-modal-close" onClick={() => setGenerationSnapshotOpen(null)}>关闭</button></footer>
        </article>
      </div>}
    </div>
  );
}

export default function ViralRemake() {
  const [mode, setMode] = useState(null);
  const [project, setProject] = useState(() =>
    createInitialProject(localStorage.getItem(STORAGE_KEY) || {}),
  );
  const [notice, setNotice] = useState("");
  const [viewer, setViewer] = useState(null);
  const [segmentDetail, setSegmentDetail] = useState(null);
  const [regenerating, setRegenerating] = useState(false);
  const [structureColumnsSessionKey, setStructureColumnsSessionKey] = useState(0);
  const [rewriteColumnsSessionKey, setRewriteColumnsSessionKey] = useState(0);
  const [elementColumnsSessionKey, setElementColumnsSessionKey] = useState(0);
  const elementDrafts = useRemakeDrafts(ELEMENT_DRAFTS_KEY, "element");
  const elementColumnsDrafts = useRemakeDrafts(ELEMENT_COLUMNS_DRAFTS_KEY, "element-columns");
  const structureDrafts = useRemakeDrafts(STRUCTURE_DRAFTS_KEY, "structure");
  const structureColumnsDrafts = useRemakeDrafts(STRUCTURE_COLUMNS_DRAFTS_KEY, "structure-columns");
  const rewriteColumnsDrafts = useRemakeDrafts(REWRITE_COLUMNS_DRAFTS_KEY, "rewrite-columns");
  const timer = useRef(null);
  const viewerCloseRef = useRef(null);
  const viewerReturnFocusRef = useRef(null);
  const segmentDetailCloseRef = useRef(null);
  const segmentDetailReturnFocusRef = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!viewer) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    viewerCloseRef.current?.focus();
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setViewer(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      viewerReturnFocusRef.current?.focus();
    };
  }, [viewer]);
  useEffect(() => {
    if (!segmentDetail) return undefined;
    const previousOverflow = document.body.style.overflow;
    segmentDetailReturnFocusRef.current = document.activeElement;
    document.body.style.overflow = "hidden";
    segmentDetailCloseRef.current?.focus();
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setSegmentDetail(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      segmentDetailReturnFocusRef.current?.focus();
    };
  }, [segmentDetail]);
  const notify = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2200);
  };
  const openViewer = (src, title) => {
    viewerReturnFocusRef.current = document.activeElement;
    setViewer({ src, title });
  };
  const save = () => {
    persistProject(localStorage, project, getStorageKey(mode));
    if (mode === "element") elementDrafts.save(JSON.parse(serializeProject(project)));
    if (mode === "element-columns") elementColumnsDrafts.save(JSON.parse(serializeProject(project)));
    if (mode === "structure") structureDrafts.save(JSON.parse(serializeProject(project)));
    if (mode === "structure-columns") structureColumnsDrafts.save(JSON.parse(serializeProject(project)));
    if (mode === "rewrite-columns") rewriteColumnsDrafts.save(JSON.parse(serializeProject(project)));
    notify("草稿已保存到当前浏览器");
  };
  const next = () => {
    const value = project;
    const operations = { 1: "拆解视频", 2: "生成替换结果", 3: "提取片段" };
    const result = advanceStep(value);
    const breakdownLog = createVideoBreakdownLog({
      videoName: value.videoName,
      videoPath: value.videoPath,
      model: value.model,
      aspectRatio: value.aspectRatio,
      quality: value.quality,
      breakdown: result.documents.breakdown,
      scriptResources: mode === "structure" ? structureDemo.replacementResources : originalReplacementResources,
      storyboardImages: mode === "structure" ? [structureDemo.referenceImage] : originalBoards,
    });
    const replacementResultLog = createReplacementResultLog({
      originalImages: mode === "structure" ? [] : originalBoards,
      replacedImages: mode === "structure" ? [] : replacedBoards,
      request: value.request,
      breakdown: value.documents.breakdown,
      storyboard: result.documents.storyboard,
      assets: value.assets,
    });
    const inputs = {
      1: breakdownLog.input,
      2: replacementResultLog,
      3: { storyboard: value.documents.storyboard, assets: value.assets, model: value.model, aspectRatio: value.aspectRatio, quality: value.quality },
    };
    const outputs = {
      1: breakdownLog.output,
      2: undefined,
      3: { segments: (mode === "structure" ? structureDemo.segments : segmentDocuments).map((segment) => ({ ...segment, content: result.documents[segment.id] || segment.content })) },
    };
    logRemakeFlow(mode, value.step, operations[value.step] || "下一步", inputs[value.step], outputs[value.step]);
    setProject(result);
  };
  const loadDemo = () => {
    setProject((value) => ({
      ...value,
      videoName: "需要复刻的模板视频.mp4",
      request: "",
      model: "seedance 2.0",
      aspectRatio: mode === "structure" || mode === "structure-columns" ? structureDemo.aspectRatio : value.aspectRatio,
      assets: [],
      assetCounters: { image: mode === "structure" ? 4 : 3, audio: 0, video: 0 },
      documents: {
        ...value.documents,
        breakdown: breakdownText,
        storyboard: mode === "structure" || mode === "structure-columns" ? structureDemo.storyboard : storyboardText,
        ...Object.fromEntries(
          (mode === "structure" || mode === "structure-columns" ? structureDemo.segments : segmentDocuments)
            .map((item) => [item.id, item.content]),
        ),
      },
    }));
    notify("Demo 素材已加载");
  };
  const loadColumnsDemo = () => {
    const columnsDemo = mode === "element-columns" ? elementColumnsDemo : mode === "rewrite-columns" ? rewriteColumnsDemo : structureDemo;
    setProject((value) => ({
      ...value,
      videoName: mode === "rewrite-columns" ? rewriteDemo.videoName : "需要复刻的模板视频.mp4",
      model: "seedance 2.5",
      aspectRatio: columnsDemo.aspectRatio,
      assets: columnsDemo.assets,
      assetCounters: { image: columnsDemo.assets.length, audio: 0, video: 0 },
      request: columnsDemo.request,
      documents: {
        ...value.documents,
        breakdown: columnsDemo.breakdown || breakdownText,
        storyboard: columnsDemo.storyboard,
        ...Object.fromEntries(columnsDemo.segments.map((item) => [item.id, item.content])),
      },
    }));
    notify("四列 Demo 素材已加载");
  };
  const regenerate = () => {
    if (regenerating) return;
    clearTimeout(timer.current);
    setRegenerating(true);
    timer.current = window.setTimeout(() => {
      setRegenerating(false);
      logRemakeFlow(mode, 3, "重新生成故事面板", {
        storyboard: project.documents.storyboard,
        request: project.request,
        assets: project.assets,
      }, { storyboard: project.documents.storyboard });
      notify("已生成一个新版本，原编辑内容已保留");
    }, 1300);
  };
  return (
    <main className="viral-remake-shell">
      {!mode ? (
        <ModeSelection onSelect={(nextMode) => {
          setMode(nextMode);
          const saved = localStorage.getItem(getStorageKey(nextMode));
          setProject(createInitialProject(saved || {}));
        }} notify={notify} />
      ) : mode === "element-columns" || mode === "structure-columns" || mode === "rewrite-columns" ? (
        <div className="remake-draft-layout remake-columns-draft-layout">
          <RemakeDraftSidebar
            storageKey={mode === "element-columns" ? ELEMENT_COLUMNS_DRAFTS_KEY : mode === "rewrite-columns" ? REWRITE_COLUMNS_DRAFTS_KEY : STRUCTURE_COLUMNS_DRAFTS_KEY}
            title={mode === "element-columns" ? "元素替换四屏任务记录" : mode === "rewrite-columns" ? "原片仿写四屏任务记录" : "结构仿写任务记录"}
            manager={mode === "element-columns" ? elementColumnsDrafts : mode === "rewrite-columns" ? rewriteColumnsDrafts : structureColumnsDrafts}
            onNew={() => {
              const manager = mode === "element-columns" ? elementColumnsDrafts : mode === "rewrite-columns" ? rewriteColumnsDrafts : structureColumnsDrafts;
              manager.setActiveId(null);
              setProject(createInitialProject());
              if (mode === "element-columns") setElementColumnsSessionKey((value) => value + 1);
              else if (mode === "rewrite-columns") setRewriteColumnsSessionKey((value) => value + 1);
              else setStructureColumnsSessionKey((value) => value + 1);
            }}
            onSelect={(draft) => {
              setProject(createInitialProject(draft.project));
              if (mode === "element-columns") setElementColumnsSessionKey((value) => value + 1);
              else if (mode === "rewrite-columns") setRewriteColumnsSessionKey((value) => value + 1);
              else setStructureColumnsSessionKey((value) => value + 1);
            }}
          />
          <StructureColumnsWorkspace
            key={mode === "element-columns" ? elementColumnsSessionKey : mode === "rewrite-columns" ? rewriteColumnsSessionKey : structureColumnsSessionKey}
            mode={mode}
            project={project}
            setProject={setProject}
            onBack={() => setMode(null)}
            onSave={save}
            onDemo={loadColumnsDemo}
            onOpen={openViewer}
            notify={notify}
          />
        </div>
      ) : (
        <div className="remake-draft-layout">
          {mode === "element" && <RemakeDraftSidebar storageKey={ELEMENT_DRAFTS_KEY} title="元素替换任务记录" manager={elementDrafts} onNew={() => { elementDrafts.setActiveId(null); setProject(createInitialProject()); }} onSelect={(draft) => setProject(createInitialProject(draft.project))} />}
          {mode === "structure" && <RemakeDraftSidebar storageKey={STRUCTURE_DRAFTS_KEY} title="结构仿写任务记录" manager={structureDrafts} onNew={() => { structureDrafts.setActiveId(null); setProject(createInitialProject()); }} onSelect={(draft) => setProject(createInitialProject(draft.project))} />}
          <div className="remake-workspace">
          <WorkflowHeader
            project={project}
            mode={mode}
            onBack={() => setMode(null)}
            onStep={(step) =>
              setProject((value) => setCurrentStep(value, step))
            }
            onSave={save}
          />
          {project.step === 1 && (
            <StepOne
              project={project}
              setProject={setProject}
              onDemo={loadDemo}
              onNext={next}
              notify={notify}
            />
          )}{" "}
          {project.step === 2 && (
            <StepTwo
              project={project}
              mode={mode}
              setProject={setProject}
              onNext={next}
          onOpen={openViewer}
              notify={notify}
            />
          )}{" "}
          {project.step === 3 && (
            <StepThree
              project={project}
              mode={mode}
              setProject={setProject}
              onNext={next}
            onOpen={openViewer}
              save={save}
              regenerate={regenerate}
              regenerating={regenerating}
            />
          )}{" "}
          {project.step === 4 && (
          <StepFour
            project={project}
            mode={mode}
            setProject={setProject}
            notify={notify}
          />
        )}{" "}
          </div>
        </div>
      )}
      {notice && (
        <div className="remake-toast">
          <CheckCircle2 />
          {notice}
        </div>
      )}
      {viewer && (
        <div
          className="remake-modal"
          role="dialog"
          aria-modal="true"
          aria-label={viewer.title}
          onMouseDown={(event) => {
            if (isBackdropSelfClick(event.target, event.currentTarget)) setViewer(null);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Tab") return;
            const focusable = Array.from(
              event.currentTarget.querySelectorAll(
                'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
              ),
            ).filter((element) => !element.disabled);
            const target = getTrappedFocusTarget(
              focusable,
              document.activeElement,
              event.shiftKey,
            );
            if (!target) return;
            event.preventDefault();
            target.focus();
          }}
        >
        <div className="remake-image-viewer">
            <header>
              <h2>{viewer.title}</h2>
              <span>点击关闭按钮返回工作台</span>
          </header>
          <div className="remake-modal-body">
            <img src={viewer.src} alt={viewer.title} />
          </div>
          <footer className="remake-modal-footer">
            <button
              ref={viewerCloseRef}
              className="remake-modal-close"
              onClick={() => setViewer(null)}
              aria-label="关闭预览"
            >
              关闭
            </button>
          </footer>
        </div>
        </div>
      )}
      {segmentDetail && (
        <div
          className="remake-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`${segmentDetail.title}故事面板`}
          onMouseDown={(event) => {
            if (isBackdropSelfClick(event.target, event.currentTarget)) {
              setSegmentDetail(null);
            }
          }}
          onKeyDown={(event) => {
            if (event.key !== "Tab") return;
            const focusable = Array.from(
              event.currentTarget.querySelectorAll(
                'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
              ),
            ).filter((element) => !element.disabled);
            const target = getTrappedFocusTarget(
              focusable,
              document.activeElement,
              event.shiftKey,
            );
            if (!target) return;
            event.preventDefault();
            target.focus();
          }}
        >
          <div className="remake-segment-modal">
            <header>
              <span className="remake-kicker">STORY PANEL</span>
              <h2>{segmentDetail.title}</h2>
              <p>
                {segmentDetail.time} · {segmentDetail.duration} ·{" "}
                {segmentDetail.shots}
              </p>
            </header>
            <div className="remake-modal-body">
              {project.documents[segmentDetail.id] ?? segmentDetail.content}
            </div>
            <footer className="remake-modal-footer">
              <button
                ref={segmentDetailCloseRef}
                className="remake-modal-close"
              onClick={() => setSegmentDetail(null)}
              aria-label="关闭详情"
            >
              关闭
            </button>
          </footer>
        </div>
        </div>
      )}
    </main>
  );
}
