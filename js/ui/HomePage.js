// 首页：暖系咖啡馆风格 V2（按lulu.md规范）
// 色彩：奶油米白、暖黄、橙黄、柔和蓝、浅绿

const BannerAdManager = require('../ads/BannerAdManager');
const { canvasRoundRect } = require('../utils/canvas');
const GoalPickerOverlay = require('./GoalPickerOverlay');
const { getBrandCopy, getHomePageLayoutSpec, getHomePageCommitmentLayout } = require('./pageLayoutSpec');

// 游戏常量
const TAP_DISTANCE_THRESHOLD = 16;   // 触摸移动距离阈值
const TASK_PRESS_SCALE = 0.96;     // 任务卡片按下缩放比例

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
    this._touch = { mode: null, lastX: 0, lastY: 0, startX: 0, startY: 0, petMoved: false, task: null };
    this._taskPress = null;
    this._banner = BannerAdManager.getInstance();
    this.goalPicker = new GoalPickerOverlay(game);

    // 新增：承诺槽位（4格）
    this._commitmentSlots = [];
    // 新增：系统引用（由 main.js 注入）
    this._goalManager = null;
    this._wishManager = null;
    this._petStateManager = null;
    this._growth = null;
    this._onCompleteGoal = null;
    this._onCommitGoal = null;
    this._onCreateGoal = null;
    // 新增：在线XP计时
    this._onlineXP = 0;
    this._lastOnlineXPTime = Date.now();
  }

  setGameSystems({ goalManager, wishManager, petStateManager, growth, onCompleteGoal, onCommitGoal, onCreateGoal }) {
    this._goalManager = goalManager;
    this._wishManager = wishManager;
    this._petStateManager = petStateManager;
    this._growth = growth;
    this._onCompleteGoal = onCompleteGoal;
    this._onCommitGoal = onCommitGoal;
    this._onCreateGoal = onCreateGoal;
  }

  setLulu(lulu) {
    this.lulu = lulu;
  }

  _getDuckName() {
    return this.game.getLuluName ? this.game.getLuluName() : '小鸭';
  }

  _openGoalPicker() {
    const duckName = this._getDuckName();
    this.goalPicker.open({
      title: `今天想和${duckName}一起坚持什么？`,
      subtitle: '选一个推荐目标，或者自己写一个',
      mandatory: false,
    });
  }

  _applyGoalSelection(goalData) {
    const created = this.game.createAndCommitGoal(goalData);
    if (!created) return false;
    if (this.lulu) {
      this.lulu.say('目标记下啦，一起慢慢做到它', 120);
    }
    this.goalPicker.close(true);
    return true;
  }

  _promptCustomGoal() {
    if (typeof wx === 'undefined' || !wx.showModal) return;
    wx.showModal({
      title: '写一个今天的小目标',
      editable: true,
      placeholderText: '比如：晚饭后散步20分钟',
      confirmText: '加入今天',
      cancelText: '取消',
      success: (res) => {
        if (!res.confirm) return;
        const text = String(res.content || '').trim();
        if (!text) {
          if (wx.showToast) wx.showToast({ title: '先写一个目标名吧', icon: 'none', duration: 1400 });
          return;
        }
        this._applyGoalSelection({
          name: text,
          type: 'habit',
          baseXp: 15,
          icon: '✨',
          tag: '自定义',
          createdFrom: 'custom',
        });
      },
    });
  }

  _handleGoalPickerAction(action) {
    if (!action) return;
    if (action.type === 'goal' && action.goal) {
      this._applyGoalSelection(action.goal);
      return;
    }
    if (action.type === 'custom') {
      this._promptCustomGoal();
    }
  }

  computeLayout(canvasWidth, canvasHeight) {
    const spec = getHomePageLayoutSpec(canvasWidth, canvasHeight);
    const commitmentLayout = getHomePageCommitmentLayout(canvasWidth, canvasHeight);
    const pad = spec.horizontalPadding;
    const topY = spec.topPadding;
    const topSectionH = spec.headerHeight;
    const petCardW = Math.min(spec.petCardWidth, canvasWidth - pad * 2);
    const petCardH = spec.petCardHeight;
    const petCardX = (canvasWidth - petCardW) / 2;
    const petCardY = spec.petCardTop;
    const actionAreaX = commitmentLayout.actionArea.x;
    const actionAreaY = commitmentLayout.actionArea.y;
    const actionAreaW = commitmentLayout.actionArea.w;
    const actionAreaH = commitmentLayout.actionArea.h;
    const actionHeaderH = commitmentLayout.actionHeaderHeight;
    const commitmentSlots = commitmentLayout.cards;
    const bottomH = actionAreaY + actionAreaH + spec.bottomPadding;

    return {
      spec,
      pad,
      topSectionH,
      topY,
      petCardX,
      petCardY,
      petCardW,
      petCardH,
      actionAreaX,
      actionAreaY,
      actionAreaW,
      actionAreaH,
      actionHeaderH,
      commitmentSlots,
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

    // 承诺槽位检测
    if (L.commitmentSlots && L.commitmentSlots.length > 0) {
      for (let i = 0; i < L.commitmentSlots.length; i++) {
        const slot = L.commitmentSlots[i];
        if (x >= slot.x && x <= slot.x + slot.w && y >= slot.y && y <= slot.y + slot.h) {
          const commitments = this._goalManager ? this._goalManager.getTodayCommitments() : [];
          return { zone: 'commitment', index: i, commit: commitments[i], layout: L };
        }
      }
    }

    return { zone: null, layout: L };
  }

  onTouchStart(x, y, canvasWidth, canvasHeight) {
    if (this.goalPicker.visible) {
      this._handleGoalPickerAction(this.goalPicker.handleClick(x, y));
      return;
    }
    const hit = this.hitTest(x, y, canvasWidth, canvasHeight);
    this._touch = { mode: null, lastX: x, lastY: y, startX: x, startY: y, petMoved: false, task: null };

    if (hit.zone === 'pet' && this.lulu) {
      this._touch.mode = 'pet';
      this.lulu.beginPetDrag();
    } else if (hit.zone === 'commitment') {
      this._touch.mode = 'commitment';
      this._touch.commit = hit.commit;
      this._touch.commitIndex = hit.index;
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
      if (!t.petMoved && dist < TAP_DISTANCE_THRESHOLD) {
        this.lulu.onTap();
        this.game.onLuluInteraction();
      }
    } else if (t.mode === 'commitment') {
      if (dist < 18) {
        if (this._onCompleteGoal && t.commit && !t.commit.completed) {
          this._onCompleteGoal(t.commit.goalId);
        } else if (!t.commit) {
          this._openGoalPicker();
        }
      }
    }

    this._touch.mode = null;
    this._touch.task = null;
    this._touch.commit = null;
  }

  onTouchCancel() {
    if (this._touch.mode === 'pet' && this.lulu) {
      this.lulu.endPetDrag();
    }
    this._touch.mode = null;
    this._touch.task = null;
    this._touch.commit = null;
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

    const openKeyboardEditor = () => {
      if (!wx.showKeyboard) {
        fallbackSheet();
        return;
      }

      let handled = false;
      const cleanup = () => {
        if (wx.offKeyboardConfirm) wx.offKeyboardConfirm(onConfirm);
        if (wx.offKeyboardComplete) wx.offKeyboardComplete(onComplete);
      };
      const finish = (text) => {
        const value = String(text || '').trim();
        if (value) {
          apply(value);
          handled = true;
        }
      };
      const onConfirm = (res) => {
        finish(res && res.value);
        cleanup();
        if (wx.hideKeyboard) wx.hideKeyboard();
      };
      const onComplete = (res) => {
        if (!handled) finish(res && res.value);
        cleanup();
        if (!handled && !prev) fallbackSheet();
      };

      if (wx.onKeyboardConfirm) wx.onKeyboardConfirm(onConfirm);
      if (wx.onKeyboardComplete) wx.onKeyboardComplete(onComplete);

      wx.showKeyboard({
        defaultValue: prev || '',
        maxLength: 18,
        multiple: false,
        confirmType: 'done',
        success: () => {},
        fail: () => {
          cleanup();
          fallbackSheet();
        },
      });
    };

    const openEditableModal = () => {
      if (!wx.showModal) {
        openKeyboardEditor();
        return;
      }
      wx.showModal({
        title: '编辑今日小目标',
        content: prev || '',
        editable: true,
        placeholderText: '输入任务名（最多18字）',
        confirmText: '保存',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            const text = (res.content != null ? String(res.content) : '').trim();
            if (text) {
              apply(text);
            } else if (!prev) {
              openKeyboardEditor();
            }
          }
        },
        fail: () => openKeyboardEditor(),
      });
    };

    // 先尝试可编辑弹窗，失败再降级键盘
    openEditableModal();
  }

  openCustomTaskMenu(task) {
    if (typeof wx === 'undefined' || !wx.showActionSheet) {
      if (!task.completed) this.game.completeTask(task.id);
      return;
    }
    wx.showActionSheet({
      itemList: task.completed ? ['编辑任务名'] : ['编辑任务名', '完成任务'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.openDailyEditor();
        } else if (res.tapIndex === 1 && !task.completed) {
          this.game.completeTask(task.id);
        }
      },
      fail: () => {
        if (!task.completed) this.game.completeTask(task.id);
      },
    });
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
    const luluName = this._getDuckName();
    const brandCopy = getBrandCopy(luluName);

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

    // ===== 顶部轻头部 =====
    const pad = L.pad;
    const topY = L.topY;
    const topSectionH = L.topSectionH;

    const brandChipW = 118;
    const brandChipH = 24;
    const brandChipX = pad;
    const brandChipY = topY + 2;
    ctx.fillStyle = 'rgba(255, 214, 107, 0.28)';
    canvasRoundRect(ctx, brandChipX, brandChipY, brandChipW, brandChipH, 12);
    ctx.fill();
    ctx.fillStyle = UI.pillText;
    ctx.font = '700 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(brandCopy.brandTitle, brandChipX + brandChipW / 2, brandChipY + 16);

    const badgeW = 58;
    const badgeH = 24;
    const badgeX = canvasWidth - pad - badgeW;
    const badgeY = brandChipY;
    ctx.fillStyle = UI.pill;
    canvasRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, 12);
    ctx.fill();
    ctx.fillStyle = UI.pillText;
    ctx.font = '600 11px sans-serif';
    ctx.fillText(`Lv.${growth.level}`, badgeX + badgeW / 2, badgeY + 16);

    ctx.fillStyle = UI.text;
    ctx.font = '600 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(luluName, pad, topY + topSectionH - 8);
    ctx.fillStyle = UI.textMuted;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(brandCopy.homeRelationshipLine, canvasWidth - pad, topY + topSectionH - 8);

    // ===== 宠物主卡 =====
    ctx.fillStyle = UI.petCardBg;
    canvasRoundRect(ctx, L.petCardX, L.petCardY, L.petCardW, L.petCardH, L.spec.petCardRadius);
    ctx.fill();
    ctx.strokeStyle = UI.petCardBorder;
    ctx.lineWidth = 1.5;
    canvasRoundRect(ctx, L.petCardX, L.petCardY, L.petCardW, L.petCardH, L.spec.petCardRadius);
    ctx.stroke();

    // 语音气泡
    const bubbleW = Math.min(148, L.petCardW - 44);
    const bubbleH = 32;
    const bubbleX = L.petCardX + (L.petCardW - bubbleW) / 2;
    const bubbleY = L.petCardY + 16;
    ctx.fillStyle = 'rgba(255, 252, 248, 0.98)';
    canvasRoundRect(ctx, bubbleX, bubbleY, bubbleW, bubbleH, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 179, 71, 0.5)';
    ctx.lineWidth = 1.5;
    canvasRoundRect(ctx, bubbleX, bubbleY, bubbleW, bubbleH, 14);
    ctx.stroke();
    ctx.fillStyle = UI.text;
    ctx.font = '500 12px sans-serif';
    ctx.textAlign = 'center';
    const bubbleText = (this.lulu && this.lulu.getActionText && this.lulu.getActionText()) || '在呢在呢～';
    ctx.fillText(bubbleText.length > 8 ? `${bubbleText.slice(0, 8)}…` : bubbleText, bubbleX + bubbleW / 2, bubbleY + 20);

    // 小鸭主角
    if (this.lulu) {
      this.lulu.drawPet(ctx, L.petCardX, L.petCardY, L.petCardW, L.petCardH);
    }
    this._hits.lulu = { x: L.petCardX, y: L.petCardY, w: L.petCardW, h: L.petCardH };

    const footerY = L.petCardY + L.petCardH - 58;
    ctx.fillStyle = 'rgba(255, 248, 238, 0.92)';
    canvasRoundRect(ctx, L.petCardX + 16, footerY, L.petCardW - 32, 36, 18);
    ctx.fill();
    ctx.fillStyle = UI.text;
    ctx.font = '600 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${moodLabel} · Lv.${growth.level}`, L.petCardX + 30, footerY + 22);
    ctx.textAlign = 'right';
    ctx.fillText(`${growth.xp}/${growth.getXpForNextLevel()} XP`, L.petCardX + L.petCardW - 30, footerY + 22);

    // 宠物卡片底部提示
    ctx.fillStyle = UI.hint;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`轻点${luluName} · 和它打个招呼`, L.petCardX + L.petCardW / 2, L.petCardY + L.petCardH - 10);

    // ===== 轻行动区 =====
    ctx.fillStyle = 'rgba(255, 255, 255, 0.76)';
    canvasRoundRect(ctx, L.actionAreaX, L.actionAreaY, L.actionAreaW, L.actionAreaH, L.spec.actionAreaRadius);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 179, 71, 0.18)';
    ctx.lineWidth = 1;
    canvasRoundRect(ctx, L.actionAreaX, L.actionAreaY, L.actionAreaW, L.actionAreaH, L.spec.actionAreaRadius);
    ctx.stroke();
    ctx.fillStyle = UI.text;
    ctx.font = '700 15px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('今天想一起完成什么', L.actionAreaX + L.spec.actionInset, L.actionAreaY + 24);
    ctx.fillStyle = UI.textMuted;
    ctx.font = '11px sans-serif';
    ctx.fillText('先选一个小目标，剩下的慢慢来', L.actionAreaX + L.spec.actionInset, L.actionAreaY + 42);

    this._commitmentSlots = L.commitmentSlots;
    const commitments = this._goalManager ? this._goalManager.getTodayCommitments() : [];
    this._commitmentSlots.forEach((slot, i) => {
      const commit = commitments[i];
      if (commit) {
        this._drawCommitmentCard(ctx, slot, commit);
      } else {
        this._drawEmptySlot(ctx, slot, i);
      }
    });

    // ===== 心愿气泡 =====
    const wishes = this._wishManager ? this._wishManager.getTodayWishes() : [];
    if (wishes.length > 0) {
      this._drawWishBubbles(ctx, L);
    }

    // ===== 在线XP小标签 =====
    if (this._onlineXP > 0) {
      ctx.fillStyle = 'rgba(255,179,71,0.15)';
      ctx.beginPath();
      ctx.roundRect(canvasWidth - pad - 80, canvasHeight - 30, 80, 22, 11);
      ctx.fill();
      ctx.fillStyle = '#8B4500';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`在线 +${this._onlineXP} XP`, canvasWidth - pad - 40, canvasHeight - 16);
    }
    this.goalPicker.render(ctx, canvasWidth, canvasHeight);
  }

  _drawCommitmentCard(ctx, slot, commit) {
    const goal = commit.goal;
    const isDone = commit.completed;
    const previewXp = this._goalManager ? this._goalManager.getGoalPreviewXp(goal.id, this._petStateManager ? this._petStateManager.moodValue : 68) : (goal.baseXp || goal.xp || 0);
    const streakLabel = goal.streakDays > 0 ? `连续${goal.streakDays}天` : '今天开始';
    ctx.save();
    ctx.fillStyle = isDone ? 'rgba(143,214,163,0.2)' : UI.card;
    canvasRoundRect(ctx, slot.x, slot.y, slot.w, slot.h, 14);
    ctx.fill();
    ctx.strokeStyle = isDone ? 'rgba(143,214,163,0.5)' : UI.cardBorder;
    ctx.lineWidth = 1.5;
    canvasRoundRect(ctx, slot.x, slot.y, slot.w, slot.h, 14);
    ctx.stroke();

    const cx = slot.x + slot.w / 2;
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(goal.icon || '🎯', cx, slot.y + 30);

    ctx.fillStyle = isDone ? UI.textMuted : UI.text;
    ctx.font = '600 13px sans-serif';
    const name = goal.name.length > 9 ? `${goal.name.slice(0, 8)}…` : goal.name;
    ctx.fillText(name, cx, slot.y + 50);

    ctx.fillStyle = 'rgba(255, 179, 71, 0.14)';
    canvasRoundRect(ctx, slot.x + 10, slot.y + 58, 56, 18, 9);
    ctx.fill();
    ctx.fillStyle = UI.text;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(streakLabel, slot.x + 38, slot.y + 71);

    ctx.fillStyle = isDone ? UI.completed : UI.accent;
    ctx.font = '600 11px sans-serif';
    ctx.fillText(isDone ? '✓ 已完成' : `预计 +${previewXp} XP`, cx + 18, slot.y + 71);

    ctx.restore();
  }

  _drawEmptySlot(ctx, slot, index) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 214, 107, 0.16)';
    canvasRoundRect(ctx, slot.x, slot.y, slot.w, slot.h, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 179, 71, 0.35)';
    ctx.lineWidth = 1.2;
    canvasRoundRect(ctx, slot.x, slot.y, slot.w, slot.h, 16);
    ctx.stroke();

    ctx.fillStyle = '#FFF';
    canvasRoundRect(ctx, slot.x + slot.w / 2 - 18, slot.y + 12, 36, 36, 18);
    ctx.fill();
    ctx.fillStyle = UI.text;
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎯', slot.x + slot.w / 2, slot.y + 36);

    ctx.fillStyle = UI.text;
    ctx.font = '700 13px sans-serif';
    ctx.fillText('添加今日目标', slot.x + slot.w / 2, slot.y + 64);
    ctx.fillStyle = UI.text;
    ctx.font = '11px sans-serif';
    ctx.fillText('可选推荐，也可自定义', slot.x + slot.w / 2, slot.y + 82);
    ctx.restore();
  }

  _drawWishBubbles(ctx, L) {
    const wishes = this._wishManager.getTodayWishes();
    const petCenter = { x: L.petCardX + L.petCardW / 2, y: L.petCardY + L.petCardH / 2 };
    wishes.forEach((wish, i) => {
      const angle = (i / Math.max(wishes.length, 1)) * Math.PI * 2 - Math.PI / 2;
      const radius = 130;
      const bx = petCenter.x + Math.cos(angle) * radius;
      const by = petCenter.y + Math.sin(angle) * radius;
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.shadowColor = 'rgba(0,0,0,0.08)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.ellipse(bx, by, 70, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#5D4E37';
      ctx.textAlign = 'center';
      ctx.fillText(wish.wishText.slice(0, 12), bx, by + 4);
      ctx.restore();
    });
  }
}

module.exports = HomePage;
