const { canvasRoundRect } = require('../utils/canvas');

function drawRoundedRect(ctx, x, y, w, h, r) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  if (typeof ctx.quadraticCurveTo === 'function') {
    canvasRoundRect(ctx, x, y, w, h, r);
    return;
  }
  ctx.beginPath();
  ctx.rect(x, y, w, h);
}

class GrowthPanel {
  render(ctx, rect, data) {
    const info = data || {};
    const level = Number.isFinite(info.level) ? info.level : 1;
    const completed = Number.isFinite(info.completedCount) ? info.completedCount : 0;
    const total = Number.isFinite(info.commitmentCount) ? info.commitmentCount : 0;
    const mood = Number.isFinite(info.moodValue) ? info.moodValue : 60;
    const moodLabel = info.moodLabel || '平稳';

    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    drawRoundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 179, 71, 0.26)';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 12);
    ctx.stroke();

    ctx.fillStyle = '#5B4A3A';
    ctx.font = '700 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('我的成长引擎', rect.x + 10, rect.y + 16);

    ctx.fillStyle = '#8A7765';
    ctx.font = '10px sans-serif';
    ctx.fillText(`Lv.${level} · 今日 ${completed}/${total}`, rect.x + 10, rect.y + 32);
    ctx.fillText(`心情 ${moodLabel} ${mood}%`, rect.x + 10, rect.y + 46);
    ctx.restore();
  }
}

module.exports = GrowthPanel;
