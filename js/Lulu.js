const { LULU_STAGES, LULU_ACTIONS, COLORS } = require('../utils/constants');

class Lulu {
  constructor() {
    this.level = 1;
    this.xp = 0;
    this.stage = LULU_STAGES.BABY;
    this.accessories = [];
    this.action = null;
    this.actionTimer = 0;
    this.animTimer = 0;
    this.breatheOffset = 0;
  }

  // 获取当前阶段
  getStage() {
    const level = this.level;
    if (level >= 16) return LULU_STAGES.ADULT;
    if (level >= 11) return LULU_STAGES.YOUTH;
    if (level >= 6) return LULU_STAGES.CHILD;
    return LULU_STAGES.BABY;
  }

  // 获取噜噜尺寸（根据阶段）
  getSize() {
    const stage = this.getStage();
    switch (stage.id) {
      case 'adult': return 180;
      case 'youth': return 150;
      case 'child': return 120;
      default: return 90;
    }
  }

  // 随机触发动作
  triggerRandomAction() {
    const action = LULU_ACTIONS[Math.floor(Math.random() * LULU_ACTIONS.length)];
    this.action = action;
    this.actionTimer = 60; // 动作持续帧数
  }

  // 获取动作描述
  getActionText() {
    switch (this.action) {
      case '摇头': return '(´・ω・`)ノ';
      case '微笑': return '(｡◕‿◕｡)';
      case '蹭蹭': return '(◕ᴗ◕✿)';
      case '蹦跳': return '(ﾉ◕ヮ◕)ﾉ*:・ﾟ✧';
      case '打哈欠': return '(๑・ω-)〜♦';
      default: return '(●´∀`)';
    }
  }

  // 更新动画
  update() {
    this.animTimer++;
    this.breatheOffset = Math.sin(this.animTimer * 0.05) * 3;

    if (this.actionTimer > 0) {
      this.actionTimer--;
      if (this.actionTimer <= 0) {
        this.action = null;
      }
    }
  }

  // 绘制噜噜
  draw(ctx, x, y) {
    const size = this.getSize();
    const color = COLORS.PRIMARY;

    ctx.save();
    ctx.translate(x, y + this.breatheOffset);

    // 身体（椭圆）
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.5, size * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // 头部（圆）
    ctx.beginPath();
    ctx.arc(0, -size * 0.3, size * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // 耳朵
    ctx.beginPath();
    ctx.ellipse(-size * 0.25, -size * 0.5, size * 0.1, size * 0.08, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(size * 0.25, -size * 0.5, size * 0.1, size * 0.08, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // 眼睛
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-size * 0.12, -size * 0.35, size * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size * 0.12, -size * 0.35, size * 0.05, 0, Math.PI * 2);
    ctx.fill();

    // 鼻子（大椭圆）
    ctx.fillStyle = '#5D4E37';
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.2, size * 0.12, size * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();

    // 腿（四条小短腿）
    ctx.fillStyle = color;
    ctx.fillRect(-size * 0.35, size * 0.2, size * 0.12, size * 0.15);
    ctx.fillRect(size * 0.23, size * 0.2, size * 0.12, size * 0.15);
    ctx.fillRect(-size * 0.15, size * 0.25, size * 0.1, size * 0.12);
    ctx.fillRect(size * 0.05, size * 0.25, size * 0.1, size * 0.12);

    ctx.restore();
  }
}

module.exports = Lulu;