// Wizarding World Spellcaster - Phase 3C: the three spell effects.
// Each function takes (particles, trailSnapshot, extra) and calls particles.addEffect()
// to animate itself over time. `trailSnapshot` is from getTrailSnapshot() at cast time.

import { burst, emitAlongPath } from './particles.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// ---------- Expecto Patronum: silver-blue orb with drifting mist ----------
export function castPatronus(ps, tr) {
  const scale = clamp(tr.scale, 0.5, 2.5);
  const { x, y } = tr.center;
  const silver = [200, 225, 255];
  const silverDim = [90, 130, 200];

  if (tr.hasDrawing) {
    ps.addEffect((t, dt) => {
      emitAlongPath(ps, tr.points, 140 * dt, {
        scale, color: silver, colorEnd: silverDim, life: 1.0,
        size: 7, sizeEnd: 0, jitter: 8, speed: 30, ay: -40
      });
    }, 0.6);
  }

  // The orb grows in, holds, then breaks into mist wisps that drift outward.
  ps.addEffect((t, dt) => {
    const growT = clamp(t / 0.5, 0, 1);
    const r = (18 + 46 * scale) * growT;
    burst(ps, x, y, 10 * dt, {
      scale, color: silver, colorEnd: silverDim, life: 0.5,
      size: r * 0.15, sizeEnd: r * 0.35, speed: 4, drag: 3, spread: 0.2
    });
    if (t > 0.4) {
      burst(ps, x + (Math.random() - 0.5) * r, y + (Math.random() - 0.5) * r, 14 * dt, {
        scale, color: silver, colorEnd: [255, 255, 255], life: 1.6,
        size: 5, sizeEnd: 16, speed: 18, drag: 0.6, ay: -22, spread: 0.4
      });
    }
  }, 2.4);

  return { durationMs: 2600 };
}

// ---------- Lumos: warm light that follows the hand ----------
export function castLumos(ps, tr, extra) {
  const scale = clamp(tr.scale, 0.5, 2.5);
  const warm = [255, 244, 200];
  const warmDim = [255, 190, 90];
  const DURATION = 8;

  ps.addEffect((t, dt) => {
    const p = extra.getHandPos ? extra.getHandPos() : tr.center;
    const fade = t > DURATION - 1 ? clamp(DURATION - t, 0, 1) : 1;
    burst(ps, p.x, p.y, 30 * dt * fade, {
      scale: scale * 0.7 + 0.3, color: warm, colorEnd: warmDim, life: 0.5,
      size: 5 * scale, sizeEnd: 1, speed: 6, drag: 4, spread: 0.3
    });
    // a few slow embers drifting up, for texture
    if (Math.random() < 6 * dt) {
      ps.spawn({
        x: p.x + (Math.random() - 0.5) * 10, y: p.y, vy: -20 - Math.random() * 20,
        vx: (Math.random() - 0.5) * 10, life: 1.2, size: 3, sizeEnd: 0,
        color: warm, colorEnd: warmDim, alpha: 0.8
      });
    }
  }, DURATION);

  return { durationMs: DURATION * 1000 };
}

// ---------- Incendio: the drawn path catches fire ----------
export function castIncendio(ps, tr) {
  const scale = clamp(tr.scale, 0.5, 2.5);
  const fire = [255, 210, 90];
  const fireEnd = [180, 40, 20];
  const { x, y } = tr.center;

  if (tr.hasDrawing) {
    ps.addEffect((t, dt) => {
      const fade = clamp(1.6 - t, 0, 1);
      emitAlongPath(ps, tr.points, 260 * dt * fade, {
        scale, color: [255, 250, 220], colorEnd: fireEnd, life: 0.7,
        size: 9, sizeEnd: 0, jitter: 4, speed: 10, vy: -90, ay: -40, drag: 0.5
      });
      // sparks that pop off sideways
      if (Math.random() < 20 * dt * fade) {
        emitAlongPath(ps, tr.points, 1, {
          scale, color: fire, colorEnd: fireEnd, life: 0.4,
          size: 3, sizeEnd: 0, jitter: 2, speed: 140, drag: 2
        });
      }
    }, 1.6);
  } else {
    // No drawing: a fireball at the fingertip/center instead.
    ps.addEffect((t, dt) => {
      burst(ps, x, y, 60 * dt, {
        scale, color: fire, colorEnd: fireEnd, life: 0.6,
        size: 10, sizeEnd: 0, speed: 90, drag: 2, ay: -60
      });
    }, 1.0);
  }

  return { durationMs: 1800 };
}

export const SPELL_CASTERS = { patronum: castPatronus, lumos: castLumos, incendio: castIncendio };
