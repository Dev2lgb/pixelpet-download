/* 펫 하우스 벽지·바닥 무늬 (앱 렌더러와 다운로드 사이트가 같이 씀. 사이트에는 export-site-data.js 가 복사) */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Patterns = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // 같은 자리면 늘 같은 0~1 값 (무늬가 그릴 때마다 바뀌지 않게)
  function hash(a, b) {
    let h = (a * 374761393 + b * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  // 작은 그림 찍기: art 의 글자마다 pal[글자] 색 ('.' 은 비움)
  function stamp(g, R, art, pal, x, y) {
    for (let dy = 0; dy < art.length; dy++) {
      for (let dx = 0; dx < art[dy].length; dx++) {
        const c = pal[art[dy][dx]];
        if (c) { g.fillStyle = c; R(x + dx, y + dy, 1, 1); }
      }
    }
  }
  const fill = (g, R, c, cols, rows) => { g.fillStyle = c; R(0, 0, cols, rows); };

  const HEART = ['.X.X.', 'XXXXX', '.XXX.', '..X..'];
  const FLOWER = ['.P.P.', 'PPYPP', '.PPP.', '..G..', '.GG..'];
  const CLOUD = ['...WW....', '..WWWW.W.', '.WWWWWWWW', 'WWWWWWWWW', '.SSSSSSS.'];
  const BERRY = ['.GG.', 'RRRR', 'RWRR', 'RRWR', '.RR.'];
  const SAKURA = ['..P..', 'PPPPP', '.PYP.', '.P.P.'];
  const BUBBLE = ['.B.', 'B.B', '.B.'];
  const FISH = ['.FF..', 'FFFFF', '.FF..'];
  const SCALLOP = ['..SSSS..', '.S....S.', 'S......S'];

  // 벽지: (g, R, cols, rows) 무늬 칸 단위로 그림
  const WALLS = {
    stripe(g, R, cols, rows) {
      fill(g, R, '#fde9d9', cols, rows);
      g.fillStyle = '#f6d8c6';
      for (let x = 0; x < cols; x += 16) R(x, 0, 6, rows);
    },
    dots(g, R, cols, rows) {
      fill(g, R, '#dff1fb', cols, rows);
      g.fillStyle = '#b9e0f6';
      for (let y = 4, r = 0; y < rows; y += 12, r++) for (let x = (r % 2) * 8 + 4; x < cols; x += 16) R(x, y, 3, 3);
    },
    check(g, R, cols, rows) {
      fill(g, R, '#e3f6ec', cols, rows);
      g.fillStyle = '#cbecd9';
      for (let y = 0, r = 0; y < rows; y += 10, r++) for (let x = (r % 2) * 10; x < cols; x += 20) R(x, y, 10, 10);
    },
    heart(g, R, cols, rows) {
      fill(g, R, '#ffe6ee', cols, rows);
      for (let y = 5, r = 0; y < rows; y += 16, r++) for (let x = (r % 2) * 12 + 4; x < cols; x += 24) stamp(g, R, HEART, { X: '#ffc2d4' }, x, y);
    },
    wood(g, R, cols, rows) {
      fill(g, R, '#e9c49a', cols, rows);
      g.fillStyle = '#d4a676';
      for (let x = 0; x < cols; x += 14) R(x, 0, 1, rows);
      for (let x = 6, r = 0; x < cols; x += 14, r++) for (let y = (r * 37) % 50 + 10; y < rows; y += 50) R(x, y, 2, 1);
    },
    night(g, R, cols, rows) {
      fill(g, R, '#26305a', cols, rows);
      for (let i = 0; i < cols * rows / 160; i++) {
        const hx = (i * 977) % cols, hy = (i * 613 + (i >> 3) * 31) % rows;
        g.fillStyle = i % 5 === 0 ? '#ffd23f' : '#c9d4ff';
        R(hx, hy, 1, 1);
      }
    },
    // 연노랑 바탕에 분홍·보라 꽃
    flower(g, R, cols, rows) {
      fill(g, R, '#fff7dc', cols, rows);
      for (let y = 3, r = 0; y < rows; y += 15, r++) {
        for (let x = (r % 2) * 10 + 3, i = 0; x < cols; x += 20, i++) stamp(g, R, FLOWER, { P: (i + r) % 2 ? '#ffb3c6' : '#c9b6f2', Y: '#ffd23f', G: '#8ccf6a' }, x, y);
      }
    },
    // 하늘색 바탕에 뭉게구름
    cloud(g, R, cols, rows) {
      fill(g, R, '#cfeaff', cols, rows);
      for (let y = 4, r = 0; y < rows; y += 20, r++) for (let x = (r % 2) * 14 + 2; x < cols; x += 28) stamp(g, R, CLOUD, { W: '#ffffff', S: '#e6f4ff' }, x, y);
    },
    // 하얀 벽돌 (군데군데 살짝 진한 벽돌)
    brick(g, R, cols, rows) {
      fill(g, R, '#f8f4ee', cols, rows);
      for (let y = 0, r = 0; y < rows; y += 6, r++) {
        const off = (r % 2) * 6;
        g.fillStyle = '#f0e9df';
        for (let x = off - 12, i = 0; x < cols; x += 12, i++) if (hash(i, r) < 0.28) R(x + 1, y, 11, 5);
        g.fillStyle = '#e2d8cc';
        R(0, y + 5, cols, 1);
        for (let x = off; x < cols; x += 12) R(x, y, 1, 5);
      }
    },
    // 버터색 깅엄 체크
    gingham(g, R, cols, rows) {
      fill(g, R, '#fffaf0', cols, rows);
      g.fillStyle = '#fde9ad';
      for (let x = 0; x < cols; x += 8) R(x, 0, 4, rows);
      for (let y = 0; y < rows; y += 8) R(0, y, cols, 4);
      g.fillStyle = '#f9d77a';
      for (let y = 0; y < rows; y += 8) for (let x = 0; x < cols; x += 8) R(x, y, 4, 4);
    },
    // 분홍 우유색 바탕에 딸기
    berry(g, R, cols, rows) {
      fill(g, R, '#ffeef3', cols, rows);
      g.fillStyle = '#ffd9e4';
      for (let y = 10, r = 0; y < rows; y += 15, r++) for (let x = (r % 2) * 8 + 10; x < cols; x += 16) R(x, y, 1, 1);
      for (let y = 3, r = 0; y < rows; y += 15, r++) for (let x = (r % 2) * 8 + 2; x < cols; x += 16) stamp(g, R, BERRY, { R: '#ff6b81', W: '#fff4d6', G: '#6cc24a' }, x, y);
    },
    // 벚꽃: 띄엄띄엄 꽃송이와 흩날리는 꽃잎
    sakura(g, R, cols, rows) {
      fill(g, R, '#fff1f5', cols, rows);
      for (let cy = 0; cy * 8 < rows; cy++) {
        for (let cx = 0; cx * 9 < cols; cx++) {
          const h = hash(cx, cy);
          if (h > 0.5) continue;
          g.fillStyle = h < 0.25 ? '#ffc2d4' : '#ffa8c2';
          const x = cx * 9 + Math.floor(hash(cy, cx) * 6), y = cy * 8 + Math.floor(h * 10) % 6;
          if (h < 0.18) R(x, y, 2, 1); else R(x, y, 1, 2);
        }
      }
      for (let cy = 0; cy * 18 < rows; cy++) {
        for (let cx = 0; cx * 22 < cols; cx++) {
          const x = cx * 22 + Math.floor(hash(cx + 7, cy) * 14), y = cy * 18 + Math.floor(hash(cy + 3, cx) * 10);
          stamp(g, R, SAKURA, { P: (cx + cy) % 2 ? '#ffb7cb' : '#ff9ab4', Y: '#ffe08a' }, x, y);
        }
      }
    },
    // 아래는 나무 판, 위는 연두 줄무늬 (반반 벽)
    panel(g, R, cols, rows) {
      const ph = Math.max(3, Math.round(rows * 0.36)), top = rows - ph;
      fill(g, R, '#e4eedb', cols, rows);
      g.fillStyle = '#d3e2c5';
      for (let x = 3; x < cols; x += 8) R(x, 0, 1, top);
      g.fillStyle = '#d8a878';
      R(0, top, cols, ph);
      g.fillStyle = '#c08e60';
      for (let x = 0; x < cols; x += 10) R(x, top, 1, ph);
      g.fillStyle = '#a8703f';
      R(0, top - 2, cols, 2);
      g.fillStyle = '#e8c095';
      R(0, top - 3, cols, 1);
    },
    // 바닷속: 물방울, 물고기, 아래 미역
    sea(g, R, cols, rows) {
      fill(g, R, '#1f5d8c', cols, rows);
      g.fillStyle = '#2a6fa0';
      R(0, 0, cols, Math.round(rows * 0.3));
      g.fillStyle = '#25669a';
      R(0, Math.round(rows * 0.3), cols, 2);
      for (let cy = 0; cy * 14 < rows; cy++) {
        for (let cx = 0; cx * 16 < cols; cx++) {
          const h = hash(cx, cy), x = cx * 16 + Math.floor(h * 12), y = cy * 14 + Math.floor(hash(cy, cx) * 10);
          if (h < 0.35) stamp(g, R, BUBBLE, { B: '#9fd8f5' }, x, y);
          else if (h < 0.6) { g.fillStyle = '#7cc3ea'; R(x, y, 1, 1); }
          else if (h > 0.93 && y < rows - 14) stamp(g, R, FISH, { F: h > 0.965 ? '#ff9f43' : '#ffd23f' }, x, y);
        }
      }
      for (let x = 2, i = 0; x < cols; x += 7, i++) {
        const hh = 4 + Math.floor(hash(i, 99) * 10);
        if (hash(99, i) < 0.4) continue;
        g.fillStyle = i % 2 ? '#3fa86a' : '#2f8f58';
        for (let k = 0; k < hh; k++) R(x + ((k >> 1) % 2), rows - 1 - k, 1, 1);
      }
    },
  };

  // 바닥 (집 안 층 사이 띠, 보통 12칸 높이)
  const FLOORS = {
    wood(g, R, cols, rows) {
      const half = rows / 2;
      fill(g, R, '#c98a55', cols, rows);
      g.fillStyle = '#b47344';
      for (let x = 0, k = 0; x < cols; x += 24, k++) R(x + (k % 2) * 12, half, 2, half + 1);
      for (let x = 12; x < cols; x += 24) R(x, 0, 2, half);
      g.fillStyle = '#8a5530';
      R(0, half, cols, 1);
    },
    tile(g, R, cols, rows) {
      fill(g, R, '#f4f4f6', cols, rows);
      g.fillStyle = '#c9d3df';
      for (let y = 0, r = 0; y < rows; y += 6, r++) for (let x = (r % 2) * 6; x < cols; x += 12) R(x, y, 6, 6);
    },
    carpet(g, R, cols, rows) {
      fill(g, R, '#f5a3c0', cols, rows);
      g.fillStyle = '#fbc6d8';
      for (let y = 1, r = 0; y < rows; y += 3, r++) for (let x = (r % 2) * 2; x < cols; x += 4) R(x, y, 1, 1);
    },
    grass(g, R, cols, rows) {
      const half = rows / 2;
      fill(g, R, '#7fc75a', cols, rows);
      g.fillStyle = '#5fae43';
      for (let x = 0; x < cols; x += 3) R(x, ((x * 7) % 3), 1, 2 + (x % 2));
      g.fillStyle = '#9ad97a';
      for (let x = 1; x < cols; x += 5) R(x, half + ((x * 3) % 2), 1, 1);
    },
    marble(g, R, cols, rows) {
      fill(g, R, '#eceff3', cols, rows);
      g.fillStyle = '#cfd6df';
      for (let x = 0; x < cols; x += 22) { R(x, 0, 1, rows); for (let i = 0; i < 6; i++) R(x + 4 + i * 2, (i % 3) + 2, 2, 1); }
    },
    // 헤링본 마루 (4칸마다 방향이 바뀌는 빗금)
    herring(g, R, cols, rows) {
      fill(g, R, '#dcae78', cols, rows);
      g.fillStyle = '#d4a26b';
      for (let x = 4; x < cols; x += 8) R(x, 0, 4, rows);
      g.fillStyle = '#b98252';
      for (let x = 0; x < cols; x++) {
        const right = Math.floor(x / 4) % 2;
        for (let y = 0; y < rows; y++) if ((((right ? x + y : x - y) % 4) + 4) % 4 === 0) R(x, y, 1, 1);
      }
    },
    // 하얀 원목
    birch(g, R, cols, rows) {
      fill(g, R, '#f2e6d2', cols, rows);
      g.fillStyle = '#e8d9c0';
      for (let i = 0; i < cols * rows / 40; i++) R(Math.floor(hash(i, 1) * cols), Math.floor(hash(1, i) * rows), 2, 1);
      g.fillStyle = '#d9c6a8';
      for (let y = 3, r = 0; y < rows; y += 4, r++) R(0, y, cols, 1);
      for (let y = 0, r = 0; y < rows; y += 4, r++) for (let x = Math.floor(hash(r, 5) * 30); x < cols; x += 30) R(x, y, 1, 3);
    },
    // 민트 타일 (하얀 줄눈)
    mint(g, R, cols, rows) {
      fill(g, R, '#ffffff', cols, rows);
      for (let y = 0; y < rows; y += 6) {
        for (let x = 0; x < cols; x += 6) {
          g.fillStyle = '#bfe8d6'; R(x, y, 5, 5);
          g.fillStyle = '#d9f4e8'; R(x, y, 5, 1); R(x, y, 1, 5);
        }
      }
    },
    // 라벤더 러그 (마름모 무늬)
    lavender(g, R, cols, rows) {
      fill(g, R, '#d4c1f3', cols, rows);
      for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
          const a = (x + y) % 8, b = (((x - y) % 8) + 8) % 8;
          if (a === 0 || b === 0) { g.fillStyle = '#bea3ea'; R(x, y, 1, 1); }
          else if ((x % 8 === 4 && y % 8 === 0) || (x % 8 === 0 && y % 8 === 4)) { g.fillStyle = '#fbf6ff'; R(x, y, 1, 1); }
        }
      }
    },
    // 빨강·크림 레트로 체크
    retro(g, R, cols, rows) {
      fill(g, R, '#fff4d6', cols, rows);
      g.fillStyle = '#e8484f';
      for (let y = 0, r = 0; y < rows; y += 4, r++) for (let x = (r % 2) * 4; x < cols; x += 8) R(x, y, 4, 4);
    },
    // 남색 별 카펫
    starry(g, R, cols, rows) {
      fill(g, R, '#2a3366', cols, rows);
      for (let cy = 0; cy * 6 < rows; cy++) {
        for (let cx = 0; cx * 7 < cols; cx++) {
          const h = hash(cx, cy + 50), x = cx * 7 + Math.floor(hash(cy, cx) * 5) + 1, y = cy * 6 + Math.floor(h * 4) + 1;
          if (h < 0.18) { g.fillStyle = '#ffd23f'; R(x - 1, y, 3, 1); R(x, y - 1, 1, 3); }
          else if (h < 0.55) { g.fillStyle = h < 0.35 ? '#c9d4ff' : '#8f9bd6'; R(x, y, 1, 1); }
        }
      }
    },
    // 구름 바닥 (몽글몽글 물결)
    cloud(g, R, cols, rows) {
      fill(g, R, '#eef8ff', cols, rows);
      for (let y = 0, r = 0; y < rows; y += 3, r++) for (let x = (r % 2) * 4 - 4; x < cols; x += 8) stamp(g, R, SCALLOP, { S: '#b6dbf5' }, x, y);
    },
  };

  // 걸레받이 색과 어두운 벽지 (층 번호를 밝게)
  const TRIM = { night: '#151c3a', sea: '#123a58', panel: '#8a5530' };
  const DARK = { night: true, sea: true };

  function paint(table, fallback, g, kind, x0, y0, w, h, z) {
    const R = (x, y, ww, hh) => g.fillRect(Math.round(x0 + x * z), Math.round(y0 + y * z), Math.max(1, Math.round(ww * z)), Math.max(1, Math.round(hh * z)));
    const cols = Math.ceil(w / z), rows = Math.ceil(h / z);
    g.save();
    g.beginPath(); g.rect(x0, y0, w, h); g.clip();
    (table[kind] || table[fallback])(g, R, cols, rows);
    g.restore();
  }
  // 벽지 (g: 캔버스, z: 무늬 한 칸 크기)
  function paintWall(g, kind, x0, y0, w, h, z) { paint(WALLS, 'stripe', g, kind, x0, y0, w, h, z); }
  // 바닥 (위쪽에 그림자 한 줄)
  function paintFloor(g, kind, x0, y0, w, h, z) {
    paint(FLOORS, 'wood', g, kind, x0, y0, w, h, z);
    g.save();
    g.beginPath(); g.rect(x0, y0, w, h); g.clip();
    g.fillStyle = 'rgba(0,0,0,0.22)';
    g.fillRect(x0, y0, w, Math.max(1, Math.round(z)));
    g.restore();
  }
  const trim = (kind) => TRIM[kind] || '#e8b796';
  const isDark = (kind) => !!DARK[kind];

  return { paintWall, paintFloor, trim, isDark, WALL_IDS: Object.keys(WALLS), FLOOR_IDS: Object.keys(FLOORS) };
});
