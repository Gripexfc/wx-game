class ParticleSystem {
  constructor() {
    this.particles = [];
    this.ripples = [];
    this.pulseFrames = 0;
    this.levelRingFrames = 0;
    // 先关闭粒子，优先保证场景清晰和性能
    this.maxParticles = 0;
  }

  onPetTap() {
    this.ripples.push({ frame: 0, max: 28 });
    if (this.ripples.length > 2) this.ripples.shift();
  }

  onGoalCompleted(visualFx) {
    this.pulseFrames = 36;
    if (visualFx && visualFx.leveledUp) {
      this.levelRingFrames = visualFx.majorEvolution ? 70 : 50;
    }
  }

  update(tick, rect) {
    if (this.pulseFrames > 0) this.pulseFrames -= 1;
    if (this.levelRingFrames > 0) this.levelRingFrames -= 1;
    this.ripples = this.ripples
      .map((r) => ({ frame: r.frame + 1, max: r.max }))
      .filter((r) => r.frame <= r.max);

    if (this.particles.length < this.maxParticles && tick % 4 === 0) {
      this.particles.push({
        x: rect.x + Math.random() * rect.w,
        y: rect.y + rect.h * (0.24 + Math.random() * 0.66),
        vx: (Math.random() - 0.5) * 0.2,
        vy: -0.1 - Math.random() * 0.24,
        life: 70 + Math.floor(Math.random() * 68),
        maxLife: 70 + Math.floor(Math.random() * 68),
        r: 1.4 + Math.random() * 2.6,
      });
    }
    this.particles = this.particles
      .map((p) => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 1 }))
      .filter((p) => p.life > 0);
  }

  draw(ctx, rect, tint) {
    this.particles.forEach((p, i) => {
      const alpha = Math.max(0, p.life / p.maxLife) * 0.34;
      if (i % 3 === 0) ctx.fillStyle = `rgba(${tint[0]}, ${tint[1]}, ${tint[2]}, ${alpha})`;
      else if (i % 3 === 1) ctx.fillStyle = `rgba(${Math.min(255, tint[0] + 12)}, ${tint[1]}, ${Math.max(0, tint[2] - 18)}, ${alpha})`;
      else ctx.fillStyle = `rgba(255, 248, 216, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });

    this.ripples.forEach((r) => {
      const t = r.frame / r.max;
      const radius = rect.w * (0.08 + t * 0.28);
      const alpha = (1 - t) * 0.3;
      ctx.strokeStyle = `rgba(255, 205, 120, ${alpha})`;
      ctx.lineWidth = 2.2 - t * 1.2;
      ctx.beginPath();
      ctx.arc(rect.x + rect.w / 2, rect.y + rect.h * 0.58, radius, 0, Math.PI * 2);
      ctx.stroke();
    });

    if (this.pulseFrames > 0) {
      const p = this.pulseFrames / 36;
      const pulse = ctx.createRadialGradient(
        rect.x + rect.w / 2,
        rect.y + rect.h * 0.55,
        20,
        rect.x + rect.w / 2,
        rect.y + rect.h * 0.55,
        rect.w * (0.25 + (1 - p) * 0.2)
      );
      pulse.addColorStop(0, `rgba(255, 194, 92, ${0.34 * p})`);
      pulse.addColorStop(1, 'rgba(255, 194, 92, 0)');
      ctx.fillStyle = pulse;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }

    if (this.levelRingFrames > 0) {
      const p = this.levelRingFrames / 70;
      ctx.strokeStyle = `rgba(255, 214, 107, ${0.45 * p})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(rect.x + rect.w / 2, rect.y + rect.h * 0.6, rect.w * (0.22 + (1 - p) * 0.1), 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

module.exports = ParticleSystem;

