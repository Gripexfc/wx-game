/**
 * 首次昵称引导页
 */
const BannerAdManager = require('../ads/BannerAdManager');
const { canvasRoundRect } = require('../utils/canvas');

class OnboardingPage {
  constructor(game) {
    this.game = game;
    this.lulu = null;
    this.inputValue = '';
    this.confirmEnabled = false;
    this._banner = BannerAdManager.getInstance();
  }

  setLulu(lulu) {
    this.lulu = lulu;
  }

  /** 触摸开始 */
  onTouchStart(x, y, canvasWidth, canvasHeight) {
    // 检测确定按钮
    const btnW = 140;
    const btnH = 46;
    const btnX = (canvasWidth - btnW) / 2;
    const btnY = canvasHeight * 0.68;
    if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
      if (this.confirmEnabled) {
        this._onConfirm();
      }
    }
  }

  /** 键盘输入（微信小游戏通过 showModal 的 editable 实现） */
  _onConfirm() {
    const name = this.inputValue.trim();
    if (!name || name.length > 10) return;

    this.game.storage.set('lulu_name', name);
    this.game.onNameSet(name);
    this._showGoalCreationGuide();
  }

  _showGoalCreationGuide() {
    if (typeof wx === 'undefined' || !wx.showActionSheet) return;
    const recs = this.game.goalManager.getRecommendations();
    const items = [...recs.map(g => `${g.icon} ${g.name}`), '稍后再说'];

    wx.showActionSheet({
      itemList: items,
      success: (res) => {
        if (res.tapIndex < recs.length) {
          const selected = recs[res.tapIndex];
          const created = this.game.goalManager.createGoal(selected);
          this.game.goalManager.commitGoal(created.id);
          if (this.lulu) {
            this.lulu.say('你的第一个目标！噜噜记住了！', 120);
          }
        }
      },
    });
  }

  /** 外部调用：设置输入值（由 main.js 通过 showModal 回调设置） */
  setInputValue(v) {
    this.inputValue = String(v || '').slice(0, 10);
    this.confirmEnabled = this.inputValue.length > 0;
  }

  /** 外部调用：打开输入弹窗 */
  promptInput() {
    if (typeof wx === 'undefined' || !wx.showModal) return;

    const game = this.game;
    wx.showModal({
      title: '给噜噜起个名字',
      editable: true,
      placeholderText: '最多10个字',
      confirmText: '确定',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          const val = (res.content != null ? String(res.content) : '').trim();
          if (val && val.length <= 10) {
            this.setInputValue(val);
            this._onConfirm();
          } else {
            // 字数超限或为空，提示重输
            wx.showToast({ title: '名字1-10个字哦', icon: 'none', duration: 1500 });
            setTimeout(() => this.promptInput(), 1600);
          }
        } else {
          // 取消也要求填写
          wx.showToast({ title: '名字不能为空哦', icon: 'none', duration: 1500 });
          setTimeout(() => this.promptInput(), 1600);
        }
      },
      fail: () => {
        // fallback：直接用默认昵称
        this.setInputValue('主人');
        this._onConfirm();
      },
    });
  }

  /** 渲染 */
  render(ctx, canvasWidth, canvasHeight) {
    // 暖色背景
    const g = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    g.addColorStop(0, '#FFF8EE');
    g.addColorStop(0.5, '#FFF5EC');
    g.addColorStop(1, '#FFFAF5');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 装饰光晕
    const glow = ctx.createRadialGradient(canvasWidth * 0.2, canvasHeight * 0.3, 10, canvasWidth * 0.2, canvasHeight * 0.3, 200);
    glow.addColorStop(0, 'rgba(255, 214, 107, 0.15)');
    glow.addColorStop(1, 'rgba(255, 214, 107, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 标题
    ctx.fillStyle = '#5B4A3A';
    ctx.font = '700 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('欢迎来到噜噜小屋', canvasWidth / 2, canvasHeight * 0.12);

    // 副标题
    ctx.fillStyle = '#8A7765';
    ctx.font = '14px sans-serif';
    ctx.fillText('给它起个名字吧', canvasWidth / 2, canvasHeight * 0.18);

    // 绘制噜噜（缩小版 idle）
    if (this.lulu) {
      this.lulu.update();
      this.lulu.drawPet(ctx, canvasWidth * 0.2, canvasHeight * 0.22, canvasWidth * 0.6, canvasHeight * 0.38);
    }

    // 输入框提示卡片
    const cardW = canvasWidth - 60;
    const cardH = 120;
    const cardX = 30;
    const cardY = canvasHeight * 0.52;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    canvasRoundRect(ctx, cardX, cardY, cardW, cardH, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 179, 71, 0.4)';
    ctx.lineWidth = 1.5;
    canvasRoundRect(ctx, cardX, cardY, cardW, cardH, 16);
    ctx.stroke();

    // 输入框占位区域（实际用 showModal）
    ctx.fillStyle = 'rgba(91, 74, 58, 0.1)';
    canvasRoundRect(ctx, cardX + 16, cardY + 20, cardW - 32, 46, 10);
    ctx.fill();
    ctx.fillStyle = 'rgba(138, 119, 101, 0.5)';
    ctx.font = '15px sans-serif';
    ctx.textAlign = 'center';
    const displayName = this.inputValue || '点击这里输入名字';
    ctx.fillText(displayName, canvasWidth / 2, cardY + 48);

    // 确定按钮
    const btnW = 140;
    const btnH = 46;
    const btnX = (canvasWidth - btnW) / 2;
    const btnY = canvasHeight * 0.68;

    const btnEnabled = this.confirmEnabled;
    ctx.fillStyle = btnEnabled ? '#FFB347' : 'rgba(255, 179, 71, 0.4)';
    canvasRoundRect(ctx, btnX, btnY, btnW, btnH, 23);
    ctx.fill();
    ctx.fillStyle = btnEnabled ? '#FFF' : 'rgba(255,255,255,0.7)';
    ctx.font = '600 16px sans-serif';
    ctx.fillText('确定', canvasWidth / 2, btnY + 29);

    // 提示文字
    ctx.fillStyle = 'rgba(138, 119, 101, 0.6)';
    ctx.font = '11px sans-serif';
    ctx.fillText('名字将在首页显示 · 最多10个字', canvasWidth / 2, canvasHeight * 0.76);

    // Banner 广告
    this._banner.show();
  }
}

module.exports = OnboardingPage;
