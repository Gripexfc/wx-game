const { COLORS } = require('../../utils/constants');
const { canvasRoundRect } = require('../utils/canvas');
const BannerAdManager = require('../ads/BannerAdManager');
const { getTaskPageCopy, getTaskPageLayoutSpec } = require('./pageLayoutSpec');

// 游戏常量
const CARD_RADIUS = 18; // 卡片圆角

class TaskPage {
  constructor(game) {
    this.game = game;
    this.taskButtons = [];
    this._banner = BannerAdManager.getInstance();
  }

  // 绘制
  render(ctx, canvasWidth, canvasHeight) {
    this._banner.hide();
    this.taskButtons = [];
    const duckName = this.game.getLuluName ? this.game.getLuluName() : '小鸭';
    const copy = getTaskPageCopy(duckName);
    const layout = getTaskPageLayoutSpec(canvasWidth, canvasHeight);
    const taskManager = this.game.taskManager;
    const tasks = taskManager.getTodayTasks();
    const completedCount = tasks.filter((task) => task.completed).length;
    const totalCount = tasks.length;
    const totalXp = taskManager.getTotalXp();

    // 背景
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, '#FFF8EE');
    gradient.addColorStop(0.58, '#FFF4E8');
    gradient.addColorStop(1, '#FFFBF6');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 返回按钮
    ctx.fillStyle = COLORS.TEXT_SECONDARY;
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('< 返回', layout.horizontalPadding, layout.topPadding + 18);

    // 标题与摘要
    ctx.fillStyle = '#5B4A3A';
    ctx.font = '700 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(copy.title, canvasWidth / 2, layout.topPadding + 28);
    ctx.fillStyle = '#8A7765';
    ctx.font = '13px sans-serif';
    ctx.fillText(copy.summary, canvasWidth / 2, layout.topPadding + 52);

    // 摘要卡
    const summaryX = layout.horizontalPadding;
    const summaryY = layout.topPadding + layout.headerHeight - layout.summaryCardHeight;
    const summaryW = canvasWidth - layout.horizontalPadding * 2;
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    canvasRoundRect(ctx, summaryX, summaryY, summaryW, layout.summaryCardHeight, CARD_RADIUS);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 179, 71, 0.22)';
    ctx.lineWidth = 1.5;
    canvasRoundRect(ctx, summaryX, summaryY, summaryW, layout.summaryCardHeight, CARD_RADIUS);
    ctx.stroke();

    ctx.fillStyle = '#8A7765';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`今天完成了 ${completedCount}/${totalCount} 件小计划`, summaryX + 18, summaryY + 28);
    ctx.fillStyle = '#FFB347';
    ctx.font = '700 18px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`已收下 ${totalXp} XP`, summaryX + summaryW - 18, summaryY + 30);
    ctx.fillStyle = '#8A7765';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('慢一点也没关系，今天记得照顾好自己', summaryX + 18, summaryY + 50);

    // 任务列表
    let y = layout.listTop;
    for (const task of tasks) {
      this.drawTaskItem(ctx, task, canvasWidth, y, layout);
      y += layout.taskCardHeight + layout.taskCardGap;
    }

    this.drawAddButton(ctx, canvasWidth, y + 6, layout);
  }

  drawTaskItem(ctx, task, canvasWidth, y, layout) {
    const x = layout.horizontalPadding;
    const width = canvasWidth - layout.horizontalPadding * 2;
    const height = layout.taskCardHeight;
    const isPlaceholder = !!task.isPlaceholder;
    const isCustom = !!task.isCustom;
    const isDone = !!task.completed;

    // 按钮区域
    this.taskButtons.push({ x, y, width, height, task });

    // 背景
    ctx.fillStyle = isDone ? 'rgba(143, 214, 163, 0.16)' : isPlaceholder ? 'rgba(255, 214, 107, 0.16)' : '#FFF';
    canvasRoundRect(ctx, x, y, width, height, CARD_RADIUS);
    ctx.fill();

    // 边框
    ctx.strokeStyle = isDone ? COLORS.SECONDARY : isPlaceholder ? 'rgba(255, 179, 71, 0.42)' : 'rgba(224, 224, 224, 0.92)';
    ctx.lineWidth = 1.6;
    canvasRoundRect(ctx, x, y, width, height, CARD_RADIUS);
    ctx.stroke();

    // 图标
    ctx.font = '28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(task.icon, x + 36, y + 42);

    // 名称
    ctx.fillStyle = COLORS.TEXT_PRIMARY;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(isPlaceholder ? '添加今天的小计划' : task.name, x + 72, y + 30);

    // 描述
    ctx.fillStyle = COLORS.TEXT_SECONDARY;
    ctx.font = '12px sans-serif';
    let desc = task.desc;
    if (isPlaceholder) {
      desc = '写一句想完成的小事，今天陪自己慢慢做';
    } else if (isCustom) {
      desc = task.desc || '也可以随时编辑这条小计划';
    }
    ctx.fillText(desc, x + 72, y + 50);

    // 右侧状态
    if (isDone) {
      ctx.fillStyle = COLORS.SECONDARY;
      ctx.font = '700 14px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('已完成', x + width - 18, y + 31);
      ctx.font = '20px sans-serif';
      ctx.fillText('✓', x + width - 18, y + 54);
    } else if (isPlaceholder) {
      ctx.fillStyle = '#FFB347';
      ctx.font = '700 13px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('去添加', x + width - 18, y + 41);
    } else if (isCustom) {
      ctx.fillStyle = '#FFB347';
      ctx.font = '700 13px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`+${task.xp} XP`, x + width - 18, y + 31);
      ctx.fillStyle = '#8A7765';
      ctx.font = '11px sans-serif';
      ctx.fillText('可编辑', x + width - 18, y + 50);
    } else {
      ctx.fillStyle = COLORS.ACCENT;
      ctx.font = '700 13px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`+${task.xp} XP`, x + width - 18, y + 41);
    }
  }

  drawAddButton(ctx, canvasWidth, y, layout) {
    const width = canvasWidth - layout.horizontalPadding * 2;
    const height = 52;
    const x = layout.horizontalPadding;
    const hasCustom = !!this.game.taskManager.getDailyCustom();

    this.taskButtons.push({ x, y, width, height, isAddButton: true });

    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.strokeStyle = 'rgba(255, 179, 71, 0.52)';
    ctx.lineWidth = 1.8;
    canvasRoundRect(ctx, x, y, width, height, CARD_RADIUS);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFB347';
    ctx.font = '700 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(hasCustom ? '编辑今天的小计划' : '添加今天的小计划', canvasWidth / 2, y + 31);
    ctx.fillStyle = '#8A7765';
    ctx.font = '11px sans-serif';
    ctx.fillText(hasCustom ? '想改文案时再点这里' : '把今天最想做的一件事写下来', canvasWidth / 2, y + 47);
  }

  openCustomTaskEditor() {
    const tm = this.game.taskManager;
    const prev = tm.getDailyCustom() ? tm.getDailyCustom().name : '';

    const apply = (name) => {
      if (tm.setDailyCustom({ name })) {
        this.game.saveData();
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

    const openEditableModal = () => {
      if (!wx.showModal) return false;
      wx.showModal({
        title: '编辑自定义任务',
        content: prev || '',
        editable: true,
        placeholderText: '输入任务名（最多18字）',
        confirmText: '保存',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            const text = (res.content != null ? String(res.content) : '').trim();
            if (text) apply(text);
            else if (!prev) fallbackSheet();
          }
        },
        fail: () => fallbackSheet(),
      });
      return true;
    };

    if (openEditableModal()) return;

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
  }

  // 点击检测
  handleClick(x, y) {
    for (const btn of this.taskButtons) {
      if (x >= btn.x && x <= btn.x + btn.width &&
          y >= btn.y && y <= btn.y + btn.height) {
        if (btn.isAddButton) {
          // 添加/编辑自定义任务
          this.openCustomTaskEditor();
        } else if (btn.task && btn.task.isPlaceholder) {
          this.openCustomTaskEditor();
        } else if (!btn.task.completed) {
          // 完成任务
          this.game.completeGoal(btn.task.id);
        }
        return true;
      }
    }

    // 返回按钮
    if (x < 80 && y < 50) {
      this.game.currentPage = 'home';
      return true;
    }

    return false;
  }
}

module.exports = TaskPage;
