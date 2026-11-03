/* PixelPet 다운로드 페이지 */
(() => {
  'use strict';
  const DATA = window.PETDATA;
  const FIX = DATA.fixed;
  const REPO = 'Dev2lgb/pixelpet-download';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const $ = (s, el) => (el || document).querySelector(s);
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const dprInt = () => Math.max(1, Math.round(window.devicePixelRatio || 1));
  const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const PINK = '#ff4f8b';

  // 마우스 위치 (뷰포트 기준)
  const mouse = { x: -9999, y: -9999, moved: 0 };
  window.addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch') { mouse.x = e.clientX; mouse.y = e.clientY; mouse.moved = performance.now(); } }, { passive: true });
  document.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });

  // ───────── 픽셀 그림 그리기 ─────────
  const cache = new Map();
  function frameCanvas(fr, pal) {
    const key = fr[2] + '|' + (pal ? (pal.B || '') + (pal.O || '') + (pal.R || '') + (pal.r || '') : '');
    let c = cache.get(key);
    if (c) return c;
    const [w, h, s] = fr;
    c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    const img = g.createImageData(w, h);
    for (let i = 0; i < w * h; i++) {
      const k = s[i];
      if (k === '.') continue;
      const hex = (pal && pal[k]) || FIX[k] || '#ff00ff';
      const n = parseInt(hex.slice(1), 16);
      img.data[i * 4] = n >> 16; img.data[i * 4 + 1] = (n >> 8) & 255; img.data[i * 4 + 2] = n & 255; img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    cache.set(key, c);
    return c;
  }

  // 발바닥 가운데(x, y) 기준으로 펫 그리기
  function drawPet(ctx, fr, pal, o) {
    const c = frameCanvas(fr, pal), P = o.P, w = fr[0] * P, h = fr[1] * P;
    ctx.save();
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.translate(Math.round(o.x), Math.round(o.y));
    if (o.rot) ctx.rotate(o.rot);
    if (o.wobble) ctx.rotate(o.wobble);
    if (o.hop) ctx.translate(0, -Math.round(o.hop));
    if (o.squash && o.squash !== 1) ctx.scale(1 + (1 - o.squash) * 0.6, o.squash);
    if (o.flip) ctx.scale(-1, 1);
    if (o.spin) {
      const s = o.spin;
      ctx.translate(0, -(h / 2 * Math.abs(Math.cos(s)) + w / 2 * Math.abs(Math.sin(s))));
      ctx.rotate(s);
      ctx.translate(0, h / 2);
    }
    ctx.drawImage(c, -Math.round(w / 2), -h, w, h);
    ctx.restore();
  }

  // 소품: 아래 가운데 기준
  function drawProp(ctx, name, x, y, P, o) {
    const fr = DATA.props[name] || DATA.icons[name];
    if (!fr) return;
    const c = frameCanvas(fr, null), w = fr[0] * P, h = fr[1] * P;
    ctx.save();
    if (o && o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.translate(Math.round(x), Math.round(y));
    if (o && o.rot) ctx.rotate(o.rot);
    if (o && o.flip) ctx.scale(-1, 1);
    ctx.drawImage(c, -Math.round(w / 2), -h, w, h);
    ctx.restore();
  }

  // 작은 그림자 (발밑 어두운 타원 느낌)
  function shadow(ctx, x, y, w, P) {
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(Math.round(x - w / 2 + P), Math.round(y), Math.round(w - 2 * P), P);
  }

  // 캔버스를 "그림 픽셀 W×H" 크기로 정수배 확대해서 맞추기
  function fitArt(cv, artW, artH, maxCss) {
    const box = cv.parentElement.clientWidth || maxCss;
    const k = Math.max(1, Math.floor(Math.min(maxCss || 9999, box) / artW));
    const r = dprInt();
    cv.style.width = artW * k + 'px';
    cv.style.height = artH * k + 'px';
    cv.width = artW * k * r;
    cv.height = artH * k * r;
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    return { ctx, P: k * r };
  }

  // 펫 하나를 담는 캔버스 (부모의 CSS 변수 --s 배율로)
  const gachaItems = [], staticItems = [], moveItems = [];
  function sprCanvas(fr, pal, opt, list) {
    const cv = document.createElement('canvas');
    const item = { cv, fr, pal, opt: opt || {} };
    (list || staticItems).push(item);
    return item;
  }
  function renderSpr(item) {
    const { cv, fr, opt } = item;
    const s = parseInt(getComputedStyle(cv.parentElement).getPropertyValue('--s'), 10) || 4;
    const r = dprInt();
    const W = fr[0] + (opt.padW || 0), H = fr[1] + (opt.padH || 0);
    cv.style.width = W * s + 'px';
    cv.style.height = H * s + 'px';
    cv.width = W * s * r; cv.height = H * s * r;
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    item.ctx = ctx; item.P = s * r; item.W = W; item.H = H;
    (opt.draw || drawStill)(item);
  }
  function drawStill(item, o) {
    const { ctx, pal, P, W, H } = item;
    if (!ctx) return;
    ctx.clearRect(0, 0, W * P, H * P);
    drawPet(ctx, item.fr, pal, Object.assign({ x: W * P / 2, y: H * P, P }, o || {}));
  }

  // ───────── 픽셀 커서 + 커서 반짝이 ─────────
  (function cursors() {
    if (!finePointer) return;
    const ARROW = [
      'K..........', 'KK.........', 'KWK........', 'KWWK.......', 'KWWWK......', 'KWWWWK.....', 'KWWWWWK....', 'KWWWWWWK...',
      'KWWWWWWWK..', 'KWWWWWWWWK.', 'KWWWWWKKKKK', 'KWWKWWK....', 'KWK.KWWK...', 'KK..KWWK...', 'K....KWWK..', '.....KKK...',
    ];
    const make = (fill) => {
      const s = 2, c = document.createElement('canvas');
      c.width = ARROW[0].length * s; c.height = ARROW.length * s;
      const g = c.getContext('2d');
      ARROW.forEach((row, y) => [...row].forEach((ch, x) => {
        if (ch === '.') return;
        g.fillStyle = ch === 'K' ? '#000' : fill;
        g.fillRect(x * s, y * s, s, s);
      }));
      return `url(${c.toDataURL()}) 0 0`;
    };
    document.documentElement.style.setProperty('--cur', make('#ffffff') + ', auto');
    document.documentElement.style.setProperty('--cur-hit', make(PINK) + ', pointer');
  })();

  (function cursorTrail() {
    if (!finePointer || reduced) return;
    const cv = $('#cursor-fx');
    const ctx = cv.getContext('2d');
    let parts = [], lx = null, ly = null, r = 1;
    const COLORS = [PINK, '#ffd23f', '#ffffff', '#7fe0d6'];
    function resize() { r = window.devicePixelRatio || 1; cv.width = innerWidth * r; cv.height = innerHeight * r; }
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      if (lx === null) { lx = e.clientX; ly = e.clientY; return; }
      const d = Math.hypot(e.clientX - lx, e.clientY - ly);
      if (d < 14) return;
      lx = e.clientX; ly = e.clientY;
      parts.push({ x: lx + 10, y: ly + 16, vx: rand(-20, 20), vy: rand(-10, 30), t: 0, life: rand(0.35, 0.6), c: pick(COLORS), s: pick([3, 3, 6]) });
      if (parts.length > 50) parts.shift();
    }, { passive: true });
    let last = 0;
    (function loop(ts) {
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
      last = ts;
      if (parts.length) {
        ctx.clearRect(0, 0, cv.width, cv.height);
        parts.forEach((p) => {
          p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt;
          const k = 1 - p.t / p.life;
          if (k <= 0) return;
          const s = Math.max(1, Math.round(p.s * (k > 0.5 ? 1 : 0.67) * r));
          ctx.fillStyle = p.c;
          ctx.fillRect(Math.round(p.x * r), Math.round(p.y * r), s, s);
        });
        parts = parts.filter((p) => p.t < p.life);
        if (!parts.length) ctx.clearRect(0, 0, cv.width, cv.height);
      }
      requestAnimationFrame(loop);
    })(0);
  })();

  // ───────── 로고 옆 아이콘 ─────────
  (function brand() {
    const cv = $('.brand-pet');
    const h = DATA.heroes[0], fr = h.f.front;
    const r = dprInt(), crop = Math.min(fr[1], 22);
    cv.width = 22 * 3 * r / 2; cv.height = 22 * 3 * r / 2;
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const P = Math.floor(cv.width / 22);
    ctx.drawImage(frameCanvas(fr, h.pal), 0, 0, fr[0], crop, Math.round((cv.width - fr[0] * P) / 2), 0, fr[0] * P, crop * P);
  })();

  // ───────── 첫 화면: 양쪽으로 흐르는 펫 행렬 ─────────
  function makeParade(cv, dir) {
    const ctx = cv.getContext('2d');
    const pool = shuffle(DATA.gacha).slice(0, 26);
    let W = 0, H = 0, r = 1, s = 4, items = [], L = 1, offset = 0, t = 0, visible = true, rect = cv.getBoundingClientRect();
    function layout() {
      r = window.devicePixelRatio || 1;
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = Math.round(W * r); cv.height = Math.round(H * r);
      s = W <= 640 ? 3 : 4;
      let x = 0;
      items = pool.map((g, i) => {
        const it = { g, x, w: g.walk0[0] * s, phase: i * 0.37, hop: 0, cool: 0 };
        x += it.w + rand(14, 34) * (s / 4);
        return it;
      });
      L = x;
      rect = cv.getBoundingClientRect();
    }
    function draw() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.imageSmoothingEnabled = false;
      const P = Math.max(1, Math.round(s * r));
      const floor = Math.round((H - 4) * r);
      ctx.fillStyle = '#1c1c1c';
      ctx.fillRect(0, floor, cv.width, Math.max(1, Math.round(r)));
      for (const it of items) {
        let base = ((it.x + offset) % L + L) % L;
        for (let k = -1; base + k * L < W + 60; k++) {
          const cx = base + k * L + it.w / 2;
          if (cx < -60 || cx > W + 60) continue;
          const happy = it.hop > 0;
          const fr = happy ? it.g.happy : (Math.floor(t * 5 + it.phase * 10) % 2 ? it.g.walk1 : it.g.walk0);
          const hop = happy ? Math.abs(Math.sin(it.hop * 9)) * 7 * s : 0;
          drawPet(ctx, fr, it.g.pal, { x: cx * r, y: floor, P, flip: !happy && dir < 0, hop: hop * r });
        }
      }
    }
    let last = 0;
    function loop(ts) {
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
      last = ts;
      if (visible) {
        t += dt;
        rect = cv.getBoundingClientRect();
        const over = mouse.y > rect.top - 20 && mouse.y < rect.bottom + 10;
        offset += dir * (over ? 7 : 26) * dt;
        // 커서 근처 펫은 멈춰서 폴짝
        const lx = mouse.x - rect.left, ly = mouse.y - rect.top;
        for (const it of items) {
          if (it.hop > 0) it.hop = Math.max(0, it.hop - dt);
          if (!over) continue;
          let base = ((it.x + offset) % L + L) % L;
          for (let k = -1; base + k * L < W + 60; k++) {
            const cx = base + k * L + it.w / 2;
            if (Math.abs(lx - cx) < it.w * 0.7 && ly > 0 && ly < H) it.hop = Math.max(it.hop, 0.35);
          }
        }
        draw();
      }
      requestAnimationFrame(loop);
    }
    layout();
    draw();
    if (!reduced) {
      new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(cv);
      requestAnimationFrame(loop);
    }
    return { layout: () => { layout(); draw(); } };
  }
  const paradeA = makeParade($('#parade-a'), 1);
  const paradeB = makeParade($('#parade-b'), -1);

  // ───────── 첫 화면: 도트 글자 PIXELPET + 그 위를 걷는 펫 ─────────
  const mark = (function () {
    const GLYPH = {
      P: ['XXXX.', 'X...X', 'X...X', 'XXXX.', 'X....', 'X....', 'X....'],
      I: ['XXXXX', '..X..', '..X..', '..X..', '..X..', '..X..', 'XXXXX'],
      X: ['X...X', 'X...X', '.X.X.', '..X..', '.X.X.', 'X...X', 'X...X'],
      E: ['XXXXX', 'X....', 'X....', 'XXXX.', 'X....', 'X....', 'XXXXX'],
      L: ['X....', 'X....', 'X....', 'X....', 'X....', 'X....', 'XXXXX'],
      T: ['XXXXX', '..X..', '..X..', '..X..', '..X..', '..X..', '..X..'],
    };
    const WORD = 'PIXELPET', COLS = WORD.length * 6 - 1;
    const cv = $('#mark');
    const ctx = cv.getContext('2d');
    const pet = DATA.heroes[13];
    let W = 0, b = 20, ps = 4, top = 0, H = 0, r = 1, gaps = [];
    let x = 60, dir = 1, act = 'walk', actT = 0, actDur = 4, t = 0, hearts = [], visible = true;
    const topRow = []; // 열마다 맨 윗줄이 채워졌는지
    [...WORD].forEach((ch, i) => { for (let c = 0; c < 6; c++) topRow[i * 6 + c] = c < 5 && GLYPH[ch][0][c] === 'X'; });
    function layout() {
      r = window.devicePixelRatio || 1;
      W = cv.parentElement.clientWidth - parseFloat(getComputedStyle(cv.parentElement).paddingLeft) * 2;
      b = Math.max(6, Math.floor(W / COLS));
      ps = clamp(Math.round(b / 6), 2, 4);
      const petH = pet.f.front[1] * ps;
      top = petH + 14;
      H = top + 7 * b + Math.round(b * 0.35) + 4;
      cv.style.width = COLS * b + 'px';
      cv.style.height = H + 'px';
      cv.width = Math.round(COLS * b * r); cv.height = Math.round(H * r);
      // 2칸 이상 비는 곳은 점프 구간
      gaps = [];
      let start = -1;
      for (let c = 0; c <= COLS; c++) {
        const filled = c < COLS && topRow[c];
        if (!filled && start < 0) start = c;
        if (filled && start >= 0) { if (c - start >= 2) gaps.push([start * b, c * b]); start = -1; }
      }
      x = clamp(x, 20, COLS * b - 20);
    }
    function surfaceHop(px) {
      for (const [a, z] of gaps) if (px > a && px < z) { const k = (px - a) / (z - a); return Math.sin(k * Math.PI) * ((z - a) * 0.45 + 8); }
      return 0;
    }
    function draw() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.imageSmoothingEnabled = false;
      const B = b * r, sh = Math.max(2, Math.round(b * 0.3 * r)), T = Math.round(top * r);
      [...WORD].forEach((ch, i) => {
        GLYPH[ch].forEach((row, y) => [...row].forEach((v, xx) => {
          if (v !== 'X') return;
          const X = Math.round((i * 6 + xx) * B), Y = T + Math.round(y * B);
          ctx.fillStyle = PINK; ctx.fillRect(X + sh, Y + sh, Math.ceil(B), Math.ceil(B));
        }));
      });
      [...WORD].forEach((ch, i) => {
        GLYPH[ch].forEach((row, y) => [...row].forEach((v, xx) => {
          if (v !== 'X') return;
          ctx.fillStyle = '#fff'; ctx.fillRect(Math.round((i * 6 + xx) * B), T + Math.round(y * B), Math.ceil(B), Math.ceil(B));
        }));
      });
      const P = Math.max(1, Math.round(ps * r));
      const f = pet.f;
      let fr = f.front, hop = surfaceHop(x), flip = dir < 0;
      const blink = t % 3.7 < 0.14;
      if (act === 'walk' || act === 'follow-walk') fr = Math.floor(t * 6) % 2 ? f.walk1 : f.walk0;
      else if (act === 'happy') { fr = f.happy; hop += Math.abs(Math.sin(actT * 8)) * 3 * ps; flip = false; }
      else if (act === 'look') { fr = blink ? f.blink : f.front; flip = false; }
      else if (blink) fr = f.blink;
      if (hop > 0 && act !== 'happy') fr = f.surprised;
      drawPet(ctx, fr, pet.pal, { x: x * r, y: T, P, flip, hop: hop * r });
      hearts.forEach((h) => drawProp(ctx, 'heart', h.x * r, (T - pet.f.front[1] * ps - 6 + h.y) * r, P, { alpha: 1 - h.t / 1.2 }));
    }
    let last = 0;
    function loop(ts) {
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
      last = ts;
      if (visible) {
        t += dt; actT += dt;
        const rc = cv.getBoundingClientRect();
        const near = mouse.x > rc.left && mouse.x < rc.right && mouse.y > rc.top - 40 && mouse.y < rc.bottom + 40;
        const maxX = COLS * b - 20;
        if (near) {
          const tx = clamp(mouse.x - rc.left, 20, maxX);
          if (Math.abs(tx - x) > 10) { dir = tx > x ? 1 : -1; x += dir * 70 * dt; act = 'follow-walk'; }
          else if (act !== 'happy') { act = 'happy'; actT = 0; }
        } else {
          if (act === 'follow-walk' || act === 'happy') { act = 'look'; actT = 0; actDur = 1.2; }
          if (act === 'walk') {
            x += dir * 34 * dt;
            if (x > maxX) { x = maxX; dir = -1; }
            if (x < 20) { x = 20; dir = 1; }
          }
          if (actT > actDur) {
            actT = 0;
            const roll = Math.random();
            if (roll < 0.6) { act = 'walk'; actDur = rand(3, 8); if (Math.random() < 0.3) dir = -dir; }
            else { act = Math.random() < 0.5 ? 'idle' : 'look'; actDur = rand(1.2, 3); }
          }
        }
        hearts.forEach((h) => { h.t += dt; h.y -= 24 * dt; });
        hearts = hearts.filter((h) => h.t < 1.2);
        draw();
      }
      requestAnimationFrame(loop);
    }
    cv.addEventListener('click', () => { hearts.push({ x, y: 0, t: 0 }); act = 'happy'; actT = 0; });
    layout();
    draw();
    if (!reduced) {
      new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(cv);
      requestAnimationFrame(loop);
    }
    return { layout: () => { layout(); draw(); } };
  })();

  // ───────── 바탕화면 모니터 장면 ─────────
  const monitor = (function () {
    const cv = $('#monitor');
    const AW = 128, AH = 98;
    const heroA = DATA.heroes[1], heroB = DATA.heroes[4], heroC = DATA.heroes[7];
    let ctx, P, t = 0, ax = 30, adir = 1, by = 30, bdir = 1;
    const sx0 = 5, sx1 = 122, sy0 = 5, floor = 66;
    function layout() { ({ ctx, P } = fitArt(cv, AW, AH, 620)); draw(); }
    function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x * P, y * P, w * P, h * P); }
    function frameBox(x, y, w, h, fill, line) {
      rect(x + 1, y, w - 2, h, line || '#3a3a3a'); rect(x, y + 1, w, h - 2, line || '#3a3a3a');
      rect(x + 1, y + 1, w - 2, h - 2, fill);
    }
    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, AW * P, AH * P);
      frameBox(56, 80, 16, 10, '#111');
      frameBox(40, 88, 48, 7, '#111');
      frameBox(0, 0, 128, 82, '#111');
      rect(sx0, sy0, sx1 - sx0 + 1, 68, '#1f1f1f');
      frameBox(14, 14, 46, 30, '#2a2a2a', '#444'); rect(15, 15, 44, 4, PINK); rect(18, 23, 26, 2, '#444'); rect(18, 28, 34, 2, '#444'); rect(18, 33, 20, 2, '#444');
      frameBox(66, 24, 38, 26, '#2a2a2a', '#444'); rect(67, 25, 36, 4, '#ffd23f'); rect(70, 33, 24, 10, '#3a3a3a');
      rect(sx0, floor, sx1 - sx0 + 1, 7, '#000');
      rect(8, floor + 2, 3, 3, PINK); rect(14, floor + 2, 3, 3, '#ffd23f'); rect(20, floor + 2, 3, 3, '#7fe0d6');
      drawProp(ctx, 'poop', 96 * P, floor * P, P);
      const ph = (t * 0.8) % 1;
      drawProp(ctx, 'stink', 96 * P, (floor - 8 - ph * 6) * P, P, { alpha: Math.sin(ph * Math.PI) * 0.9 });
      const blink = (t % 3.7) < 0.15;
      drawPet(ctx, blink ? heroC.f.blink : heroC.f.front, heroC.pal, { x: 38 * P, y: sy0 * P, P, rot: Math.PI });
      const bw = Math.floor(t * 4) % 2 ? heroB.f.walk1 : heroB.f.walk0;
      drawPet(ctx, bw, heroB.pal, { x: (sx1 + 1) * P, y: by * P, P, rot: -Math.PI / 2, flip: bdir > 0 });
      const aw = Math.floor(t * 5) % 2 ? heroA.f.walk1 : heroA.f.walk0;
      drawPet(ctx, aw, heroA.pal, { x: ax * P, y: floor * P, P, flip: adir < 0 });
    }
    let last = 0, visible = true;
    function loop(ts) {
      const dt = last ? Math.min(0.1, (ts - last) / 1000) : 0;
      last = ts;
      if (visible) {
        t += dt;
        ax += adir * 9 * dt;
        if (ax > 82) { ax = 82; adir = -1; } else if (ax < 16) { ax = 16; adir = 1; }
        by += bdir * 6 * dt;
        if (by > 52) { by = 52; bdir = -1; } else if (by < 18) { by = 18; bdir = 1; }
        draw();
      }
      requestAnimationFrame(loop);
    }
    layout();
    if (!reduced) {
      new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(cv);
      requestAnimationFrame(loop);
    }
    return { layout };
  })();

  // ───────── 룩북 ─────────
  const lookEl = $('#gacha');
  function roll() {
    const n = window.innerWidth <= 640 ? 6 : window.innerWidth <= 960 ? 6 : 8;
    lookEl.innerHTML = '';
    gachaItems.length = 0;
    shuffle(DATA.gacha).slice(0, n).forEach((g) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.setAttribute('role', 'listitem');
      const stage = document.createElement('div');
      stage.className = 'stage';
      const item = sprCanvas(g.f, g.pal, { padW: 4, padH: 6, draw: drawCard }, gachaItems);
      item.g = g; item.hover = false; item.t = 0; item.flip = false;
      stage.appendChild(item.cv);
      card.appendChild(stage);
      card.insertAdjacentHTML('beforeend', `<span class="no">No.${g.no}</span><span class="parts">${g.parts.join(', ')}</span>`);
      lookEl.appendChild(card);
      renderSpr(item);
      card.addEventListener('pointerenter', () => { item.hover = true; item.t = 0; });
      card.addEventListener('pointerleave', () => { item.hover = false; drawCard(item); });
      card.addEventListener('pointermove', (e) => { const rc = item.cv.getBoundingClientRect(); item.flip = e.clientX < rc.left + rc.width / 2; });
    });
  }
  function drawCard(it) {
    const { ctx, P, W, H, g } = it;
    if (!ctx) return;
    ctx.clearRect(0, 0, W * P, H * P);
    const x = W * P / 2, y = (H - 1) * P;
    shadow(ctx, x, y, g.f[0] * P * 0.8, P);
    let fr = it.blink ? g.blink : g.f, hop = 0;
    if (it.hover) { fr = g.happy; hop = Math.abs(Math.sin(it.t * 7)) * 3 * P; }
    drawPet(ctx, fr, g.pal, { x, y, P, hop, flip: it.flip });
  }
  roll();
  $('#reroll').addEventListener('click', roll);
  if (!reduced) {
    setInterval(() => {
      const idle = gachaItems.filter((i) => !i.hover);
      if (!idle.length) return;
      const it = pick(idle);
      it.blink = true; drawCard(it);
      setTimeout(() => { it.blink = false; drawCard(it); }, 160);
    }, 650);
  }

  // ───────── 성장, 모자 ─────────
  const EVO = [['알', '1분'], ['아기', '30분'], ['어린이', '12시간'], ['청소년', '48시간'], ['어른', '다 컸어요']];
  DATA.evo.f.forEach((fr, i) => {
    const li = document.createElement('li');
    const stand = document.createElement('div');
    stand.className = 'stand';
    const item = sprCanvas(fr, DATA.evo.pal);
    stand.appendChild(item.cv);
    li.appendChild(stand);
    li.insertAdjacentHTML('beforeend', `<div class="bar"></div><b>${EVO[i][0]}</b><span>${EVO[i][1]}</span>`);
    $('#evo').appendChild(li);
    renderSpr(item);
  });
  DATA.hats.f.forEach((fr, i) => {
    const li = document.createElement('li');
    const stand = document.createElement('div');
    stand.className = 'stand';
    const item = sprCanvas(fr, DATA.hats.pal);
    stand.appendChild(item.cv);
    li.appendChild(stand);
    li.insertAdjacentHTML('beforeend', `<span>${DATA.hats.names[i]}</span>`);
    $('#hats').appendChild(li);
    renderSpr(item);
  });

  // ───────── 장면 타일 ─────────
  const SCENE_W = 64, SCENE_H = 40, GROUND = 35;
  function sceneBg(ctx, P) {
    ctx.fillStyle = '#121212'; ctx.fillRect(0, 0, SCENE_W * P, SCENE_H * P);
    ctx.fillStyle = '#2e2e2e'; ctx.fillRect(0, GROUND * P, SCENE_W * P, P);
  }
  const HR = DATA.heroes;
  const SCENES = {
    eat(ctx, P, t) {
      const h = HR[2];
      drawPet(ctx, Math.floor(t * 3.3) % 2 ? h.f.chew : h.f.chew2, h.pal, { x: 26 * P, y: GROUND * P, P });
      drawProp(ctx, 'rice', 42 * P, GROUND * P, P);
      drawProp(ctx, 'heart', 40 * P, (12 - (t * 4) % 6) * P, P, { alpha: 0.9 });
    },
    poop(ctx, P, t) {
      const h = HR[5];
      drawPet(ctx, h.f.sad, h.pal, { x: 20 * P, y: GROUND * P, P });
      drawProp(ctx, 'poop', 40 * P, GROUND * P, P);
      drawProp(ctx, 'poop', 52 * P, GROUND * P, P);
      const ph = (t * 0.8) % 1;
      drawProp(ctx, 'stink', 40 * P, (GROUND - 9 - ph * 6) * P, P, { alpha: Math.sin(ph * Math.PI) });
      const a = t * 3;
      drawProp(ctx, 'fly', (52 + Math.cos(a) * 6) * P, (GROUND - 10 + Math.sin(a * 1.7) * 3) * P, P);
    },
    bath(ctx, P, t) {
      const h = HR[8];
      drawPet(ctx, h.f.happy, h.pal, { x: 32 * P, y: GROUND * P, P, squash: 0.9, wobble: Math.sin(t * 6) * 0.05 });
      drawProp(ctx, 'tub', 32 * P, GROUND * P, P);
      [[18, 14], [44, 10], [24, 6], [40, 20], [48, 16]].forEach(([x, y], i) => {
        const ph = (t * 0.5 + i * 0.23) % 1;
        drawProp(ctx, 'bubble', x * P, (y - ph * 6) * P, P, { alpha: 1 - ph });
      });
    },
    sleep(ctx, P, t) {
      const h = HR[10];
      drawPet(ctx, h.f.sleep, h.pal, { x: 30 * P, y: GROUND * P, P, spin: Math.PI / 2, squash: 1 + Math.sin(t * 2) * 0.02 });
      for (let i = 0; i < 3; i++) {
        const ph = (t * 0.45 + i / 3) % 1;
        drawProp(ctx, 'z', (46 + ph * 8) * P, (22 - ph * 16) * P, P, { alpha: Math.sin(ph * Math.PI) });
      }
    },
    doll(ctx, P, t) {
      const h = HR[3];
      drawPet(ctx, (t % 2.2) > 1.7 ? h.f.strain : h.f.front, h.pal, { x: 20 * P, y: GROUND * P, P, squash: 0.94 });
      drawProp(ctx, 'doll', 41 * P, (GROUND - 6) * P, P);
      drawProp(ctx, 'table', 40 * P, GROUND * P, P);
      const eyes = Math.floor(t / 2.2) % 3;
      ctx.fillStyle = '#2b2233';
      const dfr = DATA.props.doll, dx = 41 * P - Math.round(dfr[0] * P / 2), dy = (GROUND - 6) * P - dfr[1] * P;
      if (eyes >= 1) ctx.fillRect(dx + 3 * P, dy + 4 * P, P, P);
      if (eyes >= 2) ctx.fillRect(dx + 6 * P, dy + 4 * P, P, P);
    },
    flyer(ctx, P, t) {
      const h = HR[6];
      drawPet(ctx, Math.floor(t * 5) % 2 ? h.f.walk1 : h.f.walk0, h.pal, { x: 24 * P, y: GROUND * P, P });
      drawProp(ctx, 'flyer', 31 * P, (GROUND - 9) * P, P);
      const ph = (t * 0.4) % 1;
      drawProp(ctx, 'flyer', (36 + ph * 22) * P, (GROUND - 16 - Math.sin(ph * Math.PI) * 10) * P, P, { rot: ph * 5, alpha: 1 - ph * 0.6 });
    },
    box(ctx, P, t) {
      const h = HR[9];
      const fr = Math.floor(t * 4) % 2 ? h.f.walk1 : h.f.walk0;
      const x = 32 + Math.sin(t * 0.8) * 10;
      drawPet(ctx, fr, h.pal, { x: x * P, y: GROUND * P, P, flip: Math.cos(t * 0.8) < 0 });
      drawProp(ctx, 'box', x * P, (GROUND - fr[1] + 3) * P, P);
    },
  };
  const tiles = [];
  function makeTiles(el, list) {
    list.forEach(([key, title, text, pay]) => {
      const d = document.createElement('div');
      d.className = 'tile';
      const cv = document.createElement('canvas');
      cv.setAttribute('role', 'img');
      cv.setAttribute('aria-label', title);
      d.appendChild(cv);
      d.insertAdjacentHTML('beforeend', `<h3>${title}</h3><p>${text}</p>` + (pay ? `<span class="pay">${pay}</span>` : ''));
      el.appendChild(d);
      tiles.push({ cv, key, t: rand(0, 3), on: false });
    });
  }
  makeTiles($('#care-tiles'), [
    ['eat', '밥과 간식', '배고프면 머리 위에 주먹밥이 떠요. 간식을 너무 많이 주면 배탈이 나요.'],
    ['poop', '똥 치우기', '한두 시간마다 아무 데나 싸요. 똥을 클릭하면 치워져요.'],
    ['bath', '목욕', '꼬질꼬질해지면 냄새가 나고 파리가 꼬여요. 욕조에서 씻기면 반짝반짝.'],
    ['sleep', '쿨쿨', '옆으로 눕거나, 웅크리거나, 대자로 뻗어서 자요. 자다가 뒤척이기도 해요.'],
  ]);
  makeTiles($('#job-tiles'), [
    ['doll', '인형 눈 붙이기', '청소년부터 할 수 있는 첫 알바.', '1분에 10원'],
    ['flyer', '전단지 돌리기', '화면 바닥을 오가며 전단지를 날려요. 체력 30 필요.', '1분에 25원'],
    ['box', '택배 상하차', '어른이 되면 할 수 있어요. 체력 60 필요.', '1분에 50원'],
  ]);
  function drawTile(tl) { if (!tl.ctx) return; sceneBg(tl.ctx, tl.P); SCENES[tl.key](tl.ctx, tl.P, tl.t); }
  function layoutTiles() {
    tiles.forEach((tl) => { Object.assign(tl, fitArt(tl.cv, SCENE_W, SCENE_H, tl.cv.parentElement.clientWidth)); drawTile(tl); });
  }
  layoutTiles();
  if (!reduced) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { const tl = tiles.find((x) => x.cv === e.target); if (tl) tl.on = e.isIntersecting; }));
    tiles.forEach((tl) => io.observe(tl.cv));
  }

  // ───────── 펫 하우스: 집 안 단면 + 꾸미기 견본 ─────────
  // 벽지·바닥 무늬는 앱과 같음 (g: 캔버스, z: 무늬 한 칸 크기)
  const WALL_HEART = ['.X.X.', 'XXXXX', '.XXX.', '..X..'];
  function paintWall(g, kind, x0, y0, w, h, z) {
    const R = (x, y, ww, hh) => g.fillRect(Math.round(x0 + x * z), Math.round(y0 + y * z), Math.max(1, Math.round(ww * z)), Math.max(1, Math.round(hh * z)));
    const cols = Math.ceil(w / z), rows = Math.ceil(h / z);
    g.save();
    g.beginPath(); g.rect(x0, y0, w, h); g.clip();
    switch (kind) {
      case 'dots':
        g.fillStyle = '#dff1fb'; g.fillRect(x0, y0, w, h);
        g.fillStyle = '#b9e0f6';
        for (let y = 4, r = 0; y < rows; y += 12, r++) for (let x = (r % 2) * 8 + 4; x < cols; x += 16) R(x, y, 3, 3);
        break;
      case 'check':
        g.fillStyle = '#e3f6ec'; g.fillRect(x0, y0, w, h);
        g.fillStyle = '#cbecd9';
        for (let y = 0, r = 0; y < rows; y += 10, r++) for (let x = (r % 2) * 10; x < cols; x += 20) R(x, y, 10, 10);
        break;
      case 'heart':
        g.fillStyle = '#ffe6ee'; g.fillRect(x0, y0, w, h);
        g.fillStyle = '#ffc2d4';
        for (let y = 5, r = 0; y < rows; y += 16, r++) for (let x = (r % 2) * 12 + 4; x < cols; x += 24) WALL_HEART.forEach((row, dy) => { for (let dx = 0; dx < row.length; dx++) if (row[dx] === 'X') R(x + dx, y + dy, 1, 1); });
        break;
      case 'wood':
        g.fillStyle = '#e9c49a'; g.fillRect(x0, y0, w, h);
        g.fillStyle = '#d4a676';
        for (let x = 0; x < cols; x += 14) R(x, 0, 1, rows);
        for (let x = 6, r = 0; x < cols; x += 14, r++) for (let y = (r * 37) % 50 + 10; y < rows; y += 50) R(x, y, 2, 1);
        break;
      case 'night':
        g.fillStyle = '#26305a'; g.fillRect(x0, y0, w, h);
        for (let i = 0; i < cols * rows / 160; i++) {
          const hx = (i * 977) % cols, hy = (i * 613 + (i >> 3) * 31) % rows;
          g.fillStyle = i % 5 === 0 ? '#ffd23f' : '#c9d4ff';
          R(hx, hy, 1, 1);
        }
        break;
      default: // stripe
        g.fillStyle = '#fde9d9'; g.fillRect(x0, y0, w, h);
        g.fillStyle = '#f6d8c6';
        for (let x = 0; x < cols; x += 16) R(x, 0, 6, rows);
    }
    g.restore();
  }
  function paintFloor(g, kind, x0, y0, w, h, z) {
    const R = (x, y, ww, hh) => g.fillRect(Math.round(x0 + x * z), Math.round(y0 + y * z), Math.max(1, Math.round(ww * z)), Math.max(1, Math.round(hh * z)));
    const cols = Math.ceil(w / z), rows = Math.ceil(h / z), half = rows / 2;
    g.save();
    g.beginPath(); g.rect(x0, y0, w, h); g.clip();
    switch (kind) {
      case 'tile':
        g.fillStyle = '#f4f4f6'; g.fillRect(x0, y0, w, h);
        g.fillStyle = '#c9d3df';
        for (let y = 0, r = 0; y < rows; y += 6, r++) for (let x = (r % 2) * 6; x < cols; x += 12) R(x, y, 6, 6);
        break;
      case 'carpet':
        g.fillStyle = '#f5a3c0'; g.fillRect(x0, y0, w, h);
        g.fillStyle = '#fbc6d8';
        for (let y = 1, r = 0; y < rows; y += 3, r++) for (let x = (r % 2) * 2; x < cols; x += 4) R(x, y, 1, 1);
        break;
      case 'grass':
        g.fillStyle = '#7fc75a'; g.fillRect(x0, y0, w, h);
        g.fillStyle = '#5fae43';
        for (let x = 0; x < cols; x += 3) R(x, ((x * 7) % 3), 1, 2 + (x % 2));
        g.fillStyle = '#9ad97a';
        for (let x = 1; x < cols; x += 5) R(x, half + ((x * 3) % 2), 1, 1);
        break;
      case 'marble':
        g.fillStyle = '#eceff3'; g.fillRect(x0, y0, w, h);
        g.fillStyle = '#cfd6df';
        for (let x = 0; x < cols; x += 22) { R(x, 0, 1, rows); for (let i = 0; i < 6; i++) R(x + 4 + i * 2, (i % 3) + 2, 2, 1); }
        break;
      default: // wood
        g.fillStyle = '#c98a55'; g.fillRect(x0, y0, w, h);
        g.fillStyle = '#b47344';
        for (let x = 0, k = 0; x < cols; x += 24, k++) R(x + (k % 2) * 12, half, 2, half + 1);
        for (let x = 12; x < cols; x += 24) R(x, 0, 2, half);
        g.fillStyle = '#8a5530';
        R(0, half, cols, 1);
    }
    g.fillStyle = 'rgba(0,0,0,0.22)';
    g.fillRect(x0, y0, w, Math.max(1, Math.round(z)));
    g.restore();
  }

  const house = (function () {
    const cv = $('#house');
    const HS = DATA.housing;
    const OUT = FIX.O;
    // 그림 픽셀 단위. 방 높이 50 + 바닥 띠 6 = 계단 9칸(56) 높이
    const AW = 208, AH = 156, GROUND = 151, ROOM = 50, BAND = 6, WALL = 3, SPEED = 16;
    const WIDTH = [0, 110, 148, 148, 190];
    // 층마다 가구: [그림, 방 왼쪽에서 가운데까지, 벽에 거는지]
    const LAYOUT = {
      1: [[['window', 36, 1], ['toilet', 13], ['feeder', 36], ['bed', 76], ['plant2', 101]]],
      2: [[['window', 42, 1], ['frame', 110, 1], ['toilet', 13], ['bathtub', 42], ['feeder', 70], ['bed', 110], ['plant2', 138]]],
      3: [[['window', 42, 1], ['toilet', 13], ['bathtub', 42], ['feeder', 70], ['stairs9', 119]],
        [['frame', 26, 1], ['window', 80, 1], ['rug', 80], ['bed', 26], ['sofa', 80], ['plant2', 113]]],
      4: [[['window', 50, 1], ['clock', 112, 1], ['toilet', 13], ['bathtub', 42], ['feeder', 70], ['medkit', 90], ['stairs9', 161]],
        [['frame', 26, 1], ['window', 70, 1], ['rug', 100], ['bed', 26], ['plant2', 56], ['sofa', 100], ['tv', 141]]],
    };
    const USE = { toilet: 2.8, feeder: 3.2, bathtub: 4.6, bed: 9, sofa: 6 };
    const LIFT = { toilet: 8, bathtub: 2, bed: 7, sofa: 8 };
    const st = { level: 4, wall: 'stripe', floor: 'wood', roof: 'red' };
    const heroes = shuffle(DATA.heroes).slice(0, 3);
    const stars = Array.from({ length: 14 }, (_, i) => ({ x: (i * 53 + 11) % AW, y: 4 + ((i * 29) % 70), ph: i * 0.7 }));
    const bg = document.createElement('canvas');
    let ctx = cv.getContext('2d'), P = 1, t = 0, visible = true;
    let geo, items = [], stairs = null, pets = [], fx = [];

    function makeGeo() {
      const rw = WIDTH[st.level], floors = st.level >= 3 ? 2 : 1;
      const hw = rw + WALL * 2, x0 = Math.round((AW - hw) / 2);
      const fl = [];
      for (let i = 0; i < floors; i++) { const y = GROUND - BAND - i * (ROOM + BAND); fl.push({ top: y - ROOM, y }); }
      geo = { rw, floors, hw, x0, rx: x0 + WALL, fl, bodyTop: fl[floors - 1].top - WALL };
      items = [];
      LAYOUT[st.level].forEach((list, f) => list.forEach(([name, x, wall]) => {
        const fr = DATA.props[name];
        items.push({ name, x, f, wall: !!wall, w: fr[0], h: fr[1], busy: null });
      }));
      stairs = items.find((it) => it.name === 'stairs9') || null;
      if (stairs) {
        stairs.left = stairs.x - stairs.w / 2;
        stairs.xa = stairs.left - 3; // 첫 칸 앞
        stairs.xb = stairs.left + stairs.w - 4; // 꼭대기 (2층 바닥)
      }
    }
    const find = (name) => items.find((it) => it.name === name);
    // 계단 위에서 1층 바닥보다 얼마나 높은지 (한 칸 6픽셀)
    const stairUp = (x) => { const i = Math.floor((x - stairs.left - 1) / 6); return i < 0 ? 0 : Math.min(9, i + 1) * 6 + 2; };
    const feetY = (p) => (p.climb ? geo.fl[0].y - stairUp(p.x) : geo.fl[p.f].y);
    const spot = (it) => (it.name === 'feeder' ? it.x + 13 : it.name === 'toilet' ? it.x + 2 : it.x);
    const addFx = (kind, x, y, o) => fx.push(Object.assign({ kind, x, y, vx: rand(-4, 4), vy: -12, t: 0, life: 1.3 }, o || {}));

    function setAct(p, type, dur, o) { p.a = Object.assign({ type, t: 0, dur }, o || {}); }
    function startUse(p, it) { p.x = spot(it); setAct(p, 'use', it.name === 'bed' ? rand(7, 11) : USE[it.name], { it }); }
    // 가구 쓰러 가기: 다른 층이면 계단으로
    function goUse(p, it) {
      if (!it || it.busy) return false;
      it.busy = p;
      p.q = [];
      if (it.f !== p.f && stairs) {
        if (p.f === 0) p.q.push({ type: 'walk', x: stairs.xa }, { type: 'climb', up: true });
        else p.q.push({ type: 'walk', x: stairs.xb }, { type: 'climb', up: false });
      }
      p.q.push({ type: 'walk', x: spot(it) }, { type: 'use', it });
      next(p);
      return true;
    }
    function next(p) {
      const s = p.q.shift();
      if (!s) return plan(p);
      if (s.type === 'walk') setAct(p, 'walk', Infinity, { tx: clamp(s.x, 10, geo.rw - 10) });
      else if (s.type === 'climb') setAct(p, 'climb', Infinity, { up: s.up });
      else startUse(p, s.it);
    }
    function plan(p) {
      const r0 = Math.random();
      if (r0 < 0.45) {
        const free = items.filter((it) => USE[it.name] && !it.busy);
        if (free.length && goUse(p, pick(free))) return;
      }
      if (r0 < 0.75) { p.q = [{ type: 'walk', x: rand(12, geo.rw - 12) }]; return next(p); }
      if (r0 < 0.9) return setAct(p, 'idle', rand(1.2, 3));
      return setAct(p, 'hop', 1.4);
    }
    function makePets() {
      fx = [];
      pets = heroes.slice(0, geo.floors === 2 ? 3 : 2).map((h, i) => ({ h, f: 0, x: 24 + i * 30, dir: 1, a: { type: 'idle', t: 0, dur: 1 }, q: [], joy: 0, ph: i * 0.37, climb: false }));
      // 첫 장면: 한 마리는 밥, 한 마리는 침대에서 쿨쿨, 2층 집이면 한 마리가 계단으로
      const placeAt = (p, it) => { it.busy = p; p.f = it.f; startUse(p, it); p.a.t = p.a.dur * 0.3; };
      placeAt(pets[0], find('feeder'));
      placeAt(pets[1], find('bed'));
      if (pets[2]) { pets[2].x = 22; goUse(pets[2], find('sofa')); }
    }

    function update(p, dt) {
      const a = p.a;
      a.t += dt;
      if (p.joy > 0) p.joy = Math.max(0, p.joy - dt);
      const hx = geo.rx + p.x, hy = feetY(p) - 26;
      switch (a.type) {
        case 'walk': {
          const dx = a.tx - p.x;
          if (Math.abs(dx) <= SPEED * dt) { p.x = a.tx; next(p); return; }
          p.dir = dx > 0 ? 1 : -1;
          p.x += p.dir * SPEED * dt;
          return;
        }
        case 'climb': {
          const tx = a.up ? stairs.xb : stairs.xa, v = SPEED * 0.7 * dt, dx = tx - p.x;
          p.dir = dx > 0 ? 1 : -1;
          if (Math.abs(dx) <= v) { p.x = tx; p.climb = false; p.f = a.up ? 1 : 0; next(p); return; }
          p.climb = true; p.f = 0;
          p.x += p.dir * v;
          return;
        }
        case 'use': {
          const it = a.it, lift = LIFT[it.name] || 0;
          if (it.name === 'bathtub' && a.t < a.dur - 0.6) {
            a.b = (a.b || 0) + dt;
            while (a.b > 0.25) { a.b -= 0.25; addFx('bubble', hx + rand(-12, 12), hy + rand(4, 14) - lift, { vy: -rand(8, 16), life: 1.1 }); }
          }
          if (it.name === 'bed' && Math.floor(a.t / 1.6) !== a.k) { a.k = Math.floor(a.t / 1.6); addFx('z', hx + p.dir * 8, hy + 6, { vx: 5, vy: -8, life: 2 }); }
          if (!a.done && a.t > a.dur - 0.5) {
            a.done = true;
            if (it.name === 'feeder') addFx('heart', hx, hy - 2);
            else if (it.name === 'sofa') addFx('note', hx + 8, hy - lift, { vx: 6 });
            else if (it.name !== 'bed') for (let i = 0; i < 3; i++) addFx('sparkle', hx + rand(-10, 10), hy + rand(0, 16) - lift, { vy: -6, life: 0.8 });
          }
          if (a.t >= a.dur) { it.busy = null; next(p); }
          return;
        }
        default:
          if (a.t >= a.dur) next(p);
      }
    }

    function look(p) {
      const f = p.h.f, a = p.a;
      const o = { fr: f.front, flip: p.dir < 0, hop: 0, squash: 1, spin: 0, wobble: 0, lift: 0 };
      const blink = (t + p.ph * 5) % 3.7 < 0.14;
      if (a.type === 'walk' || a.type === 'climb') o.fr = Math.floor(t * 5 + p.ph * 10) % 2 ? f.walk1 : f.walk0;
      else if (a.type === 'hop') { o.fr = f.happy; o.hop = Math.abs(Math.sin(a.t * 5.5)) * 4; }
      else if (a.type === 'use') {
        o.lift = LIFT[a.it.name] || 0;
        o.flip = false;
        switch (a.it.name) {
          case 'feeder': o.fr = a.done ? f.happy : Math.floor(a.t * 3.3) % 2 ? f.chew : f.chew2; break;
          case 'toilet': o.fr = a.done ? f.happy : f.strain; if (!a.done) o.squash = 0.95 + Math.sin(a.t * 18) * 0.015; break;
          case 'bathtub': o.fr = blink ? f.blink : f.happy; o.squash = 0.9; o.wobble = Math.sin(a.t * 6) * 0.05; break;
          case 'bed': o.fr = f.sleep; o.spin = (p.dir > 0 ? 1 : -1) * Math.PI / 2 * Math.min(1, a.t / 0.5); o.squash = 1 + Math.sin(t * 2) * 0.02; break;
          default: o.fr = blink ? f.blink : f.front;
        }
      } else if (blink) o.fr = f.blink;
      if (p.joy > 0 && !p.climb && !o.spin) { o.fr = f.happy; o.hop += Math.abs(Math.sin(p.joy * 9)) * 3; }
      return o;
    }

    // 집 (지붕, 벽, 벽지, 바닥, 가구)은 바뀔 때만 다시 그림
    function renderBg() {
      bg.width = cv.width; bg.height = cv.height;
      const g = bg.getContext('2d');
      g.imageSmoothingEnabled = false;
      const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x * P), Math.round(y * P), Math.round(w * P), Math.round(h * P)); };
      const z = Math.max(1, P / 2);
      R(0, GROUND, AW, 1, '#2e2e2e');
      // 지붕: 2픽셀씩 계단처럼 좁아짐
      const roof = HS.roof.find((x) => x.id === st.roof).c;
      const cx = geo.x0 + geo.hw / 2, rows = [];
      for (let j = 0; ; j++) { const w = geo.hw + 8 - j * 12; if (w < 12) break; rows.push({ x: cx - w / 2, y: geo.bodyTop - 2 * (j + 1), w }); }
      rows.forEach((rw) => R(rw.x - 1, rw.y - 1, rw.w + 2, 3, OUT));
      rows.forEach((rw, j) => R(rw.x, rw.y, rw.w, 2, j === 0 ? roof[1] : roof[0]));
      // 몸통 + 방
      R(geo.x0, geo.bodyTop, geo.hw, GROUND - geo.bodyTop, OUT);
      R(geo.x0 + 1, geo.bodyTop + 1, geo.hw - 2, GROUND - geo.bodyTop - 1, FIX.M);
      for (const fl of geo.fl) {
        paintWall(g, st.wall, geo.rx * P, fl.top * P, geo.rw * P, ROOM * P, z);
        R(geo.rx, fl.y - 2, geo.rw, 2, st.wall === 'night' ? '#151c3a' : '#e8b796');
        paintFloor(g, st.floor, geo.rx * P, fl.y * P, geo.rw * P, BAND * P, z);
      }
      // 2층 바닥: 계단이 올라오는 자리에 구멍
      if (stairs && geo.floors === 2) R(geo.rx + stairs.left + stairs.w - 10, geo.fl[1].y, 9, BAND, 'rgba(40,24,16,0.85)');
      for (const it of items) {
        const fl = geo.fl[it.f];
        const yb = it.wall ? fl.top + (it.name === 'window' ? 8 : 10) + it.h : fl.y;
        drawProp(g, it.name, (geo.rx + it.x) * P, yb * P, P);
      }
    }

    function draw() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.imageSmoothingEnabled = false;
      for (const s of stars) {
        const k = 0.35 + 0.35 * Math.sin(t * 1.3 + s.ph);
        ctx.fillStyle = `rgba(255,255,255,${k.toFixed(2)})`;
        ctx.fillRect(s.x * P, s.y * P, P, P);
      }
      ctx.drawImage(bg, 0, 0);
      for (const p of pets) {
        const o = look(p);
        drawPet(ctx, o.fr, p.h.pal, { x: (geo.rx + p.x) * P, y: (feetY(p) - o.lift) * P, P, flip: o.flip, hop: o.hop * P, squash: o.squash, spin: o.spin, wobble: o.wobble });
        if (p.a.type === 'use' && p.a.it.name === 'bathtub') drawProp(ctx, 'bathtubFront', (geo.rx + p.a.it.x) * P, geo.fl[p.a.it.f].y * P, P);
      }
      for (const e of fx) {
        const sc = e.kind === 'bubble' ? Math.max(1, Math.round(P * 0.75)) : P;
        drawProp(ctx, e.kind, e.x * P, e.y * P, sc, { alpha: clamp((e.life - e.t) / 0.4, 0, 1) });
      }
    }

    function layout() {
      const r = window.devicePixelRatio || 1;
      const box = cv.parentElement.clientWidth || 600;
      P = Math.max(1, Math.floor(Math.min(box, 720) * r / AW));
      cv.width = AW * P; cv.height = AH * P;
      // 정수배로 맞추면 너무 작아지는 좁은 화면은 칸 너비까지 늘림
      const css = AW * P / r < box * 0.8 ? Math.min(box, 720) : AW * P / r;
      cv.style.width = css + 'px'; cv.style.height = css * AH / AW + 'px';
      ctx = cv.getContext('2d');
      renderBg();
      draw();
    }

    // 꾸미기 견본 버튼
    const thumbs = { wall: (g, id, s) => paintWall(g, id, 0, 0, s, s, s / 24), floor: (g, id, s) => paintFloor(g, id, 0, 0, s, s, s / 18) };
    function thumb(kind, id) {
      const r = dprInt(), s = 36 * r, c = document.createElement('canvas');
      c.width = s; c.height = s;
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = false;
      if (thumbs[kind]) thumbs[kind](g, id, s);
      else {
        const rf = HS.roof.find((x) => x.id === id).c, fr = DATA.props.house;
        const sc = Math.max(1, Math.floor(s / fr[0]));
        g.drawImage(frameCanvas(fr, { R: rf[0], r: rf[1] }), Math.round((s - fr[0] * sc) / 2), Math.round((s - fr[1] * sc) / 2), fr[0] * sc, fr[1] * sc);
      }
      return c;
    }
    const OPTS = {
      level: HS.level.map((name, i) => ({ id: String(i + 1), name })),
      wall: HS.wall, floor: HS.floor, roof: HS.roof,
    };
    function syncControls() {
      Object.keys(OPTS).forEach((k) => {
        document.querySelectorAll(`.deco-opts[data-k="${k}"] button`).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === String(st[k]))));
        const cur = OPTS[k].find((o) => o.id === String(st[k]));
        $('#deco-now-' + k).textContent = cur ? cur.name : '';
      });
    }
    Object.keys(OPTS).forEach((k) => {
      const box = $(`.deco-opts[data-k="${k}"]`);
      OPTS[k].forEach((o) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.dataset.v = o.id;
        if (k === 'level') { b.className = 'lvl'; b.innerHTML = `<small>Lv.${o.id}</small>${o.name}`; }
        else { b.className = 'sw'; b.title = o.name; b.setAttribute('aria-label', o.name); b.appendChild(thumb(k, o.id)); }
        b.addEventListener('click', () => {
          st[k] = k === 'level' ? Number(o.id) : o.id;
          if (k === 'level') { makeGeo(); makePets(); }
          syncControls();
          renderBg();
          draw();
        });
        box.appendChild(b);
      });
    });

    // 펫을 누르면 하트
    cv.addEventListener('click', (e) => {
      const rc = cv.getBoundingClientRect();
      const ax = (e.clientX - rc.left) / rc.width * AW, ay = (e.clientY - rc.top) / rc.height * AH;
      let best = null, bd = 16;
      for (const p of pets) {
        const d = Math.abs(geo.rx + p.x - ax), fy = feetY(p);
        if (d < bd && ay > fy - 30 && ay < fy + 2) { bd = d; best = p; }
      }
      if (!best) return;
      best.joy = 0.9;
      addFx('heart', geo.rx + best.x, feetY(best) - 30);
      if (reduced) draw();
    });

    makeGeo();
    makePets();
    syncControls();
    layout();
    let last = 0;
    function loop(ts) {
      const dt = last ? Math.min(0.1, (ts - last) / 1000) : 0;
      last = ts;
      if (visible) {
        t += dt;
        for (const p of pets) update(p, dt);
        fx.forEach((e) => { e.t += dt; e.x += e.vx * dt; e.y += e.vy * dt; });
        fx = fx.filter((e) => e.t < e.life);
        draw();
      }
      requestAnimationFrame(loop);
    }
    if (!reduced) {
      new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(cv);
      requestAnimationFrame(loop);
    }
    return { layout };
  })();

  // 집 안 전용 가구
  [['toilet', '화장실', '똥이랑 오줌을 여기서 봐요. 치울 필요가 없어요.'],
    ['feeder', '자동 급식기', '배고프면 알아서 꺼내 먹어요. 채울 필요도 없어요.'],
    ['bathtub', '욕조', '꼬질꼬질해지면 혼자 들어가서 씻어요.'],
    ['medkit', '구급상자', '아프면 알아서 약을 꺼내 먹어요.'],
    ['bed', '침대', '졸리면 올라가서 자요. 바닥보다 기력이 빨리 차요.']].forEach(([k, name, text]) => {
    const li = document.createElement('li');
    const stand = document.createElement('div');
    stand.className = 'stand';
    const fr = DATA.props[k], r = dprInt(), s = 3;
    const cv = document.createElement('canvas');
    cv.width = fr[0] * s * r; cv.height = fr[1] * s * r;
    cv.style.width = fr[0] * s + 'px'; cv.style.height = fr[1] * s + 'px';
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(frameCanvas(fr, null), 0, 0, cv.width, cv.height);
    cv.setAttribute('role', 'img');
    cv.setAttribute('aria-label', name);
    stand.appendChild(cv);
    li.appendChild(stand);
    li.insertAdjacentHTML('beforeend', `<h3>${name}</h3><p>${text}</p>`);
    $('#autos').appendChild(li);
  });

  // ───────── 몸짓 (마우스를 올리면 움직여요) ─────────
  const MOVES = [['hop', '깡총깡총'], ['spin', '빙글'], ['roll', '데굴데굴'], ['flop', '발라당'],
    ['stretch', '기지개'], ['bug', '나비 쫓기'], ['sneeze', '에취'], ['trip', '꽈당']];
  MOVES.forEach(([key, label], i) => {
    const h = HR[(i * 3 + 11) % HR.length];
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', label + ' 보기');
    li.appendChild(b);
    li.insertAdjacentHTML('beforeend', `<span>${label}</span>`);
    $('#moves').appendChild(li);
    const item = sprCanvas(h.f.front, h.pal, { padW: 12, padH: 14, draw: drawMove }, moveItems);
    item.move = key; item.h = h; item.t = 0; item.on = false;
    b.appendChild(item.cv);
    const on = () => { item.on = true; item.t = 0; };
    const off = () => { item.on = false; item.t = 0; drawMove(item); };
    b.addEventListener('mouseenter', on); b.addEventListener('focus', on); b.addEventListener('click', on);
    b.addEventListener('mouseleave', off); b.addEventListener('blur', off);
  });
  function drawMove(it) {
    const { ctx, P, W, H, h } = it;
    if (!ctx) return;
    const t = it.t, f = h.f;
    ctx.clearRect(0, 0, W * P, H * P);
    const x = W * P / 2, y = H * P;
    const o = { x, y, P };
    let fr = f.front;
    if (it.on) {
      switch (it.move) {
        case 'hop': fr = f.happy; o.hop = Math.abs(Math.sin(t * 6)) * 9 * P; break;
        case 'spin': fr = f.happy; o.flip = Math.floor(t / 0.12) % 2 === 1; if (t % 1.6 > 1.1) o.hop = Math.sin(((t % 1.6) - 1.1) / 0.5 * Math.PI) * 6 * P; break;
        case 'roll': fr = f.blink; o.spin = (t * 3) % (Math.PI * 2); break;
        case 'flop': fr = f.happy; o.spin = -Math.PI / 2 * Math.min(1, t / 0.3); break;
        case 'stretch': { const k = Math.min(1, (t % 2.4) / 0.5) * (1 - Math.max(0, Math.min(1, ((t % 2.4) - 1.3) / 0.3))); fr = f.blink; o.squash = 1 + 0.14 * k; break; }
        case 'bug': {
          fr = f.surprised; o.hop = Math.max(0, Math.sin(t * 4)) * 10 * P;
          drawProp(ctx, Math.floor(t * 9) % 2 ? 'bfly1a' : 'bfly1b', x + Math.sin(t * 1.7) * 6 * P, (11 + Math.cos(t * 2.3) * 3) * P, P);
          break;
        }
        case 'sneeze': {
          const k = t % 1.8;
          if (k < 0.9) { fr = f.strain; o.squash = 1 + 0.06 * k / 0.9; o.spin = -0.12 * k / 0.9; }
          else if (k < 1.1) { fr = f.blink; o.squash = 0.84; o.spin = 0.12; drawProp(ctx, 'poof', x + 12 * P, y - 8 * P, P); }
          else fr = f.surprised;
          break;
        }
        case 'trip': { const k = t % 2.6; fr = k < 0.25 ? f.surprised : f.sad; o.spin = Math.PI / 2 * (k < 0.25 ? k / 0.25 : k < 1.6 ? 1 : k < 2 ? 1 - (k - 1.6) / 0.4 : 0); break; }
        default:
      }
    }
    drawPet(ctx, fr, h.pal, o);
  }
  moveItems.forEach(renderSpr);

  // ───────── 감정 그림 ─────────
  [['heart', '좋아요'], ['onigiri', '배고파요'], ['poop', '똥 치워 주세요'], ['bath', '씻겨 주세요'],
    ['z', '졸려요'], ['skull', '아파요'], ['anger', '싫어요'], ['question', '뭐지?']].forEach(([k, label]) => {
    const li = document.createElement('li');
    const bub = document.createElement('span');
    bub.className = 'bub';
    const fr = DATA.props[k] || DATA.icons[k];
    const cv = document.createElement('canvas');
    const r = dprInt(), s = 3;
    cv.width = fr[0] * s * r; cv.height = fr[1] * s * r;
    cv.style.width = fr[0] * s + 'px'; cv.style.height = fr[1] * s + 'px';
    const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(frameCanvas(fr, null), 0, 0, cv.width, cv.height);
    bub.appendChild(cv);
    li.appendChild(bub);
    li.insertAdjacentHTML('beforeend', `<span>${label}</span>`);
    $('#emotes').appendChild(li);
  });

  // 메뉴 아이콘
  document.querySelectorAll('canvas[data-icon]').forEach((cv) => {
    const fr = DATA.icons[cv.dataset.icon];
    const r = dprInt();
    cv.width = fr[0] * 2 * r; cv.height = fr[1] * 2 * r;
    const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(frameCanvas(fr, null), 0, 0, cv.width, cv.height);
  });

  // ───────── 장면/몸짓/룩북 애니메이션 루프 ─────────
  let lastTs = 0;
  function sceneLoop(ts) {
    const dt = lastTs ? Math.min(0.1, (ts - lastTs) / 1000) : 0;
    lastTs = ts;
    tiles.forEach((tl) => { if (tl.on) { tl.t += dt; drawTile(tl); } });
    moveItems.forEach((it) => { if (it.on) { it.t += dt; drawMove(it); } });
    gachaItems.forEach((it) => { if (it.hover) { it.t += dt; drawCard(it); } });
    requestAnimationFrame(sceneLoop);
  }
  if (!reduced) requestAnimationFrame(sceneLoop);

  let resizeT = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      paradeA.layout(); paradeB.layout(); mark.layout(); monitor.layout(); layoutTiles(); house.layout();
      gachaItems.concat(staticItems, moveItems).forEach(renderSpr); walker.resize();
    }, 120);
  });

  // ───────── 화면 맨 아래를 걷는 펫 ─────────
  const walker = (function () {
    const wrap = $('.walker');
    const cv = $('#walk-cv');
    const hit = $('#walk-hit');
    const poopsEl = $('#poops');
    const menu = $('#pet-menu');
    const ctx = cv.getContext('2d');
    let W = 0, HH = 0, r = 1, scale = 3, P = 3;
    let pet, x, dir = 1, act = { type: 'idle', t: 0, dur: 2 }, effects = [], poops = [], seq = 1;
    let stats, sleeping = false, menuOpen = false, lastTs = 0, emote = null;

    function newPet(first) {
      pet = pick(DATA.heroes);
      stats = { full: Math.round(rand(45, 75)), happy: Math.round(rand(50, 80)), energy: Math.round(rand(55, 85)), clean: Math.round(rand(40, 70)) };
      sleeping = false;
      if (first) x = rand(0.2, 0.8) * window.innerWidth;
      setAct('fall', { vy: 0, y: first ? 220 : 160 });
      $('#pm-name').textContent = pet.name;
      $('#pm-stage').textContent = pet.stage === 'teen' ? '청소년' : '어른';
    }
    function resize() {
      r = window.devicePixelRatio || 1;
      W = window.innerWidth; HH = wrap.clientHeight;
      cv.width = Math.round(W * r); cv.height = Math.round(HH * r);
      scale = W <= 640 ? 2 : 3;
      P = Math.max(1, Math.round(scale * r));
      ctx.imageSmoothingEnabled = false;
      x = clamp(x || W / 2, 30, W - 30);
    }
    function setAct(type, o) { act = Object.assign({ type, t: 0, dur: Infinity }, o || {}); }
    const fx = (kind, ex, ey, o) => effects.push(Object.assign({ kind, x: ex, y: ey, vx: rand(-10, 10), vy: -30, t: 0, life: 1.4, g: 0 }, o || {}));
    const petW = () => pet.f.front[0] * scale, petH = () => pet.f.front[1] * scale;

    function nextAct() {
      if (sleeping) return setAct('sleep');
      if (reduced) return setAct('idle', { dur: 4 });
      // 커서가 바닥 근처에 있으면 따라오기
      if (mouse.y > window.innerHeight - 220 && Math.random() < 0.6) return setAct('follow', { dur: 6 });
      const r0 = Math.random();
      if (r0 < 0.5) { if (Math.random() < 0.4) dir = -dir; return setAct('walk', { dur: rand(3, 9) }); }
      if (r0 < 0.7) return setAct('idle', { dur: rand(1.5, 4) });
      if (r0 < 0.8) return setAct('hop', { dur: 2.2 });
      if (r0 < 0.86 && poops.length < 3 && performance.now() > 25000) return setAct('poop', { dur: 2 });
      if (r0 < 0.93) return setAct('look', { dur: 2.4 });
      return setAct('sniff', { dur: 2.6 });
    }

    function doAction(a) {
      closeMenu();
      if (a === 'swap') { fx('poof', x, -petH() / 2, { vy: 0, life: 0.5 }); newPet(false); return; }
      if (a === 'sleep') {
        if (sleeping) { sleeping = false; setAct('wake', { dur: 1.2 }); return; }
        sleeping = true; setAct('sleep'); return;
      }
      if (sleeping) { emote = { k: 'z', until: performance.now() + 1400 }; return; }
      if (a === 'eat') { setAct('eat', { dur: 3.2 }); return; }
      if (a === 'pet') { setAct('happy', { dur: 1.3 }); fx('heart', x, -petH()); stats.happy = Math.min(100, stats.happy + 8); return; }
      if (a === 'bath') setAct('bath', { dur: 5 });
    }

    function update(dt) {
      act.t += dt;
      const a = act;
      switch (a.type) {
        case 'fall':
          a.vy += 1500 * dt; a.y -= a.vy * dt;
          if (a.y <= 0) { a.y = 0; setAct('land', { dur: 0.3 }); }
          break;
        case 'walk': x += dir * 26 * dt; if (x < petW() / 2 + 4) { x = petW() / 2 + 4; dir = 1; } if (x > W - petW() / 2 - 4) { x = W - petW() / 2 - 4; dir = -1; } break;
        case 'follow': {
          if (mouse.y < window.innerHeight - 260) { a.dur = Math.min(a.dur, a.t + 0.5); break; }
          const dx = mouse.x - x;
          if (Math.abs(dx) > 14) { dir = dx > 0 ? 1 : -1; x = clamp(x + dir * 46 * dt, petW() / 2, W - petW() / 2); a.moving = true; } else a.moving = false;
          break;
        }
        case 'hop': { const ph = (a.t * 5.5) % Math.PI; if (ph > 0.25 && ph < Math.PI - 0.25) x = clamp(x + dir * 22 * dt, petW() / 2, W - petW() / 2); break; }
        case 'look': if (Math.floor(a.t / 0.8) !== a.k) { a.k = Math.floor(a.t / 0.8); dir = -dir; } break;
        case 'eat':
          if (!a.done && a.t > a.dur - 0.2) { a.done = true; stats.full = Math.min(100, stats.full + 30); fx('heart', x, -petH()); }
          break;
        case 'bath':
          if (a.t < 3.2) { a.b = (a.b || 0) + dt; while (a.b > 0.2) { a.b -= 0.2; fx('bubble', x + rand(-petW() / 2, petW() / 2), -petH() * rand(0.3, 0.8), { vy: -rand(15, 35), life: 1.2 }); } }
          if (a.t > 3.4 && a.t < 4.4) { a.d = (a.d || 0) + dt; while (a.d > 0.07) { a.d -= 0.07; const s = Math.random() < 0.5 ? 1 : -1; fx('drop', x + s * petW() * 0.4, -petH() * 0.5, { vx: s * rand(60, 150), vy: -rand(60, 140), g: 500, life: 0.7 }); } }
          if (a.t > 4.4 && !a.done) { a.done = true; stats.clean = 100; stats.happy = Math.min(100, stats.happy + 6); for (let i = 0; i < 4; i++) fx('sparkle', x + rand(-petW() / 2, petW() / 2), -petH() * rand(0.2, 0.9), { vy: -8, life: 0.7 }); }
          break;
        case 'poop':
          if (!a.done && a.t > 1.4) { a.done = true; addPoop(x - dir * petW() * 0.5); }
          break;
        case 'sleep':
          stats.energy = Math.min(100, stats.energy + dt * 2);
          if (Math.floor(a.t / 1.6) !== a.k) { a.k = Math.floor(a.t / 1.6); fx('z', x + dir * petH() * 0.45, -petW() * 0.8, { vx: 10, vy: -16, life: 2 }); }
          break;
        default:
      }
      if (a.t >= a.dur) nextAct();
      stats.full = Math.max(0, stats.full - dt * 0.15);
      stats.clean = Math.max(0, stats.clean - dt * 0.08);
      effects.forEach((e) => { e.t += dt; e.vy += e.g * dt; e.x += e.vx * dt; e.y += e.vy * dt; });
      effects = effects.filter((e) => e.t < e.life);
    }

    function addPoop(px) {
      const id = seq++;
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', '똥 치우기');
      b.title = '똥 치우기';
      const fr = DATA.props.poop;
      b.style.width = fr[0] * scale + 8 + 'px'; b.style.height = fr[1] * scale + 6 + 'px';
      b.style.left = Math.round(px - (fr[0] * scale + 8) / 2) + 'px';
      b.addEventListener('click', () => {
        poops = poops.filter((p) => p.id !== id);
        b.remove();
        for (let i = 0; i < 3; i++) fx('sparkle', px + rand(-10, 10), -rand(6, 22), { vy: -10, life: 0.7 });
        stats.happy = Math.min(100, stats.happy + 2);
      });
      poopsEl.appendChild(b);
      poops.push({ id, x: px, el: b, born: performance.now() });
    }

    function look() {
      const f = pet.f, a = act, t = a.t, now = performance.now() / 1000;
      const o = { fr: f.front, flip: dir < 0, hop: 0, squash: 1, spin: 0, wobble: 0 };
      const blink = now % 3.7 < 0.14;
      switch (a.type) {
        case 'fall': o.fr = f.surprised; o.hop = a.y; break;
        case 'land': o.squash = 1 - 0.2 * Math.sin(Math.min(1, t / a.dur) * Math.PI); break;
        case 'walk': o.fr = Math.floor(now * 5) % 2 ? f.walk1 : f.walk0; break;
        case 'follow': if (a.moving) o.fr = Math.floor(now * 7) % 2 ? f.walk1 : f.walk0; else { o.fr = f.happy; o.hop = Math.abs(Math.sin(t * 5)) * 2 * scale; } break;
        case 'hop': o.fr = f.happy; o.hop = Math.abs(Math.sin(t * 5.5)) * 5 * scale; break;
        case 'happy': o.fr = f.happy; o.hop = Math.abs(Math.sin(t * 7)) * 4 * scale; break;
        case 'eat': o.fr = Math.floor(t * 3.3) % 2 ? f.chew : f.chew2; if (t > a.dur - 0.6) o.fr = f.happy; break;
        case 'bath':
          if (t < 3.2) { o.fr = f.happy; o.squash = 0.9; o.wobble = Math.sin(t * 6) * 0.05; }
          else if (t < 4.4) { o.fr = f.blink; o.wobble = Math.sin(t * 46) * 0.16; }
          else o.fr = f.happy;
          break;
        case 'poop': o.fr = a.done ? f.happy : f.strain; o.squash = a.done ? 1 : 0.9 + Math.sin(t * 18) * 0.02; break;
        case 'sleep': o.fr = f.sleep; o.spin = (dir > 0 ? 1 : -1) * Math.PI / 2 * Math.min(1, t / 0.6); o.flip = false; o.squash = 1 + Math.sin(now * 2) * 0.02; break;
        case 'wake': o.fr = t < 0.6 ? f.blink : f.front; break;
        case 'sniff': o.fr = f.blink; o.spin = (0.2 + Math.sin(t * 14) * 0.04) * Math.min(1, t / 0.3, (a.dur - t) / 0.3); break;
        default: if (blink) o.fr = f.blink;
      }
      if (!sleeping && a.type !== 'sleep' && a.type !== 'bath' && (stats.full < 25 || stats.clean < 20) && !emote && Math.floor(now) % 6 < 3) {
        o.icon = stats.full < 25 ? 'onigiri' : 'bath';
      }
      if (emote && performance.now() < emote.until) o.icon = emote.k; else emote = null;
      return o;
    }

    function draw() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.imageSmoothingEnabled = false;
      const floorY = HH * r;
      const X = (v) => v * r;
      poops.forEach((p) => {
        drawProp(ctx, 'poop', X(p.x), floorY, P);
        const age = (performance.now() - p.born) / 1000;
        if (age > 4) { const ph = (age * 0.8) % 1; drawProp(ctx, 'stink', X(p.x) + 2 * P, floorY - (DATA.props.poop[1] + 3 + ph * 6) * P, P, { alpha: Math.sin(ph * Math.PI) * 0.9 }); }
      });
      const o = look();
      drawPet(ctx, o.fr, pet.pal, { x: X(x), y: floorY, P, flip: o.flip, hop: o.hop * r, squash: o.squash, spin: o.spin, wobble: o.wobble });
      if (act.type === 'eat') {
        const fr = DATA.props.rice, bite = Math.min(2, Math.floor(act.t / act.dur * 3));
        const keep = [1, 0.66, 0.33][bite], cut = Math.round(fr[0] * (1 - keep));
        const c = frameCanvas(fr, null), w = fr[0] * P, h = fr[1] * P;
        const rx = X(x) + (dir > 0 ? 1 : -1) * (petW() * r / 2 + 2 * P);
        ctx.drawImage(c, cut, 0, fr[0] - cut, fr[1], Math.round(rx - w / 2 + cut * P), floorY - h, (fr[0] - cut) * P, h);
      }
      if (act.type === 'bath' && act.t < 3.3) drawProp(ctx, 'tub', X(x), floorY + Math.round((1 - Math.min(1, act.t / 0.4)) * DATA.props.tub[1] * P), P);
      effects.forEach((e) => {
        const a = clamp((e.life - e.t) / 0.4, 0, 1);
        const sc = e.kind === 'bubble' || e.kind === 'drop' ? Math.max(1, Math.round(P * 0.75)) : e.kind === 'poof' ? Math.round(P * (1 + e.t * 4)) : P;
        drawProp(ctx, e.kind, X(e.x), floorY + X(e.y), sc, { alpha: a });
      });
      if (o.icon) {
        const fr = DATA.props[o.icon] || DATA.icons[o.icon];
        const iw = fr[0] * P, ih = fr[1] * P, pad = 4 * r, b = 2 * Math.round(r);
        const bw = iw + pad * 2, bh = ih + pad * 2;
        const bx = Math.round(clamp(X(x) + petW() * r * 0.3 - bw / 2, 4, cv.width - bw - 4));
        const by = Math.round(floorY - petH() * r - bh - 8 * r - o.hop * r);
        ctx.fillStyle = '#fff'; ctx.fillRect(bx + b, by, bw - 2 * b, bh); ctx.fillRect(bx, by + b, bw, bh - 2 * b);
        ctx.drawImage(frameCanvas(fr, null), bx + pad, by + pad, iw, ih);
      }
      const lying = act.type === 'sleep';
      const hw = lying ? petH() : petW(), hh = lying ? petW() : petH();
      hit.style.left = Math.round(x - hw / 2) + 'px';
      hit.style.width = Math.round(hw) + 'px';
      hit.style.height = Math.round(hh + o.hop) + 'px';
    }

    function loop(ts) {
      const dt = lastTs ? Math.min(0.1, (ts - lastTs) / 1000) : 0;
      lastTs = ts;
      update(dt);
      draw();
      if (menuOpen) { updateMenu(); placeMenu(); }
      requestAnimationFrame(loop);
    }

    const STATS = [['full', '배부름', '#ffb347'], ['happy', '행복', PINK], ['energy', '기력', '#6ec6ff'], ['clean', '청결', '#7fe0d6']];
    $('#pm-stats').innerHTML = STATS.map(([k, l, c]) => `<span>${l}</span><div class="bar"><i data-k="${k}" style="background:${c}"></i></div>`).join('');
    function updateMenu() {
      STATS.forEach(([k]) => { $(`[data-k="${k}"]`).style.width = clamp(stats[k], 0, 100) + '%'; });
      $('#pm-sleep').lastChild.textContent = sleeping ? '깨우기' : '재우기';
    }
    function placeMenu() {
      const mw = menu.offsetWidth, mh = menu.offsetHeight;
      menu.style.left = Math.round(clamp(x - mw / 2, 8, window.innerWidth - mw - 16)) + 'px';
      menu.style.top = Math.round(Math.max(8, window.innerHeight - petH() - mh - 32)) + 'px';
    }
    function openMenu() { menuOpen = true; menu.classList.remove('hidden'); updateMenu(); placeMenu(); hit.setAttribute('aria-expanded', 'true'); const f = menu.querySelector('button'); if (f) f.focus({ preventScroll: true }); }
    function closeMenu() { menuOpen = false; menu.classList.add('hidden'); hit.setAttribute('aria-expanded', 'false'); }
    hit.addEventListener('click', (e) => { e.stopPropagation(); if (menuOpen) closeMenu(); else openMenu(); });
    menu.addEventListener('click', (e) => { e.stopPropagation(); const b = e.target.closest('[data-act]'); if (b) doAction(b.dataset.act); });
    document.addEventListener('click', () => { if (menuOpen) closeMenu(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) { closeMenu(); hit.focus({ preventScroll: true }); } });

    resize();
    newPet(true);
    requestAnimationFrame(loop);
    return { resize };
  })();

  // ───────── 윈도우 버전 (Microsoft Store 에 올라가 있는 패키지 버전) ─────────
  // 스토어 목록 정보의 패키지 이름이 "아이디_1.4.0.0_x64__..." 모양이라 거기서 버전을 읽음. 못 읽으면 표시 안 함
  fetch('https://displaycatalog.mp.microsoft.com/v7.0/products?bigIds=9P7TRJ3P1TRG&market=KR&languages=ko-KR')
    .then((res) => (res.ok ? res.text() : Promise.reject(res.status)))
    .then((txt) => {
      const m = /"PackageFullName":"[^"_]+_(\d+)\.(\d+)\.(\d+)\.\d+_/.exec(txt);
      if (m) $('#dl-win-ver').textContent = `v${m[1]}.${m[2]}.${m[3]}`;
    })
    .catch(() => {});

  // ───────── 맥 다운로드 링크 (GitHub 릴리스에서 자동으로. 윈도우는 index.html 의 Microsoft Store 링크) ─────────
  // dmg 가 있는 가장 최신 릴리스를 씀 (맥 파일이 아직 안 올라온 새 버전이면 이전 버전 맥 파일로)
  const mb = (n) => Math.round(n / 1024 / 1024) + 'MB';
  fetch(`https://api.github.com/repos/${REPO}/releases?per_page=10`)
    .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
    .then((list) => {
      const rels = (list || []).filter((r) => !r.draft && !r.prerelease);
      const tag = (r) => (r.tag_name || '').replace(/^v/, '');
      const pick = (re) => {
        for (const r of rels) { const a = (r.assets || []).find((x) => re.test(x.name)); if (a) return { a, ver: tag(r) }; }
        return null;
      };
      const mac = pick(/\.dmg$/i);
      if (rels[0] && tag(rels[0])) $('#ver').textContent = tag(rels[0]);
      const m = $('#dl-mac');
      if (mac) {
        m.href = mac.a.browser_download_url;
        $('#dl-mac-ver').textContent = 'v' + mac.ver;
        $('#dl-mac-sub').textContent = `macOS, 인텔과 애플 실리콘 (${mb(mac.a.size)})`;
      } else { m.setAttribute('aria-disabled', 'true'); m.removeAttribute('href'); $('#dl-mac-sub').textContent = '곧 올라와요'; }
    })
    .catch(() => { /* 실패하면 릴리스 페이지로 가는 기본 링크 그대로 */ });
})();
