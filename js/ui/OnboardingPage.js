/**
 * 首次昵称引导页
 */
const BannerAdManager = require('../ads/BannerAdManager');
const { canvasRoundRect } = require('../utils/canvas');
const GoalPickerOverlay = require('./GoalPickerOverlay');
const { getOnboardingCopy, getOnboardingLayoutSpec } = require('./pageLayoutSpec');

class OnboardingPage {
  constructor(game) {
    this.game = game;
    this.lulu = null;
    this.inputValue = '';
    this.confirmEnabled = false;
    this._banner = BannerAdManager.getInstance();
    this.stage = 'naming';
    this.goalPicker = new GoalPickerOverlay(game);
    this.copy = getOnboardingCopy();
  }

  setLulu(lulu) {
    this.lulu = lulu;
  }

  /** 触摸开始 */
  onTouchStart(x, y, canvasWidth, canvasHeight) {
    if (this.stage === 'goalPicker') {
      this._handleGoalPickerAction(this.goalPicker.handleClick(x, y));
      return;
    }
    const layout = this._getLayout(canvasWidth, canvasHeight);

    // 检测确定按钮
    const btnW = layout.buttonRect.w;
    const btnH = layout.buttonRect.h;
    const btnX = layout.buttonRect.x;
    const btnY = layout.buttonRect.y;
    if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
      if (this.confirmEnabled) {
        this._onConfirm();
      } else {
        this.promptInput();
      }
      return;
    }

    const cardX = layout.namingCardX;
    const cardY = layout.namingCardY;
    const cardW = layout.namingCardW;
    const cardH = layout.namingCardH;
    if (x >= cardX && x <= cardX + cardW && y >= cardY && y <= cardY + cardH) {
      this.promptInput();
    }
  }

  /** 键盘输入（微信小游戏通过 showModal 的 editable 实现） */
  _getDuckName() {
    return this.inputValue.trim() || this.copy.defaultDuckName;
  }

  _formatCopy(template, replacements) {
    return String(template || '').replace(/\{(\w+)\}/g, (match, key) => {
      return Object.prototype.hasOwnProperty.call(replacements, key) ? replacements[key] : match;
    });
  }

  _finishOnboarding() {
    const name = this.inputValue.trim();
    if (!name) return;
    if (this.game.storage && typeof this.game.storage.set === 'function') {
      this.game.storage.set('lulu_name', name);
    }
    if (typeof this.game.onNameSet === 'function') {
      this.game.onNameSet(name);
    }
  }

  _onConfirm() {
    const name = this.inputValue.trim();
    if (!name || name.length > 10) return;
    this.stage = 'goalPicker';
    const duckName = this._getDuckName();
    this.goalPicker.open({
      title: this._formatCopy(this.copy.goalPickerTitleTemplate, { duckName }),
      subtitle: this._formatCopy(this.copy.goalPickerSubtitleTemplate, { duckName }),
      mandatory: true,
    });
  }

  _handleGoalPickerAction(action) {
    if (!action) return;
    if (action.type === 'goal' && action.goal) {
      const created = this.game.createAndCommitGoal(action.goal);
      if (!created) return;
      if (this.lulu) {
        this.lulu.say(this._formatCopy(this.copy.goalSuccessTemplate, { duckName: this._getDuckName() }), 120);
      }
      this._finishOnboarding();
      return;
    }
    if (action.type === 'custom') {
      this._promptCustomGoal();
    }
  }

  _promptCustomGoal() {
    if (typeof wx === 'undefined' || !wx.showModal) return;
    wx.showModal({
      title: this.copy.customGoalModalTitle,
      editable: true,
      placeholderText: this.copy.customGoalPlaceholder,
      confirmText: this.copy.customGoalConfirmText,
      cancelText: this.copy.customGoalCancelText,
      success: (res) => {
        if (!res.confirm) return;
        const text = String(res.content || '').trim();
        if (!text) {
          if (wx.showToast) wx.showToast({ title: this.copy.customGoalEmptyToast, icon: 'none', duration: 1400 });
          return;
        }
        const created = this.game.createAndCommitGoal({
          name: text,
          type: 'habit',
          baseXp: 15,
          icon: '✨',
          tag: '自定义',
          createdFrom: 'custom',
        });
        if (!created) return;
        if (this.lulu) {
          this.lulu.say(this.copy.customGoalSuccessText, 120);
        }
        this._finishOnboarding();
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
    if (typeof wx === 'undefined') return;

    const validateAndConfirm = (raw) => {
      const val = String(raw != null ? raw : '').trim();
      if (val && val.length <= 10) {
        this.setInputValue(val);
        this._onConfirm();
        return true;
      }
      return false;
    };

    // 方案A：showModal editable
    if (wx.showModal) {
      wx.showModal({
        title: this.copy.namePrompt,
        editable: true,
        content: this.inputValue || '',
        placeholderText: this.copy.inputModalPlaceholderText,
        confirmText: this.copy.inputModalConfirmText,
        cancelText: this.copy.inputModalCancelText,
        success: (res) => {
          if (!res.confirm) return;
          if (validateAndConfirm(res.content)) return;
          if (wx.showToast) wx.showToast({ title: this.copy.inputValidationToast, icon: 'none', duration: 1400 });
        },
        fail: () => {
          // 方案B：键盘兜底
          this._promptByKeyboard(validateAndConfirm);
        },
      });
      return;
    }

    // 方案B：键盘兜底
    this._promptByKeyboard(validateAndConfirm);
  }

  _promptByKeyboard(validateAndConfirm) {
    if (typeof wx === 'undefined' || !wx.showKeyboard) return;
    let handled = false;
    const cleanup = () => {
      if (wx.offKeyboardConfirm) wx.offKeyboardConfirm(onConfirm);
      if (wx.offKeyboardComplete) wx.offKeyboardComplete(onComplete);
    };
    const onConfirm = (res) => {
      handled = validateAndConfirm(res && res.value);
      cleanup();
      if (wx.hideKeyboard) wx.hideKeyboard();
      if (!handled && wx.showToast) wx.showToast({ title: this.copy.inputValidationToast, icon: 'none', duration: 1400 });
    };
    const onComplete = (res) => {
      if (!handled) handled = validateAndConfirm(res && res.value);
      cleanup();
    };
    if (wx.onKeyboardConfirm) wx.onKeyboardConfirm(onConfirm);
    if (wx.onKeyboardComplete) wx.onKeyboardComplete(onComplete);
    wx.showKeyboard({
      defaultValue: this.inputValue || '',
      maxLength: 10,
      multiple: false,
      confirmType: 'done',
      fail: () => cleanup(),
    });
  }

  _getLayout(canvasWidth, canvasHeight) {
    return getOnboardingLayoutSpec(canvasWidth, canvasHeight);
  }

  /** 渲染 */
  render(ctx, canvasWidth, canvasHeight) {
    this._banner.hide();

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

    const layout = this._getLayout(canvasWidth, canvasHeight);

    // 上部品牌区
    ctx.fillStyle = '#8A7765';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.copy.heroEyebrow, canvasWidth / 2, layout.heroTop + 12);

    ctx.fillStyle = '#5B4A3A';
    ctx.font = '700 28px sans-serif';
    ctx.fillText(this.copy.brandTitle, canvasWidth / 2, layout.heroTop + 48);

    ctx.fillStyle = '#8A7765';
    ctx.font = '14px sans-serif';
    ctx.fillText(this.copy.subtitle, canvasWidth / 2, layout.heroTop + 78);

    // 中部鸭子视觉区
    ctx.fillStyle = 'rgba(255, 221, 150, 0.22)';
    ctx.beginPath();
    ctx.ellipse(
      layout.petAreaCenterX,
      layout.petAreaCenterY,
      layout.petHaloRadius,
      layout.petHaloRadius * 0.82,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    if (this.lulu) {
      this.lulu.update();
      this.lulu.drawPet(
        ctx,
        layout.petAreaCenterX - layout.petDrawWidth / 2,
        layout.petAreaCenterY - layout.petDrawHeight / 2,
        layout.petDrawWidth,
        layout.petDrawHeight
      );
    }

    // 下部命名卡
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    canvasRoundRect(ctx, layout.namingCardX, layout.namingCardY, layout.namingCardW, layout.namingCardH, 22);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 179, 71, 0.4)';
    ctx.lineWidth = 1.5;
    canvasRoundRect(ctx, layout.namingCardX, layout.namingCardY, layout.namingCardW, layout.namingCardH, 22);
    ctx.stroke();

    ctx.fillStyle = '#5B4A3A';
    ctx.font = '600 16px sans-serif';
    ctx.fillText(this.copy.namePrompt, canvasWidth / 2, layout.namingCardY + 32);

    ctx.fillStyle = 'rgba(138, 119, 101, 0.72)';
    ctx.font = '12px sans-serif';
    ctx.fillText(this.copy.nameReminder, canvasWidth / 2, layout.namingCardY + 50);

    // 输入框占位区域（实际输入仍由 showModal / keyboard 承担）
    ctx.fillStyle = 'rgba(91, 74, 58, 0.1)';
    canvasRoundRect(
      ctx,
      layout.inputRect.x,
      layout.inputRect.y,
      layout.inputRect.w,
      layout.inputRect.h,
      layout.inputRect.radius
    );
    ctx.fill();
    ctx.fillStyle = 'rgba(138, 119, 101, 0.5)';
    ctx.font = '15px sans-serif';
    ctx.textAlign = 'center';
    const displayName = this.inputValue || this.copy.inputPlaceholder;
    ctx.fillText(displayName, canvasWidth / 2, layout.inputRect.y + 31);

    const btnEnabled = this.confirmEnabled;
    ctx.fillStyle = btnEnabled ? '#FFB347' : 'rgba(255, 179, 71, 0.4)';
    canvasRoundRect(
      ctx,
      layout.buttonRect.x,
      layout.buttonRect.y,
      layout.buttonRect.w,
      layout.buttonRect.h,
      layout.buttonRect.radius
    );
    ctx.fill();
    ctx.fillStyle = btnEnabled ? '#FFF' : 'rgba(255,255,255,0.7)';
    ctx.font = '600 16px sans-serif';
    ctx.fillText(this.copy.primaryButtonText, canvasWidth / 2, layout.buttonRect.y + 31);

    ctx.fillStyle = 'rgba(138, 119, 101, 0.6)';
    ctx.font = '11px sans-serif';
    ctx.fillText(this.copy.goalPickerHint, canvasWidth / 2, layout.namingCardY + layout.namingCardH - 8);

    if (this.stage === 'goalPicker') {
      this.goalPicker.render(ctx, canvasWidth, canvasHeight);
    }
  }
}

module.exports = OnboardingPage;
