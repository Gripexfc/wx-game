function normalizeDuckName(duckName) {
  const name = String(duckName || '').trim();
  return name || '小鸭';
}

function getBrandCopy(duckName) {
  const safeDuckName = normalizeDuckName(duckName);
  return {
    brandTitle: '慢慢变乖鸭',
    homeRelationshipLine: `今天也和 ${safeDuckName} 一起慢慢变好`,
  };
}

function getHomePageLayoutSpec(width, height) {
  const safeWidth = Math.max(320, Number(width) || 375);
  const safeHeight = Math.max(568, Number(height) || 667);
  const horizontalPadding = Math.max(16, Math.min(24, Math.round(safeWidth * 0.045)));
  const topPadding = Math.max(14, Math.min(22, Math.round(safeHeight * 0.024)));
  const bottomPadding = Math.max(16, Math.min(24, Math.round(safeHeight * 0.024)));
  const headerHeight = Math.max(44, Math.min(64, Math.round(safeHeight * 0.072)));
  const petCardTop = topPadding + headerHeight + Math.max(10, Math.round(safeHeight * 0.016));
  const petCardHeight = Math.max(248, Math.min(356, Math.round(safeHeight * 0.38)));
  const petCardWidth = Math.min(safeWidth - horizontalPadding * 2, 336);
  const actionAreaTop = petCardTop + petCardHeight + Math.max(18, Math.round(safeHeight * 0.03));
  const actionAreaHeight = Math.max(170, safeHeight - actionAreaTop - bottomPadding);
  const actionCardGap = safeHeight < 640 ? 8 : 10;
  const actionCardHeight = Math.max(
    68,
    Math.min(86, Math.floor((actionAreaHeight - 66 - actionCardGap) / 2))
  );
  return {
    showBottomBanner: false,
    horizontalPadding,
    topPadding,
    bottomPadding,
    headerHeight,
    petCardTop,
    petCardHeight,
    petCardWidth,
    petCardRadius: 28,
    actionAreaTop,
    actionAreaHeight,
    actionAreaRadius: 24,
    actionInset: 14,
    actionCardGap,
    actionCardHeight,
  };
}

function getHomePageCommitmentLayout(width, height) {
  const spec = getHomePageLayoutSpec(width, height);
  const safeWidth = Math.max(320, Number(width) || 375);
  const actionArea = {
    x: spec.horizontalPadding,
    y: spec.actionAreaTop,
    w: safeWidth - spec.horizontalPadding * 2,
    h: spec.actionAreaHeight,
  };
  const actionHeaderHeight = 46;
  const cardsTop = actionArea.y + actionHeaderHeight + 6;
  const cardW = Math.floor((actionArea.w - spec.actionInset * 2 - spec.actionCardGap) / 2);
  const cardH = spec.actionCardHeight;
  const leftX = actionArea.x + spec.actionInset;
  const secondRowY = cardsTop + cardH + spec.actionCardGap;

  return {
    actionArea,
    actionHeaderHeight,
    cardsTop,
    cards: [
      { x: leftX, y: cardsTop, w: cardW, h: cardH },
      { x: leftX + cardW + spec.actionCardGap, y: cardsTop, w: cardW, h: cardH },
      { x: leftX, y: secondRowY, w: cardW, h: cardH },
      { x: leftX + cardW + spec.actionCardGap, y: secondRowY, w: cardW, h: cardH },
    ],
  };
}

function getOnboardingCopy() {
  return {
    brandTitle: '慢慢变乖鸭',
    subtitle: '领一只会陪你慢慢变好的小鸭',
    defaultDuckName: '小鸭',
    heroEyebrow: '今天开始，一起慢慢变好',
    namePrompt: '给它起个名字',
    nameReminder: '名字会出现在首页，陪你一起坚持',
    inputPlaceholder: '点击这里输入名字',
    primaryButtonText: '带它回家',
    goalPickerHint: '点击按钮后，会继续进入今日目标选择',
    goalPickerTitleTemplate: '今天想和{duckName}一起坚持什么？',
    goalPickerSubtitleTemplate: '先选一个目标，再带{duckName}回到首页',
    customGoalModalTitle: '写一个今天的小目标',
    customGoalPlaceholder: '比如：晚饭后散步20分钟',
    customGoalConfirmText: '开始坚持',
    customGoalCancelText: '取消',
    customGoalEmptyToast: '先写一个目标名吧',
    customGoalSuccessText: '这个目标听起来就很棒！',
    inputModalPlaceholderText: '最多10个字',
    inputModalConfirmText: '确定',
    inputModalCancelText: '取消',
    inputValidationToast: '名字1-10个字哦',
    goalSuccessTemplate: '你的第一个目标！{duckName}记住了！',
  };
}

function getOnboardingLayoutSpec(width, height) {
  const safeWidth = Math.max(320, Number(width) || 375);
  const safeHeight = Math.max(568, Number(height) || 667);
  const horizontalPadding = Math.max(20, Math.min(28, Math.round(safeWidth * 0.06)));
  const topPadding = Math.max(26, Math.min(40, Math.round(safeHeight * 0.05)));
  const bottomPadding = Math.max(18, Math.min(26, Math.round(safeHeight * 0.03)));
  const heroTop = topPadding;
  const heroHeight = Math.max(88, Math.min(120, Math.round(safeHeight * 0.14)));
  const petAreaTop = heroTop + heroHeight + Math.max(10, Math.round(safeHeight * 0.015));
  const namingCardH = Math.max(168, Math.min(220, Math.round(safeHeight * 0.29)));
  const namingCardY = safeHeight - bottomPadding - namingCardH;
  const petAreaHeight = Math.max(190, namingCardY - petAreaTop - Math.max(12, Math.round(safeHeight * 0.02)));
  const cardX = horizontalPadding;
  const cardW = safeWidth - horizontalPadding * 2;
  const inputX = cardX + 18;
  const inputY = namingCardY + 62;
  const inputW = cardW - 36;
  const inputH = 50;
  const buttonW = cardW - 36;
  const buttonH = 50;
  const buttonX = cardX + 18;
  const buttonY = namingCardY + namingCardH - buttonH - 20;

  return {
    horizontalPadding,
    topPadding,
    bottomPadding,
    heroTop,
    heroHeight,
    petAreaTop,
    petAreaHeight,
    petAreaCenterX: safeWidth / 2,
    petAreaCenterY: petAreaTop + petAreaHeight / 2,
    petDrawWidth: Math.min(safeWidth * 0.76, 292),
    petDrawHeight: Math.min(petAreaHeight * 0.92, safeHeight * 0.34),
    petHaloRadius: Math.min(safeWidth * 0.32, petAreaHeight * 0.42),
    namingCardX: cardX,
    namingCardY,
    namingCardW: cardW,
    namingCardH,
    inputRect: {
      x: inputX,
      y: inputY,
      w: inputW,
      h: inputH,
      radius: 14,
    },
    buttonRect: {
      x: buttonX,
      y: buttonY,
      w: buttonW,
      h: buttonH,
      radius: 25,
    },
  };
}

function getTaskPageCopy(duckName) {
  const safeDuckName = normalizeDuckName(duckName);
  return {
    title: `${safeDuckName}今天的小计划`,
    summary: '做完一件，就离慢慢变好更近一点',
  };
}

function getTaskPageLayoutSpec(width, height) {
  const safeWidth = Math.max(320, Number(width) || 375);
  const safeHeight = Math.max(568, Number(height) || 667);
  const horizontalPadding = Math.max(18, Math.min(26, Math.round(safeWidth * 0.05)));
  const topPadding = Math.max(18, Math.min(26, Math.round(safeHeight * 0.03)));
  const bottomPadding = Math.max(20, Math.min(28, Math.round(safeHeight * 0.03)));
  const headerHeight = Math.max(92, Math.min(128, Math.round(safeHeight * 0.16)));
  const summaryCardHeight = Math.max(72, Math.min(94, Math.round(safeHeight * 0.11)));
  const listTop = topPadding + headerHeight + summaryCardHeight + 18;
  const taskCardHeight = Math.max(78, Math.min(96, Math.round(safeHeight * 0.11)));
  const taskCardGap = safeHeight < 640 ? 12 : 14;

  return {
    showBottomBanner: false,
    horizontalPadding,
    topPadding,
    bottomPadding,
    headerHeight,
    summaryCardHeight,
    listTop,
    taskCardHeight,
    taskCardGap,
    cardRadius: 18,
  };
}

module.exports = {
  getBrandCopy,
  getHomePageLayoutSpec,
  getHomePageCommitmentLayout,
  getOnboardingCopy,
  getOnboardingLayoutSpec,
  getTaskPageCopy,
  getTaskPageLayoutSpec,
};
