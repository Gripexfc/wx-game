const { canvasRoundRect } = require('../utils/canvas');

const UI = {
  mask: 'rgba(91, 74, 58, 0.35)',
  panel: '#FFFDF8',
  panelBorder: 'rgba(255, 179, 71, 0.28)',
  title: '#5B4A3A',
  text: '#8A7765',
  card: '#FFF6E9',
  cardBorder: 'rgba(255, 179, 71, 0.26)',
  cardAccent: '#FFB347',
  customBg: '#FFF1D6',
  customBorder: 'rgba(255, 179, 71, 0.35)',
  closeBg: 'rgba(255, 179, 71, 0.12)',
};

class GoalPickerOverlay {
  constructor(game) {
    this.game = game;
    this.visible = false;
    this.title = '';
    this.subtitle = '';
    this.mandatory = false;
    this.recommendations = [];
    this._hits = [];
  }

  open(options = {}) {
    this.visible = true;
    const duckName = this.game.getLuluName ? this.game.getLuluName() : '小鸭';
    this.title = options.title || `今天想和${duckName}一起坚持什么？`;
    this.subtitle = options.subtitle || '推荐目标和自定义目标都可以';
    this.mandatory = !!options.mandatory;
    this.recommendations = (options.recommendations || this.game.goalManager.getRecommendations()).slice(0, 4);
    this._hits = [];
  }

  close(force = false) {
    if (this.mandatory && !force) return;
    this.visible = false;
    this._hits = [];
  }

  _getReason(goal) {
    if (goal.createdFrom === 'custom') return '更贴近你今天的节奏';
    if (goal.tag === '运动') return '更容易进入状态';
    if (goal.tag === '学习') return '适合慢慢坚持';
    if (goal.tag === '健康') return '更适合稳定养成';
    if (goal.tag === '生活') return '今天就能完成';
    return '适合先开始试试';
  }

  _getPreviewXp(goal) {
    const moodValue = this.game.petStateManager ? this.game.petStateManager.moodValue : 68;
    return this.game.goalManager.getGoalPreviewXp(goal, moodValue);
  }

  handleClick(x, y) {
    if (!this.visible) return null;
    for (const hit of this._hits) {
      if (x >= hit.x && x <= hit.x + hit.w && y >= hit.y && y <= hit.y + hit.h) {
        if (hit.kind === 'close') {
          this.close();
          return { type: 'close' };
        }
        if (hit.kind === 'goal') {
          return { type: 'goal', goal: hit.goal };
        }
        if (hit.kind === 'custom') {
          return { type: 'custom' };
        }
      }
    }
    if (!this.mandatory) {
      this.close();
      return { type: 'dismiss' };
    }
    return null;
  }

  render(ctx, canvasWidth, canvasHeight) {
    if (!this.visible) return;

    const panelX = 18;
    const panelY = 88;
    const panelW = canvasWidth - 36;
    const panelH = Math.min(470, canvasHeight - 130);
    const innerX = panelX + 16;
    const headerY = panelY + 28;
    const gap = 12;
    const cardW = Math.floor((panelW - 32 - gap) / 2);
    const cardH = 110;
    const cardsY = panelY + 98;
    const customY = cardsY + Math.ceil(this.recommendations.length / 2) * (cardH + gap) + 4;
    const customH = 78;

    this._hits = [];

    ctx.save();
    ctx.fillStyle = UI.mask;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.fillStyle = UI.panel;
    canvasRoundRect(ctx, panelX, panelY, panelW, panelH, 24);
    ctx.fill();
    ctx.strokeStyle = UI.panelBorder;
    ctx.lineWidth = 1.5;
    canvasRoundRect(ctx, panelX, panelY, panelW, panelH, 24);
    ctx.stroke();

    ctx.fillStyle = UI.title;
    ctx.font = '700 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(this.title, innerX, headerY);

    ctx.fillStyle = UI.text;
    ctx.font = '12px sans-serif';
    ctx.fillText(this.subtitle, innerX, headerY + 24);

    if (!this.mandatory) {
      const closeSize = 30;
      const closeX = panelX + panelW - closeSize - 14;
      const closeY = panelY + 16;
      ctx.fillStyle = UI.closeBg;
      canvasRoundRect(ctx, closeX, closeY, closeSize, closeSize, 15);
      ctx.fill();
      ctx.fillStyle = UI.title;
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('×', closeX + closeSize / 2, closeY + 20);
      this._hits.push({ kind: 'close', x: closeX, y: closeY, w: closeSize, h: closeSize });
    }

    this.recommendations.forEach((goal, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = innerX + col * (cardW + gap);
      const y = cardsY + row * (cardH + gap);
      const previewXp = this._getPreviewXp(goal);
      const reason = this._getReason(goal);

      ctx.fillStyle = UI.card;
      canvasRoundRect(ctx, x, y, cardW, cardH, 18);
      ctx.fill();
      ctx.strokeStyle = UI.cardBorder;
      ctx.lineWidth = 1.2;
      canvasRoundRect(ctx, x, y, cardW, cardH, 18);
      ctx.stroke();

      ctx.fillStyle = '#FFF';
      canvasRoundRect(ctx, x + 12, y + 12, 34, 34, 17);
      ctx.fill();
      ctx.fillStyle = UI.title;
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(goal.icon || '🎯', x + 29, y + 35);

      ctx.fillStyle = UI.title;
      ctx.font = '700 14px sans-serif';
      ctx.textAlign = 'left';
      const name = goal.name.length > 10 ? `${goal.name.slice(0, 9)}…` : goal.name;
      ctx.fillText(name, x + 12, y + 64);

      ctx.fillStyle = UI.text;
      ctx.font = '11px sans-serif';
      ctx.fillText(reason, x + 12, y + 82);

      ctx.fillStyle = UI.cardAccent;
      ctx.font = '700 11px sans-serif';
      ctx.fillText(`预计 +${previewXp} XP`, x + 12, y + 99);

      this._hits.push({ kind: 'goal', goal, x, y, w: cardW, h: cardH });
    });

    ctx.fillStyle = UI.customBg;
    canvasRoundRect(ctx, innerX, customY, panelW - 32, customH, 18);
    ctx.fill();
    ctx.strokeStyle = UI.customBorder;
    ctx.lineWidth = 1.2;
    canvasRoundRect(ctx, innerX, customY, panelW - 32, customH, 18);
    ctx.stroke();

    ctx.fillStyle = UI.title;
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('✨', innerX + 14, customY + 28);
    ctx.font = '700 15px sans-serif';
    ctx.fillText('自己写一个', innerX + 44, customY + 28);
    ctx.fillStyle = UI.text;
    ctx.font = '12px sans-serif';
    ctx.fillText('更适合你今天的节奏，也更有专属感', innerX + 14, customY + 52);

    this._hits.push({ kind: 'custom', x: innerX, y: customY, w: panelW - 32, h: customH });

    ctx.fillStyle = UI.text;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      this.mandatory ? `先选一个目标，再带${this.game.getLuluName ? this.game.getLuluName() : '小鸭'}回到首页` : '点空白处可关闭',
      canvasWidth / 2,
      panelY + panelH - 18
    );
    ctx.restore();
  }
}

module.exports = GoalPickerOverlay;
