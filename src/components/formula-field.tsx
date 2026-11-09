"use client";

import { useEffect, useRef } from "react";

const FORMULAS = [
  "F=ma",
  "E=mc²",
  "p=mv",
  "Gm₁m₂/r²",
  "∇·E=ρ/ε₀",
  "∇·B=0",
  "∇×E=−∂B/∂t",
  "iℏ∂Ψ/∂t=ĤΨ",
  "ΔxΔp≥ℏ/2",
  "PV=nRT",
  "S=k ln W",
  "F=−kx",
  "τ=Iα",
  "L=Iω",
  "a=v²/r",
  "½mv²",
  "v=λf",
  "n₁sinθ₁",
  "R=V/I",
  "∇·(ρv)",
  "η=1−T₂/T₁",
  "λ=h/p",
  "ω=2πf",
  "q=mcΔT",
  "ρ=m/V",
];

type Point = { x: number; y: number };
type Mote = {
  text: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  homeX: number;
  homeY: number;
  scatterX: number;
  scatterY: number;
};

const PER_SHAPE = 460;

function sampleShape(image: HTMLImageElement, count: number): Point[] {
  const sampleWidth = 150;
  const sampleHeight = Math.max(1, Math.round((sampleWidth * image.height) / image.width));
  const scratch = document.createElement("canvas");
  scratch.width = sampleWidth;
  scratch.height = sampleHeight;
  const scratchContext = scratch.getContext("2d", { willReadFrequently: true });
  if (!scratchContext) return [];
  scratchContext.drawImage(image, 0, 0, sampleWidth, sampleHeight);
  const pixels = scratchContext.getImageData(0, 0, sampleWidth, sampleHeight).data;
  const found: Point[] = [];
  for (let y = 0; y < sampleHeight; y += 2) {
    for (let x = 0; x < sampleWidth; x += 2) {
      if (pixels[(y * sampleWidth + x) * 4 + 3] > 40) {
        found.push({ x: x / sampleWidth, y: y / sampleHeight });
      }
    }
  }
  if (found.length === 0) return [];
  const stride = Math.max(1, Math.floor(found.length / count));
  return found.filter((_, index) => index % stride === 0).slice(0, count);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = src;
  return image.decode().then(() => image);
}

export function FormulaField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = canvas.getContext("2d");
    if (!draw) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let motes: Mote[] = [];
    let catPoints: Point[] = [];
    let rabbitPoints: Point[] = [];
    let running = true;
    let started = 0;
    let scattering = false;

    function homesFor(points: Point[], anchorX: number, boxWidth: number, boxHeight: number, top: number): Point[] {
      return points.map((point) => ({
        x: anchorX + point.x * boxWidth,
        y: top + point.y * boxHeight,
      }));
    }

    function layout() {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.floor(width * ratio));
      canvas.height = Math.max(1, Math.floor(height * ratio));
      draw.setTransform(ratio, 0, 0, ratio, 0, 0);
      const boxHeight = height * 0.86;
      const top = height * 0.06;
      const catWidth = boxHeight * (555 / 782);
      const rabbitWidth = boxHeight * (408 / 995);
      const homes = [
        ...homesFor(catPoints, width * 0.04, catWidth, boxHeight, top),
        ...homesFor(rabbitPoints, width - rabbitWidth - width * 0.04, rabbitWidth, boxHeight, top),
      ];
      if (motes.length !== homes.length) {
        motes = homes.map((home, index) => ({
          text: FORMULAS[index % FORMULAS.length],
          x: Math.random() * width,
          y: Math.random() * height,
          vx: 0,
          vy: 0,
          homeX: home.x,
          homeY: home.y,
          scatterX: Math.random() * width,
          scatterY: Math.random() * height,
        }));
        return;
      }
      motes.forEach((mote, index) => {
        mote.homeX = homes[index].x;
        mote.homeY = homes[index].y;
      });
    }

    function tick(now: number) {
      if (!running) return;
      const cycle = reduce ? 0 : ((now - started) / 1000) % 9;
      const gathering = reduce || cycle < 4.6;
      if (!gathering && !scattering) {
        scattering = true;
        for (const mote of motes) {
          mote.scatterX = Math.random() * width;
          mote.scatterY = Math.random() * height;
        }
      }
      if (gathering) scattering = false;
      const lookX = Number.parseFloat(getComputedStyle(canvas).getPropertyValue("--look-x")) || 0;
      const lookY = Number.parseFloat(getComputedStyle(canvas).getPropertyValue("--look-y")) || 0;
      draw.clearRect(0, 0, width, height);
      draw.font = "11px Cascadia Mono, Consolas, ui-monospace, monospace";
      draw.textBaseline = "middle";
      draw.fillStyle = gathering ? "rgba(120, 112, 102, 0.34)" : "rgba(120, 112, 102, 0.18)";
      for (const mote of motes) {
        const side = mote.homeX < width / 2 ? 1 : -0.35;
        const targetX = (gathering ? mote.homeX : mote.scatterX) + lookX * 22 * side;
        const targetY = (gathering ? mote.homeY : mote.scatterY) + lookY * 14;
        const pull = gathering ? 0.05 : 0.018;
        mote.vx = (mote.vx + (targetX - mote.x) * pull) * (gathering ? 0.76 : 0.9);
        mote.vy = (mote.vy + (targetY - mote.y) * pull) * (gathering ? 0.76 : 0.9);
        mote.x += mote.vx;
        mote.y += mote.vy;
        draw.fillText(mote.text, mote.x, mote.y);
      }
      window.requestAnimationFrame(tick);
    }

    void Promise.all([loadImage("/machine-cat.png?v=2"), loadImage("/machine-rabbit.png?v=2")]).then(([catImage, rabbitImage]) => {
      if (!running) return;
      catPoints = sampleShape(catImage, PER_SHAPE);
      rabbitPoints = sampleShape(rabbitImage, PER_SHAPE);
      layout();
      started = performance.now();
      window.requestAnimationFrame(tick);
    });

    const observer = new ResizeObserver(() => {
      if (catPoints.length === 0) return;
      layout();
    });
    observer.observe(canvas);
    return () => {
      running = false;
      observer.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="formula-field" aria-hidden="true" />;
}
