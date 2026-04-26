// 首页：暖系咖啡馆风格 V2（按lulu.md规范）
// 色彩：奶油米白、暖黄、橙黄、柔和蓝、浅绿

const BannerAdManager = require('../ads/BannerAdManager');
const { canvasRoundRect } = require('../utils/canvas');
const GoalPickerOverlay = require('./GoalPickerOverlay');
const { getBrandCopy, HOME_MOTIVATION_QUOTES, getHomePageLayoutSpec, getHomePageCommitmentLayout } = require('./pageLayoutSpec');
const { PetBackgroundSystem } = require('./pet-background/index');
const GrowthPanel = require('./GrowthPanel');
const SocialPulsePanel = require('./SocialPulsePanel');

// 游戏常量
const TAP_DISTANCE_THRESHOLD = 16;
/** 承诺卡片按下缩放（略明显，松手弹簧回弹） */
const TASK_PRESS_SCALE = 0.9;
const TASK_PRESS_LERP = 0.36;
/** 宠物卡片轻按缩放 */
const PET_CARD_SQUASH_MIN = 0.972;
const PET_SQUASH_LERP = 0.32;

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
    this._hits.growthPanel = null;
    this._hits.socialPanel = null;
    this._hits.shareMoment = null;
    this._touch = { mode: null, lastX: 0, lastY: 0, startX: 0, startY: 0, petMoved: false, task: null };
    this._taskPress = null;
    /** 完成任务槽位短暂高亮 */
    this._slotPulse = null;
    /** 点宠物后的外圈光晕（帧） */
    this._petGlowFrames = 0;
    /** 手指按下时宠物卡整体微缩 */
    this._petCardSquash = 1;
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
    this._onUndoGoal = null;
    this._canUndoGoal = null;
    this._onCommitGoal = null;
    this._onCreateGoal = null;
    this._quoteIndex = 0;
    // 新增：在线XP计时
    this._onlineXP = 0;
    this._lastOnlineXPTime = Date.now();
    /** 任务完成后飞向宠物的能量球 */
    this._goalConsumeFx = [];
    /** 升级特效 */
    this._levelUpFx = null;
    this._petBackground = new PetBackgroundSystem();
    this._growthPanel = new GrowthPanel();
    this._socialPulsePanel = new SocialPulsePanel();
    this._overlay = {
      visible: false,
      title: '',
      items: [],
      allItems: [],
      mode: '',
      layout: null,
      page: 0,
      pageSize: 8,
      busyItemId: '',
    };
    this._actionThrottle = {};
  }

  setGameSystems({ goalManager, wishManager, petStateManager, growth, onCompleteGoal, onUndoGoal, canUndoGoal, onCommitGoal, onCreateGoal }) {
    this._goalManager = goalManager;
    this._wishManager = wishManager;
    this._petStateManager = petStateManager;
    this._growth = growth;
    this._onCompleteGoal = onCompleteGoal;
    this._onUndoGoal = onUndoGoal;
    this._canUndoGoal = canUndoGoal;
    this._onCommitGoal = onCommitGoal;
    this._onCreateGoal = onCreateGoal;
  }

  setLulu(lulu) {
    this.lulu = lulu;
  }

  _getDuckName() {
    return this.game.getLuluName ? this.game.getLuluName() : '小鸭';
  }

  rotateMotivationQuote() {
    const total = HOME_MOTIVATION_QUOTES.length || 1;
    this._quoteIndex = (this._quoteIndex + 1) % total;
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
    if (this.game && typeof this.game.onLuluInteraction === 'function') {
      this.game.onLuluInteraction();
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
    const brandChipY = topY + 2;
    const badgeW = 56;
    const badgeH = 24;
    const badgeX = canvasWidth - pad - badgeW;
    const badgeY = brandChipY;

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
      brandChipY,
      badgeX,
      badgeY,
      badgeW,
      badgeH,
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

    // Lv 徽章：动画档位 + 可选「完成暴击」（略扩热区）
    const bh = 6;
    if (
      x >= L.badgeX - bh &&
      x <= L.badgeX + L.badgeW + bh &&
      y >= L.badgeY - bh &&
      y <= L.badgeY + L.badgeH + bh
    ) {
      return { zone: 'prefs_badge', layout: L };
    }

    // Pet card area
    if (x >= L.petCardX && x <= L.petCardX + L.petCardW && y >= L.petCardY && y <= L.petCardY + L.petCardH) {
      return { zone: 'pet', layout: L };
    }

    if (this._hits.growthPanel) {
      const r = this._hits.growthPanel;
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        return { zone: 'growth_panel', layout: L };
      }
    }
    if (this._hits.socialPanel) {
      const r = this._hits.socialPanel;
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        return { zone: 'social_panel', layout: L };
      }
    }
    if (this._hits.shareMoment) {
      const r = this._hits.shareMoment;
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        return { zone: 'share_moment', layout: L };
      }
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
    if (this._overlay.visible) {
      this._handleOverlayTap(x, y);
      return;
    }
    if (this.goalPicker.visible) {
      this._handleGoalPickerAction(this.goalPicker.handleClick(x, y));
      return;
    }
    const hit = this.hitTest(x, y, canvasWidth, canvasHeight);
    this._touch = { mode: null, lastX: x, lastY: y, startX: x, startY: y, petMoved: false, task: null };

    if (hit.zone === 'prefs_badge') {
      this._touch.mode = 'prefs_badge';
    } else if (hit.zone === 'growth_panel') {
      this._touch.mode = 'growth_panel';
    } else if (hit.zone === 'social_panel') {
      this._touch.mode = 'social_panel';
    } else if (hit.zone === 'share_moment') {
      this._touch.mode = 'share_moment';
    } else if (hit.zone === 'pet' && this.lulu) {
      this._touch.mode = 'pet';
      this._petCardSquash = PET_CARD_SQUASH_MIN;
      this.lulu.beginPetDrag();
    } else if (hit.zone === 'commitment') {
      this._touch.mode = 'commitment';
      this._touch.commit = hit.commit;
      this._touch.commitIndex = hit.index;
      this._taskPress = { index: hit.index, scale: TASK_PRESS_SCALE };
    }
  }

  onTouchMove(x, y, canvasWidth, canvasHeight) {
    if (this._touch.mode === 'pet' && this.lulu) {
      const dx = x - this._touch.lastX;
      if (Math.abs(dx) > 2) this._touch.petMoved = true;
      if (this._touch.petMoved) {
        this._petCardSquash += (1 - this._petCardSquash) * 0.45;
      }
      this.lulu.dragPet(dx);
      this._touch.lastX = x;
      this._touch.lastY = y;
    }
  }

  onTouchEnd(x, y, canvasWidth, canvasHeight) {
    const t = this._touch;
    const dist = Math.hypot(x - t.startX, y - t.startY);

    if (t.mode === 'prefs_badge' && dist < 22) {
      this._openGamePrefsSheet();
      this.game.onLuluInteraction();
    } else if (t.mode === 'growth_panel' && dist < 22) {
      this._openGrowthPanelSheet();
      this.game.onLuluInteraction();
    } else if (t.mode === 'social_panel' && dist < 22) {
      this._openSocialPanelSheet();
      this.game.onLuluInteraction();
    } else if (t.mode === 'share_moment' && dist < 22) {
      this._triggerShareMoment();
      this.game.onLuluInteraction();
    } else if (t.mode === 'pet' && this.lulu) {
      this.lulu.endPetDrag();
      if (!t.petMoved && dist < TAP_DISTANCE_THRESHOLD) {
        this.lulu.onTap();
        this._petGlowFrames = 34;
        this._triggerBackgroundRipple();
        this.game.onLuluInteraction();
      }
    } else if (t.mode === 'commitment') {
      if (dist < 18) {
        if (t.commit && !t.commit.completed && this._onCompleteGoal) {
          const result = this._onCompleteGoal(t.commit.goalId);
          if (result && result.success) {
            this.rotateMotivationQuote();
            this._slotPulse = { index: t.commitIndex, ttl: 32, kind: 'done' };
            this._spawnGoalConsumeFx(t.commitIndex, t.commit, result.visualFx);
            const completedGoal = result.goal || (t.commit ? t.commit.goal : null);
            this._petBackground.onGoalCompleted(completedGoal, result.visualFx);
            this.game.onLuluInteraction();
          }
        } else if (t.commit && t.commit.completed && this._onUndoGoal) {
          const canUndo = this._canUndoGoal ? this._canUndoGoal(t.commit.goalId) : true;
          if (!canUndo) {
            if (typeof wx !== 'undefined' && wx.showToast) {
              wx.showToast({ title: '撤销时间已过', icon: 'none', duration: 1300 });
            }
          } else {
            const undoResult = this._onUndoGoal(t.commit.goalId);
            if (undoResult && undoResult.success) {
              this.rotateMotivationQuote();
              this._slotPulse = { index: t.commitIndex, ttl: 26, kind: 'undo' };
              this._cancelGoalConsumeFx(undoResult.goalId);
              this.game.onLuluInteraction();
            }
          }
        } else if (!t.commit) {
          this._openGoalPicker();
          this.game.onLuluInteraction();
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
    this._taskPress = null;
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

  _openGamePrefsSheet() {
    if (typeof wx === 'undefined' || !wx.showActionSheet) return;
    const game = this.game;
    if (!game || typeof game.getMotionTier !== 'function' || typeof game.setMotionTier !== 'function') return;
    const tier = game.getMotionTier();
    const critOn = typeof game.getGoalCritEnabled === 'function' ? game.getGoalCritEnabled() : false;
    wx.showActionSheet({
      itemList: [
        `动画：省电${tier === 'low' ? ' ✓' : ''}`,
        `动画：标准${tier === 'standard' ? ' ✓' : ''}`,
        `动画：热闹${tier === 'high' ? ' ✓' : ''}`,
        critOn ? '完成暴击：关（每日≤3）' : '完成暴击：开（每日≤3）',
      ],
      success: (res) => {
        const i = res.tapIndex;
        if (i === 0) game.setMotionTier('low');
        else if (i === 1) game.setMotionTier('standard');
        else if (i === 2) game.setMotionTier('high');
        else if (i === 3 && typeof game.setGoalCritEnabled === 'function') {
          game.setGoalCritEnabled(!critOn);
        }
        if (wx.showToast) {
          let title = '';
          if (i <= 2) {
            const labels = { low: '省电', standard: '标准', high: '热闹' };
            title = `动画：${labels[game.getMotionTier()] || '标准'}`;
          } else {
            title = critOn ? '已关闭暴击' : '已开启暴击';
          }
          wx.showToast({ title, icon: 'none', duration: 1300 });
        }
      },
    });
  }

  openCustomTaskMenu(task) {
    if (typeof wx === 'undefined' || !wx.showActionSheet) {
      if (!task.completed && this.game && typeof this.game.completeGoal === 'function') this.game.completeGoal(task.id);
      return;
    }
    wx.showActionSheet({
      itemList: task.completed ? ['编辑任务名'] : ['编辑任务名', '完成任务'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.openDailyEditor();
        } else if (res.tapIndex === 1 && !task.completed) {
          if (this.game && typeof this.game.completeGoal === 'function') this.game.completeGoal(task.id);
        }
      },
      fail: () => {
        if (!task.completed && this.game && typeof this.game.completeGoal === 'function') this.game.completeGoal(task.id);
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

    if (this._taskPress && this._taskPress.scale < 0.998) {
      this._taskPress.scale += (1 - this._taskPress.scale) * TASK_PRESS_LERP;
    } else if (this._taskPress && this._taskPress.scale >= 0.998) {
      this._taskPress = null;
    }
    if (this._petCardSquash < 0.9995) {
      this._petCardSquash += (1 - this._petCardSquash) * PET_SQUASH_LERP;
    }

    const L = this.computeLayout(canvasWidth, canvasHeight);
    const growth = this.game.growth;
    const mood = this.lulu ? this.lulu.getMoodValue() : 60;
    const moodLabel = this.lulu ? this.lulu.getMoodLabel() : '平稳';
    const luluName = this._getDuckName();
    const brandCopy = getBrandCopy(luluName, this._quoteIndex);
    const homeSnapshot = this.game && typeof this.game.getHomeSnapshot === 'function'
      ? this.game.getHomeSnapshot()
      : null;
    this._updateGoalConsumeFx();
    this._updateBackgroundFx(L, growth.level, mood, moodLabel);

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

    const brandChipH = 24;
    const brandChipY = L.brandChipY;
    ctx.font = '700 12px sans-serif';
    ctx.textAlign = 'left';
    const nameChipW = Math.min(
      Math.max(72, Math.ceil(ctx.measureText(luluName).width) + 22),
      canvasWidth - pad * 2 - 68
    );
    const brandChipX = pad;
    ctx.fillStyle = 'rgba(255, 214, 107, 0.28)';
    canvasRoundRect(ctx, brandChipX, brandChipY, nameChipW, brandChipH, 12);
    ctx.fill();
    ctx.fillStyle = UI.pillText;
    ctx.textAlign = 'center';
    ctx.fillText(luluName, brandChipX + nameChipW / 2, brandChipY + 16);

    const { badgeX, badgeY, badgeW, badgeH } = L;
    ctx.fillStyle = UI.pill;
    canvasRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, 12);
    ctx.fill();
    ctx.fillStyle = UI.pillText;
    ctx.font = '600 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Lv.${growth.level}`, badgeX + badgeW / 2, badgeY + 16);

    ctx.fillStyle = UI.textMuted;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(brandCopy.homeRelationshipLine, canvasWidth - pad, topY + topSectionH - 8);

    // ===== 成长条（心情 + 经验，均在宠物卡上方，不挡立绘）=====
    const xpY = L.spec.xpStripY;
    const xpH = L.spec.xpStripHeight;
    const xpW = canvasWidth - pad * 2;
    const xpX = pad;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
    canvasRoundRect(ctx, xpX, xpY, xpW, xpH, 11);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 179, 71, 0.22)';
    ctx.lineWidth = 1;
    canvasRoundRect(ctx, xpX, xpY, xpW, xpH, 11);
    ctx.stroke();
    const xpNum = `${growth.xp}/${growth.getXpForNextLevel()}`;
    const moodStr = `心情 ${moodLabel} · ${mood}%`;
    ctx.fillStyle = UI.text;
    ctx.font = '600 10px sans-serif';
    ctx.textAlign = 'left';
    let moodDraw = moodStr;
    const maxMoodPx = xpW * 0.48;
    while (moodDraw.length > 4 && ctx.measureText(moodDraw).width > maxMoodPx) {
      moodDraw = `${moodDraw.slice(0, -2)}…`;
    }
    ctx.fillText(moodDraw, xpX + 10, xpY + 14);
    ctx.fillStyle = UI.textMuted;
    ctx.font = '600 9px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`经验 ${xpNum}`, xpX + xpW - 10, xpY + 14);
    const barLeft = xpX + 10;
    const barRight = xpX + xpW - 10;
    const barW = Math.max(48, barRight - barLeft);
    const barY = xpY + 20;
    const ratio = Math.max(0, Math.min(1, growth.getXpProgress()));
    ctx.fillStyle = UI.barBg;
    canvasRoundRect(ctx, barLeft, barY, barW, 5, 2);
    ctx.fill();
    if (ratio > 0) {
      ctx.fillStyle = UI.barFill;
      canvasRoundRect(ctx, barLeft, barY, Math.max(2, barW * ratio), 5, 2);
      ctx.fill();
    }

    // ===== 宠物主卡（整体微缩放 + 点击光晕，操作反馈）=====
    const pcx = L.petCardX + L.petCardW / 2;
    const pcy = L.petCardY + L.petCardH / 2;
    ctx.save();
    ctx.translate(pcx, pcy);
    ctx.scale(this._petCardSquash, this._petCardSquash);
    ctx.translate(-pcx, -pcy);

    this._drawPetBackground(ctx, L, growth.level);
    ctx.strokeStyle = UI.petCardBorder;
    ctx.lineWidth = 1.5;
    canvasRoundRect(ctx, L.petCardX, L.petCardY, L.petCardW, L.petCardH, L.spec.petCardRadius);
    ctx.stroke();

    if (this._petGlowFrames > 0) {
      const g = this._petGlowFrames / 34;
      ctx.strokeStyle = `rgba(255, 200, 120, ${0.22 + g * 0.38})`;
      ctx.lineWidth = 2.2 + (1 - g) * 2;
      canvasRoundRect(ctx, L.petCardX - 2, L.petCardY - 2, L.petCardW + 4, L.petCardH + 4, L.spec.petCardRadius + 2);
      ctx.stroke();
      this._petGlowFrames -= 1;
    }

    if (this.lulu) {
      this.lulu.drawPet(ctx, L.petCardX, L.petCardY, L.petCardW, L.petCardH, {
        screen: { w: canvasWidth, h: canvasHeight },
      });
    }
    this._drawGoalConsumeFx(ctx, L);
    ctx.restore();
    this._hits.lulu = { x: L.petCardX, y: L.petCardY, w: L.petCardW, h: L.petCardH };

    // ===== 轻行动区 =====
    ctx.fillStyle = 'rgba(255, 255, 255, 0.76)';
    canvasRoundRect(ctx, L.actionAreaX, L.actionAreaY, L.actionAreaW, L.actionAreaH, L.spec.actionAreaRadius);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 179, 71, 0.18)';
    ctx.lineWidth = 1;
    canvasRoundRect(ctx, L.actionAreaX, L.actionAreaY, L.actionAreaW, L.actionAreaH, L.spec.actionAreaRadius);
    ctx.stroke();
    this._drawDualPanels(ctx, L, homeSnapshot);

    this._commitmentSlots = L.commitmentSlots;
    const commitments = this._goalManager ? this._goalManager.getTodayCommitments() : [];
    this._commitmentSlots.forEach((slot, i) => {
      const commit = commitments[i];
      const pressScale =
        this._taskPress && this._taskPress.index === i ? this._taskPress.scale : 1;
      const sx = slot.x + slot.w / 2;
      const sy = slot.y + slot.h / 2;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.scale(pressScale, pressScale);
      ctx.translate(-sx, -sy);
      if (commit) {
        this._drawCommitmentCard(ctx, slot, commit, i);
      } else {
        this._drawEmptySlot(ctx, slot, i);
      }
      ctx.restore();
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
    if (this._slotPulse) {
      this._slotPulse.ttl -= 1;
      if (this._slotPulse.ttl <= 0) this._slotPulse = null;
    }

    this.goalPicker.render(ctx, canvasWidth, canvasHeight);
    this._drawOverlay(ctx, canvasWidth, canvasHeight);
  }

  _drawDualPanels(ctx, L, homeSnapshot) {
    const inset = L.spec.actionInset;
    const gap = 8;
    const panelY = L.actionAreaY + 8;
    const panelH = Math.max(44, L.actionHeaderH - 12);
    const panelW = (L.actionAreaW - inset * 2 - gap) / 2;
    const leftRect = { x: L.actionAreaX + inset, y: panelY, w: panelW, h: panelH };
    const rightRect = { x: leftRect.x + panelW + gap, y: panelY, w: panelW, h: panelH };

    const growthData = homeSnapshot && homeSnapshot.growth ? homeSnapshot.growth : null;
    const socialData = homeSnapshot && homeSnapshot.social ? homeSnapshot.social : null;
    const inboxData = homeSnapshot && homeSnapshot.inbox ? homeSnapshot.inbox : null;

    this._growthPanel.render(ctx, leftRect, growthData);
    this._socialPulsePanel.render(ctx, rightRect, socialData, inboxData);
    this._hits.growthPanel = leftRect;
    this._hits.socialPanel = rightRect;
    this._drawLatestMoment(ctx, L, homeSnapshot && homeSnapshot.latestMoment);
  }

  _openGrowthPanelSheet() {
    const snapshot = this.game && typeof this.game.getHomeSnapshot === 'function'
      ? this.game.getHomeSnapshot()
      : null;
    const growth = snapshot && snapshot.growth ? snapshot.growth : null;
    const items = [
      `等级 Lv.${growth ? growth.level : 1}`,
      `今日完成 ${growth ? growth.completedCount : 0}/${growth ? growth.commitmentCount : 0}`,
      `心情 ${growth ? growth.moodLabel : '平稳'} ${growth ? growth.moodValue : 60}%`,
    ];
    if (this.game && typeof this.game.trackUiEvent === 'function') {
      this.game.trackUiEvent('open_growth_panel', {});
    }
    this._openOverlay('成长详情', items, 'growth');
  }

  _openSocialPanelSheet() {
    const snapshot = this.game && typeof this.game.getHomeSnapshot === 'function'
      ? this.game.getHomeSnapshot()
      : null;
    const lines = this._buildSocialOverlayItems(snapshot);
    if (this.game && typeof this.game.markInboxAsRead === 'function') {
      this.game.markInboxAsRead();
    }
    if (this.game && typeof this.game.trackUiEvent === 'function') {
      this.game.trackUiEvent('open_social_panel', {
        feedCount: social ? social.feedCount : 0,
        unread: inbox ? inbox.unreadCount : 0,
      });
    }
    this._openOverlay('好友脉冲', lines, 'social');
  }

  _openInboxOverlay() {
    const snapshot = this.game && typeof this.game.getHomeSnapshot === 'function'
      ? this.game.getHomeSnapshot()
      : null;
    const lines = this._buildInboxOverlayItems(snapshot);
    if (this.game && typeof this.game.trackUiEvent === 'function') {
      const inbox = snapshot && snapshot.inbox ? snapshot.inbox : null;
      this.game.trackUiEvent('open_inbox_overlay', {
        cheerCount: inbox && Array.isArray(inbox.cheerItems) ? inbox.cheerItems.length : 0,
        visitCount: inbox && Array.isArray(inbox.visitItems) ? inbox.visitItems.length : 0,
      });
    }
    this._openOverlay('收件箱', lines, 'inbox');
  }

  _buildSocialOverlayItems(snapshot) {
    const social = snapshot && snapshot.social ? snapshot.social : null;
    const inbox = snapshot && snapshot.inbox ? snapshot.inbox : null;
    const feedItems = social && Array.isArray(social.feedItems) ? social.feedItems : [];
    const base = [
      `关注 ${social ? social.followingCount : 0} 人`,
      `动态 ${social ? social.feedCount : 0} 条`,
      `收件箱 ${inbox ? inbox.unreadCount : 0} 条`,
    ];
    const viewInbox = [{ label: '查看收件箱详情', action: 'open_inbox' }];
    const dedupFeed = [];
    const seenFeed = {};
    for (let i = 0; i < feedItems.length; i += 1) {
      const item = feedItems[i];
      const key = `${item.hostOpenId || ''}:${item.summary || ''}`;
      if (seenFeed[key]) continue;
      seenFeed[key] = true;
      dedupFeed.push(item);
      if (dedupFeed.length >= 6) break;
    }
    const feedTop = dedupFeed.map((item) => ({
      label: `${item.nickName}：${item.summary}`,
      action: 'visit',
      target: item,
      id: item.id || '',
      handled: item.id && this.game && typeof this.game.isInboxItemHandled === 'function'
        ? this.game.isInboxItemHandled(item.id)
        : false,
    }));
    const inboxItems = [];
    if (inbox && Array.isArray(inbox.cheerItems) && inbox.cheerItems[0]) {
      inboxItems.push(`加油：${inbox.cheerItems[0].nickName}`);
    }
    if (inbox && Array.isArray(inbox.visitItems) && inbox.visitItems[0]) {
      inboxItems.push(`来访：${inbox.visitItems[0].nickName}`);
    }
    return base.concat(viewInbox).concat(feedTop).concat(inboxItems);
  }

  _buildInboxOverlayItems(snapshot) {
    const inbox = snapshot && snapshot.inbox ? snapshot.inbox : null;
    const cheer = inbox && Array.isArray(inbox.cheerItems) ? inbox.cheerItems : [];
    const visit = inbox && Array.isArray(inbox.visitItems) ? inbox.visitItems : [];
    const dedupCheer = [];
    const seenCheer = {};
    for (let i = 0; i < cheer.length; i += 1) {
      const item = cheer[i];
      const key = item.fromOpenId || item.id || `${item.nickName || ''}:${item.createdAt || ''}`;
      if (seenCheer[key]) continue;
      seenCheer[key] = true;
      dedupCheer.push(item);
      if (dedupCheer.length >= 4) break;
    }
    const dedupVisit = [];
    const seenVisit = {};
    for (let i = 0; i < visit.length; i += 1) {
      const item = visit[i];
      const key = item.visitorOpenId || item.id || `${item.nickName || ''}:${item.createdAt || ''}`;
      if (seenVisit[key]) continue;
      seenVisit[key] = true;
      dedupVisit.push(item);
      if (dedupVisit.length >= 4) break;
    }
    const lines = [
      { label: '--- 收到加油 ---', kind: 'header' },
    ]
      .concat(dedupCheer.map((item) => ({
        label: `${item.nickName} 给你加油了`,
        action: 'cheer_back',
        target: { hostOpenId: item.fromOpenId || '' },
        id: item.id || '',
        handled: item.id && this.game && typeof this.game.isInboxItemHandled === 'function'
          ? this.game.isInboxItemHandled(item.id)
          : false,
      })))
      .concat([{ label: '--- 来访记录 ---', kind: 'header' }])
      .concat(dedupVisit.map((item) => ({
        label: `${item.nickName} 来看你了`,
        action: 'visit_back',
        target: { hostOpenId: item.visitorOpenId || '' },
        id: item.id || '',
        handled: item.id && this.game && typeof this.game.isInboxItemHandled === 'function'
          ? this.game.isInboxItemHandled(item.id)
          : false,
      })));
    return lines;
  }

  _openOverlay(title, items, mode) {
    this._overlay.visible = true;
    this._overlay.title = title || '详情';
    this._overlay.allItems = Array.isArray(items) ? this._sortOverlayItems(items, mode || 'default') : [];
    this._overlay.mode = mode || 'default';
    this._overlay.layout = null;
    this._overlay.page = 0;
    this._overlay.busyItemId = '';
    this._syncOverlayPageItems();
  }

  _closeOverlay() {
    this._overlay.visible = false;
    this._overlay.items = [];
    this._overlay.allItems = [];
    this._overlay.layout = null;
    this._overlay.page = 0;
    this._overlay.busyItemId = '';
  }

  _syncOverlayPageItems() {
    const pageSize = this._overlay.pageSize || 8;
    const all = this._overlay.allItems || [];
    const maxPage = Math.max(0, Math.ceil(all.length / pageSize) - 1);
    this._overlay.page = Math.max(0, Math.min(this._overlay.page, maxPage));
    const start = this._overlay.page * pageSize;
    this._overlay.items = all.slice(start, start + pageSize);
  }

  _sortOverlayItems(items, mode) {
    if (!Array.isArray(items)) return [];
    if (mode !== 'social' && mode !== 'inbox') return items.slice(0);
    const arr = items.slice(0);
    arr.sort((a, b) => {
      const aHeader = a && a.kind === 'header' ? 1 : 0;
      const bHeader = b && b.kind === 'header' ? 1 : 0;
      if (aHeader !== bHeader) return bHeader - aHeader;
      const aHandled = a && a.handled ? 1 : 0;
      const bHandled = b && b.handled ? 1 : 0;
      if (aHandled !== bHandled) return aHandled - bHandled;
      return 0;
    });
    return arr;
  }

  _handleOverlayTap(x, y) {
    const layout = this._overlay.layout;
    if (!layout) {
      this._closeOverlay();
      return;
    }
    const inPanel = x >= layout.panel.x && x <= layout.panel.x + layout.panel.w && y >= layout.panel.y && y <= layout.panel.y + layout.panel.h;
    if (!inPanel) {
      this._closeOverlay();
      return;
    }
    if (x >= layout.close.x && x <= layout.close.x + layout.close.w && y >= layout.close.y && y <= layout.close.y + layout.close.h) {
      this._closeOverlay();
      return;
    }
    if (layout.prev && x >= layout.prev.x && x <= layout.prev.x + layout.prev.w && y >= layout.prev.y && y <= layout.prev.y + layout.prev.h) {
      this._overlay.page -= 1;
      this._syncOverlayPageItems();
      return;
    }
    if (layout.next && x >= layout.next.x && x <= layout.next.x + layout.next.w && y >= layout.next.y && y <= layout.next.y + layout.next.h) {
      this._overlay.page += 1;
      this._syncOverlayPageItems();
      return;
    }
    if (this._overlay.mode === 'social' && layout.items.length > 0) {
      const hit = layout.items.find((item) => x >= item.x && x <= item.x + item.w && y >= item.y && y <= item.y + item.h);
      if (!hit) return;
      const source = this._overlay.items[hit.index];
      if (source && source.action === 'open_inbox') {
        this._openInboxOverlay();
      } else if (source && source.action === 'visit') {
        this._openSocialActionMenu(source.target, source);
      } else if (typeof wx !== 'undefined' && wx.showToast) {
        wx.showToast({ title: '已记录回访入口', icon: 'none', duration: 1000 });
      }
    }
    if (this._overlay.mode === 'inbox' && layout.items.length > 0) {
      const hit = layout.items.find((item) => x >= item.x && x <= item.x + item.w && y >= item.y && y <= item.y + item.h);
      if (!hit) return;
      const source = this._overlay.items[hit.index];
      if (!source || source.kind === 'header') return;
      this._openSocialActionMenu(source.target, source);
    }
  }

  _openSocialActionMenu(target, sourceItem) {
    if (!target || !target.hostOpenId) {
      if (typeof wx !== 'undefined' && wx.showToast) {
        wx.showToast({ title: '目标暂不可用', icon: 'none', duration: 1000 });
      }
      return;
    }
    if (sourceItem && sourceItem.handled) {
      if (typeof wx !== 'undefined' && wx.showToast) {
        wx.showToast({ title: '该条已处理', icon: 'none', duration: 1000 });
      }
      return;
    }
    if (sourceItem && sourceItem.busy) return;
    if (this._isActionThrottled(target, sourceItem && sourceItem.action)) {
      if (typeof wx !== 'undefined' && wx.showToast) {
        wx.showToast({ title: '操作太快，稍后再试', icon: 'none', duration: 900 });
      }
      return;
    }
    if (typeof wx === 'undefined' || !wx.showActionSheet) {
      this._triggerVisitAction(target, sourceItem);
      return;
    }
    wx.showActionSheet({
      itemList: ['发起来访互动', '给Ta加油'],
      success: (res) => {
        if (res.tapIndex === 0) {
          if (this.game && typeof this.game.trackUiEvent === 'function') {
            this.game.trackUiEvent('social_action_select', { action: 'visit' });
          }
          this._triggerVisitAction(target, sourceItem);
        } else if (res.tapIndex === 1) {
          if (this.game && typeof this.game.trackUiEvent === 'function') {
            this.game.trackUiEvent('social_action_select', { action: 'cheer' });
          }
          this._triggerCheerAction(target, sourceItem);
        }
      },
    });
  }

  _triggerVisitAction(target, sourceItem) {
    if (!this.game || typeof this.game.triggerQuickVisit !== 'function') return;
    this._setSourceBusy(sourceItem, true);
    this.game.triggerQuickVisit(target).then((res) => {
      if (typeof wx !== 'undefined' && wx.showToast) {
        wx.showToast({
          title: res && res.success ? '已发起来访' : this._getActionErrorMessage(res, 'visit'),
          icon: 'none',
          duration: 1200,
        });
      }
      if (res && res.success && sourceItem) {
        this._markSourceHandled(sourceItem);
      } else if (sourceItem) {
        sourceItem.lastError = this._getActionErrorMessage(res, 'visit');
      }
      if (this.game && typeof this.game.trackUiEvent === 'function') {
        this.game.trackUiEvent('social_action_result', { action: 'visit', success: Boolean(res && res.success), code: res && res.code });
      }
    }).finally(() => {
      this._setSourceBusy(sourceItem, false);
      this._refreshOverlayFromSnapshot();
    });
  }

  _triggerCheerAction(target, sourceItem) {
    if (!this.game || typeof this.game.triggerQuickCheer !== 'function') return;
    this._setSourceBusy(sourceItem, true);
    this.game.triggerQuickCheer(target).then((res) => {
      if (typeof wx !== 'undefined' && wx.showToast) {
        wx.showToast({
          title: res && res.success ? '已送出加油' : this._getActionErrorMessage(res, 'cheer'),
          icon: 'none',
          duration: 1200,
        });
      }
      if (res && res.success && sourceItem) {
        this._markSourceHandled(sourceItem);
      } else if (sourceItem) {
        sourceItem.lastError = this._getActionErrorMessage(res, 'cheer');
      }
      if (this.game && typeof this.game.trackUiEvent === 'function') {
        this.game.trackUiEvent('social_action_result', { action: 'cheer', success: Boolean(res && res.success), code: res && res.code });
      }
    }).finally(() => {
      this._setSourceBusy(sourceItem, false);
      this._refreshOverlayFromSnapshot();
    });
  }

  _setSourceBusy(sourceItem, busy) {
    if (!sourceItem) return;
    sourceItem.busy = Boolean(busy);
    if (sourceItem.id) {
      this._overlay.busyItemId = busy ? sourceItem.id : '';
      for (let i = 0; i < this._overlay.allItems.length; i += 1) {
        const item = this._overlay.allItems[i];
        if (item && item.id === sourceItem.id) item.busy = Boolean(busy);
      }
      this._syncOverlayPageItems();
    }
  }

  _isActionThrottled(target, action) {
    const actionName = action || 'visit';
    const hostId = target && target.hostOpenId ? target.hostOpenId : '';
    if (!hostId) return false;
    const key = `${actionName}:${hostId}`;
    const now = Date.now();
    const last = this._actionThrottle[key] || 0;
    if (now - last < 1500) {
      return true;
    }
    this._actionThrottle[key] = now;
    return false;
  }

  _markSourceHandled(sourceItem) {
    sourceItem.handled = true;
    sourceItem.lastError = '';
    if (sourceItem.id && this.game && typeof this.game.markInboxItemHandled === 'function') {
      this.game.markInboxItemHandled(sourceItem.id);
    }
    if (sourceItem.id && Array.isArray(this._overlay.allItems)) {
      for (let i = 0; i < this._overlay.allItems.length; i += 1) {
        const item = this._overlay.allItems[i];
        if (item && item.id === sourceItem.id) {
          item.handled = true;
        }
      }
      this._overlay.allItems = this._sortOverlayItems(this._overlay.allItems, this._overlay.mode);
      this._syncOverlayPageItems();
    }
  }

  _refreshOverlayFromSnapshot() {
    if (!this._overlay.visible) return;
    const snapshot = this.game && typeof this.game.getHomeSnapshot === 'function'
      ? this.game.getHomeSnapshot()
      : null;
    let nextItems = null;
    if (this._overlay.mode === 'social') {
      nextItems = this._buildSocialOverlayItems(snapshot);
    } else if (this._overlay.mode === 'inbox') {
      nextItems = this._buildInboxOverlayItems(snapshot);
    } else {
      return;
    }
    if (Array.isArray(nextItems)) {
      this._overlay.allItems = this._sortOverlayItems(nextItems, this._overlay.mode);
      this._syncOverlayPageItems();
    }
  }

  _getActionErrorMessage(res, actionType) {
    const code = res && res.code ? String(res.code) : '';
    if (code === 'RATE_LIMITED') return '操作太频繁，稍后再试';
    if (code === 'NOT_FOLLOWING') return '先关注对方再加油';
    if (code === 'NO_TARGET') return '目标暂不可用';
    if (code === 'NETWORK_ERROR' || code === 'CALL_FAIL') return '网络波动，请稍后重试';
    if (actionType === 'cheer') return '加油失败，请稍后重试';
    return '来访暂不可用';
  }

  _drawOverlay(ctx, canvasWidth, canvasHeight) {
    if (!this._overlay.visible) return;
    const panelW = Math.min(320, canvasWidth - 40);
    const panelH = Math.min(300, canvasHeight - 120);
    const panelX = (canvasWidth - panelW) / 2;
    const panelY = (canvasHeight - panelH) / 2;

    ctx.save();
    ctx.fillStyle = 'rgba(20, 20, 20, 0.35)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
    canvasRoundRect(ctx, panelX, panelY, panelW, panelH, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 179, 71, 0.28)';
    ctx.lineWidth = 1;
    canvasRoundRect(ctx, panelX, panelY, panelW, panelH, 14);
    ctx.stroke();

    ctx.fillStyle = '#5B4A3A';
    ctx.font = '700 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(this._overlay.title, panelX + 14, panelY + 22);

    const closeRect = { x: panelX + panelW - 42, y: panelY + 8, w: 32, h: 24 };
    ctx.fillStyle = 'rgba(255, 179, 71, 0.2)';
    canvasRoundRect(ctx, closeRect.x, closeRect.y, closeRect.w, closeRect.h, 8);
    ctx.fill();
    ctx.fillStyle = '#8B4500';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('关闭', closeRect.x + closeRect.w / 2, closeRect.y + 16);

    const items = this._overlay.items || [];
    const itemRects = [];
    let y = panelY + 40;
    const footerY = panelY + panelH - 30;
    for (let i = 0; i < items.length; i += 1) {
      if (y + 28 > footerY - 4) break;
      const itemRect = { x: panelX + 12, y, w: panelW - 24, h: 24, index: i };
      itemRects.push(itemRect);
      const item = items[i];
      const isHeader = item && typeof item === 'object' && item.kind === 'header';
      const handled = item && typeof item === 'object' && item.handled;
      const busy = item && typeof item === 'object' && item.busy;
      const failed = item && typeof item === 'object' && item.lastError;
      ctx.fillStyle = isHeader
        ? 'rgba(255, 239, 209, 0.36)'
        : this._overlay.mode === 'social'
          ? (handled ? 'rgba(143, 214, 163, 0.1)' : (failed ? 'rgba(255, 155, 155, 0.18)' : 'rgba(143, 214, 163, 0.18)'))
          : (handled ? 'rgba(255, 214, 107, 0.1)' : (failed ? 'rgba(255, 155, 155, 0.18)' : 'rgba(255, 214, 107, 0.16)'));
      canvasRoundRect(ctx, itemRect.x, itemRect.y, itemRect.w, itemRect.h, 8);
      ctx.fill();
      ctx.fillStyle = '#5B4A3A';
      ctx.font = isHeader ? '700 11px sans-serif' : '11px sans-serif';
      ctx.textAlign = 'left';
      const line = typeof item === 'object' && item && item.label ? item.label : String(item || '');
      let finalLine = line;
      if (handled) finalLine = `已处理 · ${line}`;
      else if (busy) finalLine = `处理中 · ${line}`;
      else if (failed) finalLine = `失败可重试 · ${line}`;
      const text = finalLine.length > 30 ? `${finalLine.slice(0, 30)}…` : finalLine;
      ctx.fillText(text, itemRect.x + 8, itemRect.y + 16);
      y += 30;
    }
    const pageSize = this._overlay.pageSize || 8;
    const totalPages = Math.max(1, Math.ceil((this._overlay.allItems || []).length / pageSize));
    const currentPage = (this._overlay.page || 0) + 1;
    const prevRect = { x: panelX + 12, y: footerY, w: 64, h: 20 };
    const nextRect = { x: panelX + panelW - 76, y: footerY, w: 64, h: 20 };
    ctx.fillStyle = 'rgba(255, 214, 107, 0.2)';
    canvasRoundRect(ctx, prevRect.x, prevRect.y, prevRect.w, prevRect.h, 8);
    ctx.fill();
    canvasRoundRect(ctx, nextRect.x, nextRect.y, nextRect.w, nextRect.h, 8);
    ctx.fill();
    ctx.fillStyle = '#8B4500';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('上一页', prevRect.x + prevRect.w / 2, prevRect.y + 13);
    ctx.fillText('下一页', nextRect.x + nextRect.w / 2, nextRect.y + 13);
    ctx.fillText(`${currentPage}/${totalPages}`, panelX + panelW / 2, footerY + 13);
    ctx.restore();

    this._overlay.layout = {
      panel: { x: panelX, y: panelY, w: panelW, h: panelH },
      close: closeRect,
      items: itemRects,
      prev: prevRect,
      next: nextRect,
    };
  }

  _drawLatestMoment(ctx, L, moment) {
    this._hits.shareMoment = null;
    if (!moment || !moment.summary) return;
    const text = String(moment.summary);
    const short = text.length > 22 ? `${text.slice(0, 22)}…` : text;
    const x = L.actionAreaX + L.spec.actionInset;
    const y = L.actionAreaY + L.actionHeaderH + 2;
    ctx.save();
    ctx.fillStyle = UI.textMuted;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(short, x, y);
    const btnW = 46;
    const btnH = 16;
    const btnX = L.actionAreaX + L.actionAreaW - L.spec.actionInset - btnW;
    const btnY = y - 11;
    ctx.fillStyle = 'rgba(143,214,163,0.22)';
    canvasRoundRect(ctx, btnX, btnY, btnW, btnH, 8);
    ctx.fill();
    ctx.fillStyle = '#5B4A3A';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('分享', btnX + btnW / 2, btnY + 11);
    this._hits.shareMoment = { x: btnX, y: btnY, w: btnW, h: btnH };
    ctx.restore();
  }

  _triggerShareMoment() {
    if (!this.game || typeof this.game.triggerShareFromMoment !== 'function') return;
    this.game.triggerShareFromMoment().then((res) => {
      if (typeof wx !== 'undefined' && wx.showToast) {
        wx.showToast({
          title: res && res.success ? '已打开分享' : '分享暂不可用',
          icon: 'none',
          duration: 1200,
        });
      }
    });
  }

  _spawnGoalConsumeFx(slotIndex, commit, visualFx) {
    if (!this._commitmentSlots || !this._commitmentSlots[slotIndex]) return;
    const slot = this._commitmentSlots[slotIndex];
    const ttl = 52;
    const fx = {
      goalId: commit && commit.goalId,
      title: (commit && commit.goal && commit.goal.name) || '目标',
      icon: (commit && commit.goal && commit.goal.icon) || '🎯',
      xp: visualFx && visualFx.xp ? visualFx.xp : 0,
      moodBoost: visualFx && visualFx.moodBoost ? visualFx.moodBoost : 0,
      crit: Boolean(visualFx && visualFx.crit),
      critBonus: visualFx && visualFx.critBonus ? visualFx.critBonus : 0,
      leveledUp: Boolean(visualFx && visualFx.leveledUp),
      majorEvolution: Boolean(visualFx && visualFx.majorEvolution),
      level: visualFx && visualFx.level ? visualFx.level : null,
      t: 0,
      ttl: 62,
      x: slot.x + slot.w / 2,
      y: slot.y + slot.h / 2,
      startW: slot.w,
      startH: slot.h,
      done: false,
    };
    this._goalConsumeFx.push(fx);
  }

  _cancelGoalConsumeFx(goalId) {
    if (!goalId) return;
    this._goalConsumeFx = this._goalConsumeFx.filter((fx) => fx.goalId !== goalId);
  }

  _updateGoalConsumeFx() {
    if (!this._goalConsumeFx.length) return;
    const alive = [];
    this._goalConsumeFx.forEach((fx) => {
      fx.t += 1;
      if (fx.t <= fx.ttl + 30) alive.push(fx);
      if (!fx.done && fx.t >= fx.ttl) {
        fx.done = true;
        if (this.lulu && typeof this.lulu.onGoalConsumed === 'function') {
          this.lulu.onGoalConsumed();
        }
        this._levelUpFx = {
          ttl: fx.majorEvolution ? 92 : 58,
          t: 0,
          text: fx.majorEvolution ? `Lv.${fx.level} 变身进化!` : fx.leveledUp ? `Lv.${fx.level} 升级!` : '',
          major: fx.majorEvolution,
        };
      }
    });
    this._goalConsumeFx = alive;
    if (this._levelUpFx) {
      this._levelUpFx.t += 1;
      if (this._levelUpFx.t > this._levelUpFx.ttl) this._levelUpFx = null;
    }
  }

  _drawGoalConsumeFx(ctx, L) {
    if (!this._goalConsumeFx.length && !this._levelUpFx) return;
    const targetX = L.petCardX + L.petCardW * 0.52;
    const targetY = L.petCardY + L.petCardH * 0.62;
    this._goalConsumeFx.forEach((fx) => {
      const p = Math.min(1, fx.t / fx.ttl);
      const ease = 1 - Math.pow(1 - p, 3);
      const rise = Math.sin(ease * Math.PI) * 48;
      const x = fx.x + (targetX - fx.x) * ease;
      const y = fx.y + (targetY - fx.y) * ease - rise;
      const cardW = Math.max(26, fx.startW * (1 - ease * 0.72));
      const cardH = Math.max(18, fx.startH * (1 - ease * 0.76));
      const rot = (1 - ease) * 0.18 + Math.sin(fx.t * 0.2) * 0.04;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.globalAlpha = 1 - Math.max(0, (fx.t - fx.ttl) / 30);
      ctx.fillStyle = 'rgba(255,255,255,0.96)';
      canvasRoundRect(ctx, -cardW / 2, -cardH / 2, cardW, cardH, Math.max(6, cardH * 0.24));
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,179,71,0.45)';
      ctx.lineWidth = 1.2;
      canvasRoundRect(ctx, -cardW / 2, -cardH / 2, cardW, cardH, Math.max(6, cardH * 0.24));
      ctx.stroke();
      ctx.fillStyle = '#5B4A3A';
      ctx.font = `${Math.max(9, Math.floor(cardH * 0.34))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(fx.icon, 0, -cardH * 0.05);
      if (cardW > 44) {
        const title = fx.title.length > 5 ? `${fx.title.slice(0, 5)}…` : fx.title;
        ctx.font = `${Math.max(8, Math.floor(cardH * 0.28))}px sans-serif`;
        ctx.fillStyle = '#8A7765';
        ctx.fillText(title, 0, cardH * 0.27);
      }
      ctx.restore();

      // 吸入轨迹粒子
      if (fx.t > fx.ttl * 0.5) {
        const spark = 2 + (1 - ease) * 2;
        ctx.save();
        ctx.fillStyle = 'rgba(255,196,96,0.7)';
        for (let i = 0; i < 3; i++) {
          const sx = x + Math.cos(fx.t * 0.24 + i * 2.1) * (10 + i * 4) * (1 - ease);
          const sy = y + Math.sin(fx.t * 0.22 + i * 1.8) * (7 + i * 3) * (1 - ease);
          ctx.beginPath();
          ctx.arc(sx, sy, spark * (1 - i * 0.2), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (p >= 1) {
        const fade = Math.max(0, 1 - (fx.t - fx.ttl) / 30);
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.fillStyle = '#8B4500';
        ctx.font = '700 12px sans-serif';
        ctx.textAlign = 'center';
        const critBit = fx.crit && fx.critBonus ? ` 暴击+${fx.critBonus}` : '';
        ctx.fillText(`+${fx.xp}XP  +${fx.moodBoost}心情${critBit}`, targetX, targetY - 30 - (fx.t - fx.ttl) * 1.2);
        ctx.restore();
      }
    });

    if (this._levelUpFx) {
      const p = this._levelUpFx.t / this._levelUpFx.ttl;
      const alpha = Math.sin(Math.min(1, p) * Math.PI);
      const pulse = 1 + Math.sin(p * Math.PI * (this._levelUpFx.major ? 6 : 4)) * (this._levelUpFx.major ? 0.16 : 0.1);
      const cx = L.petCardX + L.petCardW / 2;
      const cy = L.petCardY + L.petCardH / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(pulse, pulse);
      ctx.translate(-cx, -cy);
      ctx.strokeStyle = this._levelUpFx.major
        ? `rgba(126, 91, 255, ${0.34 * alpha})`
        : `rgba(255, 209, 102, ${0.4 * alpha})`;
      ctx.lineWidth = this._levelUpFx.major ? 5 : 4;
      canvasRoundRect(ctx, L.petCardX - 5, L.petCardY - 5, L.petCardW + 10, L.petCardH + 10, L.spec.petCardRadius + 6);
      ctx.stroke();
      ctx.restore();

      if (this._levelUpFx.text) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this._levelUpFx.major ? '#6E47FF' : '#C97800';
        ctx.font = this._levelUpFx.major ? '900 18px sans-serif' : '800 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this._levelUpFx.text, cx, L.petCardY + 16);
        ctx.restore();
      }
    }
  }

  _drawCommitmentCard(ctx, slot, commit, slotIndex) {
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

    const canUndo = isDone && this._canUndoGoal && this._canUndoGoal(commit.goalId);
    ctx.fillStyle = isDone ? UI.completed : UI.accent;
    ctx.font = '600 11px sans-serif';
    ctx.fillText(isDone ? (canUndo ? '✓ 已完成(可撤销)' : '✓ 已完成') : `预计 +${previewXp} XP`, cx + 20, slot.y + 71);

    if (this._slotPulse && this._slotPulse.index === slotIndex && this._slotPulse.ttl > 0) {
      const maxT = this._slotPulse.kind === 'undo' ? 26 : 32;
      const p = Math.min(1, this._slotPulse.ttl / maxT);
      const warm = this._slotPulse.kind === 'undo';
      ctx.strokeStyle = warm
        ? `rgba(255, 179, 71, ${0.25 + p * 0.45})`
        : `rgba(111, 195, 142, ${0.3 + p * 0.5})`;
      ctx.lineWidth = 2.4 + (1 - p) * 2.2;
      canvasRoundRect(ctx, slot.x - 3, slot.y - 3, slot.w + 6, slot.h + 6, 17);
      ctx.stroke();
    }

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
    if (!wishes || wishes.length === 0) return;
    // 只显示一个主心愿，避免同屏多气泡造成“文案重复”
    const primaryWish = wishes[0];
    const text = String(primaryWish.wishText || '').trim();
    if (!text) return;
    const bx = L.petCardX + L.petCardW / 2;
    const by = L.petCardY + 58;
    const bubbleW = Math.min(280, L.petCardW * 0.82);
    const bubbleH = 46;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.shadowColor = 'rgba(0,0,0,0.1)';
    ctx.shadowBlur = 10;
    canvasRoundRect(ctx, bx - bubbleW / 2, by - bubbleH / 2, bubbleW, bubbleH, 24);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(220, 212, 196, 0.75)';
    ctx.lineWidth = 1;
    canvasRoundRect(ctx, bx - bubbleW / 2, by - bubbleH / 2, bubbleW, bubbleH, 24);
    ctx.stroke();
    ctx.font = '600 17px sans-serif';
    ctx.fillStyle = '#5D4E37';
    ctx.textAlign = 'center';
    ctx.fillText(text.slice(0, 14), bx, by + 6);
    ctx.restore();
  }

  _triggerBackgroundRipple() {
    this._petBackground.onPetTap();
  }

  _updateBackgroundFx(L, level, mood, moodLabel) {
    this._bgContext = { level, moodValue: mood, moodLabel };
  }

  _drawPetBackground(ctx, L, level) {
    const rect = { x: L.petCardX, y: L.petCardY, w: L.petCardW, h: L.petCardH };
    const context = this._bgContext || { level, moodValue: 60, moodLabel: '平稳' };
    this._petBackground.draw(ctx, rect, context);
    if (this.lulu && typeof this.lulu.setPose === 'function') {
      this.lulu.setPose(this._petBackground.getPose());
    }
  }

  _drawDailyStatusStrip(ctx, L, growth) {
    const level = growth && Number.isFinite(growth.level) ? growth.level : 1;
    const warmth = Math.max(0, Math.min(1, (level - 1) / 15));
    const bgBlue = 250 - Math.round(warmth * 18);
    const borderBlue = 210 - Math.round(warmth * 22);
    const stripH = 26;
    const stripW = Math.min(L.petCardW, L.actionAreaW);
    const stripX = (L.petCardX + L.petCardW / 2) - stripW / 2;
    const gapTop = L.petCardY + L.petCardH;
    const gapBottom = L.actionAreaY;
    const minTopPadding = 6;
    const minBottomPadding = 6;
    const defaultY = gapTop + 10;
    const maxY = gapBottom - stripH - minBottomPadding;
    const minY = gapTop + minTopPadding;
    const stripY = Math.max(minY, Math.min(defaultY, maxY));
    const commitments = this._goalManager ? this._goalManager.getTodayCommitments() : [];
    const doneCount = commitments.filter(c => c.completed).length;
    const totalCount = commitments.length;
    const remainingXp = Math.max(0, growth.getXpForNextLevel() - growth.xp);

    ctx.fillStyle = `rgba(255, 255, ${bgBlue}, 0.82)`;
    canvasRoundRect(ctx, stripX, stripY, stripW, stripH, 12);
    ctx.fill();
    ctx.strokeStyle = `rgba(255, 179, ${borderBlue}, 0.24)`;
    ctx.lineWidth = 1;
    canvasRoundRect(ctx, stripX, stripY, stripW, stripH, 12);
    ctx.stroke();

    const chunk = stripW / 2;
    ctx.fillStyle = UI.textMuted;
    ctx.font = '600 10.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`今日 ${doneCount}/${totalCount}`, stripX + chunk * 0.5, stripY + 17);
    ctx.fillText(`距升级 ${remainingXp}XP`, stripX + chunk * 1.5, stripY + 17);
  }
}

module.exports = HomePage;
