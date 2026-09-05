import React, { useEffect } from 'react';
import './creative-home.css';

import { ArrowUpRight, Sparkles } from 'lucide-react';
import { useRef, useState } from 'react';

const modes = [
  {
    name: '自由创作',
    description: '从一个灵感出发，探索让人停下滑动的短视频创意。',
    action: '开启灵感创作',
    image: 'portal',
    tone: 'blue',
    tag: '让灵感自由生长',
  },
  {
    name: '个人商品创作',
    description: '从你的商品出发，挖掘卖点，讲出打动用户的购买理由。',
    action: '打造商品短视频',
    image: 'studio',
    tone: 'coral',
    tag: '让商品成为主角',
  },
  {
    name: '团队商品创作',
    description: '从团队商品出发，结合共享素材，让品牌创意持续成片。',
    action: '开启团队创作',
    image: 'team',
    tone: 'teal',
    tag: '让好创意一起发生',
  },
];

const platforms = [
  ['抖音', 'tiktok'],
  ['小红书', 'xiaohongshu'],
  ['哔哩哔哩', 'bilibili'],
  ['视频号', 'channels'],
  ['TikTok', 'tiktok'],
  ['YouTube', 'youtube'],
  ['Instagram', 'instagram'],
];

export default function CreativeHome({ onChoose }) {
  const art = useRef(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const [egg, setEgg] = useState(false);

  function selectMode(index) {
    onChoose(['free', 'personal', 'team'][index]);
  }

  function wave() {
    setEgg(true);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setEgg(false), 900);
  }

  return (
    <main className="launchpad home">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span />爆款创意发射场</div>
          <h1>下一个<span className="highlight">爆款短视频</span>，<br />从你的创意开始。</h1>
          <p>找到吸睛角度，讲好商品故事。<br />从剧本、分镜到视频生成，让创意一步步成片。</p>
          <div className="creation-path">
            <span>一个灵感</span><i /><span>一个好故事</span><i />
            <span>一支好视频<ArrowUpRight size={15} /></span>
          </div>
        </div>

        <div
          className="hero-art"
          ref={art}
          onPointerMove={(event) => {
            const element = art.current;
            if (!element || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
            const box = element.getBoundingClientRect();
            element.style.setProperty('--px', `${((event.clientX - box.left) / box.width - 0.5) * 12}px`);
            element.style.setProperty('--py', `${((event.clientY - box.top) / box.height - 0.5) * 8}px`);
          }}
          onPointerLeave={() => {
            art.current?.style.setProperty('--px', '0px');
            art.current?.style.setProperty('--py', '0px');
          }}
        >
          <div className="scene-halo" />
          <svg className="film-path" viewBox="0 0 650 340" fill="none" aria-hidden="true">
            <path d="M-25 315C120 390 150 50 319 99S440 415 674 208" stroke="#C5B4FF" strokeWidth="31" />
            <path d="M-25 315C120 390 150 50 319 99S440 415 674 208" stroke="#fff" strokeWidth="22" strokeDasharray="3 21" />
          </svg>
          <span className="sticker sticker-one"><Sparkles size={14} />吸睛开场</span>
          <span className="sticker sticker-two">卖点特写<ArrowUpRight size={14} /></span>
          <button className={`director ${egg ? 'launchpad-wave' : ''}`} onClick={wave} aria-label="和灵感导演打招呼">
            <img src={`${import.meta.env.BASE_URL}creative-launchpad/art/director.png`} alt="蓝色灵感导演从彩色纸片中抽出一个创意" />
          </button>
          <img className="hero-studio" src={`${import.meta.env.BASE_URL}creative-launchpad/art/studio.png`} alt="商品摄影台与竖屏视频装置" />
          <span className="spark spark-one">✦</span><span className="spark spark-two">✳</span><span className="orbit-dot" />
          <span className="hero-badge badge-youtube"><img src={`${import.meta.env.BASE_URL}creative-launchpad/brands/youtube.svg`} alt="YouTube" /></span>
          <span className="hero-badge badge-tiktok"><img src={`${import.meta.env.BASE_URL}creative-launchpad/brands/tiktok.svg`} alt="TikTok" /></span>
          {egg && <span className="egg-note">灵感已捕获！</span>}
        </div>
      </section>

      <section className="entry-section">
        <div className="section-heading"><h2>选择你的创作起点</h2><span>灵感不设限，故事由你开启</span></div>
        <div className="entry-grid">
          {modes.map((mode, index) => (
            <button className={`entry-card ${mode.tone}`} key={mode.name} onClick={() => selectMode(index)}>
              <div className="card-art">
                <span className="entry-number">0{index + 1}</span><span className="card-tag">{mode.tag}</span>
                <img src={`${import.meta.env.BASE_URL}creative-launchpad/art/${mode.image}.png`} alt="" /><div className="art-ellipse" />
              </div>
              <div className="card-copy"><h3>{mode.name}</h3><p>{mode.description}</p><span className="card-action">{mode.action}<span><ArrowUpRight size={19} /></span></span></div>
            </button>
          ))}
        </div>
      </section>

      <footer className="platforms">
        <span>好创意，不止一个舞台。</span>
        <div className="platform-list">
          {platforms.map(([name, file]) => <span tabIndex={0} className={`platform ${file}`} key={name} aria-label={name}><img src={`${import.meta.env.BASE_URL}creative-launchpad/brands/${file}.svg`} alt={name} /><span className="tooltip">{name}</span></span>)}
        </div>
        <span className="platform-end">让故事，被更多人看见<ArrowUpRight size={14} /></span>
      </footer>
    </main>
  );
}
