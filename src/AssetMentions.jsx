import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AudioLines, Video } from "lucide-react";
import {
  findMentionCandidates,
  getMentionMenuPosition,
  isMentionClickOutside,
  keepWithinTextLimit,
  moveMentionSelection,
  parseAssetReferenceHref,
  splitAssetMentions,
} from "./viral-remake-state";

const assetType = (asset) => asset ? asset.type || "image" : "missing";
const assetSource = (asset) => asset?.preview || asset?.path;

function MentionThumb({ asset, menu = false }) {
  const type = assetType(asset);
  return <span className={menu ? `remake-mention-thumb ${type}` : "remake-token-thumb"} data-media-type={type} aria-hidden="true">{type === "image" && assetSource(asset) ? <img src={assetSource(asset)} alt="" /> : type === "audio" ? <AudioLines /> : type === "video" ? <Video /> : null}</span>;
}

export function MentionEditor({ value, assets, onChange, maxLength = 500, ariaLabel = "替换需求", placeholder = "输入替换需求，输入 @ 引用左侧素材" }) {
  const wrapRef = useRef(null);
  const editorRef = useRef(null);
  const rangeRef = useRef(null);
  const [query, setQuery] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuPosition, setMenuPosition] = useState({ left: 16, top: 16 });
  const candidates = query === null ? [] : findMentionCandidates(assets, query);

  const updateToken = (token, asset, reference) => {
    token.className = `remake-mention-token${asset ? "" : " missing"}`;
    token.contentEditable = "false";
    token.dataset.reference = reference;
    let thumb = token.querySelector(":scope > .remake-token-thumb");
    if (!thumb) { thumb = document.createElement("span"); token.prepend(thumb); }
    thumb.className = "remake-token-thumb";
    thumb.dataset.mediaType = assetType(asset);
    thumb.setAttribute("aria-hidden", "true");
    thumb.replaceChildren();
    if (assetType(asset) === "image" && assetSource(asset)) {
      const image = document.createElement("img");
      image.src = assetSource(asset);
      image.alt = "";
      thumb.append(image);
    }
    const label = [...token.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
    if (label) label.nodeValue = reference;
    else token.append(document.createTextNode(reference));
  };
  const createToken = (asset, reference) => {
    const token = document.createElement("span");
    updateToken(token, asset, reference);
    return token;
  };
  const renderValue = (force = false, nextValue = value) => {
    const editor = editorRef.current;
    if (!editor || (!force && document.activeElement === editor)) return;
    editor.replaceChildren();
    nextValue.split(/(@(?:图片|音频|视频)\d+)/g).filter(Boolean).forEach((part) => {
      if (!/^@(图片|音频|视频)\d+$/.test(part)) return editor.append(document.createTextNode(part));
      const asset = assets.find((item) => `@${item.role}` === part);
      editor.append(createToken(asset, part));
    });
  };
  useEffect(renderValue, [value]);
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.querySelectorAll(".remake-mention-token").forEach((token) => updateToken(token, assets.find((item) => `@${item.role}` === token.dataset.reference), token.dataset.reference));
  }, [assets]);
  useEffect(() => setActiveIndex(0), [query]);
  useEffect(() => {
    if (query === null) return undefined;
    const dismiss = (event) => { if (isMentionClickOutside(wrapRef.current, event.target)) setQuery(null); };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [query]);
  const serialize = () => editorRef.current?.innerText.replace(/\u00a0/g, " ") || "";
  const sync = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    rangeRef.current = range.cloneRange();
    const attempted = serialize();
    const text = keepWithinTextLimit(value, attempted, maxLength);
    if (text !== attempted) {
      renderValue(true, value);
      const end = document.createRange();
      end.selectNodeContents(editor);
      end.collapse(false);
      selection.removeAllRanges();
      selection.addRange(end);
      rangeRef.current = end.cloneRange();
      setQuery(null);
      return;
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
      setMenuPosition(getMentionMenuPosition({ right: caretRect.right - wrapRect.left, bottom: caretRect.bottom - wrapRect.top }, wrapRef.current.clientWidth));
    }
    setQuery(match ? match[1] : null);
  };
  const insertMention = (asset) => {
    const range = rangeRef.current;
    const editor = editorRef.current;
    if (!range || !editor) return;
    const removeLength = (query?.length || 0) + 1;
    if (serialize().length - removeLength + asset.role.length + 2 > maxLength) return setQuery(null);
    if (range.startContainer.nodeType === Node.TEXT_NODE && range.startOffset >= removeLength) range.setStart(range.startContainer, range.startOffset - removeLength);
    range.deleteContents();
    const space = document.createTextNode("\u00a0");
    range.insertNode(space);
    range.insertNode(createToken(asset, `@${asset.role}`));
    range.setStartAfter(space);
    range.collapse(true);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    editor.focus();
    setQuery(null);
    onChange(serialize());
  };
  return <div ref={wrapRef} className="remake-mention-wrap"><div ref={editorRef} className="remake-mention-editor" contentEditable role="textbox" aria-label={ariaLabel} aria-multiline="true" aria-activedescendant={query !== null && candidates[activeIndex] ? `mention-option-${candidates[activeIndex].id}` : undefined} data-placeholder={placeholder} onInput={sync} onKeyUp={(event) => !["Escape", "ArrowDown", "ArrowUp", "Enter"].includes(event.key) && sync()} onKeyDown={(event) => {
    if (event.key === "Escape") { event.preventDefault(); setQuery(null); setActiveIndex(0); }
    if (query !== null && (event.key === "ArrowDown" || event.key === "ArrowUp")) { event.preventDefault(); setActiveIndex((index) => moveMentionSelection(index, event.key === "ArrowDown" ? 1 : -1, candidates.length)); }
    if (event.key === "Enter" && query !== null && candidates[activeIndex]) { event.preventDefault(); insertMention(candidates[activeIndex]); setActiveIndex(0); }
  }} />{query !== null && <div className="remake-mention-menu" role="listbox" aria-label="引用素材" style={menuPosition}>{candidates.length ? candidates.map((asset, index) => <button type="button" role="option" id={`mention-option-${asset.id}`} aria-selected={index === activeIndex} className={index === activeIndex ? "active" : ""} key={asset.id} onMouseEnter={() => setActiveIndex(index)} onMouseDown={(event) => event.preventDefault()} onClick={() => insertMention(asset)}><MentionThumb asset={asset} menu /><span className="remake-mention-copy"><b>@{asset.role}</b><small>{assetType(asset) === "image" ? "图片" : assetType(asset) === "audio" ? "音频" : "视频"} · {asset.name}</small></span></button>) : <p>没有匹配的素材</p>}</div>}<span className="remake-request-count">{value.length}/{maxLength}</span></div>;
}

function remarkAssetMentions() {
  return (tree) => {
    const visit = (node) => {
      if (!Array.isArray(node.children)) return;
      node.children = node.children.flatMap((child) => {
        if (child.type !== "text" && child.type !== "inlineCode") { visit(child); return [child]; }
        return splitAssetMentions(child.value).map((part) => part.type === "mention" ? { type: "link", url: `#asset-${encodeURIComponent(part.role)}`, children: [{ type: "text", value: part.value }] } : { type: child.type, value: part.value });
      });
    };
    visit(tree);
  };
}

export function AssetMention({ asset, reference }) {
  return <span className={`remake-mention-token${asset ? "" : " missing"}`} data-reference={`@${reference}`} title={asset?.name || "素材已删除"} aria-label={asset ? `@${reference}，${asset.name}` : `@${reference}，素材已删除`}><MentionThumb asset={asset} />@{reference}</span>;
}

export function AssetMarkdown({ value, assets, className = "" }) {
  return <div className={`remake-markdown-body ${className}`.trim()}><ReactMarkdown remarkPlugins={[remarkGfm, remarkAssetMentions]} components={{ a({ href, children }) { const role = parseAssetReferenceHref(href); return role ? <AssetMention asset={assets.find((item) => item.role === role)} reference={role} /> : <a href={href}>{children}</a>; } }}>{value}</ReactMarkdown></div>;
}
