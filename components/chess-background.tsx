"use client";

import React, { useEffect, useRef } from "react";

interface Star    { x: number; y: number; r: number; phase: number; speed: number; }
interface Floater { x: number; y: number; size: number; vy: number; vx: number; opacity: number; maxOp: number; sym: string; rot: number; rotV: number; color: string; }
interface Node    { x: number; y: number; bx: number; by: number; vx: number; vy: number; conn: number[]; }
interface Mote    { x: number; y: number; vy: number; vx: number; opacity: number; r: number; }

const SYMS = ["♟","♞","♝","♜","♛","♚","♙","♘","♗","♖","♕","♔"];
const rnd  = (a: number, b: number) => a + Math.random() * (b - a);

export type BgTheme = "navy" | "crimson" | "forest" | "amethyst";

interface ThemePalette {
  bg0:     string;
  bg1:     string;
  bg2:     string;
  centerR: string;
  centerG: string;
  aurora1a: string;
  aurora1b: string;
  aurora2a: string;
  aurora2b: string;
  nodeCol: string;
  moteCol: string;
  floatColors: string[];
  gridCol: string;
}

const THEMES: Record<BgTheme, ThemePalette> = {
  navy: {
    bg0: "#060810", bg1: "#08101c", bg2: "#050810",
    centerR: "212,175,55", centerG: "212,175,55",
    aurora1a: "212,175,55", aurora1b: "64,126,170",
    aurora2a: "78,48,178",  aurora2b: "38,118,138",
    nodeCol:  "212,175,55",
    moteCol:  "212,175,55",
    floatColors: ["#d4af37","#c8a82e","#e8c84a","#b8982a","#f0d060","#ffe080","#ffd700"],
    gridCol: "212,175,55",
  },
  crimson: {
    bg0: "#0d0608", bg1: "#150a0c", bg2: "#0a0508",
    centerR: "180,28,48",  centerG: "180,28,48",
    aurora1a: "200,36,56", aurora1b: "90,18,28",
    aurora2a: "120,10,40", aurora2b: "180,60,80",
    nodeCol:  "220,60,80",
    moteCol:  "200,40,60",
    floatColors: ["#e02040","#c81830","#f04060","#a01020","#ff6080","#d83050","#ff4060"],
    gridCol: "200,40,60",
  },
  forest: {
    bg0: "#060d08", bg1: "#0a1510", bg2: "#050d07",
    centerR: "40,160,80",  centerG: "40,160,80",
    aurora1a: "50,180,90", aurora1b: "30,100,60",
    aurora2a: "20,80,50",  aurora2b: "60,140,80",
    nodeCol:  "60,180,100",
    moteCol:  "50,160,90",
    floatColors: ["#30b060","#28a050","#3cc870","#209040","#50d080","#40c060","#28b040"],
    gridCol: "50,160,90",
  },
  amethyst: {
    bg0: "#0a0610", bg1: "#100a18", bg2: "#08050d",
    centerR: "150,60,220", centerG: "150,60,220",
    aurora1a: "160,70,230", aurora1b: "80,30,160",
    aurora2a: "100,40,180", aurora2b: "180,80,240",
    nodeCol:  "170,80,240",
    moteCol:  "150,60,220",
    floatColors: ["#9040e0","#a050f0","#7830c0","#b060f0","#c070ff","#8840d0","#d090ff"],
    gridCol: "150,70,220",
  },
};

export function ChessBackground({
  bgTheme = "navy",
  customBgColor,
  customBgImage,
}: {
  bgTheme?:       BgTheme;
  customBgColor?: string | null;
  customBgImage?: string | null;
}) {
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const rafRef         = useRef(0);
  const themeRef       = useRef<ThemePalette>(THEMES[bgTheme]);
  const customColorRef = useRef<string | null>(customBgColor ?? null);
  const bgImageRef     = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    themeRef.current = THEMES[bgTheme];
  }, [bgTheme]);

  useEffect(() => {
    customColorRef.current = customBgColor ?? null;
  }, [customBgColor]);

  // Load image whenever it changes
  useEffect(() => {
    if (!customBgImage) { bgImageRef.current = null; return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = customBgImage;
    img.onload = () => { bgImageRef.current = img; };
    img.onerror = () => { bgImageRef.current = null; };
  }, [customBgImage]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0, H = 0, time = 0;
    let stars:    Star[]    = [];
    let floaters: Floater[] = [];
    let nodes:    Node[]    = [];
    let motes:    Mote[]    = [];

    function resize() {
      W = canvas!.width  = window.innerWidth;
      H = canvas!.height = window.innerHeight;
      buildStars(); buildNodes(); buildMotes();
    }

    function buildStars() {
      stars = Array.from({ length: 220 }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        r: rnd(0.12, 2.0), phase: Math.random() * Math.PI * 2, speed: rnd(0.22, 1.6),
      }));
    }

    function buildNodes() {
      const sp   = 92;
      const cols = Math.ceil(W / sp) + 1;
      const rows = Math.ceil(H / sp) + 1;
      nodes = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const bx = c * sp + (r % 2 === 0 ? 0 : sp / 2);
          const by = r * sp;
          nodes.push({ x: bx + rnd(-18, 18), y: by + rnd(-18, 18), bx, by, vx: rnd(-0.10, 0.10), vy: rnd(-0.10, 0.10), conn: [] });
        }
      }
      const mx = 148 * 148;
      for (let i = 0; i < nodes.length; i++) {
        nodes[i].conn = [];
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].bx - nodes[j].bx, dy = nodes[i].by - nodes[j].by;
          if (dx * dx + dy * dy < mx) nodes[i].conn.push(j);
        }
      }
    }

    function buildMotes() {
      motes = Array.from({ length: 50 }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vy: -rnd(0.06, 0.28), vx: rnd(-0.06, 0.06), opacity: rnd(0.03, 0.13), r: rnd(0.7, 2.0),
      }));
    }

    function makeFloater(startRandom = false): Floater {
      const t = themeRef.current;
      return {
        x: Math.random() * W,
        y: startRandom ? rnd(0, H) : H + rnd(10, 60),
        size: rnd(10, 26), vy: -rnd(0.12, 0.50), vx: rnd(-0.15, 0.15),
        opacity: startRandom ? Math.random() * 0.13 : 0, maxOp: rnd(0.04, 0.19),
        sym: SYMS[Math.floor(Math.random() * SYMS.length)],
        rot: Math.random() * Math.PI * 2, rotV: rnd(-0.008, 0.008),
        color: t.floatColors[Math.floor(Math.random() * t.floatColors.length)],
      };
    }

    function buildFloaters() {
      floaters = Array.from({ length: 28 }, () => makeFloater(true));
    }

    function draw() {
      if (!canvas || !ctx) return;
      time += 0.0050;
      const t = themeRef.current;
      ctx.clearRect(0, 0, W, H);

      /* Base — image > custom colour > theme gradient */
      const customC   = customColorRef.current;
      const bgImg     = bgImageRef.current;
      if (bgImg) {
        // Cover-fit the image
        const scale = Math.max(W / bgImg.width, H / bgImg.height);
        const dw    = bgImg.width  * scale;
        const dh    = bgImg.height * scale;
        const dx    = (W - dw) / 2;
        const dy    = (H - dh) / 2;
        ctx.drawImage(bgImg, dx, dy, dw, dh);
        // Dark scrim so animated elements stay visible
        ctx.fillStyle = "rgba(0,0,0,0.52)";
        ctx.fillRect(0, 0, W, H);
      } else {
        const bg = ctx.createLinearGradient(0, 0, W * 0.5, H);
        if (customC) {
          bg.addColorStop(0, customC);
          bg.addColorStop(0.5, customC + "dd");
          bg.addColorStop(1, customC + "aa");
        } else {
          bg.addColorStop(0, t.bg0); bg.addColorStop(0.5, t.bg1); bg.addColorStop(1, t.bg2);
        }
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      }

      /* Centre glow */
      const cg = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, W * 0.72);
      cg.addColorStop(0,    `rgba(${t.centerR},0.060)`);
      cg.addColorStop(0.48, `rgba(${t.centerG},0.016)`);
      cg.addColorStop(1,    "rgba(0,0,0,0)");
      ctx.fillStyle = cg; ctx.fillRect(0, 0, W, H);

      /* Aurora band 1 */
      const ay1 = H * 0.25 + Math.sin(time * 0.32) * H * 0.08;
      const aw1 = 150 + Math.sin(time * 0.18) * 42;
      const gi1 = 0.024 + Math.sin(time * 0.26) * 0.008;
      const bi1 = 0.017 + Math.sin(time * 0.21) * 0.007;
      const a1  = ctx.createLinearGradient(0, ay1 - aw1 * 0.5, 0, ay1 + aw1 * 0.5);
      a1.addColorStop(0, "rgba(0,0,0,0)");
      a1.addColorStop(0.25, `rgba(${t.aurora1a},${gi1})`);
      a1.addColorStop(0.55, `rgba(${t.aurora1b},${bi1})`);
      a1.addColorStop(0.80, `rgba(${t.aurora1b},${bi1 * 0.45})`);
      a1.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = a1; ctx.fillRect(0, ay1 - aw1 * 0.5, W, aw1);

      /* Aurora band 2 */
      const ay2 = H * 0.66 + Math.sin(time * 0.20 + 2.3) * H * 0.06;
      const aw2 = 108 + Math.sin(time * 0.27 + 1.5) * 28;
      const gi2 = 0.011 + Math.sin(time * 0.30 + 2.1) * 0.005;
      const a2  = ctx.createLinearGradient(0, ay2 - aw2 * 0.5, 0, ay2 + aw2 * 0.5);
      a2.addColorStop(0, "rgba(0,0,0,0)");
      a2.addColorStop(0.30, `rgba(${t.aurora2a},${gi2})`);
      a2.addColorStop(0.65, `rgba(${t.aurora2b},${gi2 * 0.78})`);
      a2.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = a2; ctx.fillRect(0, ay2 - aw2 * 0.5, W, aw2);

      /* Stars */
      for (const s of stars) {
        const tw = Math.sin(time * s.speed + s.phase) * 0.5 + 0.5;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r * (0.45 + tw * 0.72), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${tw * 0.72 + 0.05})`; ctx.fill();
      }

      /* Gold dust motes */
      for (const m of motes) {
        m.x += m.vx; m.y += m.vy;
        if (m.y < -4)    m.y = H + 4;
        if (m.x < -4)    m.x = W + 4;
        if (m.x > W + 4) m.x = -4;
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${t.moteCol},${m.opacity})`; ctx.fill();
      }

      /* Network nodes & edges */
      ctx.lineWidth = 0.40;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx; n.y += n.vy;
        if (Math.abs(n.x - n.bx) > 20) n.vx *= -1;
        if (Math.abs(n.y - n.by) > 20) n.vy *= -1;
        for (const j of n.conn) {
          const m  = nodes[j];
          const d  = Math.hypot(n.x - m.x, n.y - m.y);
          const al = (1 - d / 148) * 0.062;
          ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y);
          ctx.strokeStyle = `rgba(${t.nodeCol},${al})`; ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(n.x, n.y, 1.1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${t.nodeCol},0.18)`; ctx.fill();
      }

      /* Floating chess pieces */
      for (let i = 0; i < floaters.length; i++) {
        const p = floaters[i];
        p.y += p.vy; p.x += p.vx; p.rot += p.rotV;
        const frac = 1 - p.y / H;
        if (frac > 0.18) p.opacity = Math.min(p.maxOp, p.opacity + 0.0009);
        else             p.opacity = Math.max(0, p.opacity - 0.0007);
        if (p.y < -40 || p.opacity < 0.001) {
          const newF = makeFloater();
          // refresh colour from current theme
          newF.color = t.floatColors[Math.floor(Math.random() * t.floatColors.length)];
          floaters[i] = newF;
          continue;
        }
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.globalAlpha = p.opacity;
        ctx.font = `${p.size}px serif`;
        ctx.fillStyle = p.color;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(p.sym, 0, 0);
        ctx.restore();
      }

      /* Grid overlay */
      ctx.strokeStyle = `rgba(${t.gridCol},0.016)`; ctx.lineWidth = 0.22;
      const gs = 56;
      for (let x = 0; x < W; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      /* Vignette */
      const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.82);
      vig.addColorStop(0, "rgba(0,0,0,0)"); vig.addColorStop(1, "rgba(0,0,0,0.48)");
      ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

      rafRef.current = requestAnimationFrame(draw);
    }

    resize(); buildFloaters();
    rafRef.current = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ zIndex: 0, pointerEvents: "none", transition: "opacity 0.4s ease" }}
      aria-hidden="true"
    />
  );
}
