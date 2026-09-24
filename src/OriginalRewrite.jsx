import React, { useState } from "react";
import { ArrowLeft, Check, RotateCcw, Save } from "lucide-react";
import { rewriteSteps } from "./original-rewrite-data";
import { REWRITE_STORAGE_KEY, createRewriteProject, persistRewriteProject, setRewriteStep } from "./original-rewrite-state";
import "./original-rewrite.css";

export default function OriginalRewrite({ onBack, notify }) {
  const [project, setProject] = useState(() => createRewriteProject(localStorage.getItem(REWRITE_STORAGE_KEY)));
  const reset = () => setProject(createRewriteProject());
  return (
    <section className="original-rewrite">
      <header className="rewrite-project-header">
        <div><button aria-label="返回模式选择" onClick={onBack}><ArrowLeft /></button><span>爆款复刻 / 原片仿写</span><strong>{project.videoName || "未命名项目"}</strong></div>
        <div><button onClick={reset}><RotateCcw />重新开始</button><button className="primary" onClick={() => { persistRewriteProject(localStorage, project); notify("原片仿写草稿已保存"); }}><Save />保存草稿</button></div>
      </header>
      <nav className="rewrite-steps" aria-label="原片仿写项目进度">
        {rewriteSteps.map((label, index) => { const number = index + 1; const complete = number < project.step; return <button key={label} className={number === project.step ? "active" : complete ? "complete" : ""} disabled={number > project.maxStep} onClick={() => setProject((value) => setRewriteStep(value, number))}><span>{complete ? <Check /> : number}</span><b>{label}</b></button>; })}
      </nav>
      <div className="rewrite-stage"><span className="remake-kicker">STEP {String(project.step).padStart(2, "0")}</span><h1>{rewriteSteps[project.step - 1]}</h1><p>原片仿写工作流正在准备当前阶段。</p></div>
    </section>
  );
}
