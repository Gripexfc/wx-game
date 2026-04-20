/**
 * 噜噜 · Canvas 伪 3D 虚拟宠物：分层光影、自主行为、点击 / 左右滑翻面、对话气泡
 */

const { LULU_STAGES } = require('../utils/constants');

const DIALOGUE = {
  tap: ['在呢在呢～', '戳我干嘛呀', '摸摸头，会变强', '今天也要加油嗷', '嘿嘿，我在听', '再戳要收费了（开玩笑'],
  idle: ['有点无聊耶…', '去做个任务？', '我帮你守着进度', '想喝奶茶（幻觉）', '你回来啦', '外面天气好吗', '记得喝水'],
  happy: ['开心！', '好耶～', '被你夸会害羞啦', '继续冲'],
  sleepy: ['困困…', 'Zzz…', '想睡觉'],
};

const TASK_PRAISE = [
  '今天也很厉害呀！',
  '我看到你在努力，超棒！',
  '再完成一个，我们就升级啦！',
  '你做到了，噜式点赞！',
  '稳稳推进，继续冲！',
];

const INTERACTIONS_BY_LEVEL = [
  { minLevel: 1, actions: ['点点头', '挥挥手', '眨眼鼓励', '轻轻蹦一下'] },
  { minLevel: 6, actions: ['开心摇摆', '转圈庆祝', '抱抱手势', '抬橘子炫耀'] },
  { minLevel: 13, actions: ['双手比赞', '撒星星', '高兴跳跃', '阳光光晕'] },
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 翻面阈值：超过则绘制背面简化形体 */
const BACK_THRESHOLD = 0.38;

class Lulu {
  constructor() {
    this.level = 1;
    this.xp = 0;
    this.stage = LULU_STAGES.BABY;
    this.accessories = [];
    this.unlockedActions = [];

    this.petFrame = 0;
    this.mood = 'idle';
    this.moodTimer = 0;
    this.blinkTimer = 0;
    this.nextBlinkAt = 90 + Math.floor(Math.random() * 90);
    this.sayText = '';
    this.sayTimer = 0;
    this.nextIdleChat = 280 + Math.floor(Math.random() * 200);
    this.bob = 0;
    this.hopY = 0;
    this.hopVy = 0;
    this.lookSide = 0;
    this.lookTimer = 0;
    this.legacyAction = null;
    this.legacyActionTimer = 0;
    this.moodValue = 68;
    this.interactionCooldown = 0;
    this.todayInteractionCount = 0;
    this.taskNoReactionStreak = 0;

    this.autoAction = null;
    this.autoActionTimer = 0;
    this.nextAutoActionAt = 240 + Math.floor(Math.random() * 120);
    this.autoActionPaused = false;
    this._autoActionPhase = 0;

    this.turn = 0;
    this.turnSmooth = 0;
    this.petDragging = false;

    /** PetStateManager 引用（由 main.js 注入） */
    this._psm = null;

    /** 酷炫动作状态 */
    this._coolActionId = null;
    this._coolActionFrame = 0;
    this._coolActionCallback = null;
    this._coolActionDuration = 0;
  }

  setPetStateManager(psm) {
    this._psm = psm;
    if (psm) {
      this.moodValue = psm.moodValue;
    }
  }

  /** 获取心情级别人名 */
  getMoodLevelName() {
    if (!this._psm) return '开心';
    return this._psm.getMoodLevel();
  }

  /** 目标完成时调用（宠物见证） */
  onGoalCompleted(goalName) {
    const name = goalName || '目标';
    this.mood = 'happy';
    this.moodTimer = 55;
    this.triggerRewardInteraction(name);
  }

  say(text, frames = 110) {
    this.sayText = text;
    this.sayTimer = frames;
  }

  getStage() {
    const level = this.level;
    if (level >= 16) return LULU_STAGES.ADULT;
    if (level >= 11) return LULU_STAGES.YOUTH;
    if (level >= 6) return LULU_STAGES.CHILD;
    return LULU_STAGES.BABY;
  }

  getScaleMul() {
    const s = this.getStage().id;
    if (s === 'adult') return 1.08;
    if (s === 'youth') return 1.02;
    if (s === 'child') return 0.96;
    return 0.88;
  }

  say(text, frames = 110) {
    this.sayText = text;
    this.sayTimer = frames;
  }

  onOwnerFinishedTask(taskName) {
    const name = taskName || '任务';
    this.mood = 'happy';
    this.moodTimer = 55;
    this.adjustMood(8 + Math.floor(Math.random() * 7));
    this.triggerRewardInteraction(name);
  }

  onTap() {
    this.mood = 'happy';
    this.moodTimer = 40;
    this.hopVy = -6;
    this.say(pick(DIALOGUE.tap), 100);
    this.lookSide = (Math.random() - 0.5) * 0.4;
    this.lookTimer = 30;
    // 暂停自动动作，交互结束后重置计时器
    this.autoActionPaused = true;
    this.autoActionPaused = false;
    if (this.autoAction) {
      this.autoAction = null;
      this._autoActionPhase = 0;
    }
    this.nextAutoActionAt = 180 + Math.floor(Math.random() * 120);
  }

  beginPetDrag() {
    this.petDragging = true;
    this.autoActionPaused = true;
  }

  dragPet(dx) {
    this.turn = Math.max(-1, Math.min(1, this.turn - dx * 0.0048));
  }

  endPetDrag() {
    this.petDragging = false;
    // 交互结束后 60 帧再恢复自动动作
    this.nextAutoActionAt = 60;
    this.autoActionPaused = false;
  }

  triggerRandomAction() {
    const lines = ['摇头晃脑', '蹭蹭你', '蹦一下', '伸懒腰', '发呆'];
    const t = pick(lines);
    this.legacyAction = t;
    this.legacyActionTimer = 55;
    if (t === '伸懒腰') {
      this.mood = 'sleepy';
      this.moodTimer = 60;
      this.say(pick(DIALOGUE.sleepy), 90);
    } else {
      this.say(pick(DIALOGUE.happy), 80);
      this.hopVy = -5;
    }
  }

  getMoodValue() {
    return Math.max(0, Math.min(100, Math.round(this.moodValue)));
  }

  getMoodLabel() {
    const m = this.getMoodValue();
    if (m >= 85) return '阳光';
    if (m >= 65) return '开心';
    if (m >= 40) return '平稳';
    return '想抱抱';
  }

  adjustMood(delta) {
    this.moodValue = Math.max(0, Math.min(100, this.moodValue + delta));
  }

  getUnlockedActions() {
    const pool = [];
    INTERACTIONS_BY_LEVEL.forEach((bucket) => {
      if (this.level >= bucket.minLevel) {
        pool.push(...bucket.actions);
      }
    });
    return pool.length ? pool : ['点点头'];
  }

  triggerRewardInteraction(taskName) {
    const baseChance = 0.6;
    const moodBonus = this.getMoodValue() >= 80 ? 0.2 : 0;
    const mustTrigger = this.taskNoReactionStreak >= 2;
    const canTrigger = mustTrigger || Math.random() < (baseChance + moodBonus);

    if (!canTrigger && this.interactionCooldown <= 0) {
      this.taskNoReactionStreak += 1;
      this.say(`「${taskName}」完成啦，我记在小本本里了`, 120);
      return;
    }

    this.taskNoReactionStreak = 0;
    this.interactionCooldown = 180;
    this.todayInteractionCount += 1;

    const action = pick(this.getUnlockedActions());
    const praise = pick(TASK_PRAISE);
    this.legacyAction = action;
    this.legacyActionTimer = 65;

    if (action.includes('跳') || action.includes('转圈')) {
      this.hopVy = -6.3;
    } else if (action.includes('蹦')) {
      this.hopVy = -5.2;
    }

    this.say(`「${taskName}」完成！${praise}`, 150);
  }

  getActionText() {
    if (this.sayTimer > 0 && this.sayText) return this.sayText;
    if (this.autoAction) {
      const labels = { cute: '卖萌中…', crawl: '爬呀爬…', run: '跑起来！' };
      return labels[this.autoAction] || '';
    }
    if (this.legacyAction) return this.legacyAction;
    return '';
  }

  update() {
    const speedFactor = this._psm ? this._psm.getMoodSpeedFactor() : 1.0;
    this.petFrame += speedFactor;
    this.bob = Math.sin(this.petFrame * 0.055) * 3.2 * speedFactor;

    this.turnSmooth += (this.turn - this.turnSmooth) * 0.26;
    if (!this.petDragging && Math.abs(this.turn) > 0.008) {
      this.turn *= 0.968;
    }

    if (this.sayTimer > 0) this.sayTimer -= 1;
    if (this.interactionCooldown > 0) this.interactionCooldown -= 1;
    if (this.moodTimer > 0) {
      this.moodTimer -= 1;
      if (this.moodTimer <= 0) this.mood = 'idle';
    }
    if (this.legacyActionTimer > 0) {
      this.legacyActionTimer -= 1;
      if (this.legacyActionTimer <= 0) this.legacyAction = null;
    }
    if (this.lookTimer > 0) this.lookTimer -= 1;
    else this.lookSide *= 0.92;

    this.nextBlinkAt -= 1;
    if (this.nextBlinkAt <= 0) {
      this.blinkTimer = 10;
      this.nextBlinkAt = 100 + Math.floor(Math.random() * 140);
    }
    if (this.blinkTimer > 0) this.blinkTimer -= 1;

    this.nextIdleChat -= 1;
    if (this.nextIdleChat <= 0 && this.mood === 'idle' && this.sayTimer <= 0) {
      if (Math.random() < 0.45) {
        this.say(pick(DIALOGUE.idle), 130);
      }
      this.nextIdleChat = 360 + Math.floor(Math.random() * 280);
      this.adjustMood(-1);
    }

    this.hopY += this.hopVy;
    this.hopVy += 0.55;
    if (this.hopY > 0) {
      this.hopY = 0;
      this.hopVy = 0;
    }

    // ===== 自动动作状态机 =====
    if (!this.autoActionPaused && this.legacyActionTimer <= 0) {
      if (this.autoAction) {
        this.autoActionTimer -= 1;
        this._autoActionPhase += 1;
        if (this.autoActionTimer <= 0) {
          this.autoAction = null;
          this._autoActionPhase = 0;
          this.nextAutoActionAt = 180 + Math.floor(Math.random() * 120);
        }
      } else {
        this.nextAutoActionAt -= 1;
        if (this.nextAutoActionAt <= 0) {
          if (Math.random() < 0.3) {
            const pool = ['cute', 'crawl', 'run'];
            this.autoAction = pool[Math.floor(Math.random() * pool.length)];
            const durations = { cute: 80, crawl: 120, run: 100 };
            this.autoActionTimer = durations[this.autoAction] || 90;
            this._autoActionPhase = 0;
          } else {
            this.nextAutoActionAt = 180 + Math.floor(Math.random() * 120);
          }
        }
      }
    }
  }

  drawPet(ctx, rx, ry, rw, rh) {
    const base = Math.min(rw, rh) * 0.34 * this.getScaleMul();
    const cx = rx + rw / 2;
    const groundY = ry + rh * 0.9;
    const cy = groundY - base * 0.32 + this.bob + this.hopY;

    ctx.save();

    const shadowA = 0.18 + Math.abs(this.turnSmooth) * 0.08;
    ctx.fillStyle = `rgba(255, 179, 71, ${shadowA})`;
    ctx.beginPath();
    ctx.ellipse(cx, groundY + 3, base * 0.92, base * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    const showBack = Math.abs(this.turnSmooth) > BACK_THRESHOLD;
    if (showBack) {
      this._drawPetBack(ctx, cx, cy, base);
    } else {
      this._drawPetFront(ctx, cx, cy, base);
    }

    ctx.restore();

    if (this._coolActionId) {
      this._drawCoolAction(ctx, cx, cy, base);
    }

    const headR = base * 0.42;
    const bodyRy = base * 0.42;
    const hy = showBack ? -bodyRy * 0.72 - headR * 0.06 : -bodyRy * 0.75;
    const squash = 1 + Math.sin(this.petFrame * 0.08) * 0.02 + (this.mood === 'happy' ? 0.03 : 0);
    const bubbleAnchorY = cy + (hy - headR * 1.05) * squash;

    if (this.sayTimer > 0 && this.sayText) {
      this._drawSpeechBubble(ctx, cx, bubbleAnchorY, rw * 0.92, this.sayText);
    }
  }

  _drawPetFront(ctx, cx, cy, base) {
    const squash = 1 + Math.sin(this.petFrame * 0.08) * 0.02;
    const happySquash = this.mood === 'happy' ? 0.04 : 0;
    const lean = this.turnSmooth * 0.08;

    ctx.save();
    // 自动动作偏移和倾斜
    let bodyOffsetX = 0;
    let bodyOffsetY = 0;
    let bodyTilt = 0;
    let eyeSquint = 0;

    if (this.autoAction === 'cute') {
      eyeSquint = 1;
      bodyOffsetY = Math.sin(this._autoActionPhase * 0.18) * 3;
    } else if (this.autoAction === 'crawl') {
      bodyOffsetX = Math.sin(this._autoActionPhase * 0.12) * 4;
      bodyOffsetY = Math.abs(Math.sin(this._autoActionPhase * 0.12)) * 2;
    } else if (this.autoAction === 'run') {
      bodyTilt = Math.sin(this._autoActionPhase * 0.25) * 0.06;
    }

    ctx.translate(cx + bodyOffsetX, cy + bodyOffsetY);
    ctx.rotate(bodyTilt);
    ctx.scale(1 - happySquash, squash);

    const bodyRy = base * 0.42;
    const bodyRx = base * 0.48;

    // 暖黄色身体渐变（按lulu.md规范）
    const gBody = ctx.createRadialGradient(-bodyRx * 0.25, -bodyRy * 0.4, base * 0.08, 0, 0, base * 0.7);
    gBody.addColorStop(0, '#FFF3DC');
    gBody.addColorStop(0.35, '#FFE4C4');
    gBody.addColorStop(0.7, '#FFD9A8');
    gBody.addColorStop(1, '#FFCF7F');
    ctx.fillStyle = gBody;
    ctx.beginPath();
    ctx.ellipse(0, bodyRy * 0.18, bodyRx, bodyRy, 0, 0, Math.PI * 2);
    ctx.fill();

    // 肚子高光（白白嫩嫩）
    ctx.fillStyle = 'rgba(255, 254, 248, 0.75)';
    ctx.beginPath();
    ctx.ellipse(0, bodyRy * 0.22, bodyRx * 0.65, bodyRy * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();

    // 橙色短裤
    const shortsY = bodyRy * 0.55;
    const gShorts = ctx.createLinearGradient(0, shortsY - 12, 0, shortsY + 15);
    gShorts.addColorStop(0, '#FFB030');
    gShorts.addColorStop(1, '#E88200');
    ctx.fillStyle = gShorts;
    ctx.beginPath();
    ctx.ellipse(0, shortsY, bodyRx * 0.72, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    const headR = base * 0.44;
    const hx = 0;
    const hy = -bodyRy * 0.78;

    // 暖黄色头部（和身体无缝衔接，几乎无脖子）
    const gHead = ctx.createRadialGradient(hx - headR * 0.32, hy - headR * 0.32, headR * 0.1, hx, hy, headR * 1.1);
    gHead.addColorStop(0, '#FFF3DC');
    gHead.addColorStop(0.4, '#FFE4C4');
    gHead.addColorStop(1, '#FFD9A8');
    ctx.fillStyle = gHead;
    ctx.beginPath();
    ctx.arc(hx, hy, headR, 0, Math.PI * 2);
    ctx.fill();

    // 头顶高光（3D软胶质感）
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.ellipse(hx - headR * 0.28, hy - headR * 0.42, headR * 0.32, headR * 0.18, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // 头顶橘子（核心识别符号，1/6头部大小，居中）
    const orangeY = hy - headR * 1.06;
    const orangeR = headR * 0.17;
    const gOrange = ctx.createRadialGradient(hx - orangeR * 0.3, orangeY - orangeR * 0.25, orangeR * 0.2, hx, orangeY, orangeR);
    gOrange.addColorStop(0, '#FFCC44');
    gOrange.addColorStop(0.5, '#FFAA00');
    gOrange.addColorStop(1, '#E89400');
    ctx.fillStyle = gOrange;
    ctx.beginPath();
    ctx.arc(hx, orangeY, orangeR, 0, Math.PI * 2);
    ctx.fill();
    // 橘子高光
    ctx.fillStyle = 'rgba(255, 240, 100, 0.65)';
    ctx.beginPath();
    ctx.ellipse(hx - orangeR * 0.4, orangeY - orangeR * 0.35, orangeR * 0.35, orangeR * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    // 绿色小蒂
    ctx.fillStyle = '#6AAF2A';
    ctx.beginPath();
    ctx.ellipse(hx, orangeY - orangeR * 0.95, orangeR * 0.22, orangeR * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    // 叶子
    ctx.strokeStyle = '#4A8A1A';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx, orangeY - orangeR * 0.85);
    ctx.quadraticCurveTo(hx + orangeR * 0.7, orangeY - orangeR * 1.4, hx + orangeR * 0.9, orangeY - orangeR * 1.0);
    ctx.stroke();

    // 超大圆钝口鼻（占脸部1/2以上）
    const snoutY = hy + headR * 0.18;
    const gSnout = ctx.createRadialGradient(hx, snoutY - headR * 0.12, headR * 0.08, hx, snoutY, headR * 0.7);
    gSnout.addColorStop(0, '#FFCC66');
    gSnout.addColorStop(0.4, '#FFB030');
    gSnout.addColorStop(0.75, '#FF9500');
    gSnout.addColorStop(1, '#E88200');
    ctx.fillStyle = gSnout;
    ctx.beginPath();
    ctx.ellipse(hx, snoutY, headR * 0.68, headR * 0.56, 0, 0, Math.PI * 2);
    ctx.fill();
    // 口鼻高光
    ctx.fillStyle = 'rgba(255, 240, 128, 0.4)';
    ctx.beginPath();
    ctx.ellipse(hx - headR * 0.2, snoutY - headR * 0.2, headR * 0.25, headR * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    // 超大圆眼睛（淡蓝虹膜）
    const eyeY = hy - headR * 0.08;
    const eyeOff = this.lookSide * headR * 0.1;
    const blink = this.blinkTimer > 0;
    const squint = eyeSquint > 0;
    if (!blink && !squint) {
      // 白色眼白
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.ellipse(hx - headR * 0.3 + eyeOff, eyeY, headR * 0.22, headR * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(hx + headR * 0.3 + eyeOff, eyeY, headR * 0.22, headR * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();

      // 淡蓝虹膜
      const gIris = ctx.createRadialGradient(hx - headR * 0.28 + eyeOff, eyeY - headR * 0.05, headR * 0.05, hx - headR * 0.3 + eyeOff, eyeY, headR * 0.18);
      gIris.addColorStop(0, '#C5E8F8');
      gIris.addColorStop(0.5, '#8ACCE8');
      gIris.addColorStop(1, '#5BADE0');
      ctx.fillStyle = gIris;
      ctx.beginPath();
      ctx.ellipse(hx - headR * 0.28 + eyeOff, eyeY + headR * 0.03, headR * 0.14, headR * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(hx + headR * 0.32 + eyeOff, eyeY + headR * 0.03, headR * 0.14, headR * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();

      // 黑色瞳孔
      ctx.fillStyle = '#1A1A2E';
      ctx.beginPath();
      ctx.ellipse(hx - headR * 0.28 + eyeOff, eyeY + headR * 0.05, headR * 0.08, headR * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(hx + headR * 0.32 + eyeOff, eyeY + headR * 0.05, headR * 0.08, headR * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();

      // 多层高光
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath();
      ctx.arc(hx - headR * 0.32 + eyeOff, eyeY - headR * 0.08, headR * 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(hx + headR * 0.28 + eyeOff, eyeY - headR * 0.08, headR * 0.05, 0, Math.PI * 2);
      ctx.fill();
      // 小高光
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.arc(hx - headR * 0.24 + eyeOff, eyeY + headR * 0.08, headR * 0.02, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(hx + headR * 0.36 + eyeOff, eyeY + headR * 0.08, headR * 0.02, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 眨眼（佛系呆萌）
      ctx.strokeStyle = '#C8A070';
      ctx.lineWidth = headR * 0.045;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx - headR * 0.48 + eyeOff, eyeY);
      ctx.quadraticCurveTo(hx - headR * 0.3 + eyeOff, eyeY - headR * 0.04, hx - headR * 0.1 + eyeOff, eyeY);
      ctx.moveTo(hx + headR * 0.1 + eyeOff, eyeY);
      ctx.quadraticCurveTo(hx + headR * 0.3 + eyeOff, eyeY - headR * 0.04, hx + headR * 0.48 + eyeOff, eyeY);
      ctx.stroke();
    }

    // 卖萌眯眼：两条弧线
    if (squint) {
      ctx.strokeStyle = '#C8A070';
      ctx.lineWidth = headR * 0.06;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(hx - headR * 0.28 + eyeOff, eyeY, headR * 0.18, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(hx + headR * 0.28 + eyeOff, eyeY, headR * 0.18, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
    }

    // 呆萌无辜眼神（半眯）
    ctx.strokeStyle = 'rgba(200, 160, 112, 0.45)';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx - headR * 0.58, eyeY - headR * 0.18);
    ctx.quadraticCurveTo(hx - headR * 0.35, eyeY - headR * 0.25, hx - headR * 0.12, eyeY - headR * 0.14);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(hx + headR * 0.12, eyeY - headR * 0.14);
    ctx.quadraticCurveTo(hx + headR * 0.35, eyeY - headR * 0.25, hx + headR * 0.58, eyeY - headR * 0.18);
    ctx.stroke();

    // 小巧半圆形耳朵（浅黄色）
    ctx.fillStyle = '#FFE4C4';
    ctx.beginPath();
    ctx.ellipse(hx - headR * 0.82, hy - headR * 0.52, headR * 0.14, headR * 0.1, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFD9A8';
    ctx.beginPath();
    ctx.ellipse(hx - headR * 0.82, hy - headR * 0.52, headR * 0.08, headR * 0.06, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFE4C4';
    ctx.beginPath();
    ctx.ellipse(hx + headR * 0.82, hy - headR * 0.52, headR * 0.14, headR * 0.1, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFD9A8';
    ctx.beginPath();
    ctx.ellipse(hx + headR * 0.82, hy - headR * 0.52, headR * 0.08, headR * 0.06, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // 佛系呆萌表情
    ctx.strokeStyle = '#C07000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx - headR * 0.12, snoutY + headR * 0.32);
    ctx.quadraticCurveTo(hx, snoutY + headR * 0.38, hx + headR * 0.12, snoutY + headR * 0.32);
    ctx.stroke();

    // 短粗圆手
    ctx.fillStyle = '#FFD9A8';
    ctx.beginPath();
    ctx.ellipse(hx - bodyRx * 0.88, bodyRy * 0.35, bodyRx * 0.18, bodyRx * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFE4C4';
    ctx.beginPath();
    ctx.ellipse(hx - bodyRx * 0.9, bodyRy * 0.32, bodyRx * 0.09, bodyRx * 0.065, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFD9A8';
    ctx.beginPath();
    ctx.ellipse(hx + bodyRx * 0.88, bodyRy * 0.35, bodyRx * 0.18, bodyRx * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFE4C4';
    ctx.beginPath();
    ctx.ellipse(hx + bodyRx * 0.9, bodyRy * 0.32, bodyRx * 0.09, bodyRx * 0.065, 0, 0, Math.PI * 2);
    ctx.fill();

    // 短粗圆脚
    ctx.fillStyle = '#FFCF7F';
    ctx.beginPath();
    ctx.ellipse(hx - bodyRx * 0.5, bodyRy * 0.95, bodyRx * 0.22, bodyRx * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFE4C4';
    ctx.beginPath();
    ctx.ellipse(hx - bodyRx * 0.52, bodyRy * 0.92, bodyRx * 0.1, bodyRx * 0.065, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFCF7F';
    ctx.beginPath();
    ctx.ellipse(hx + bodyRx * 0.5, bodyRy * 0.95, bodyRx * 0.22, bodyRx * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFE4C4';
    ctx.beginPath();
    ctx.ellipse(hx + bodyRx * 0.52, bodyRy * 0.92, bodyRx * 0.1, bodyRx * 0.065, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  _drawPetBack(ctx, cx, cy, base) {
    const squash = 1 + Math.sin(this.petFrame * 0.08) * 0.02;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, squash);

    const bodyRy = base * 0.44;
    const bodyRx = base * 0.48;

    // 背部暖黄色渐变
    const gBody = ctx.createRadialGradient(0, -bodyRy * 0.5, bodyRx * 0.2, 0, 0, bodyRx * 0.8);
    gBody.addColorStop(0, '#FFD9A8');
    gBody.addColorStop(1, '#FFCF7F');
    ctx.fillStyle = gBody;
    ctx.beginPath();
    ctx.ellipse(0, bodyRy * 0.14, bodyRx, bodyRy, 0, 0, Math.PI * 2);
    ctx.fill();

    // 背部高光
    ctx.fillStyle = 'rgba(255, 254, 248, 0.5)';
    ctx.beginPath();
    ctx.ellipse(-bodyRx * 0.15, -bodyRy * 0.3, bodyRx * 0.45, bodyRy * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // 橙色短裤背面
    const shortsY = bodyRy * 0.5;
    const gShorts = ctx.createLinearGradient(0, shortsY - 10, 0, shortsY + 12);
    gShorts.addColorStop(0, '#FFB030');
    gShorts.addColorStop(1, '#E88200');
    ctx.fillStyle = gShorts;
    ctx.beginPath();
    ctx.ellipse(0, shortsY, bodyRx * 0.7, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    const headR = base * 0.42;
    const hy = -bodyRy * 0.75;

    // 头部背面渐变
    const gHead = ctx.createRadialGradient(0, hy - headR * 0.2, headR * 0.3, 0, hy, headR);
    gHead.addColorStop(0, '#FFE4C4');
    gHead.addColorStop(1, '#FFD9A8');
    ctx.fillStyle = gHead;
    ctx.beginPath();
    ctx.arc(0, hy, headR, 0, Math.PI * 2);
    ctx.fill();

    // 耳朵背面
    const earS = 0.85 + Math.abs(this.turnSmooth) * 0.15;
    ctx.fillStyle = '#FFE4C4';
    ctx.beginPath();
    ctx.ellipse(-headR * 0.82 * earS, hy - headR * 0.5, headR * 0.14, headR * 0.1, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFD9A8';
    ctx.beginPath();
    ctx.ellipse(-headR * 0.82 * earS, hy - headR * 0.5, headR * 0.08, headR * 0.06, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFE4C4';
    ctx.beginPath();
    ctx.ellipse(headR * 0.82 * earS, hy - headR * 0.5, headR * 0.14, headR * 0.1, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFD9A8';
    ctx.beginPath();
    ctx.ellipse(headR * 0.82 * earS, hy - headR * 0.5, headR * 0.08, headR * 0.06, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // 背面头顶橘子
    const orangeY = hy - headR * 1.06;
    const orangeR = headR * 0.17;
    const gOrange = ctx.createRadialGradient(-orangeR * 0.3, orangeY - orangeR * 0.3, orangeR * 0.2, 0, orangeY, orangeR);
    gOrange.addColorStop(0, '#FFCC44');
    gOrange.addColorStop(1, '#E89400');
    ctx.fillStyle = gOrange;
    ctx.beginPath();
    ctx.arc(0, orangeY, orangeR, 0, Math.PI * 2);
    ctx.fill();
    // 橘子高光
    ctx.fillStyle = 'rgba(255, 240, 100, 0.6)';
    ctx.beginPath();
    ctx.ellipse(-orangeR * 0.3, orangeY - orangeR * 0.3, orangeR * 0.3, orangeR * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    // 绿蒂
    ctx.fillStyle = '#6AAF2A';
    ctx.beginPath();
    ctx.ellipse(0, orangeY - orangeR * 0.9, orangeR * 0.18, orangeR * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  _drawSpeechBubble(ctx, cx, topY, maxW, text) {
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    const lines = this._wrapText(ctx, text, maxW - 28);
    const lineH = 18;
    const padX = 14;
    const padY = 10;
    const maxLineW = lines.length ? Math.max(...lines.map((l) => ctx.measureText(l).width), 40) : 40;
    const bw = Math.min(maxW, maxLineW + padX * 2);
    const bh = lines.length * lineH + padY * 2;
    const bx = cx - bw / 2;
    const by = topY - bh - 8;

    ctx.save();
    // 暖白气泡
    ctx.fillStyle = 'rgba(255, 252, 248, 0.98)';
    ctx.strokeStyle = 'rgba(255, 179, 71, 0.5)';
    ctx.lineWidth = 2;
    this._roundRect(ctx, bx, by, bw, bh, 16);
    ctx.fill();
    ctx.stroke();

    // 气泡小尾巴
    ctx.fillStyle = 'rgba(255, 252, 248, 0.98)';
    ctx.beginPath();
    ctx.moveTo(cx - 7, by + bh);
    ctx.lineTo(cx + 7, by + bh);
    ctx.lineTo(cx, by + bh + 12);
    ctx.closePath();
    ctx.fill();

    // 暖棕色文字
    ctx.fillStyle = '#5B4A3A';
    lines.forEach((line, i) => {
      ctx.fillText(line, bx + padX, by + padY + 14 + i * lineH);
    });
    ctx.restore();
  }

  _wrapText(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return [text];
    const out = [];
    let cur = '';
    for (const ch of text) {
      const t = cur + ch;
      if (ctx.measureText(t).width > maxWidth && cur) {
        out.push(cur);
        cur = ch;
      } else {
        cur = t;
      }
    }
    if (cur) out.push(cur);
    return out.length ? out : [text];
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  // ========== 心情级外观变化 ==========

  /** 根据心情值对颜色做饱和度调整 */
  _applyMoodSaturation(ctx, colorMult) {
    if (colorMult === 1.0) return;
    if (colorMult < 1.0) {
      ctx.globalAlpha = colorMult;
    }
  }

  // ========== 酷炫动作 ==========

  playCoolAction(actionId, callback) {
    this._coolActionId = actionId;
    this._coolActionFrame = 0;
    this._coolActionCallback = callback || null;
    const durations = {
      heartbeat: 90, dance: 120, backflip: 60, rainbow: 150, takeoff: 100,
      supersugar: 180, royal: 200, transform: 240, universe: 300,
    };
    this._coolActionDuration = durations[actionId] || 120;
  }

  _drawCoolAction(ctx, cx, cy, base) {
    if (!this._coolActionId) return;
    const progress = this._coolActionFrame / this._coolActionDuration;
    const id = this._coolActionId;

    ctx.save();
    if (id === 'heartbeat') {
      const scale = 1 + Math.sin(progress * Math.PI * 6) * 0.08 * (1 - progress);
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);
    } else if (id === 'dance') {
      const swing = Math.sin(progress * Math.PI * 4) * 0.1;
      ctx.translate(cx, cy);
      ctx.rotate(swing);
      ctx.translate(-cx, -cy);
    } else if (id === 'backflip') {
      const angle = progress * Math.PI * 2;
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.translate(-cx, -cy);
    } else if (id === 'rainbow') {
      const alpha = Math.sin(progress * Math.PI) * 0.8;
      ctx.fillStyle = `rgba(255,100,200,${alpha * 0.3})`;
      ctx.beginPath();
      ctx.arc(cx, cy - base * 0.8, base * 0.6 * progress, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'takeoff') {
      const lift = Math.sin(progress * Math.PI) * base * 0.3;
      ctx.translate(0, -lift);
    } else if (id === 'supersugar') {
      const alpha = Math.sin(progress * Math.PI);
      ctx.fillStyle = `rgba(255,50,100,${alpha * 0.4})`;
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + progress * Math.PI;
        const r = base * 0.5 * (0.5 + progress * 0.5);
        ctx.beginPath();
        ctx.arc(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, base * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (id === 'royal') {
      const glow = Math.sin(progress * Math.PI) * 0.3;
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = base * 0.5 * progress;
    } else if (id === 'transform') {
      const pulse = 1 + Math.sin(progress * Math.PI * 2) * 0.1;
      ctx.translate(cx, cy);
      ctx.scale(pulse, pulse);
      ctx.translate(-cx, -cy);
      ctx.globalAlpha = 0.5 + Math.sin(progress * Math.PI) * 0.5;
    } else if (id === 'universe') {
      const alpha = Math.sin(progress * Math.PI);
      ctx.fillStyle = `rgba(100,50,200,${alpha * 0.3})`;
      ctx.fillRect(0, 0, 400, 700);
    }
    ctx.restore();

    this._coolActionFrame++;
    if (this._coolActionFrame >= this._coolActionDuration) {
      if (this._coolActionCallback) this._coolActionCallback();
      this._coolActionId = null;
      this._coolActionFrame = 0;
    }
  }
}

module.exports = Lulu;
