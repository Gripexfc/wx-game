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

class SocialPulsePanel {
  render(ctx, rect, data, inbox) {
    const social = data || {};
    const inboxData = inbox || {};
    const pulseLine = social.pulseLine || '今天还没有新动态';
    const unread = Number.isFinite(inboxData.unreadCount) ? inboxData.unreadCount : 0;

    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    drawRoundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(143, 214, 163, 0.55)';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 12);
    ctx.stroke();

    ctx.fillStyle = '#5B4A3A';
    ctx.font = '700 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('好友脉冲', rect.x + 10, rect.y + 16);

    ctx.fillStyle = '#8A7765';
    ctx.font = '10px sans-serif';
    const line = pulseLine.length > 12 ? `${pulseLine.slice(0, 12)}…` : pulseLine;
    ctx.fillText(line, rect.x + 10, rect.y + 32);
    ctx.fillText(`收件箱 ${unread} 条`, rect.x + 10, rect.y + 46);
    ctx.restore();
  }
}

module.exports = SocialPulsePanel;
