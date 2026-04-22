/**
 * 首次引导：选宠(四选一) -> 起名 -> 首目标
 */
const BannerAdManager = require('../ads/BannerAdManager');
const { canvasRoundRect } = require('../utils/canvas');
const GoalPickerOverlay = require('./GoalPickerOverlay');
const { getOnboardingCopy, getOnboardingLayoutSpec } = require('./pageLayoutSpec');
const { STORAGE_KEYS } = require('../../utils/constants');

class OnboardingPage {
  constructor(game) {
    this.game = game;
    this.lulu = null;
    this.inputValue = '';
    this.confirmEnabled = false;
    this._banner = BannerAdManager.getInstance();
    this.stage = game && game.skipPetPickOnboarding ? 'naming' : 'petPick';
    this.selectedPetVariant = 0;
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

    if (this.stage === 'petPick') {
      if (this.lulu && typeof this.lulu.setPetVariantId === 'function') {
        this.lulu.setPetVariantId(this.selectedPetVariant);
      }
      for (let i = 0; i < layout.petTiles.length; i++) {
        const t = layout.petTiles[i];
        if (x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h) {
          this.selectedPetVariant = t.variantId;
          if (this.lulu && typeof this.lulu.setPetVariantId === 'function') {
            this.lulu.setPetVariantId(this.selectedPetVariant);
          }
          return;
        }
      }
      const b = layout.buttonRect;
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        this.stage = 'naming';
      }
      return;
    }


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
      this.game.storage.set(STORAGE_KEYS.PET_VARIANT_ID, this.selectedPetVariant);
    }
    if (this.lulu && typeof this.lulu.setPetVariantId === 'function') {
      this.lulu.setPetVariantId(this.selectedPetVariant);
    }
    if (typeof this.game.onOnboardingCloudSync === 'function') {
      this.game.onOnboardingCloudSync({ petVariantId: this.selectedPetVariant, petName: name });
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
    if (this.lulu && typeof this.lulu.setPetVariantId === 'function' && (this.stage === 'petPick' || this.stage === 'naming')) {
      this.lulu.setPetVariantId(this.selectedPetVariant);
    }

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

    const isPet = this.stage === 'petPick';
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
    ctx.fillText(isPet ? this.copy.petPickTitle : this.copy.subtitle, canvasWidth / 2, layout.heroTop + 78);
    if (isPet) {
      ctx.font = '12px sans-serif';
      ctx.fillText(this.copy.petPickSubtitle, canvasWidth / 2, layout.heroTop + 98);
    }

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

    if (isPet) {
      for (let i = 0; i < layout.petTiles.length; i++) {
        const t = layout.petTiles[i];
        const sel = t.variantId === this.selectedPetVariant;
        ctx.fillStyle = sel ? 'rgba(255, 179, 71, 0.35)' : 'rgba(255, 255, 255, 0.5)';
        canvasRoundRect(ctx, t.x, t.y, t.w, t.h, 14);
        ctx.fill();
        ctx.strokeStyle = sel ? '#E89400' : 'rgba(138, 119, 101, 0.35)';
        ctx.lineWidth = sel ? 2.2 : 1.2;
        canvasRoundRect(ctx, t.x, t.y, t.w, t.h, 14);
        ctx.stroke();
        const label = (this.copy.petVariantNames && this.copy.petVariantNames[t.variantId]) || `造型${t.variantId + 1}`;
        ctx.fillStyle = '#5B4A3A';
        ctx.font = '600 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, t.x + t.w / 2, t.y + t.h / 2 + 4);
      }
    }

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

    if (isPet) {
      ctx.fillStyle = '#5B4A3A';
      ctx.font = '600 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('在上方格子中选造型', canvasWidth / 2, layout.namingCardY + 32);
      ctx.fillStyle = 'rgba(138, 119, 101, 0.72)';
      ctx.font = '12px sans-serif';
      ctx.fillText('中央预览会随选择变化', canvasWidth / 2, layout.namingCardY + 52);
    } else {
      ctx.fillStyle = '#5B4A3A';
      ctx.font = '600 16px sans-serif';
      ctx.fillText(this.copy.namePrompt, canvasWidth / 2, layout.namingCardY + 32);

      ctx.fillStyle = 'rgba(138, 119, 101, 0.72)';
      ctx.font = '12px sans-serif';
      ctx.fillText(this.copy.nameReminder, canvasWidth / 2, layout.namingCardY + 50);
    }

    if (!isPet) {
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
    }

    const btnEnabled = isPet ? true : this.confirmEnabled;
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
    ctx.textAlign = 'center';
    const btnText = isPet ? (this.copy.petPickButtonText || '选好了，去起名') : this.copy.primaryButtonText;
    ctx.fillText(btnText, canvasWidth / 2, layout.buttonRect.y + 31);

    ctx.fillStyle = 'rgba(138, 119, 101, 0.6)';
    ctx.font = '11px sans-serif';
    ctx.fillText(this.copy.goalPickerHint, canvasWidth / 2, layout.namingCardY + layout.namingCardH - 8);

    if (this.stage === 'goalPicker') {
      this.goalPicker.render(ctx, canvasWidth, canvasHeight);
    }
  }
}

module.exports = OnboardingPage;
