"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { narrateCharacter } from "@/lib/narrator";

// ── City theme configs ────────────────────────────────────────────────────────
export const CITY_CONFIGS = {
  lasvegas:   { label: "🎰 Las Vegas",        neons: ["#ffd700","#ff6600","#ff3333"] },
  tokyo:      { label: "🌸 Tokyo",            neons: ["#ff2d78","#bf5fff","#ff69b4"] },
  macau:      { label: "🐉 Macau",            neons: ["#ff1a1a","#ffd700","#ff8c00"] },
  montecarlo: { label: "🎯 Monte Carlo",      neons: ["#4169e1","#b0c4de","#00bfff"] },
  singapore:  { label: "🌴 Singapore",        neons: ["#00ff88","#00cfff","#ff00aa"] },
  atlantic:   { label: "🌊 Atlantic City",    neons: ["#9400d3","#00ffff","#ff007f"] },
  badenbaden: { label: "🏛️ Baden-Baden",      neons: ["#ffa500","#ffd700","#daa520"] },
  sanjose:    { label: "🌺 San José",         neons: ["#44ff44","#ffd700","#ff6a00"] },
  paradise:   { label: "🏝️ Paradise Island",  neons: ["#00ffff","#ff69b4","#ffd700"] },
  london:     { label: "🎡 London",           neons: ["#ff4500","#ffd700","#dc143c"] },
  sydney:     { label: "🦘 Sydney",           neons: ["#ff8c00","#00aaff","#00ff7f"] },
};

const lighten = (h,a) => '#'+[h.slice(1,3),h.slice(3,5),h.slice(5,7)]
  .map(c=>Math.max(0,Math.min(255,parseInt(c,16)+a)).toString(16).padStart(2,'0')).join('');
const darken = (h,a) => lighten(h,-a);

// ── Canvas textures ───────────────────────────────────────────────────────────
function makeFeltTexture() {
  const S = 1024;
  const cv = document.createElement('canvas'); cv.width = cv.height = S;
  const ctx = cv.getContext('2d');

  ctx.fillStyle = '#0a3016'; ctx.fillRect(0,0,S,S);
  const g = ctx.createRadialGradient(512,512,0,512,512,490);
  g.addColorStop(0,'#1a7030'); g.addColorStop(0.65,'#0e4820'); g.addColorStop(1,'#061508');
  ctx.fillStyle = g; ctx.fillRect(0,0,S,S);

  ctx.save();
  ctx.shadowColor = 'rgba(201,162,39,0.7)'; ctx.shadowBlur = 28;
  ctx.strokeStyle = 'rgba(201,162,39,0.9)'; ctx.lineWidth = 16;
  ctx.beginPath(); ctx.ellipse(512,512,470,368,0,0,Math.PI*2); ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(201,162,39,0.3)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.ellipse(512,512,428,325,0,0,Math.PI*2); ctx.stroke();

  [['♠',195,255,'rgba(220,220,220,0.15)'],['♣',829,255,'rgba(220,220,220,0.15)'],
   ['♥',195,769,'rgba(200,50,50,0.24)'],  ['♦',829,769,'rgba(200,50,50,0.24)']
  ].forEach(([s,px,py,col]) => {
    ctx.font='bold 162px serif'; ctx.fillStyle=col;
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(s,px,py);
  });

  ctx.save();
  ctx.shadowColor='rgba(201,162,39,0.55)'; ctx.shadowBlur=20;
  ctx.strokeStyle='rgba(201,162,39,0.72)'; ctx.lineWidth=7;
  ctx.beginPath(); ctx.arc(512,512,96,0,Math.PI*2); ctx.stroke();
  ctx.restore();
  ctx.font='bold 33px Georgia'; ctx.fillStyle='rgba(201,162,39,0.75)';
  ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('PROPERTY RUSH',512,512);

  for(let i=0;i<5;i++){
    const a=(i/5)*Math.PI*2+Math.PI/2, rx=512+Math.cos(a)*302, ry=512+Math.sin(a)*240;
    ctx.save(); ctx.shadowColor='rgba(201,162,39,0.35)'; ctx.shadowBlur=10;
    ctx.strokeStyle='rgba(201,162,39,0.5)'; ctx.lineWidth=4;
    ctx.beginPath(); ctx.arc(rx,ry,46,0,Math.PI*2); ctx.stroke();
    ctx.restore();
  }

  const t = new THREE.CanvasTexture(cv);
  t.needsUpdate = true;
  return t;
}

function makeHostessTexture(dressHex, hairHex) {
  const W=256, H=512;
  const cv = document.createElement('canvas'); cv.width=W; cv.height=H;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0,0,W,H);
  const skin='#f5c9a0';

  ctx.fillStyle='rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(128,490,50,13,0,0,Math.PI*2); ctx.fill();

  // Dark stockings — no pale skin sticks
  ctx.fillStyle='#120818';
  [[96,340,24,118],[136,340,24,118]].forEach(([lx,ly,lw,lh])=>{
    ctx.beginPath(); ctx.roundRect(lx,ly,lw,lh,5); ctx.fill();
  });
  // Sheen on stockings
  ctx.fillStyle='rgba(180,130,255,0.12)';
  [[100,342,10,100],[140,342,10,100]].forEach(([lx,ly,lw,lh])=>{
    ctx.beginPath(); ctx.roundRect(lx,ly,lw,lh,4); ctx.fill();
  });
  // Stiletto heels
  [[94,454,26,14],[134,454,26,14]].forEach(([sx,sy,sw,sh])=>{
    ctx.fillStyle='#0c0814';
    ctx.beginPath(); ctx.roundRect(sx,sy,sw,sh,[6,6,2,2]); ctx.fill();
    // pointed toe
    ctx.beginPath(); ctx.moveTo(sx,sy+sh); ctx.lineTo(sx+sw,sy+sh); ctx.lineTo(sx+sw+8,sy+sh+10); ctx.lineTo(sx-2,sy+sh+8); ctx.closePath(); ctx.fill();
    // heel spike
    ctx.fillStyle='#c9a227';
    ctx.beginPath(); ctx.moveTo(sx+sw-5,sy+sh); ctx.lineTo(sx+sw-2,sy+sh+14); ctx.lineTo(sx+sw+2,sy+sh+14); ctx.lineTo(sx+sw+1,sy+sh); ctx.closePath(); ctx.fill();
  });

  const dg=ctx.createLinearGradient(40,128,218,360);
  dg.addColorStop(0,lighten(dressHex,45)); dg.addColorStop(0.45,dressHex); dg.addColorStop(1,darken(dressHex,55));
  ctx.fillStyle=dg;
  ctx.beginPath();
  ctx.moveTo(83,138); ctx.lineTo(173,138);
  ctx.bezierCurveTo(198,228,218,308,228,350);
  ctx.lineTo(28,350);
  ctx.bezierCurveTo(38,308,58,228,83,138);
  ctx.closePath(); ctx.fill();

  const sg=ctx.createLinearGradient(83,138,152,240);
  sg.addColorStop(0,'rgba(255,255,255,0.42)'); sg.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=sg;
  ctx.beginPath(); ctx.moveTo(83,138); ctx.lineTo(155,138); ctx.lineTo(146,238); ctx.lineTo(83,210); ctx.closePath(); ctx.fill();

  ctx.fillStyle='rgba(255,255,255,0.88)';
  [[98,162],[160,182],[115,245],[174,268],[86,306],[162,320],[130,172],[148,336]].forEach(([sx,sy])=>{
    ctx.beginPath(); ctx.arc(sx,sy,2.5,0,Math.PI*2); ctx.fill();
  });

  const bg=ctx.createLinearGradient(88,92,178,148);
  bg.addColorStop(0,lighten(dressHex,28)); bg.addColorStop(1,dressHex);
  ctx.fillStyle=bg;
  ctx.beginPath(); ctx.roundRect(88,92,80,52,[10,10,0,0]); ctx.fill();

  // Opera gloves — dress color darkened so arms blend with the costume
  const gloveColor = darken(dressHex, 40);
  ctx.fillStyle=gloveColor;
  ctx.beginPath();
  ctx.moveTo(90,108); ctx.bezierCurveTo(56,132,46,182,50,226);
  ctx.lineTo(64,221); ctx.bezierCurveTo(62,180,70,134,102,118); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(166,108); ctx.bezierCurveTo(200,132,210,182,206,226);
  ctx.lineTo(192,221); ctx.bezierCurveTo(196,180,186,134,154,118); ctx.closePath(); ctx.fill();
  // Small skin patch at wrist/hand
  ctx.fillStyle=skin;
  ctx.beginPath(); ctx.ellipse(52,224,8,6,0.3,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(204,224,8,6,-0.3,0,Math.PI*2); ctx.fill();

  // ── Cocktail tray (right palm) ──────────────────────────────────────────────
  ctx.save();
  ctx.translate(220,205); ctx.rotate(-0.22);
  ctx.fillStyle='#c9a227';                                            // gold rim
  ctx.beginPath(); ctx.ellipse(0,3,30,10,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#ded6cc';                                            // silver surface
  ctx.beginPath(); ctx.ellipse(0,0,28,8,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.35)';                             // highlight
  ctx.beginPath(); ctx.ellipse(-7,-2,13,4,0,0,Math.PI*2); ctx.fill();
  [[-11,0],[8,0]].forEach(([gx])=>{                                   // 2 champagne flutes
    ctx.fillStyle='rgba(200,230,255,0.82)';
    ctx.fillRect(gx-1.5,-20,3,14);                                    // stem
    ctx.beginPath(); ctx.moveTo(gx-5,-20); ctx.lineTo(gx+5,-20);
    ctx.lineTo(gx+3,-35); ctx.lineTo(gx-3,-35); ctx.closePath(); ctx.fill(); // flute bowl
    ctx.fillStyle='rgba(255,215,40,0.75)';                            // champagne
    ctx.beginPath(); ctx.moveTo(gx-4,-22); ctx.lineTo(gx+4,-22);
    ctx.lineTo(gx+2,-34); ctx.lineTo(gx-2,-34); ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.6)';                            // bubble
    ctx.beginPath(); ctx.arc(gx-1,-28,1.5,0,Math.PI*2); ctx.fill();
  });
  ctx.restore();

  ctx.fillStyle=skin;
  ctx.beginPath(); ctx.roundRect(110,66,36,32,6); ctx.fill();
  ctx.beginPath(); ctx.ellipse(128,50,34,38,0,0,Math.PI*2); ctx.fill();

  ctx.fillStyle=darken(hairHex,25);
  ctx.beginPath(); ctx.ellipse(128,34,37,30,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle=darken(hairHex,15);
  ctx.beginPath(); ctx.moveTo(94,45); ctx.bezierCurveTo(72,72,70,128,76,158); ctx.lineTo(88,156);
  ctx.bezierCurveTo(84,126,86,74,102,50); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(162,45); ctx.bezierCurveTo(184,72,186,128,180,158); ctx.lineTo(168,156);
  ctx.bezierCurveTo(172,126,174,74,154,50); ctx.closePath(); ctx.fill();
  ctx.fillStyle=hairHex;
  ctx.beginPath(); ctx.ellipse(128,22,35,20,0,0,Math.PI*2); ctx.fill();

  // ── Venetian masquerade mask ─────────────────────────────────────────────────
  ctx.save();
  const maskCol = darken(dressHex, 10);
  ctx.fillStyle = maskCol;
  ctx.beginPath(); ctx.ellipse(114,50,22,13,-0.08,0,Math.PI*2); ctx.fill(); // left lens
  ctx.beginPath(); ctx.ellipse(142,50,22,13, 0.08,0,Math.PI*2); ctx.fill(); // right lens
  ctx.fillRect(124,46,9,8);                                                   // bridge
  // Eye-hole cut-back to skin
  ctx.fillStyle=skin;
  ctx.beginPath(); ctx.ellipse(114,51,13,8, 0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(142,51,13,8, 0,0,Math.PI*2); ctx.fill();
  // Gold trim
  ctx.save(); ctx.shadowColor='#c9a227'; ctx.shadowBlur=6;
  ctx.strokeStyle='#c9a227'; ctx.lineWidth=1.8;
  ctx.beginPath(); ctx.ellipse(114,50,22,13,-0.08,0,Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(142,50,22,13, 0.08,0,Math.PI*2); ctx.stroke();
  ctx.restore();
  // Decorative feathers at right temple
  ctx.save(); ctx.translate(167,36);
  ['#ff2277','#ff9500','#ffee22'].forEach((c)=>{
    ctx.rotate(0.22);
    ctx.strokeStyle=c; ctx.lineWidth=2.8; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,-24); ctx.stroke();
    ctx.fillStyle=c+'cc';
    ctx.beginPath(); ctx.ellipse(0,-22,3,9,0,0,Math.PI*2); ctx.fill();
  });
  ctx.restore();
  ctx.restore();

  [[114,48],[142,48]].forEach(([ex,ey])=>{
    ctx.fillStyle='white'; ctx.beginPath(); ctx.ellipse(ex,ey,10,6.5,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#1e3a6e'; ctx.beginPath(); ctx.ellipse(ex,ey+1,6.2,6.2,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#080808'; ctx.beginPath(); ctx.ellipse(ex,ey+1,3.5,3.5,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.92)'; ctx.beginPath(); ctx.arc(ex+2,ey-1,2.2,0,Math.PI*2); ctx.fill();
  });

  ctx.strokeStyle='#1a1a1a'; ctx.lineWidth=2.5; ctx.lineCap='round';
  for(let i=0;i<5;i++){
    ctx.beginPath(); ctx.moveTo(105+i*4,42); ctx.lineTo(104+i*4.5,37); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(133+i*4,42); ctx.lineTo(132+i*4.5,37); ctx.stroke();
  }
  ctx.strokeStyle=darken(hairHex,35); ctx.lineWidth=3.2; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(104,37); ctx.quadraticCurveTo(114,33,122,35); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(134,35); ctx.quadraticCurveTo(142,33,152,37); ctx.stroke();

  ctx.strokeStyle='rgba(175,115,72,0.55)'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.arc(128,60,4.5,0.25,Math.PI-0.25); ctx.stroke();

  ctx.fillStyle='#c03860';
  ctx.beginPath();
  ctx.moveTo(116,66); ctx.bezierCurveTo(120,61,126,60,128,62);
  ctx.bezierCurveTo(130,60,136,61,140,66);
  ctx.bezierCurveTo(137,72,130,74,128,73);
  ctx.bezierCurveTo(126,74,119,72,116,66); ctx.fill();
  ctx.fillStyle='rgba(255,175,175,0.45)';
  ctx.beginPath(); ctx.ellipse(128,70,6.5,3,0,0,Math.PI); ctx.fill();

  ctx.save(); ctx.shadowColor='#c9a227'; ctx.shadowBlur=7;
  ctx.strokeStyle='#c9a227'; ctx.lineWidth=2.8;
  ctx.beginPath(); ctx.arc(128,82,21,0.28,Math.PI-0.28); ctx.stroke();
  ctx.fillStyle='#c9a227'; ctx.beginPath(); ctx.arc(128,101,5.5,0,Math.PI*2); ctx.fill();
  ctx.restore();
  ctx.save(); ctx.shadowColor='#c9a227'; ctx.shadowBlur=8;
  ctx.fillStyle='#c9a227';
  ctx.beginPath(); ctx.arc(93,50,5,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(163,50,5,0,Math.PI*2); ctx.fill();
  ctx.restore();

  const t = new THREE.CanvasTexture(cv);
  t.needsUpdate = true;
  return t;
}

function makeDealerTexture() {
  const W=256, H=512;
  const cv = document.createElement('canvas'); cv.width=W; cv.height=H;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0,0,W,H);
  const skin='#e8c49a';

  ctx.fillStyle='rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(128,492,50,13,0,0,Math.PI*2); ctx.fill();

  ctx.fillStyle='#1a1a2e';
  [[96,318,24,148],[136,318,24,148]].forEach(([lx,ly,lw,lh])=>{
    ctx.beginPath(); ctx.roundRect(lx,ly,lw,lh,4); ctx.fill();
  });
  ctx.fillStyle='#0a0808';
  [[93,452,30,20],[133,452,30,20]].forEach(([sx,sy,sw,sh])=>{
    ctx.beginPath(); ctx.roundRect(sx,sy,sw,sh,5); ctx.fill();
  });

  ctx.fillStyle='#12122a';
  ctx.beginPath(); ctx.roundRect(80,95,96,230,[0,0,20,20]); ctx.fill();
  ctx.strokeStyle='#c9a227'; ctx.lineWidth=3;
  ctx.strokeRect(82,97,92,226);
  ctx.fillStyle='#f0f0f8';
  ctx.fillRect(80,100,12,220); ctx.fillRect(164,100,12,220);

  ctx.fillStyle='#c9a227';
  ctx.beginPath();
  ctx.moveTo(110,118); ctx.lineTo(128,128); ctx.lineTo(146,118);
  ctx.lineTo(128,108); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(128,118,5,0,Math.PI*2); ctx.fill();

  ctx.fillStyle='#12122a';
  ctx.beginPath(); ctx.moveTo(80,100); ctx.bezierCurveTo(44,122,36,175,42,218);
  ctx.lineTo(56,213); ctx.bezierCurveTo(52,174,60,128,92,112); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(176,100); ctx.bezierCurveTo(212,122,220,175,214,218);
  ctx.lineTo(200,213); ctx.bezierCurveTo(204,174,196,128,164,112); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#c9a227';
  ctx.beginPath(); ctx.arc(48,212,5,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(208,212,5,0,Math.PI*2); ctx.fill();

  ctx.fillStyle=skin;
  ctx.beginPath(); ctx.roundRect(112,68,32,32,5); ctx.fill();
  ctx.beginPath(); ctx.ellipse(128,50,33,38,0,0,Math.PI*2); ctx.fill();

  ctx.fillStyle='#1a0e05';
  ctx.beginPath(); ctx.ellipse(128,22,34,20,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#150a03';
  [[94,42,14,22],[158,42,14,22]].forEach(([hx,hy,hw,hh])=>{
    ctx.beginPath(); ctx.roundRect(hx,hy,hw,hh,5); ctx.fill();
  });

  [[114,50],[142,50]].forEach(([ex,ey])=>{
    ctx.fillStyle='white'; ctx.beginPath(); ctx.ellipse(ex,ey,9,6,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#2a3a6e'; ctx.beginPath(); ctx.ellipse(ex,ey+1,5.5,5.5,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#080808'; ctx.beginPath(); ctx.ellipse(ex,ey+1,3,3,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(ex+2,ey-1,2,0,Math.PI*2); ctx.fill();
  });
  ctx.strokeStyle='#1a0e05'; ctx.lineWidth=3; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(105,39); ctx.quadraticCurveTo(114,35,122,37); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(134,37); ctx.quadraticCurveTo(142,35,151,39); ctx.stroke();
  ctx.strokeStyle='rgba(160,105,65,0.5)'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.arc(128,61,4,0.3,Math.PI-0.3); ctx.stroke();
  ctx.strokeStyle='#a0654a'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(128,70,8,0.15,Math.PI-0.15); ctx.stroke();

  ctx.fillStyle='rgba(201,162,39,0.9)';
  ctx.beginPath(); ctx.roundRect(103,155,50,22,3); ctx.fill();
  ctx.fillStyle='#1a1230';
  ctx.font='bold 9px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('DEALER', 128, 166);

  ['#f0f0f0','#e8f0ff','#fff0f0'].forEach((col, i) => {
    ctx.save();
    ctx.translate(42, 205);
    ctx.rotate(-0.3 + i*0.2);
    ctx.fillStyle=col; ctx.strokeStyle='#aaa'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.roundRect(-8,-14,16,22,2); ctx.fill(); ctx.stroke();
    ctx.restore();
  });

  const t = new THREE.CanvasTexture(cv);
  t.needsUpdate = true;
  return t;
}

// ── Neon sign canvas texture (white text on black → tinted by emissive color) ──
function makeNeonSignTexture(text) {
  const W=512, H=72;
  const cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  const ctx=cv.getContext('2d');
  ctx.fillStyle='#000000'; ctx.fillRect(0,0,W,H);
  ctx.textAlign='center'; ctx.textBaseline='middle';
  const fontSize = text.length > 10 ? 34 : 42;
  ctx.font=`900 ${fontSize}px 'Arial Black', Arial, sans-serif`;
  // Glow layers
  [30,18,10,4].forEach((blur,i)=>{
    ctx.shadowColor='white'; ctx.shadowBlur=blur;
    ctx.fillStyle=`rgba(255,255,255,${0.18+i*0.18})`;
    ctx.fillText(text,W/2,H/2);
  });
  // Sharp bright core
  ctx.shadowBlur=0;
  ctx.fillStyle='white'; ctx.fillText(text,W/2,H/2);
  const t=new THREE.CanvasTexture(cv); t.needsUpdate=true;
  return t;
}

// ── Scene builder ─────────────────────────────────────────────────────────────
function buildThreeScene(canvas, stateRef) {
  const W = canvas.clientWidth || window.innerWidth;
  const H = canvas.clientHeight || window.innerHeight;

  // Renderer
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setSize(W, H, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030108);
  scene.fog = new THREE.FogExp2(0x030108, 0.028);

  // Camera
  const camera = new THREE.PerspectiveCamera(56, W / H, 0.1, 130);
  camera.position.set(0, 4, 10);
  camera.lookAt(0, -1, 0);

  // ── Lighting ────────────────────────────────────────────────────────────────
  const ambientLight = new THREE.AmbientLight(0x0a0612, 1.8);
  scene.add(ambientLight);

  // Main table spotlight
  const tableSpot = new THREE.SpotLight(0xffe8c8, 80);
  tableSpot.angle = Math.PI / 5.5;
  tableSpot.penumbra = 0.4;
  tableSpot.decay = 1.2;
  tableSpot.distance = 22;
  tableSpot.castShadow = true;
  tableSpot.shadow.mapSize.set(1024, 1024);
  tableSpot.shadow.bias = -0.001;
  tableSpot.position.set(0, 10, -0.5);
  tableSpot.target.position.set(0, -1.5, 0);
  scene.add(tableSpot);
  scene.add(tableSpot.target);

  // Fill spot (blue cool)
  const fillSpot = new THREE.SpotLight(0x3060cc, 18);
  fillSpot.angle = Math.PI / 4;
  fillSpot.penumbra = 0.6;
  fillSpot.decay = 2;
  fillSpot.distance = 18;
  fillSpot.position.set(-5, 7, 4);
  fillSpot.target.position.set(0, -1, 0);
  scene.add(fillSpot);
  scene.add(fillSpot.target);

  // Under-table glow
  const underGlow = new THREE.PointLight(0x442200, 6, 8);
  underGlow.position.set(0, -2, 0);
  scene.add(underGlow);

  // Dealer light
  const dealerLight = new THREE.PointLight(0xfff0e0, 5, 6);
  dealerLight.position.set(0, 1, -3.5);
  scene.add(dealerLight);

  // Mirror ball light (rotating)
  const mirrorLight = new THREE.PointLight(0x8888ff, 4, 25);
  mirrorLight.position.set(0, 11, 0);
  scene.add(mirrorLight);

  // ── Floor ────────────────────────────────────────────────────────────────────
  const floorGeo = new THREE.PlaneGeometry(60, 60);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x060210, roughness: 0.88, metalness: 0.12 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2.5;
  floor.receiveShadow = true;
  scene.add(floor);

  // Floor grid lines
  const gridMat = new THREE.MeshBasicMaterial({ color: 0x0c0818 });
  for(let i=-4;i<=4;i++){
    const gxGeo = new THREE.BoxGeometry(0.02, 0.002, 40);
    const gx = new THREE.Mesh(gxGeo, gridMat);
    gx.position.set(i*4, -2.49, 0);
    scene.add(gx);
    const gzGeo = new THREE.BoxGeometry(40, 0.002, 0.02);
    const gz = new THREE.Mesh(gzGeo, gridMat);
    gz.position.set(0, -2.49, i*4);
    scene.add(gz);
  }

  // ── Walls ─────────────────────────────────────────────────────────────────────
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x060110, roughness: 0.92, metalness: 0.05 });
  const wallGeo = new THREE.PlaneGeometry(50, 18);
  [[0,6,-19,0,0,0],[0,6,19,0,Math.PI,0],[-22,6,0,0,Math.PI/2,0],[22,6,0,0,-Math.PI/2,0]].forEach(([px,py,pz,rx,ry,rz])=>{
    const w = new THREE.Mesh(wallGeo, wallMat);
    w.position.set(px,py,pz);
    w.rotation.set(rx,ry,rz);
    scene.add(w);
  });
  const ceilGeo = new THREE.PlaneGeometry(60, 60);
  const ceil = new THREE.Mesh(ceilGeo, new THREE.MeshStandardMaterial({ color: 0x040009, roughness: 1.0 }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 14;
  scene.add(ceil);

  // ── Casino Table ──────────────────────────────────────────────────────────────
  const tableGrp = new THREE.Group();
  tableGrp.position.set(0, -1.6, 0);
  scene.add(tableGrp);

  const feltTex = makeFeltTexture();
  feltTex.wrapS = feltTex.wrapT = THREE.RepeatWrapping;

  // Felt top (use ellipse-ish via scaled cylinder)
  const feltGeo = new THREE.CylinderGeometry(4.6, 4.6, 0.22, 64);
  const feltMesh = new THREE.Mesh(feltGeo,
    new THREE.MeshStandardMaterial({ map: feltTex, roughness: 0.93, metalness: 0.0 }));
  feltMesh.scale.set(1, 1, 0.65); // oval: narrower in Z
  feltMesh.receiveShadow = true;
  tableGrp.add(feltMesh);

  // Gold rim
  const rimGeo = new THREE.CylinderGeometry(4.8, 4.8, 0.3, 64);
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xc9a227, emissive: 0x8b6914, emissiveIntensity: 0.5, metalness: 0.92, roughness: 0.2 });
  const rim = new THREE.Mesh(rimGeo, goldMat);
  rim.scale.set(1, 1, 0.65);
  rim.position.y = -0.04;
  tableGrp.add(rim);

  // Padded edge
  const padGeo = new THREE.CylinderGeometry(4.76, 4.76, 0.36, 64);
  const padMesh = new THREE.Mesh(padGeo, new THREE.MeshStandardMaterial({ color: 0x120808, roughness: 0.85 }));
  padMesh.scale.set(1, 1, 0.65);
  padMesh.position.y = -0.06;
  tableGrp.add(padMesh);

  // Pedestal
  const pedGeo = new THREE.CylinderGeometry(0.6, 0.6, 2.6, 20);
  const pedMat = new THREE.MeshStandardMaterial({ color: 0x0d0508, metalness: 0.25, roughness: 0.72 });
  const ped = new THREE.Mesh(pedGeo, pedMat);
  ped.position.y = -1.6;
  ped.castShadow = true;
  tableGrp.add(ped);

  // Base plate
  const baseGeo = new THREE.CylinderGeometry(1.8, 1.8, 0.2, 20);
  const base = new THREE.Mesh(baseGeo, pedMat);
  base.position.y = -2.8;
  tableGrp.add(base);

  // ── Chips on table ────────────────────────────────────────────────────────────
  const chipGeom = new THREE.CylinderGeometry(0.19, 0.19, 0.1, 20);
  const chipColorHexes = [0xcc1111, 0x1111cc, 0x11aa22, 0x111111, 0xcc8800];
  [[-3.8,0.12,0.9],[3.8,0.12,0.9],[-3.4,0.12,-0.7*0.65],[3.4,0.12,-0.7*0.65],[0,0.12,-1.4*0.65]].forEach(([cx,cy,cz],si)=>{
    for(let j=0;j<6;j++){
      const col = chipColorHexes[(si*3+j)%5];
      const chipMesh = new THREE.Mesh(chipGeom,
        new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.2, metalness: 0.65, roughness: 0.38 }));
      chipMesh.position.set(cx, cy + j*0.105, cz);
      tableGrp.add(chipMesh);
    }
  });

  // No scattered cards — table felt is the clean backdrop for the girls

  // ── Overhead lamp ─────────────────────────────────────────────────────────────
  const lampGeo = new THREE.ConeGeometry(0.65, 0.85, 20);
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x151008, emissive: 0xffe8a0, emissiveIntensity: 3, metalness: 0.72, roughness: 0.28 });
  const lamp = new THREE.Mesh(lampGeo, lampMat);
  lamp.rotation.x = Math.PI;
  lamp.position.set(0, 7.5, -0.5);
  scene.add(lamp);
  const cordGeo = new THREE.CylinderGeometry(0.02, 0.02, 3.5, 8);
  const cord = new THREE.Mesh(cordGeo, new THREE.MeshStandardMaterial({ color: 0x080808 }));
  cord.position.set(0, 9.5, -0.5);
  scene.add(cord);

  // ── Slot machines ─────────────────────────────────────────────────────────────
  const slotMat = new THREE.MeshStandardMaterial({ color: 0x080510, metalness: 0.58, roughness: 0.42 });
  const conf0 = CITY_CONFIGS.lasvegas;
  [[-13,0,-12],[13,0,-12],[-17,0,-9],[17,0,-9],[-11,0,-15],[11,0,-15]].forEach(([sx,sy,sz],i)=>{
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 4.8, 1.3), slotMat);
    body.position.set(sx, sy, sz);
    body.castShadow = true;
    scene.add(body);
    const scHex = parseInt(conf0.neons[i%3].slice(1),16);
    const screen = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.25, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x000000, emissive: scHex, emissiveIntensity: 3.5 }));
    screen.position.set(sx, sy+0.85, sz+0.65);
    scene.add(screen);
    const chrome = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.18, 1.4),
      new THREE.MeshStandardMaterial({ color: 0x888888, emissive: scHex, emissiveIntensity: 1.2, metalness: 0.95 }));
    chrome.position.set(sx, sy+2.5, sz);
    scene.add(chrome);
    const slotLight = new THREE.PointLight(scHex, 4, 7);
    slotLight.position.set(sx, sy+1, sz+1);
    scene.add(slotLight);
  });

  // ── Neon signs ────────────────────────────────────────────────────────────────
  const SIGN_DEFS = [
    { pos:[0,8.2,-18.5], rot:[0,0,0],         w:10,  h:1.4, neonIdx:0, text:'PROPERTY RUSH' },
    { pos:[-14,5.8,-7],  rot:[0,Math.PI/2,0],  w:6,   h:1.1, neonIdx:1, text:'HIGH STAKES' },
    { pos:[14,5.8,-7],   rot:[0,-Math.PI/2,0], w:6,   h:1.1, neonIdx:2, text:'VIP LOUNGE' },
    { pos:[-14,8.4,0],   rot:[0,Math.PI/2,0],  w:5.5, h:1.1, neonIdx:0, text:'JACKPOT' },
    { pos:[14,8.4,0],    rot:[0,-Math.PI/2,0], w:5.5, h:1.1, neonIdx:1, text:'NO LIMIT' },
    { pos:[0,6.2,-18.4], rot:[0,0,0],          w:7,   h:1.0, neonIdx:2, text:'♠  ♥  ♣  ♦' },
  ];
  const neonMeshes = SIGN_DEFS.map((def) => {
    const hexStr = (CITY_CONFIGS[stateRef.current.city] || CITY_CONFIGS.lasvegas).neons[def.neonIdx];
    const hex = parseInt(hexStr.slice(1), 16);
    const signTex = makeNeonSignTexture(def.text);
    // Dark backing board behind sign
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(def.w+0.4, def.h+0.3, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x050008, roughness: 0.9 })
    );
    board.position.set(...def.pos);
    board.rotation.set(...def.rot);
    scene.add(board);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: new THREE.Color(hex),
      emissiveMap: signTex,
      emissiveIntensity: 3.5,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(def.w, def.h, 0.06), mat);
    mesh.position.set(def.pos[0], def.pos[1], def.pos[2] + (def.rot[1] === 0 ? 0.07 : 0));
    mesh.rotation.set(...def.rot);
    scene.add(mesh);
    const light = new THREE.PointLight(hex, 5, 10);
    light.position.set(...def.pos);
    scene.add(light);
    return { mesh, mat, light, neonIdx: def.neonIdx };
  });

  // ── Chandeliers ───────────────────────────────────────────────────────────────
  [[-8,11,-6],[8,11,-6],[0,11,-10],[-8,11,4],[8,11,4]].forEach(([cx,cy,cz])=>{
    const ch = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xc9a227, emissive: 0xffe8a0, emissiveIntensity: 2.5, metalness: 0.85 }));
    ch.position.set(cx,cy,cz);
    scene.add(ch);
    const cL = new THREE.PointLight(0xfff0c0, 3, 12);
    cL.position.set(cx, cy-0.3, cz);
    scene.add(cL);
  });

  // ── Mirror/Disco ball ─────────────────────────────────────────────────────────
  const mirrorBallGeo = new THREE.SphereGeometry(0.7, 32, 32);
  const mirrorBallMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.99, roughness: 0.0, emissive: 0x444444, emissiveIntensity: 0.5 });
  const mirrorBall = new THREE.Mesh(mirrorBallGeo, mirrorBallMat);
  mirrorBall.position.set(0, 12, 0);
  scene.add(mirrorBall);

  // ── Particle chips ────────────────────────────────────────────────────────────
  const particleChipGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.06, 16);
  const chipColorList = [0xff2222, 0x2222ff, 0x22cc33, 0xffcc00, 0xff22cc];
  const particles = Array.from({ length:32 }, (_, i) => {
    const mesh = new THREE.Mesh(particleChipGeo,
      new THREE.MeshStandardMaterial({ color: chipColorList[i%5], emissive: chipColorList[i%5], emissiveIntensity: 0.4 }));
    mesh.position.set(-5+Math.random()*10, 15, -5+Math.random()*6);
    mesh.visible = false;
    scene.add(mesh);
    return { mesh, x:-5+Math.random()*10, z:-5+Math.random()*6, vy:-(1+Math.random()*2.5), phase:Math.random()*Math.PI*2, spin:(Math.random()-0.5)*180 };
  });

  // ── Animation ─────────────────────────────────────────────────────────────────
  let time = 0;
  let rafId = null;

  const camTarget = new THREE.Vector3(0, -0.8, 0);

  function animate() {
    rafId = requestAnimationFrame(animate);
    const dt = 1/60;
    time += dt;
    const cheering = stateRef.current.cheering;
    const conf = CITY_CONFIGS[stateRef.current.city] || CITY_CONFIGS.lasvegas;

    // Camera fixed — no orbit, girls are the focus
    camera.position.set(0, 4, 10);
    camera.lookAt(camTarget);

    // Mirror ball slow spin only
    mirrorBall.rotation.y += dt * 0.18;

    // Neon flicker + city update
    neonMeshes.forEach((n, i) => {
      const hexStr = conf.neons[n.neonIdx % 3];
      const hex = parseInt(hexStr.slice(1), 16);
      const flicker = 1 + Math.sin(time*(2.8+i*0.7)+i*2.1)*0.07;
      n.mat.emissive.setHex(hex);
      n.mat.emissiveIntensity = 3.5 * flicker;
      n.light.color.setHex(hex);
    });

    // Particles
    particles.forEach((p) => {
      if (cheering) {
        p.mesh.visible = true;
        p.mesh.position.y += p.vy * dt;
        if (p.mesh.position.y < -2.5) {
          p.mesh.position.y = 14 + Math.random()*4;
          p.x = -6+Math.random()*12; p.z = -6+Math.random()*8;
        }
        p.mesh.position.x = p.x + Math.sin(time*2+p.phase)*0.3;
        p.mesh.position.z = p.z;
        p.mesh.rotation.x += p.spin * dt * 0.0175;
        p.mesh.rotation.y += p.spin * 0.5 * dt * 0.0175;
      } else {
        p.mesh.visible = false;
        p.mesh.position.y = 14;
      }
    });

    // Resize check
    const cW = canvas.clientWidth, cH = canvas.clientHeight;
    if (renderer.domElement.width !== cW || renderer.domElement.height !== cH) {
      renderer.setSize(cW, cH, false);
      camera.aspect = cW / cH;
      camera.updateProjectionMatrix();
    }

    renderer.render(scene, camera);
  }

  animate();

  return () => {
    if (rafId) cancelAnimationFrame(rafId);
    renderer.dispose();
    scene.clear();
  };
}

// Local GLB model pool — Skye replaces the non-downloadable Host model
const CHAR_POOL = [
  { url: '/models/leggings.glb' },
  { url: '/models/kimberly.glb' },
  { url: '/models/helen.glb'    },
  { url: '/models/skye.glb'     }, // host
  { url: '/models/hips.glb'     },
  { url: '/models/crimson.glb'  },
];

// ── Speech line banks ─────────────────────────────────────────────────────────
const HYPE_LINES = [
  "You're a real deal! 💪",
  "That's my champion! ✨",
  "Unstoppable tonight! 🌟",
  "High roller energy! 🎲",
  "Eyes on the prize! 👀",
  "Make that power move! ⚡",
  "Vegas would love you 🎰",
  "Born to win, darling! 👑",
  "You've got this in the bag! 💼",
  "The table is YOURS tonight! 🏆",
  "Pure genius. I'm obsessed. 😍",
  "They never saw it coming! 💥",
  "Look at you go! Incredible! 🤩",
  "This is YOUR moment! 🌠",
  "Flawless strategy, honey! ♟️",
  "The cards are whispering your name 🃏",
  "This table has never seen anything like you 🌟",
];

const LOSS_LINES = [
  "Sorry for your loss, honey 😢",
  "Don't you dare give up! 😤",
  "They got lucky. You've got skill 🃏",
  "Shake it off, darling 💅",
  "I didn't come here to watch you lose 👀",
  "Ooh that stings… but you're still standing! 💔",
  "Revenge is a dish best served cold 🧊",
  "Pain is temporary, victory is forever 🔥",
  "Even champions take a hit sometimes 🥊",
  "That was rough. Come back stronger! 💪",
  "They played dirty. You'll play smarter. 🧠",
  "Don't let them see you sweat, darling 😤",
];

const SASSY_LINES = [
  "Oh honey, is that the best you've got? 😏",
  "Cute move. Now watch mine 💋",
  "Bless your heart… you tried 🙈",
  "The audacity! I love it 🔥",
  "They're shaking in their boots right now 😈",
  "Oh darling, the drama! 🎭",
  "Play your cards right — no pun intended 😉",
  "That was bold. I respect it 💎",
  "Someone's getting greedy… I like it 😼",
  "Oh the nerve! Absolutely unhinged. 😂",
  "I would never… but I understand why you did 👀",
  "Scandalous. Absolutely scandalous! 🌶️",
  "Did they really just do that? Bold! 😤",
  "Honey, you're playing 4D chess 🧩",
  "Look at the brain on this one! 🧠",
  "Messy but iconic, honestly 💅",
];

// Short burst lines on card play
const CARD_REACT_LINES = [
  "Ooh, bold move! 🎴",
  "Yes! Play it! ✨",
  "That's the one! 🔥",
  "Make them pay! 💸",
  "I love this! 😍",
  "Go go go! 🚀",
  "Yesss! 💪",
  "The drama! 😱",
  "Iconic! 🌟",
  "They won't recover from that! 😈",
];

// Shared Draco decoder (one instance reused across all character loaders)
let _dracoLoader = null;
function getDracoLoader() {
  if (!_dracoLoader) {
    _dracoLoader = new DRACOLoader();
    _dracoLoader.setDecoderPath('/draco/');
  }
  return _dracoLoader;
}

// Positions that stay near edges so girls peek out beside the game board
function getPositions(n) {
  if (n <= 0) return [];
  if (n === 1) return [8];
  if (n === 2) return [8, 92];
  if (n === 3) return [6, 50, 94];
  if (n === 4) return [6, 22, 78, 94];
  if (n === 5) return [5, 17, 50, 83, 95];
  return Array.from({ length: n }, (_, i) => 5 + (90 / (n - 1)) * i);
}

// ── Character dimensions ───────────────────────────────────────────────────────
const CHAR_W = 140;
const CHAR_H = 420;

// ── Single shared-renderer stage — ONE WebGL context for BOTH girls ────────────
// Uses scissor/viewport to draw each model into its own region of one canvas.
function CharacterStage({ slots, positions }) {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || slots.length === 0) return;

    // ONE renderer — replaces N individual contexts
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // cap to save VRAM
    renderer.outputColorSpace  = THREE.SRGBColorSpace;
    renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.autoClear = false;
    renderer.setClearColor(0x000000, 0);

    // Shared env map — generated ONCE, reused by every scene
    const pmrem = new THREE.PMREMGenerator(renderer);
    const sharedEnv = pmrem.fromScene(new THREE.Scene()).texture;
    pmrem.dispose();

    function makeScene() {
      const sc = new THREE.Scene();
      sc.environment = sharedEnv;
      sc.add(new THREE.AmbientLight(0xffffff, 3.0));
      const key = new THREE.DirectionalLight(0xfff4e0, 3.0);
      key.position.set(1.5, 3, 2); sc.add(key);
      const fill = new THREE.DirectionalLight(0xaabbff, 1.2);
      fill.position.set(-2, 1, 1); sc.add(fill);
      const back = new THREE.DirectionalLight(0xffffff, 1.0);
      back.position.set(0, 2, -3); sc.add(back);
      return sc;
    }

    const chars = slots.map((_, i) => ({
      scene:    makeScene(),
      camera:   new THREE.PerspectiveCamera(42, CHAR_W / CHAR_H, 0.01, 100),
      mixer:    null,
      model:    null,
      rotY:     Math.random() * Math.PI * 2,
      spinRate: 0.16 + (i % 4) * 0.025 + Math.random() * 0.04,
      ready:    false,
    }));

    const loader = new GLTFLoader();
    loader.setDRACOLoader(getDracoLoader());
    let loadedN = 0;

    chars.forEach((cd, i) => {
      loader.load(slots[i].url, (gltf) => {
        const model = gltf.scene;
        const box   = new THREE.Box3().setFromObject(model);
        const size  = box.getSize(new THREE.Vector3());
        const ctr   = box.getCenter(new THREE.Vector3());
        const sc    = 2.0 / Math.max(size.x, size.y, size.z);
        model.scale.setScalar(sc);
        model.position.set(-ctr.x * sc, -ctr.y * sc + size.y * sc * 0.05, -ctr.z * sc);
        cd.scene.add(model);
        cd.model = model;

        const sh = size.y * sc;
        cd.camera.position.set(0, sh * 0.42, sh * 1.1);
        cd.camera.lookAt(0, sh * 0.42, 0);

        if (gltf.animations.length > 0) {
          cd.mixer = new THREE.AnimationMixer(model);
          cd.mixer.clipAction(gltf.animations[0]).play();
        }
        cd.ready = true;
        loadedN += 1;
        if (loadedN === slots.length) setReady(true);
      });
    });

    const clock = new THREE.Clock();
    let rafId;

    function animate() {
      rafId = requestAnimationFrame(animate);
      const dt = clock.getDelta();

      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      if (cssW > 0 && cssH > 0) renderer.setSize(cssW, cssH, false);

      renderer.setScissorTest(false);
      renderer.clear();
      renderer.setScissorTest(true);

      chars.forEach((cd, i) => {
        if (!cd.ready || !cd.model) return;
        if (cd.mixer) cd.mixer.update(dt);
        cd.rotY += dt * cd.spinRate;
        cd.model.rotation.y = cd.rotY;

        const W = canvas.clientWidth, H = canvas.clientHeight;
        const cx = Math.round((positions[i] / 100) * W);
        const left = cx - CHAR_W / 2;
        const h    = Math.min(CHAR_H, H);

        if (left + CHAR_W < 0 || left > W) return; // off-screen

        renderer.setViewport(left, 0, CHAR_W, h);
        renderer.setScissor(left, 0, CHAR_W, h);
        cd.camera.aspect = CHAR_W / h;
        cd.camera.updateProjectionMatrix();
        renderer.clearDepth();
        renderer.render(cd.scene, cd.camera);
      });
      renderer.setScissorTest(false);
    }
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      chars.forEach(cd => {
        if (cd.model) {
          cd.model.traverse(child => {
            if (!child.isMesh) return;
            child.geometry?.dispose();
            (Array.isArray(child.material) ? child.material : [child.material]).forEach(m => {
              if (!m) return;
              Object.values(m).forEach(v => { if (v?.isTexture) v.dispose(); });
              m.dispose?.();
            });
          });
        }
        cd.scene.clear();
      });
      sharedEnv.dispose();
      renderer.dispose();
    };
  }, [slots.map(s => s.url).join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        display: 'block', pointerEvents: 'none',
        opacity: ready ? 1 : 0, transition: 'opacity 1.8s ease',
      }}
    />
  );
}

// ── Pure-HTML speech bubble overlay (no WebGL) ─────────────────────────────────
function CharacterBubble({ charIndex, playerName, posLeft, bubbleDelayMs, gameActive, forceReactLine }) {
  const [bubble,     setBubble]     = useState('');
  const [showBubble, setShowBubble] = useState(false);

  useEffect(() => {
    if (!forceReactLine) return;
    setBubble(forceReactLine);
    setShowBubble(true);
    if (gameActive) narrateCharacter(forceReactLine, charIndex);
    const t = setTimeout(() => setShowBubble(false), 3500);
    return () => clearTimeout(t);
  }, [forceReactLine]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!gameActive) return;
    let showT, hideT, cycleT;
    function showLine() {
      const pool = Math.random() < 0.55 ? HYPE_LINES : SASSY_LINES;
      const line = pool[Math.floor(Math.random() * pool.length)];
      setBubble(line);
      setShowBubble(true);
      narrateCharacter(line, charIndex);
      hideT  = setTimeout(() => setShowBubble(false), 4500);
      cycleT = setTimeout(showLine, 32000 + Math.random() * 22000);
    }
    showT = setTimeout(showLine, bubbleDelayMs);
    return () => { clearTimeout(showT); clearTimeout(hideT); clearTimeout(cycleT); };
  }, [gameActive, bubbleDelayMs, charIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: `${posLeft}%`,
      transform: 'translateX(-50%)', width: CHAR_W, height: CHAR_H,
      pointerEvents: 'none',
    }}>
      {/* Bubble */}
      <div style={{
        position: 'absolute', bottom: '102%', left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(15,10,30,0.93)',
        border: '1px solid rgba(180,130,255,0.35)',
        borderRadius: 12, padding: '6px 10px',
        fontSize: 11, fontWeight: 600, color: '#ead8ff',
        whiteSpace: 'nowrap', maxWidth: 220, pointerEvents: 'none',
        opacity: showBubble ? 1 : 0, transition: 'opacity 0.4s ease',
        zIndex: 30, boxShadow: '0 2px 16px rgba(120,60,200,0.4)',
      }}>
        {bubble}
        <div style={{
          position: 'absolute', bottom: -7, left: '50%', transform: 'translateX(-50%)',
          width: 0, height: 0,
          borderLeft: '7px solid transparent', borderRight: '7px solid transparent',
          borderTop: '7px solid rgba(180,130,255,0.35)',
        }} />
      </div>
      {playerName && (
        <div style={{
          position: 'absolute', bottom: -22, left: '50%', transform: 'translateX(-50%)',
          fontSize: 11, fontWeight: 700, color: 'rgba(200,180,255,0.85)',
          whiteSpace: 'nowrap', letterSpacing: '0.05em',
        }}>
          {playerName}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function CasinoBackground({
  city          = "lasvegas",
  cheering      = false,
  players       = [],
  gameActive    = false,   // true only while game.phase === "playing"
  reactionTrigger = 0,     // bumped by parent whenever a card is played
  lossTarget    = -1,      // player index that just suffered a negative action
}) {
  const canvasRef  = useRef(null);
  const stateRef   = useRef({ city, cheering });
  const cleanupRef = useRef(null);

  // Which slot is reacting to a card play, and what line it shows
  const [reactingSlot,     setReactingSlot]     = useState(-1);
  const [reactingLine,     setReactingLine]      = useState('');
  const [lossSlot,         setLossSlot]          = useState(-1);
  const [lossLine,         setLossLine]          = useState('');

  useEffect(() => { stateRef.current.cheering = cheering; }, [cheering]);
  useEffect(() => { stateRef.current.city = city; }, [city]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cleanup = buildThreeScene(canvas, stateRef);
    cleanupRef.current = cleanup;
    return () => { if (cleanupRef.current) cleanupRef.current(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Full slot list (one per player, or 2 decorative on home page)
  const allSlots = players.length > 0
    ? players.slice(0, CHAR_POOL.length).map((p, i) => ({
        url:          CHAR_POOL[i % CHAR_POOL.length].url,
        playerName:   p.name,
        charIndex:    i,
        bubbleDelayMs: 8000 + i * 4000,
      }))
    : [
        { url: CHAR_POOL[0].url, playerName: '', charIndex: 0, bubbleDelayMs: 9000  },
        { url: CHAR_POOL[5].url, playerName: '', charIndex: 5, bubbleDelayMs: 15000 },
      ];

  // Always show exactly 2 girls: pick two random ones each mount to keep it fresh
  // (stable ref so they don't re-randomise on every render)
  const pairRef = useRef(null);
  if (!pairRef.current || pairRef.current.srcLen !== allSlots.length) {
    if (allSlots.length <= 2) {
      pairRef.current = { pair: allSlots, srcLen: allSlots.length };
    } else {
      // Pick 2 distinct random indices
      const a = Math.floor(Math.random() * allSlots.length);
      let b = Math.floor(Math.random() * (allSlots.length - 1));
      if (b >= a) b += 1;
      pairRef.current = { pair: [allSlots[a], allSlots[b]], srcLen: allSlots.length };
    }
  }
  const displaySlots = pairRef.current.pair;
  const displayPositions = [9, 91]; // left + right edges, always fully visible

  // Card-play reaction: pick a random display slot
  useEffect(() => {
    if (!reactionTrigger || displaySlots.length === 0) return;
    const idx  = Math.floor(Math.random() * displaySlots.length);
    const pool = Math.random() < 0.6 ? CARD_REACT_LINES : HYPE_LINES;
    const line = pool[Math.floor(Math.random() * pool.length)];
    setReactingSlot(idx);
    setReactingLine(line);
    const t = setTimeout(() => setReactingSlot(-1), 4000);
    return () => clearTimeout(t);
  }, [reactionTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // Loss reaction
  useEffect(() => {
    if (lossTarget < 0 || displaySlots.length === 0) return;
    const idx  = lossTarget % displaySlots.length;
    const pool = Math.random() < 0.7 ? LOSS_LINES : SASSY_LINES;
    const line = pool[Math.floor(Math.random() * pool.length)];
    setLossSlot(idx);
    setLossLine(line);
    const t = setTimeout(() => setLossSlot(-1), 5000);
    return () => clearTimeout(t);
  }, [lossTarget]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
      />

      {/* Desktop character layer — ONE renderer for both girls */}
      <div className="hidden sm:block" style={{
        position: 'fixed', inset: 0, zIndex: 18, pointerEvents: 'none',
      }}>
        {/* Single shared-renderer canvas */}
        <CharacterStage slots={displaySlots} positions={displayPositions} />

        {/* HTML overlays: bubbles + name labels (no WebGL) */}
        {displaySlots.map((slot, i) => (
          <CharacterBubble
            key={slot.url + i}
            charIndex={slot.charIndex}
            playerName={slot.playerName}
            posLeft={displayPositions[i]}
            bubbleDelayMs={slot.bubbleDelayMs}
            gameActive={gameActive}
            forceReactLine={
              reactingSlot === i ? reactingLine :
              lossSlot     === i ? lossLine     : ''
            }
          />
        ))}
      </div>

      {/* Mobile: ONE girl, bottom-right, no renderer (uses CharacterStage with 1 slot) */}
      <div className="sm:hidden" style={{
        position: 'fixed', bottom: 0, right: 0, zIndex: 18, pointerEvents: 'none',
        width: 110, height: 340,
      }}>
        {displaySlots[0] && (
          <>
            <CharacterStage
              slots={[displaySlots[0]]}
              positions={[50]}
            />
            <CharacterBubble
              charIndex={displaySlots[0].charIndex}
              playerName=""
              posLeft={50}
              bubbleDelayMs={12000}
              gameActive={gameActive}
              forceReactLine={reactingSlot === 0 ? reactingLine : (lossSlot === 0 ? lossLine : '')}
            />
          </>
        )}
      </div>
    </div>
  );
}
