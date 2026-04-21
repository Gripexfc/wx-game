const { COLORS, TASKS } = require('../../utils/constants');
const BannerAdManager = require('../ads/BannerAdManager');

class TaskPage {
  constructor(game) {
    this.game = game;
    this.taskButtons = [];
    this._banner = BannerAdManager.getInstance();
  }

  // 绘制
  render(ctx, canvasWidth, canvasHeight) {
    this._banner.show();

    // 背景
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, COLORS.BG_START);
    gradient.addColorStop(1, COLORS.BG_END);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 标题
    ctx.fillStyle = COLORS.TEXT_PRIMARY;
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('今日任务', canvasWidth / 2, 50);

    // 返回按钮
    ctx.fillStyle = COLORS.TEXT_SECONDARY;
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('< 返回', 20, 35);

    // 今日获得 XP
    const taskManager = this.game.taskManager;
    const totalXp = taskManager.getTotalXp();
    ctx.fillStyle = COLORS.ACCENT;
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`今日可获得: ${totalXp} XP`, canvasWidth / 2, 90);

    // 任务列表
    this.taskButtons = [];
    const tasks = taskManager.getTodayTasks();
    let y = 130;

    for (const task of tasks) {
      this.drawTaskItem(ctx, task, canvasWidth, y);
      y += 70;
    }

    // 添加任务按钮
    this.drawAddButton(ctx, canvasWidth, y + 20);
  }

  drawTaskItem(ctx, task, canvasWidth, y) {
    const x = 30;
    const width = canvasWidth - 60;
    const height = 60;

    // 按钮区域
    this.taskButtons.push({ x, y, width, height, task });

    // 背景
    ctx.fillStyle = task.completed ? '#E8F5E9' : '#FFF';
    this.roundRect(ctx, x, y, width, height, 12);
    ctx.fill();

    // 边框
    ctx.strokeStyle = task.completed ? COLORS.SECONDARY : '#E0E0E0';
    ctx.lineWidth = 2;
    this.roundRect(ctx, x, y, width, height, 12);
    ctx.stroke();

    // 图标
    ctx.font = '28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(task.icon, x + 35, y + 38);

    // 名称
    ctx.fillStyle = COLORS.TEXT_PRIMARY;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(task.name, x + 70, y + 28);

    // 描述
    ctx.fillStyle = COLORS.TEXT_SECONDARY;
    ctx.font = '12px sans-serif';
    ctx.fillText(task.desc, x + 70, y + 45);

    // XP
    ctx.fillStyle = task.completed ? COLORS.SECONDARY : COLORS.ACCENT;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`+${task.xp} XP`, x + width - 20, y + 38);

    // 完成标记
    if (task.completed) {
      ctx.fillStyle = COLORS.SECONDARY;
      ctx.font = '20px sans-serif';
      ctx.fillText('✓', x + width - 50, y + 38);
    }
  }

  drawAddButton(ctx, canvasWidth, y) {
    const width = canvasWidth - 60;
    const height = 50;
    const x = 30;

    this.taskButtons.push({ x, y, width, height, isAddButton: true });

    ctx.fillStyle = '#FFF';
    ctx.strokeStyle = COLORS.ACCENT;
    ctx.lineWidth = 2;
    this.roundRect(ctx, x, y, width, height, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COLORS.ACCENT;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('+ 添加自定义任务', canvasWidth / 2, y + 32);
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
        } else if (!btn.task.completed) {
          // 完成任务
          this.game.completeTask(btn.task.id);
        }
        return true;
      }
    }

    // 返回按钮
    if (x < 80 && y < 50) {
      this.game.showHomePage();
      return true;
    }

    return false;
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

module.exports = TaskPage;
