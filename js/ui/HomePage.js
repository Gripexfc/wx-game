// 首页：暖系咖啡馆风格 V2（按lulu.md规范）
// 色彩：奶油米白、暖黄、橙黄、柔和蓝、浅绿

const BannerAdManager = require('../ads/BannerAdManager');

const UI = {
  // 背景渐变
  bgTop: '#FFF8EE',
  bgMid: '#FFF5EC',
  bgBottom: '#FFFAF5',
  // 文字
  text: '#5B4A3A',
  textMuted: '#8A7765',
  // 强调色
  accent: '#FFB347',
  accentSoft: '#FFD66B',
  // 暖黄渐变（进度条）
  barBg: 'rgba(255, 179, 71, 0.25)',
  barFill: '#FFD66B',
  // 等级徽章
  pill: '#FFD66B',
  pillText: '#8B4500',
  // 卡片
  card: '#FFFFFF',
  cardBorder: 'rgba(255, 179, 71, 0.25)',
  // 心情值
  moodBg: '#FFF8EE',
  moodBorder: 'rgba(255, 179, 71, 0.24)',
  moodText: '#8B4500',
  // 完成态
  completed: '#8FD6A3',
  // 柔和蓝
  softBlue: '#8FC8FF',
  // 提示文字
  hint: 'rgba(138, 119, 101, 0.7)',
  // 宠物卡片
  petCardBg: 'rgba(255, 255, 255, 0.85)',
  petCardBorder: 'rgba(255, 179, 71, 0.2)',
};

class HomePage {
  constructor(game) {
    this.game = game;
    this.lulu = null;
    this._hits = { lulu: null, tasks: [] };
    /** @type {{ mode: 'pet'|'task'|null, lastX: number, lastY: number, startX: number, startY: number, petMoved: boolean, task: object|null }} */
    this._touch = { mode: null, lastX: 0, lastY: 0, startX: 0, startY: 0, petMoved: false, task: null };
    /** 任务行按压缩放 */
    this._taskPress = null;
    this._banner = BannerAdManager.getInstance();
  }

  setLulu(lulu) {
    this.lulu = lulu;
  }

  computeLayout(canvasWidth, canvasHeight) {
    const pad = 15;
    const top = 10;
    const bottomReserve = 18;

    // Top section
    const topSectionH = 44;
    const topY = top;

    // Pet card: generous size, fills ~45% of content area
    const petCardW = Math.min(310, canvasWidth - pad * 2);
    const petCardH = Math.floor(canvasHeight * 0.42);
    const petCardX = (canvasWidth - petCardW) / 2;
    const petCardY = topY + topSectionH + 6;

    // Status cards: 4px gap from pet card (close, tight grouping)
    const statusCardGap = 10;
    const statusCardH = 54;
    const statusCardW = Math.floor((petCardW - statusCardGap) / 2);
    const statusCardY = petCardY + petCardH + 4;

    // XP bar: 8px gap from status cards
    const xpBarY = statusCardY + statusCardH + 8;

    // Task grid: label 8px above grid
    const taskGridY = xpBarY + 18;
    const taskGap = 10;
    const taskCardW = Math.floor((canvasWidth - pad * 2 - taskGap) / 2);
    const taskCardH = 96;
    const tasksAll = this.getDisplayTasks();

    // 2x2 grid
    const displayTasks = tasksAll.slice(0, 4);
    const rows = Math.ceil(displayTasks.length / 2);
    const taskGridH = rows * taskCardH + (rows - 1) * taskGap;
    const bottomH = taskGridY + taskGridH + bottomReserve;

    return {
      pad,
      top,
      topSectionH,
      topY,
      petCardX,
      petCardY,
      petCardW,
      petCardH,
      statusCardGap,
      statusCardY,
      statusCardH,
      statusCardW,
      xpBarY,
      taskGridY,
      taskCardW,
      taskCardH,
      taskGap,
      displayTasks,
      bottomH,
      canvasHeight,
    };
  }

  getDisplayTasks() {
    const all = this.game.taskManager.getTodayTasks();
    const desiredSystemOrder = ['fitness', 'read', 'eat'];
    const system = desiredSystemOrder
      .map((id) => all.find((t) => t.id === id && !t.isCustom && !t.isPlaceholder))
      .filter(Boolean);
    const custom = all.find((t) => t.isCustom || t.isPlaceholder);
    return custom ? [...system, custom] : system;
  }

  hitTest(x, y, canvasWidth, canvasHeight) {
    const L = this.computeLayout(canvasWidth, canvasHeight);

    // Pet card area
    if (x >= L.petCardX && x <= L.petCardX + L.petCardW && y >= L.petCardY && y <= L.petCardY + L.petCardH) {
      return { zone: 'pet', layout: L };
    }

    // Task grid (2x2)
    for (let i = 0; i < L.displayTasks.length; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const tx = L.pad + col * (L.taskCardW + L.taskGap);
      const ty = L.taskGridY + row * (L.taskCardH + L.taskGap);
      const tw = L.taskCardW;
      if (x >= tx && x <= tx + tw && y >= ty && y <= ty + L.taskCardH) {
        return { zone: 'task', task: L.displayTasks[i], layout: L };
      }
    }

    return { zone: null, layout: L };
  }

  onTouchStart(x, y, canvasWidth, canvasHeight) {
    const hit = this.hitTest(x, y, canvasWidth, canvasHeight);
    this._touch = {
      mode: null,
      lastX: x,
      lastY: y,
      startX: x,
      startY: y,
      petMoved: false,
      task: null,
    };

    if (hit.zone === 'pet' && this.lulu) {
      this._touch.mode = 'pet';
      this.lulu.beginPetDrag();
    } else if (hit.zone === 'task') {
      this._touch.mode = 'task';
      this._touch.task = hit.task;
      this._taskPress = { id: hit.task.id, scale: 0.96 };
    }
  }

  onTouchMove(x, y, canvasWidth, canvasHeight) {
    if (this._touch.mode === 'pet' && this.lulu) {
      const dx = x - this._touch.lastX;
      if (Math.abs(dx) > 2) this._touch.petMoved = true;
      this.lulu.dragPet(dx);
      this._touch.lastX = x;
      this._touch.lastY = y;
    }
  }

  onTouchEnd(x, y, canvasWidth, canvasHeight) {
    const t = this._touch;
    const dist = Math.hypot(x - t.startX, y - t.startY);

    if (t.mode === 'pet' && this.lulu) {
      this.lulu.endPetDrag();
      if (!t.petMoved && dist < 16) {
        this.lulu.onTap();
        this.game.onLuluInteraction();
      }
    } else if (t.mode === 'task' && t.task && dist < 18) {
      const task = t.task;
      if (task.isPlaceholder) {
        this.openDailyEditor();
      } else if (!task.completed) {
        this.game.completeTask(task.id);
      }
    }

    this._touch.mode = null;
    this._touch.task = null;
  }

  onTouchCancel() {
    if (this._touch.mode === 'pet' && this.lulu) {
      this.lulu.endPetDrag();
    }
    this._touch.mode = null;
    this._touch.task = null;
  }

  openDailyEditor() {
    const tm = this.game.taskManager;
    const prev = tm.getDailyCustom() ? tm.getDailyCustom().name : '';
    const game = this.game;

    const apply = (name) => {
      if (tm.setDailyCustom({ name })) {
        game.saveData();
        if (this.lulu) {
          this.lulu.say('收到！今天一起冲这句～', 120);
        }
      }
    };

    if (typeof wx === 'undefined') return;

    const fallbackSheet = () => {
      wx.showActionSheet({
        itemList: ['早睡打卡', '好好干饭', '运动一下', '阅读半小时', '先不写了'],
        success: (res) => {
          const presets = ['早睡打卡', '好好干饭', '运动一下', '阅读半小时'];
          if (res.tapIndex >= 0 && res.tapIndex < 4) {
            apply(presets[res.tapIndex]);
          }
        },
      });
    };

    if (wx.showModal) {
      wx.showModal({
        title: '今日小目标',
        content: prev || '',
        editable: true,
        placeholderText: '写一句给自己的话，不改就沿用上次',
        confirmText: '保存',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            const text = (res.content != null ? String(res.content) : '').trim();
            if (text) {
              apply(text);
            } else if (!prev) {
              fallbackSheet();
            }
          }
        },
        fail: () => fallbackSheet(),
      });
    } else {
      fallbackSheet();
    }
  }

  /** 兼容旧入口：单点（无 move/end 时） */
  handleClick(x, y, canvasWidth, canvasHeight) {
    this.onTouchStart(x, y, canvasWidth, canvasHeight);
    this.onTouchEnd(x, y, canvasWidth, canvasHeight);
  }

  render(ctx, canvasWidth, canvasHeight) {
    this._banner.hide();

    this._hits = { lulu: null, tasks: [] };

    if (this._taskPress && this._taskPress.scale < 0.999) {
      this._taskPress.scale += (1 - this._taskPress.scale) * 0.22;
    } else if (this._taskPress && this._taskPress.scale >= 0.999) {
      this._taskPress = null;
    }

    const L = this.computeLayout(canvasWidth, canvasHeight);
    const growth = this.game.growth;
    const mood = this.lulu ? this.lulu.getMoodValue() : 60;
    const moodLabel = this.lulu ? this.lulu.getMoodLabel() : '平稳';

    // 背景渐变
    const g = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    g.addColorStop(0, UI.bgTop);
    g.addColorStop(0.5, UI.bgMid);
    g.addColorStop(1, UI.bgBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 暖色光晕装饰
    const glow = ctx.createRadialGradient(canvasWidth * 0.8, 60, 10, canvasWidth * 0.8, 60, 200);
    glow.addColorStop(0, 'rgba(255, 214, 107, 0.18)');
    glow.addColorStop(1, 'rgba(255, 214, 107, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // ===== 顶部区域 =====
    const pad = L.pad;
    const topY = L.topY;
    const topSectionH = L.topSectionH;

    // 左侧：用户头像 + 昵称
    const avatarSize = 36;
    const avatarX = pad;
    const avatarY = topY + (topSectionH - avatarSize) / 2;
    ctx.fillStyle = UI.accentSoft;
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = UI.text;
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('😊', avatarX + avatarSize / 2, avatarY + avatarSize / 2);
    ctx.textBaseline = 'alphabetic';

    ctx.fillStyle = UI.text;
    ctx.font = '600 14px sans-serif';
    ctx.textAlign = 'left';
    const luluName = this.game.getLuluName ? this.game.getLuluName() : '小明';
    ctx.fillText(luluName, avatarX + avatarSize + 8, topY + topSectionH / 2 + 5);

    // 中间：页面标题
    ctx.font = '700 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('噜噜任务小屋', canvasWidth / 2, topY + topSectionH / 2 + 5);

    // 右侧：等级徽章 + 心情图标
    const badgeW = 56;
    const badgeH = 26;
    const badgeX = canvasWidth - pad - badgeW - 24;
    const badgeY = topY + (topSectionH - badgeH) / 2;

    ctx.fillStyle = UI.pill;
    this.roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 13);
    ctx.fill();
    ctx.fillStyle = UI.pillText;
    ctx.font = '600 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Lv.${growth.level}`, badgeX + badgeW / 2, badgeY + 17);

    const moodIcon = mood >= 85 ? '☀️' : mood >= 65 ? '😊' : mood >= 40 ? '😐' : '😢';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(moodIcon, badgeX + badgeW + 6, badgeY + 18);

    // ===== 宠物卡片（圆角24px大卡片） =====
    ctx.fillStyle = UI.petCardBg;
    this.roundRect(ctx, L.petCardX, L.petCardY, L.petCardW, L.petCardH, 24);
    ctx.fill();
    ctx.strokeStyle = UI.petCardBorder;
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, L.petCardX, L.petCardY, L.petCardW, L.petCardH, 24);
    ctx.stroke();

    // 语音气泡
    const bubbleW = 120;
    const bubbleH = 32;
    const bubbleX = L.petCardX + (L.petCardW - bubbleW) / 2;
    const bubbleY = L.petCardY - 10;
    ctx.fillStyle = 'rgba(255, 252, 248, 0.98)';
    this.roundRect(ctx, bubbleX, bubbleY, bubbleW, bubbleH, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 179, 71, 0.5)';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, bubbleX, bubbleY, bubbleW, bubbleH, 14);
    ctx.stroke();
    ctx.fillStyle = UI.text;
    ctx.font = '500 12px sans-serif';
    ctx.textAlign = 'center';
    const bubbleText = (this.lulu && this.lulu.getActionText && this.lulu.getActionText()) || '在呢在呢～';
    ctx.fillText(bubbleText.length > 8 ? `${bubbleText.slice(0, 8)}…` : bubbleText, bubbleX + bubbleW / 2, bubbleY + 20);

    // 噜噜宠物
    if (this.lulu) {
      this.lulu.drawPet(ctx, L.petCardX, L.petCardY, L.petCardW, L.petCardH);
    }
    this._hits.lulu = { x: L.petCardX, y: L.petCardY, w: L.petCardW, h: L.petCardH };

    // 宠物卡片底部提示
    ctx.fillStyle = UI.hint;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('轻点噜噜 · 触发互动', L.petCardX + L.petCardW / 2, L.petCardY + L.petCardH - 10);

    // ===== 状态卡片（XP + 心情） =====
    const xpCardX = L.petCardX;
    const moodCardX = L.petCardX + L.statusCardW + L.statusCardGap;

    // XP 状态卡
    ctx.fillStyle = UI.moodBg;
    this.roundRect(ctx, xpCardX, L.statusCardY, L.statusCardW, L.statusCardH, 12);
    ctx.fill();
    ctx.strokeStyle = UI.moodBorder;
    ctx.lineWidth = 1;
    this.roundRect(ctx, xpCardX, L.statusCardY, L.statusCardW, L.statusCardH, 12);
    ctx.stroke();
    ctx.fillStyle = UI.textMuted;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('经验值', xpCardX + L.statusCardW / 2, L.statusCardY + 14);
    ctx.fillStyle = UI.text;
    ctx.font = '700 16px sans-serif';
    ctx.fillText(`${growth.xp}/${growth.getXpForNextLevel()}`, xpCardX + L.statusCardW / 2, L.statusCardY + 32);

    // XP mini进度条
    const miniBarW = L.statusCardW - 20;
    const miniBarH = 4;
    const miniBarX = xpCardX + 10;
    const miniBarY = L.statusCardY + 40;
    const xpProg = growth.getXpProgress();
    ctx.fillStyle = UI.barBg;
    this.roundRect(ctx, miniBarX, miniBarY, miniBarW, miniBarH, 2);
    ctx.fill();
    ctx.fillStyle = UI.barFill;
    this.roundRect(ctx, miniBarX, miniBarY, Math.max(miniBarH, miniBarW * xpProg), miniBarH, 2);
    ctx.fill();

    // 心情状态卡
    ctx.fillStyle = UI.moodBg;
    this.roundRect(ctx, moodCardX, L.statusCardY, L.statusCardW, L.statusCardH, 12);
    ctx.fill();
    ctx.strokeStyle = UI.moodBorder;
    ctx.lineWidth = 1;
    this.roundRect(ctx, moodCardX, L.statusCardY, L.statusCardW, L.statusCardH, 12);
    ctx.stroke();
    ctx.fillStyle = UI.textMuted;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('心情值', moodCardX + L.statusCardW / 2, L.statusCardY + 14);
    ctx.fillStyle = UI.text;
    ctx.font = '700 16px sans-serif';
    ctx.fillText(String(Math.round(mood)), moodCardX + L.statusCardW / 2, L.statusCardY + 32);

    // 心情mini进度条
    const moodBarX = moodCardX + 10;
    ctx.fillStyle = UI.barBg;
    this.roundRect(ctx, moodBarX, miniBarY, miniBarW, miniBarH, 2);
    ctx.fill();
    ctx.fillStyle = '#8FC8FF';
    this.roundRect(ctx, moodBarX, miniBarY, Math.max(miniBarH, miniBarW * (mood / 100)), miniBarH, 2);
    ctx.fill();

    // ===== XP进度条 =====
    const xpBarW = canvasWidth - pad * 2;
    const prog = growth.getXpProgress();
    ctx.fillStyle = UI.barBg;
    this.roundRect(ctx, pad, L.xpBarY, xpBarW, 6, 3);
    ctx.fill();
    ctx.fillStyle = UI.barFill;
    this.roundRect(ctx, pad, L.xpBarY, Math.max(6, xpBarW * prog), 6, 3);
    ctx.fill();
    ctx.fillStyle = UI.textMuted;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${growth.xp} / ${growth.getXpForNextLevel()} XP`, canvasWidth / 2, L.xpBarY + 16);

    // ===== 今日任务标签 =====
    ctx.fillStyle = UI.textMuted;
    ctx.font = '600 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('今日任务', pad, L.taskGridY - 8);

    // ===== 任务网格（2x2） =====
    L.displayTasks.forEach((task, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const tx = pad + col * (L.taskCardW + L.taskGap);
      const ty = L.taskGridY + row * (L.taskCardH + L.taskGap);
      this.drawTaskCard(ctx, tx, ty, L.taskCardW, L.taskCardH, task);
    });
    this._banner.show();
  }

  drawTaskCard(ctx, x, y, w, h, task) {
    this._hits.tasks.push({ x, y, w, h, task });

    const press = this._taskPress && this._taskPress.id === task.id ? this._taskPress.scale : 1;
    const cx = x + w / 2;
    const cy = y + h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(press, press);
    ctx.translate(-cx, -cy);

    // 卡片背景
    ctx.fillStyle = task.completed ? 'rgba(255,255,255,0.7)' : UI.card;
    this.roundRect(ctx, x, y, w, h, 14);
    ctx.fill();
    ctx.strokeStyle = task.completed ? 'rgba(143, 214, 163, 0.4)' : UI.cardBorder;
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, x, y, w, h, 14);
    ctx.stroke();

    // 自定义任务：淡绿底色
    if (task.isPlaceholder && !task.completed) {
      ctx.fillStyle = 'rgba(143, 214, 163, 0.12)';
      this.roundRect(ctx, x + 1, y + 1, w - 2, h - 2, 13);
      ctx.fill();
    }

    const cx2 = x + w / 2;

    // 任务图标
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(task.icon, cx2, y + 34);

    // 任务名称
    ctx.textAlign = 'center';
    ctx.fillStyle = task.completed ? UI.textMuted : UI.text;
    ctx.font = '600 14px sans-serif';
    const name = task.name.length > 10 ? `${task.name.slice(0, 9)}…` : task.name;
    ctx.fillText(name, cx2, y + 56);

    // 任务描述
    ctx.font = '10px sans-serif';
    ctx.fillStyle = UI.textMuted;
    const desc = task.desc && task.desc.length > 16 ? `${task.desc.slice(0, 15)}…` : (task.desc || '');
    ctx.fillText(desc, cx2, y + 72);

    // 奖励/状态
    ctx.textAlign = 'center';
    ctx.font = '600 12px sans-serif';
    if (task.isPlaceholder && !task.completed) {
      ctx.fillStyle = UI.accent;
      ctx.fillText('点击编辑', cx2, y + h - 12);
    } else {
      ctx.fillStyle = task.completed ? UI.completed : UI.accent;
      ctx.fillText(task.completed ? '✓ 已完成' : `+${task.xp} XP`, cx2, y + h - 12);
    }

    ctx.restore();
  }

  roundRect(ctx, x, y, w, h, r) {
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
}

module.exports = HomePage;
