import React, { useEffect, useRef, useState } from "react";
import { FileVideo, MoreHorizontal, Pencil, Pin, Plus, Search, Trash2 } from "lucide-react";
import { REWRITE_DRAFTS_KEY, createDraftCollection, deleteDraft, filterDrafts, getDraftModeLabel, persistDrafts, saveDraft, toggleDraftPin, updateDraftTitle } from "./remake-drafts-state";

export function useRemakeDrafts(storageKey, mode) {
  const [drafts, setDrafts] = useState(() => createDraftCollection(localStorage.getItem(storageKey) || []));
  const [activeId, setActiveId] = useState(null);
  useEffect(() => { persistDrafts(localStorage, storageKey, drafts); }, [drafts, storageKey]);
  return {
    drafts,
    activeId,
    setActiveId,
    save(project) {
      const id = activeId || `draft-${Date.now()}`;
      setDrafts((items) => saveDraft(items, { mode, project }, id));
      setActiveId(id);
      return id;
    },
    rename: (id, title) => setDrafts((items) => updateDraftTitle(items, id, title)),
    togglePin: (id) => setDrafts((items) => toggleDraftPin(items, id)),
    remove: (id) => setDrafts((items) => deleteDraft(items, id)),
  };
}

export default function RemakeDraftSidebar({ storageKey, title, manager, onNew, onSelect }) {
  const heading = title || (storageKey === REWRITE_DRAFTS_KEY ? "原片仿写任务记录" : "元素替换任务记录");
  const [query, setQuery] = useState("");
  const [menuId, setMenuId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const menuRef = useRef(null);
  useEffect(() => {
    if (!menuId) return undefined;
    const close = (event) => { if (!menuRef.current?.contains(event.target)) setMenuId(null); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [menuId]);
  const shown = filterDrafts(manager.drafts, query);
  const finishRename = (id) => { manager.rename(id, editTitle); setRenamingId(null); };
  return <aside className="remake-draft-sidebar" aria-label={heading} data-storage-key={storageKey}>
    <header><strong>{heading}</strong></header>
    <button className="remake-draft-new" onClick={onNew}><Plus />新建任务</button>
    <label className="remake-draft-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索任务" aria-label="搜索任务" /></label>
    <div className="remake-draft-list">
      {shown.map((draft) => <article className={manager.activeId === draft.id ? "active" : ""} key={draft.id}>
        <button className="remake-draft-main" onClick={() => { manager.setActiveId(draft.id); onSelect(draft); }}>
          <span className="remake-draft-thumb"><FileVideo /></span>
          <span>{renamingId === draft.id ? <input autoFocus value={editTitle} aria-label="重命名草稿" onClick={(event) => event.stopPropagation()} onChange={(event) => setEditTitle(event.target.value)} onBlur={() => finishRename(draft.id)} onKeyDown={(event) => { if (event.key === "Enter") finishRename(draft.id); if (event.key === "Escape") setRenamingId(null); }} /> : <b>{draft.pinned && <Pin />}{draft.title}</b>}<small>{getDraftModeLabel(draft.mode)}<i />{draft.updatedAt === "刚刚" ? "刚刚" : new Date(draft.updatedAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</small></span>
        </button>
        <button className="remake-draft-more" aria-label={`${draft.title}更多操作`} onClick={() => setMenuId(menuId === draft.id ? null : draft.id)}><MoreHorizontal /></button>
        {menuId === draft.id && <div className="remake-draft-menu" ref={menuRef}><button onClick={() => { manager.togglePin(draft.id); setMenuId(null); }}><Pin />{draft.pinned ? "取消置顶" : "置顶"}</button><button onClick={() => { setEditTitle(draft.title); setRenamingId(draft.id); setMenuId(null); }}><Pencil />重命名</button><button className="danger" onClick={() => { manager.remove(draft.id); setMenuId(null); if (manager.activeId === draft.id) onNew(); }}><Trash2 />删除</button></div>}
      </article>)}
      {!shown.length && <div className="remake-draft-empty">暂无草稿记录</div>}
    </div>
  </aside>;
}
