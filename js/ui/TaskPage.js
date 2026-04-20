const { COLORS, TASKS } = require('../utils/constants');
const { canvasRoundRect } = require('../utils/canvas');

class TaskPage {
  constructor(game) {
    this.game = game;
    this.taskButtons = [];
  }

  // 绘制
  render(ctx, canvasWidth, canvasHeight) {
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
    canvasRoundRect(ctx, x, y, width, height, 12);
    ctx.fill();

    // 边框
    ctx.strokeStyle = task.completed ? COLORS.SECONDARY : '#E0E0E0';
    ctx.lineWidth = 2;
    canvasRoundRect(ctx, x, y, width, height, 12);
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
    canvasRoundRect(ctx, x, y, width, height, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COLORS.ACCENT;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('+ 添加自定义任务', canvasWidth / 2, y + 32);
  }

  // 点击检测
  handleClick(x, y) {
    for (const btn of this.taskButtons) {
      if (x >= btn.x && x <= btn.x + btn.width &&
          y >= btn.y && y <= btn.y + btn.height) {
        if (btn.isAddButton) {
          // 添加自定义任务（简化版）
          this.game.taskManager.addCustomTask({
            name: '自定义任务',
            icon: '✨',
            xp: 10,
            desc: '自定义任务描述',
          });
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
}

module.exports = TaskPage;
