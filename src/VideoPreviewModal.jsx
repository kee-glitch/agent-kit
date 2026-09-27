import React, { useEffect, useRef } from "react";
import { getTrappedFocusTarget, isBackdropSelfClick } from "./viral-remake-state";

export default function VideoPreviewModal({ open, onClose, src, title, badge, subtitle }) {
  const modalRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const closeOnKeydown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        modalRef.current?.querySelectorAll('button:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])') || [],
      );
      const target = getTrappedFocusTarget(focusable, document.activeElement, event.shiftKey);
      if (target) {
        event.preventDefault();
        target.focus();
      }
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnKeydown);
    requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnKeydown);
      previousFocus?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="remake-modal" role="dialog" aria-modal="true" aria-label={`${title}视频播放`} onMouseDown={(event) => {
      if (isBackdropSelfClick(event.target, event.currentTarget)) onClose();
    }}>
      <article ref={modalRef} className="remake-video-modal shared-video-preview">
        <header className="remake-segment-modal-header">
          {badge && <span>{badge}</span>}
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </header>
        <div className="remake-modal-body"><video controls autoPlay playsInline src={src} /></div>
        <footer className="remake-modal-footer"><button ref={closeRef} type="button" className="remake-modal-close" onClick={onClose}>关闭</button></footer>
      </article>
    </div>
  );
}
