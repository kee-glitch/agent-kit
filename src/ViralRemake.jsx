import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
  Package,
  Pill,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
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
} from "./viral-remake-data";
import {
  ASPECT_RATIOS,
  BOUND_ASSET_ACCEPT,
  GENERAL_ASSET_ACCEPT,
  STORAGE_KEY,
  addSequencedAssets,
  advanceStep,
  beginLatestRequest,
  canAdvance,
  clearRunningStatuses,
  clearVideo,
  createInitialProject,
  findMentionCandidates,
  findBoundReplacementAsset,
  getMentionMenuPosition,
  getTrappedFocusTarget,
  isMentionClickOutside,
  isBackdropSelfClick,
  isLatestRequest,
  getMediaType,
  getSelectedSegmentIds,
  toggleAllSegmentSelections,
  keepWithinTextLimit,
  moveMentionSelection,
  nextAssetLabel,
  persistProject,
  parseAssetReferenceHref,
  queueGeneration,
  removeReplacementAsset,
  replaceSequencedAsset,
  setCurrentStep,
  setGenerationStatus,
  splitAssetMentions,
  replaceVideo,
  updateDocument,
  updateReplacementAsset,
  upsertBoundReplacementAsset,
} from "./viral-remake-state";
import "./viral-remake.css";

const MODELS = [
  "seedance 2.0 mini",
  "seedance 2.0 fast",
  "seedance 2.0",
  "seedance 2.5",
];

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
              <span>{mode.index}</span>
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
              {mode.id === "element" ? (
                <Layers3 />
              ) : mode.id === "rewrite" ? (
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
              onClick={() => mode.active && onSelect()}
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
        <span>当前仅开放元素替换模式</span>
        <i />
        <span>所有处理均为前端 Demo 演示</span>
      </footer>
    </main>
  );
}

function WorkflowHeader({ project, onBack, onStep, onSave, onReset }) {
  return (
    <>
      <header className="remake-project-header">
        <div className="remake-project-title">
          <button aria-label="返回模式选择" onClick={onBack}>
            <ArrowLeft />
          </button>
          <div>
            <span>爆款复刻 / 元素替换</span>
            <strong>{project.videoName || "未命名项目"}</strong>
          </div>
        </div>
        <div className="remake-header-actions">
          <button onClick={onReset}>
            <RotateCcw />
            重新开始
          </button>
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

function BoundReplacementRow({ resource, asset, onChoose, onClear }) {
  const ResourceIcon =
    resource.type === "person"
      ? UserRound
      : resource.type === "detail"
        ? Pill
        : Package;
  const UploadedIcon =
    asset?.type === "audio" ? AudioLines : asset?.type === "image" ? ImageIcon : Video;

  return (
    <article className="remake-bound-resource-row">
      <label
        className={`remake-bound-resource-media${asset ? " has-asset" : ""}`}
        aria-label={asset ? `替换${resource.title}素材` : `上传${resource.title}素材`}
      >
        <input type="file" accept={BOUND_ASSET_ACCEPT} onChange={onChoose} />
        {asset?.type === "image" && (asset.preview || asset.path) ? (
          <img src={asset.preview || asset.path} alt="" />
        ) : asset?.type === "video" && asset.preview ? (
          <video src={asset.preview} muted />
        ) : asset ? (
          <UploadedIcon />
        ) : (
          <ResourceIcon />
        )}
      </label>
      <div className="remake-bound-resource-copy">
        <b>{resource.title}</b>
        <p>{resource.description}</p>
      </div>
      {asset ? (
        <button type="button" className="remake-bound-clear" onClick={onClear}>
          <Trash2 />
          清空
        </button>
      ) : (
        <label className="remake-bound-upload-action">
          <input type="file" accept={BOUND_ASSET_ACCEPT} onChange={onChoose} />
          <Upload />
          上传
        </label>
      )}
    </article>
  );
}

function MentionEditor({ value, assets, onChange }) {
  const wrapRef = useRef(null);
  const editorRef = useRef(null);
  const rangeRef = useRef(null);
  const [query, setQuery] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuPosition, setMenuPosition] = useState({ left: 16, top: 16 });
  const candidates = query === null ? [] : findMentionCandidates(assets, query);
  const updateMentionToken = (token, asset, reference) => {
    token.className = `remake-mention-token${asset ? "" : " missing"}`;
    token.contentEditable = "false";
    token.dataset.reference = reference;
    let thumb = token.querySelector(":scope > .remake-token-thumb");
    if (!thumb) {
      thumb = document.createElement("span");
      token.prepend(thumb);
    }
    thumb.className = "remake-token-thumb";
    thumb.dataset.mediaType = asset?.type || "missing";
    thumb.setAttribute("aria-hidden", "true");
    thumb.replaceChildren();
    if (asset?.type === "image" && (asset.preview || asset.path)) {
      const image = document.createElement("img");
      image.src = asset.preview || asset.path;
      image.alt = "";
      thumb.append(image);
    }
    const label = Array.from(token.childNodes).find(
      (node) => node.nodeType === Node.TEXT_NODE,
    );
    if (label) label.nodeValue = reference;
    else token.append(document.createTextNode(reference));
  };
  const createMentionToken = (asset, reference) => {
    const token = document.createElement("span");
    updateMentionToken(token, asset, reference);
    return token;
  };
  const renderValue = (force = false, nextValue = value) => {
    const editor = editorRef.current;
    if (!editor || (!force && document.activeElement === editor)) return;
    editor.replaceChildren();
    nextValue
      .split(/(@(?:图片|音频|视频)\d+)/g)
      .filter(Boolean)
      .forEach((part) => {
        if (!/^@(图片|音频|视频)\d+$/.test(part))
          return editor.append(document.createTextNode(part));
        const asset = assets.find((item) => `@${item.role}` === part);
        editor.append(createMentionToken(asset, part));
      });
  };
  useEffect(renderValue, [value]);
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.querySelectorAll(".remake-mention-token").forEach((token) => {
      const reference = token.dataset.reference;
      const asset = assets.find((item) => `@${item.role}` === reference);
      updateMentionToken(token, asset, reference);
    });
  }, [assets]);
  useEffect(() => setActiveIndex(0), [query]);
  useEffect(() => {
    if (query === null) return undefined;
    const dismissOnOutsidePress = (event) => {
      if (isMentionClickOutside(wrapRef.current, event.target)) {
        setQuery(null);
        setActiveIndex(0);
      }
    };
    document.addEventListener("pointerdown", dismissOnOutsidePress);
    return () =>
      document.removeEventListener("pointerdown", dismissOnOutsidePress);
  }, [query]);
  const serializeEditor = (editor) => editor.innerText;
  const sync = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    rangeRef.current = range.cloneRange();
    const attempted = serializeEditor(editor).replace(/\u00a0/g, " ");
    const text = keepWithinTextLimit(value, attempted);
    if (text !== attempted) {
      renderValue(true, value);
      const end = document.createRange();
      end.selectNodeContents(editor);
      end.collapse(false);
      selection.removeAllRanges();
      selection.addRange(end);
      rangeRef.current = end.cloneRange();
    }
    onChange(text);
    const before = range.cloneRange();
    before.selectNodeContents(editor);
    before.setEnd(range.endContainer, range.endOffset);
    const match = before.toString().match(/@([^@\s]*)$/);
    if (match && wrapRef.current) {
      const caret = range.cloneRange();
      caret.collapse(false);
      const caretRect = caret.getBoundingClientRect();
      const wrapRect = wrapRef.current.getBoundingClientRect();
      setMenuPosition(
        getMentionMenuPosition(
          {
            right: caretRect.right - wrapRect.left,
            bottom: caretRect.bottom - wrapRect.top,
          },
          wrapRef.current.clientWidth,
        ),
      );
    }
    setQuery(match ? match[1] : null);
  };
  const insertMention = (asset) => {
    const range = rangeRef.current;
    const editor = editorRef.current;
    if (!range || !editor) return;
    const removeLength = (query?.length || 0) + 1;
    const currentText = serializeEditor(editor).replace(/\u00a0/g, " ");
    const nextLength =
      currentText.length - removeLength + asset.role.length + 2;
    if (nextLength > 500) {
      setQuery(null);
      return;
    }
    if (
      range.startContainer.nodeType === Node.TEXT_NODE &&
      range.startOffset >= removeLength
    )
      range.setStart(range.startContainer, range.startOffset - removeLength);
    range.deleteContents();
    const token = createMentionToken(asset, `@${asset.role}`);
    const space = document.createTextNode("\u00a0");
    range.insertNode(space);
    range.insertNode(token);
    range.setStartAfter(space);
    range.collapse(true);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    editor.focus();
    setQuery(null);
    onChange(serializeEditor(editor).replace(/\u00a0/g, " "));
  };
  return (
    <div ref={wrapRef} className="remake-mention-wrap">
      <div
        ref={editorRef}
        className="remake-mention-editor"
        contentEditable
        role="textbox"
        aria-label="替换需求"
        aria-multiline="true"
        aria-activedescendant={
          query !== null && candidates[activeIndex]
            ? `mention-option-${candidates[activeIndex].id}`
            : undefined
        }
        data-placeholder="输入替换需求，输入 @ 引用左侧素材"
        onInput={sync}
        onKeyUp={(event) =>
          !["Escape", "ArrowDown", "ArrowUp", "Enter"].includes(event.key) &&
          sync()
        }
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            setQuery(null);
            setActiveIndex(0);
          }
          if (
            query !== null &&
            (event.key === "ArrowDown" || event.key === "ArrowUp")
          ) {
            event.preventDefault();
            setActiveIndex((index) =>
              moveMentionSelection(
                index,
                event.key === "ArrowDown" ? 1 : -1,
                candidates.length,
              ),
            );
          }
          if (
            event.key === "Enter" &&
            query !== null &&
            candidates[activeIndex]
          ) {
            event.preventDefault();
            insertMention(candidates[activeIndex]);
            setActiveIndex(0);
          }
        }}
      />
      {query !== null && (
        <div
          className="remake-mention-menu"
          role="listbox"
          aria-label="引用替换素材"
          style={menuPosition}
        >
          {candidates.length ? (
            candidates.map((asset, index) => (
              <button
                type="button"
                role="option"
                id={`mention-option-${asset.id}`}
                aria-selected={index === activeIndex}
                className={index === activeIndex ? "active" : ""}
                key={asset.id}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => insertMention(asset)}
              >
                <span className={`remake-mention-thumb ${asset.type}`}>
                  {asset.type === "image" && (asset.preview || asset.path) ? (
                    <img src={asset.preview || asset.path} alt="" />
                  ) : asset.type === "audio" ? (
                    <AudioLines />
                  ) : (
                    <Video />
                  )}
                </span>
                <span className="remake-mention-copy">
                  <b>@{asset.role}</b>
                  <small>
                    {asset.type === "image"
                      ? "图片"
                      : asset.type === "audio"
                        ? "音频"
                        : "视频"}{" "}
                    · {asset.name}
                  </small>
                </span>
              </button>
            ))
          ) : (
            <p>没有匹配的素材</p>
          )}
        </div>
      )}
      <small className="remake-request-count">{value.length}/500</small>
      <span className="remake-at-hint">
        <AtSign />
        输入 @ 引用素材
      </span>
    </div>
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

function remarkAssetMentions() {
  return (tree) => {
    const visit = (node) => {
      if (!Array.isArray(node.children)) return;
      node.children = node.children.flatMap((child) => {
        if (child.type !== "text" && child.type !== "inlineCode") {
          visit(child);
          return [child];
        }
        const parts = splitAssetMentions(child.value);
        if (!parts.some((part) => part.type === "mention")) return [child];
        return parts.map((part) =>
          part.type === "mention"
            ? {
                type: "link",
                url: `#asset-${encodeURIComponent(part.role)}`,
                children: [{ type: "text", value: part.value }],
              }
            : { type: child.type, value: part.value },
        );
      });
    };
    visit(tree);
  };
}

function AssetMention({ asset, reference }) {
  return (
    <span
      className={`remake-mention-token${asset ? "" : " missing"}`}
      data-reference={`@${reference}`}
      title={asset?.name || "素材已删除"}
      aria-label={asset ? `@${reference}，${asset.name}` : `@${reference}，素材已删除`}
    >
      <span
        className="remake-token-thumb"
        data-media-type={asset?.type || "missing"}
        aria-hidden="true"
      >
        {asset?.type === "image" && (asset.preview || asset.path) && (
          <img src={asset.preview || asset.path} alt="" />
        )}
      </span>
      @{reference}
    </span>
  );
}

function AssetMarkdown({ value, assets, className = "" }) {
  return (
    <div className={`remake-markdown-body ${className}`.trim()}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkAssetMentions]}
        components={{
          a({ href, children }) {
            const role = parseAssetReferenceHref(href);
            if (role) {
              return (
                <AssetMention
                  asset={assets.find((item) => item.role === role)}
                  reference={role}
                />
              );
            }
            return <a href={href}>{children}</a>;
          },
        }}
      >
        {value}
      </ReactMarkdown>
    </div>
  );
}

function DocumentEditor({
  title,
  value,
  assets,
  onSave,
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
            <button className="primary" onClick={onSave}>
              <Save />
              保存
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

function StepTwo({ project, setProject, onNext, onOpen, notify }) {
  const value = project.documents.breakdown ?? breakdownText;
  const latestBoundRequestRef = useRef(new Map());
  const latestAssetRequestRef = useRef(new Map());
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
    setProject((current) => addSequencedAssets(current, added));
  };
  const chooseBoundAsset = async (sourceId, role, event) => {
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
    setProject((current) => upsertBoundReplacementAsset(current, addition));
  };
  const clearBoundAsset = (sourceId, assetId) => {
    beginLatestRequest(latestBoundRequestRef.current, sourceId);
    removeAsset(assetId);
  };
  const replaceAsset = async (id, file) => {
    const request = beginLatestRequest(latestAssetRequestRef.current, id);
    const preview = await readFile(file);
    if (!isLatestRequest(latestAssetRequestRef.current, id, request)) return;
    setProject((currentProject) => {
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
  const removeAsset = (id) => {
    beginLatestRequest(latestAssetRequestRef.current, id);
    setProject((current) => removeReplacementAsset(current, id));
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
          <h2>原视频逐秒分镜</h2>
          <p>每 15 秒生成一张总览图，点击查看大图。</p>
        </div>
        <span>3 张 · 42 帧</span>
      </div>
      <BoardGallery originals onOpen={onOpen} />
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
            {originalReplacementResources.map((resource) => {
              const asset = findBoundReplacementAsset(project.assets, resource.id);
              return (
                <BoundReplacementRow
                  key={resource.id}
                  resource={resource}
                  asset={asset}
                  onChoose={(event) => chooseBoundAsset(resource.id, resource.role, event)}
                  onClear={() => asset && clearBoundAsset(resource.id, asset.id)}
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
                替换需求 <span className="remake-optional-label">非必填</span>
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
          <h1>校对替换结果</h1>
          <p>人物、产品与方糖已写入新故事面板，并生成逐秒画面对照。</p>
        </div>
      </div>
      <article className="remake-document remake-comparison-card">
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
      </article>
      <DocumentEditor
        title="替换后的故事面板"
        value={value}
        assets={project.assets}
        onSave={save}
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
  const videoCloseRef = useRef(null);
  const videoReturnFocusRef = useRef(null);
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

  useEffect(() => {
    if (!videoOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    videoCloseRef.current?.focus();
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setVideoOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      videoReturnFocusRef.current?.focus();
    };
  }, [videoOpen]);

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
              onClick={(event) => {
                videoReturnFocusRef.current = event.currentTarget;
                setVideoOpen(true);
              }}
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
      {videoOpen && (
        <div
          className="remake-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`${segment.title}生成视频`}
          onClick={(event) => {
            if (isBackdropSelfClick(event.target, event.currentTarget)) setVideoOpen(false);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Tab") return;
            const focusable = Array.from(
              event.currentTarget.querySelectorAll(
                'button:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])',
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
        <article className="remake-video-modal">
          <header className="remake-segment-modal-header">
            <span>0{index + 1}</span>
            <h2>{segment.title}</h2>
            <p>{segment.time} · {segment.duration} · {segment.shots}</p>
          </header>
          <div className="remake-modal-body">
            <video controls autoPlay src="./viral-remake-demo/template.mp4" />
          </div>
          <footer className="remake-modal-footer">
            <button
              ref={videoCloseRef}
              className="remake-modal-close"
              onClick={() => setVideoOpen(false)}
              aria-label="关闭视频"
            >
              关闭
            </button>
          </footer>
        </article>
        </div>
      )}
    </article>
  );
}

function StepFour({
  project,
  setProject,
  notify,
}) {
  const timers = useRef(new Map());
  const inFlight = useRef(new Set());
  const [selectedSegments, setSelectedSegments] = useState(
    () => new Set(segmentDocuments.map((segment) => segment.id)),
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
    setProject((value) => queueGeneration(value, started).project);
    started.forEach((id, index) => {
      const timer = window.setTimeout(() => {
        inFlight.current.delete(id);
        timers.current.delete(id);
        setProject((value) => setGenerationStatus(value, id, "done"));
        notify(`${segmentDocuments.find((item) => item.id === id)?.title}生成完成`);
      }, 1400 + index * 220);
      timers.current.set(id, timer);
    });
  };

  const availableSegmentIds = segmentDocuments.map((segment) => segment.id);
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
        {segmentDocuments.map((segment, index) => {
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

function StepFive({ project, setProject, notify, openSegment }) {
  const timers = useRef(new Map());
  const inFlight = useRef(new Set());
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current.clear();
      inFlight.current.clear();
      setProject((value) => clearRunningStatuses(value));
    },
    [setProject],
  );
  const beginGeneration = (ids) => {
    const started = ids.filter((id) => !inFlight.current.has(id));
    if (!started.length) {
      notify("所选片段已在生成中");
      return;
    }
    started.forEach((id) => inFlight.current.add(id));
    setProject((value) => queueGeneration(value, started).project);
    started.forEach((id, index) => {
      const timer = window.setTimeout(
        () => {
          inFlight.current.delete(id);
          timers.current.delete(id);
          setProject((value) => setGenerationStatus(value, id, "done"));
          notify(
            `${segmentDocuments.find((item) => item.id === id)?.title}生成完成`,
          );
        },
        1400 + index * 220,
      );
      timers.current.set(id, timer);
    });
  };
  const generate = (id) => beginGeneration([id]);
  const batch = () => beginGeneration(segmentDocuments.map((item) => item.id));
  return (
    <section className="remake-stage">
      <div className="remake-stage-heading">
        <div>
          <span className="remake-kicker">STEP 05</span>
          <h1>生成复刻视频</h1>
          <p>检查每段故事面板后单独生成，或一次性提交全部片段。</p>
        </div>
        <button className="remake-primary" onClick={batch}>
          <Sparkles />
          批量生成全部
        </button>
      </div>
      <div className="remake-generation-overview">
        <div>
          <b>3</b>
          <span>生成片段</span>
        </div>
        <div>
          <b>41s</b>
          <span>合成后时长</span>
        </div>
        <div>
          <b>{project.aspectRatio}</b>
          <span>画面比例</span>
        </div>
        <div>
          <b>{project.model}</b>
          <span>视频模型</span>
        </div>
      </div>
      <div className="remake-generate-list">
        {segmentDocuments.map((segment, index) => {
          const status = project.generation[segment.id] || "idle";
          const thumb = replacedBoards[index];
          return (
            <article key={segment.id}>
              <button
                className="remake-video-thumb"
                onClick={() => openSegment(segment)}
              >
                <img src={thumb} alt={`${segment.title}预览`} />
                <span>
                  <Play />
                </span>
                <i>{segment.duration}</i>
              </button>
              <div className="remake-video-info">
                <header>
                  <div>
                    <span>0{index + 1}</span>
                    <div>
                      <h2>{segment.title}</h2>
                      <p>
                        {segment.time} · {segment.shots}
                      </p>
                    </div>
                  </div>
                  <em className={status}>
                    {status === "done"
                      ? "已完成"
                      : status === "running"
                        ? "生成中"
                        : "待生成"}
                  </em>
                </header>
              <p>{segment.summary}</p>
                <footer>
                  <button onClick={() => openSegment(segment)}>
                    <FileText />
                    查看故事面板
                  </button>
                  <button
                    className="primary"
                    disabled={status === "running"}
                    onClick={() => generate(segment.id)}
                  >
                    {status === "running" ? (
                      <LoaderCircle className="spin" />
                    ) : status === "done" ? (
                      <RefreshCw />
                    ) : (
                      <Video />
                    )}
                    {status === "done"
                      ? "重新生成"
                      : status === "running"
                        ? "生成中"
                        : "生成视频"}
                  </button>
                </footer>
              </div>
            </article>
          );
        })}
      </div>
      <div className="remake-stage-footer">
        <button
          className="remake-secondary"
          onClick={() => setProject((value) => setCurrentStep(value, 4))}
        >
          <ArrowLeft />
          返回片段编辑
        </button>
        <span>生成结果仅用于前端流程演示</span>
      </div>
    </section>
  );
}

export default function ViralRemake() {
  const [selected, setSelected] = useState(false);
  const [project, setProject] = useState(() =>
    createInitialProject(localStorage.getItem(STORAGE_KEY) || {}),
  );
  const [notice, setNotice] = useState("");
  const [viewer, setViewer] = useState(null);
  const [segmentDetail, setSegmentDetail] = useState(null);
  const [regenerating, setRegenerating] = useState(false);
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
    persistProject(localStorage, project);
    notify("草稿已保存到当前浏览器");
  };
  const next = () => setProject((value) => advanceStep(value));
  const loadDemo = () => {
    setProject((value) => ({
      ...value,
      videoName: "需要复刻的模板视频.mp4",
      request: demoRequest,
      model: "seedance 2.0",
      assets: demoAssets,
      assetCounters: { image: 3, audio: 0, video: 0 },
      documents: {
        ...value.documents,
        breakdown: breakdownText,
        storyboard: storyboardText,
        ...Object.fromEntries(
          segmentDocuments.map((item) => [item.id, item.content]),
        ),
      },
    }));
    notify("Demo 素材已加载");
  };
  const regenerate = () => {
    if (regenerating) return;
    clearTimeout(timer.current);
    setRegenerating(true);
    timer.current = window.setTimeout(() => {
      setRegenerating(false);
      notify("已生成一个新版本，原编辑内容已保留");
    }, 1300);
  };
  const reset = () => {
    if (!window.confirm("确定清空当前草稿并重新开始吗？")) return;
    localStorage.removeItem(STORAGE_KEY);
    setProject(createInitialProject());
    setSelected(false);
    notify("项目已重置");
  };
  return (
    <main className="viral-remake-shell">
      {!selected ? (
        <ModeSelection onSelect={() => setSelected(true)} notify={notify} />
      ) : (
        <div className="remake-workspace">
          <WorkflowHeader
            project={project}
            onBack={() => setSelected(false)}
            onStep={(step) =>
              setProject((value) => setCurrentStep(value, step))
            }
            onSave={save}
            onReset={reset}
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
              setProject={setProject}
              onNext={next}
          onOpen={openViewer}
              notify={notify}
            />
          )}{" "}
          {project.step === 3 && (
            <StepThree
              project={project}
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
            setProject={setProject}
            notify={notify}
          />
        )}{" "}
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
