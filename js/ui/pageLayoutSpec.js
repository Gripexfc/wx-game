function normalizeDuckName(duckName) {
  const name = String(duckName || '').trim();
  return name || '小鸭';
}

const HOME_MOTIVATION_QUOTES = [
  '今天也和{duckName}一起慢慢变好',
  '一点点进步，也是在发光',
  '不求完美，坚持就很酷',
  '先做五分钟，状态会跟上你',
  '你在努力的样子很有力量',
  '慢一点没关系，别停下就好',
  '把今天过好，就是最强成长',
  '每次完成，都在给未来加分',
  '今天的你，已经比昨天更稳了',
  '和{duckName}一起，把小事做成',
];

function resolveMotivationQuote(index, duckName) {
  const safeDuckName = normalizeDuckName(duckName);
  const len = HOME_MOTIVATION_QUOTES.length;
  const safeIndex = len > 0 ? ((Number(index) || 0) % len + len) % len : 0;
  const template = HOME_MOTIVATION_QUOTES[safeIndex] || HOME_MOTIVATION_QUOTES[0] || '';
  return template.replace(/\{duckName\}/g, safeDuckName);
}

function getBrandCopy(duckName, quoteIndex) {
  const safeDuckName = normalizeDuckName(duckName);
  return {
    brandTitle: '慢慢变乖鸭',
    homeRelationshipLine: resolveMotivationQuote(quoteIndex, safeDuckName),
  };
}

function getHomePageLayoutSpec(width, height) {
  const safeWidth = Math.max(320, Number(width) || 375);
  const safeHeight = Math.max(568, Number(height) || 667);
  const horizontalPadding = Math.max(16, Math.min(24, Math.round(safeWidth * 0.045)));
  const topPadding = Math.max(14, Math.min(22, Math.round(safeHeight * 0.024)));
  const bottomPadding = Math.max(16, Math.min(24, Math.round(safeHeight * 0.024)));
  const headerHeight = Math.max(44, Math.min(64, Math.round(safeHeight * 0.072)));
  /** 成长 + 心情条：在标题与宠物卡之间，避免压在宠物立绘上 */
  const xpStripGapAfterHeader = 12;
  /** 上行：心情 + 经验数字；下行：进度条，避免叠在宠物立绘上 */
  const xpStripHeight = 34;
  const xpStripY = topPadding + headerHeight + xpStripGapAfterHeader;
  const petCardGapAfterXp = Math.max(12, Math.round(safeHeight * 0.018));
  const petCardTop = xpStripY + xpStripHeight + petCardGapAfterXp;
  const petCardWidth = Math.min(safeWidth - horizontalPadding * 2, 348);
  const actionCardGap = safeHeight < 640 ? 8 : 10;
  /** 承诺区：白底容器贴底铺满；卡片在剩余高度内垂直居中 */
  const ACTION_HEAD = 46;
  const ACTION_GAP_AFTER_HEAD = 8;
  const ACTION_BOTTOM_INSET = 14;
  const MIN_CARD_H = 56;
  const MAX_CARD_H = 88;
  const petToActionGap = Math.max(16, Math.round(safeHeight * 0.024));
  const usableBelowXp = safeHeight - bottomPadding - petCardTop - petToActionGap;
  const actionMin =
    ACTION_HEAD + ACTION_GAP_AFTER_HEAD + 2 * MIN_CARD_H + actionCardGap + ACTION_BOTTOM_INSET;
  let petCardHeight = Math.round(usableBelowXp * 0.6);
  petCardHeight = Math.max(236, Math.min(352, petCardHeight));
  let actionAreaHeight = usableBelowXp - petCardHeight;
  if (actionAreaHeight < actionMin) {
    actionAreaHeight = actionMin;
    petCardHeight = Math.max(200, usableBelowXp - actionAreaHeight);
  }
  const actionAreaTop = petCardTop + petCardHeight + petToActionGap;
  const innerForCards = Math.max(
    0,
    actionAreaHeight - ACTION_HEAD - ACTION_GAP_AFTER_HEAD - ACTION_BOTTOM_INSET - actionCardGap
  );
  let actionCardHeight = Math.max(MIN_CARD_H, Math.min(MAX_CARD_H, Math.floor(innerForCards / 2)));
  let cardsBlock = 2 * actionCardHeight + actionCardGap;
  while (cardsBlock > innerForCards && actionCardHeight > MIN_CARD_H) {
    actionCardHeight -= 1;
    cardsBlock = 2 * actionCardHeight + actionCardGap;
  }
  const slackBelowHead = innerForCards - cardsBlock;
  const actionCardsTopOffset = ACTION_HEAD + ACTION_GAP_AFTER_HEAD + Math.max(0, Math.floor(slackBelowHead / 2));
  return {
    showBottomBanner: false,
    horizontalPadding,
    topPadding,
    bottomPadding,
    headerHeight,
    xpStripY,
    xpStripHeight,
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
    actionCardsTopOffset,
    petToActionGap,
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
  const cardsTop = actionArea.y + (spec.actionCardsTopOffset != null ? spec.actionCardsTopOffset : actionHeaderHeight + 6);
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
    petPickTitle: '选一只你的小鸭',
    petPickSubtitle: '四色性格不同，之后可在设置里再换',
    petPickButtonText: '选好了，去起名',
    petVariantNames: ['暖阳黄', '薄荷青', '薰衣紫', '珊瑚橙'],
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

  const petDrawWidth = Math.min(safeWidth * 0.76, 292);
  const petDrawHeight = Math.min(petAreaHeight * 0.92, safeHeight * 0.34);
  const petAreaCenterX = safeWidth / 2;
  const petAreaCenterY = petAreaTop + petAreaHeight / 2;
  const petTileW = Math.min(86, Math.max(64, Math.floor(petDrawWidth * 0.36)));
  const petTileGap = 10;
  const petGridW = petTileW * 2 + petTileGap;
  const petGridH = petTileW * 2 + petTileGap;
  const petGridLeft = petAreaCenterX - petGridW / 2;
  const petGridTop = petAreaCenterY - petGridH / 2 - petDrawHeight * 0.12;
  const petTiles = [
    { x: petGridLeft, y: petGridTop, w: petTileW, h: petTileW, variantId: 0 },
    { x: petGridLeft + petTileW + petTileGap, y: petGridTop, w: petTileW, h: petTileW, variantId: 1 },
    { x: petGridLeft, y: petGridTop + petTileW + petTileGap, w: petTileW, h: petTileW, variantId: 2 },
    { x: petGridLeft + petTileW + petTileGap, y: petGridTop + petTileW + petTileGap, w: petTileW, h: petTileW, variantId: 3 },
  ];

  return {
    horizontalPadding,
    topPadding,
    bottomPadding,
    heroTop,
    heroHeight,
    petAreaTop,
    petAreaHeight,
    petAreaCenterX,
    petAreaCenterY,
    petDrawWidth,
    petDrawHeight,
    petHaloRadius: Math.min(safeWidth * 0.32, petAreaHeight * 0.42),
    petTileW,
    petTileGap,
    petTiles,
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
  HOME_MOTIVATION_QUOTES,
  getHomePageLayoutSpec,
  getHomePageCommitmentLayout,
  getOnboardingCopy,
  getOnboardingLayoutSpec,
  getTaskPageCopy,
  getTaskPageLayoutSpec,
};
