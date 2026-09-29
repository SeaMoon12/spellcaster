// Wizarding World Spellcaster - Phase 3B: particle engine core.
// Pure canvas 2D. Time-based (seconds), pooled objects, additive glow sprites.
// The spell effects in 3C are built from spawn(), burst(), emitAlongPath() and addEffect().

const spriteCache = new Map();

// Soft glowing dot, pre-rendered once per (quantized) color and reused by drawImage.
function getSprite(r, g, b) {
  const q = (v) => Math.min(255, ((v >> 3) << 3) + 4);
  const qr = q(r), qg = q(g), qb = q(b);
  const key = (qr << 16) | (qg << 8) | qb;
  let c = spriteCache.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    const core = (v) => Math.round(v + (255 - v) * 0.6);   // brighter core
    gr.addColorStop(0, `rgba(${core(qr)},${core(qg)},${core(qb)},1)`);
    gr.addColorStop(0.35, `rgba(${qr},${qg},${qb},0.7)`);
    gr.addColorStop(1, `rgba(${qr},${qg},${qb},0)`);
    x.fillStyle = gr;
    x.fillRect(0, 0, 64, 64);
    spriteCache.set(key, c);
  }
  return c;
}

const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
// 2.4 -> 2 (60%) or 3 (40%), so fractional per-frame rates work.
const randomRound = (n) => Math.floor(n) + (Math.random() < n - Math.floor(n) ? 1 : 0);

export class ParticleSystem {
  constructor(max = 4000) {
    this.max = max;
    this.list = [];
    this.pool = [];
    this.effects = [];
  }

  get count() { return this.list.length; }

  // o: x, y, vx, vy, ax, ay, drag (1/s), life (s), size/sizeEnd (radius px),
  //    color/colorEnd [r,g,b], alpha/alphaEnd, additive (default true)
  spawn(o) {
    if (this.list.length >= this.max) return false;
    const p = this.pool.pop() || {};
    p.x = o.x; p.y = o.y;
    p.vx = o.vx || 0; p.vy = o.vy || 0;
    p.ax = o.ax || 0; p.ay = o.ay || 0;
    p.drag = o.drag || 0;
    p.life = o.life || 1; p.age = 0;
    p.size = o.size ?? 10;
    p.sizeEnd = o.sizeEnd ?? p.size;
    p.color = o.color || [255, 255, 255];
    p.colorEnd = o.colorEnd || p.color;
    p.alpha = o.alpha ?? 1;
    p.alphaEnd = o.alphaEnd ?? 0;
    p.additive = o.additive !== false;
    this.list.push(p);
    return true;
  }

  // Run fn(t, dt, system) every frame for `duration` seconds (t = seconds since start).
  addEffect(fn, duration) { this.effects.push({ fn, duration, t: 0 }); }

  clear() {
    while (this.list.length) this.pool.push(this.list.pop());
    this.effects.length = 0;
  }

  update(dt) {
    dt = Math.min(dt, 0.05);                       // don't explode after a tab stall
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i];
      e.t += dt;
      try { e.fn(e.t, dt, this); } catch (err) { console.error('Effect error', err); e.t = e.duration; }
      if (e.t >= e.duration) this.effects.splice(i, 1);
    }
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.age += dt;
      if (p.age >= p.life) {
        const last = this.list.pop();              // swap-remove; `last` was already updated this frame
        if (last !== p) this.list[i] = last;
        this.pool.push(p);
        continue;
      }
      if (p.drag) { const k = Math.max(0, 1 - p.drag * dt); p.vx *= k; p.vy *= k; }
      p.vx += p.ax * dt; p.vy += p.ay * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
  }

  draw(ctx) {
    ctx.save();
    for (const additivePass of [true, false]) {
      ctx.globalCompositeOperation = additivePass ? 'lighter' : 'source-over';
      for (const p of this.list) {
        if (p.additive !== additivePass) continue;
        const t = p.age / p.life;
        const size = lerp(p.size, p.sizeEnd, t);
        const alpha = lerp(p.alpha, p.alphaEnd, t);
        if (alpha <= 0.003 || size <= 0.3) continue;
        const spr = getSprite(
          Math.round(lerp(p.color[0], p.colorEnd[0], t)),
          Math.round(lerp(p.color[1], p.colorEnd[1], t)),
          Math.round(lerp(p.color[2], p.colorEnd[2], t)));
        ctx.globalAlpha = alpha;
        ctx.drawImage(spr, p.x - size, p.y - size, size * 2, size * 2);
      }
    }
    ctx.restore();
  }
}

// ---------- Helpers (all take `scale` so bigger drawings make bigger spells) ----------

// Particles flying out in all directions from a point.
// o: speed, life, size, sizeEnd, color, colorEnd, drag, ay, alpha, spread (0..1 speed randomness)
export function burst(ps, x, y, count, o = {}) {
  const scale = o.scale ?? 1;
  const n = randomRound(count * scale);
  for (let i = 0; i < n; i++) {
    const ang = Math.random() * Math.PI * 2;
    const sp = (o.speed ?? 200) * scale * (1 - (o.spread ?? 0.6) * Math.random());
    ps.spawn({
      x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
      ay: o.ay ?? 0, drag: o.drag ?? 1.5,
      life: (o.life ?? 1) * rand(0.7, 1.3),
      size: (o.size ?? 10) * scale * rand(0.7, 1.2),
      sizeEnd: (o.sizeEnd ?? 0) * scale,
      color: o.color, colorEnd: o.colorEnd, alpha: o.alpha, additive: o.additive
    });
  }
}

// Particles born on the drawn path (points from getTrailSnapshot().points).
// o: jitter (px scatter), speed (random drift), plus the same look options as burst().
export function emitAlongPath(ps, points, count, o = {}) {
  const segs = [];
  for (let i = 1; i < points.length; i++) if (!points[i].brk) segs.push(i);
  if (!segs.length) return;
  const scale = o.scale ?? 1;
  const n = randomRound(count * scale);
  for (let i = 0; i < n; i++) {
    const s = segs[(Math.random() * segs.length) | 0];
    const a = points[s - 1], b = points[s], t = Math.random();
    const j = (o.jitter ?? 6) * scale;
    const ang = Math.random() * Math.PI * 2;
    const sp = (o.speed ?? 40) * scale * Math.random();
    ps.spawn({
      x: lerp(a.x, b.x, t) + rand(-j, j), y: lerp(a.y, b.y, t) + rand(-j, j),
      vx: Math.cos(ang) * sp + (o.vx ?? 0), vy: Math.sin(ang) * sp + (o.vy ?? 0),
      ay: o.ay ?? 0, drag: o.drag ?? 1,
      life: (o.life ?? 1) * rand(0.7, 1.3),
      size: (o.size ?? 8) * scale * rand(0.7, 1.2),
      sizeEnd: (o.sizeEnd ?? 0) * scale,
      color: o.color, colorEnd: o.colorEnd, alpha: o.alpha, additive: o.additive
    });
  }
}
