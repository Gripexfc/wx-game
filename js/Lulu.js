/**
 * 噜噜 · Canvas 伪 3D 虚拟宠物：分层光影、自主行为、点击 / 左右滑翻面、对话气泡
 */

const { LULU_STAGES, COOL_ACTIONS } = require('../utils/constants');
const { canvasRoundRect } = require('./utils/canvas');

/** 四套皮肤：身体/头/短裤/橘子渐变（0 为默认暖黄） */
const PET_VARIANTS = [
  {
    body: ['#FFF3DC', '#FFE4C4', '#FFD9A8', '#FFCF7F'],
    head: ['#FFF3DC', '#FFE4C4', '#FFD9A8'],
    shorts: ['#FFB030', '#E88200'],
    orange: ['#FFCC44', '#FFAA00', '#E89400'],
  },
  {
    body: ['#E8F5F0', '#C8EBDD', '#A8DCC8', '#7ECCA8'],
    head: ['#E8F5F0', '#C8EBDD', '#A8DCC8'],
    shorts: ['#3DAA7A', '#1E7A52'],
    orange: ['#8FD4A0', '#4CB87A', '#2E9060'],
  },
  {
    body: ['#F2E8FF', '#E4D4FC', '#D4BFF5', '#C0A4EB'],
    head: ['#F2E8FF', '#E4D4FC', '#D4BFF5'],
    shorts: ['#9B6FE0', '#6E4AB8'],
    orange: ['#D4A8FF', '#B07AE8', '#8B52D8'],
  },
  {
    body: ['#FFEEE8', '#FFD8D4', '#FFC0B8', '#FFA898'],
    head: ['#FFEEE8', '#FFD8D4', '#FFC0B8'],
    shorts: ['#FF7A5C', '#E84D2E'],
    orange: ['#FFAA88', '#FF7A50', '#E85D30'],
  },
];

const DIALOGUE = {
  tap: [
    '在呢在呢～',
    '戳我干嘛呀',
    '摸摸头，会变强',
    '今天也要加油嗷',
    '嘿嘿，我在听',
    '再戳要收费了（开玩笑',
    '来啦来啦～',
    '被你戳到啦',
    '好痒好痒哈哈',
    '我在我在别慌',
    '戳一下加运气',
    '今天也想贴贴',
    '你手指好暖',
    '我在练发呆功',
    '再戳我就装哭',
    '好啦好啦看你',
    '摸摸肚子也行',
    '我在给你充电',
  ],
  idle: [
    '有点无聊耶…',
    '去做个任务？',
    '我帮你守着进度',
    '想喝奶茶（幻觉）',
    '你回来啦',
    '外面天气好吗',
    '记得喝水',
    '要不要伸个懒腰',
    '我数到三你就开始',
    '今天也想被你夸',
    '我在这等你好久了',
    '慢慢来比较快哦',
    '小目标也很厉害',
    '我在偷看你屏幕',
    '开玩笑的啦',
    '想听你说说话',
    '要不要摸鱼一下',
    '我会替你加油的',
    '你不在时好安静',
    '回来就好啦',
    '我帮你把阳光留住',
    '今天也要对自己温柔',
  ],
  happy: [
    '开心！',
    '好耶～',
    '被你夸会害羞啦',
    '继续冲',
    '哇你超棒',
    '我跟着高兴',
    '笑一个给我看',
    '今天运气不错',
    '好运贴贴',
    '我转圈圈庆祝',
    '太棒了叭',
    '给你比个大心',
  ],
  sleepy: ['困困…', 'Zzz…', '想睡觉', '眼皮好重', '想趴一会', '梦里见哦', '小声点我睡了', '呼噜噜…', '月亮晚安'],
};

const TASK_PRAISE = [
  '今天也很厉害呀！',
  '我看到你在努力，超棒！',
  '再完成一个，我们就升级啦！',
  '你做到了，噜式点赞！',
  '稳稳推进，继续冲！',
  '这一步超有力量',
  '我就知道你可以',
  '完成的感觉很爽吧',
  '我在旁边偷偷鼓掌',
  '好稳好稳',
  '又前进一小格啦',
  '给自己一点掌声',
  '你超有毅力',
  '继续保持这个节奏',
  '今天也因你发光',
];

const AUTO_ACTION_CONFIG = {
  cute: { duration: 88, label: '卖萌中…' },
  crawl: { duration: 118, label: '爬呀爬…' },
  run: { duration: 102, label: '跑起来！' },
  hop: { duration: 90, label: '蹦蹦跳跳' },
  walk: { duration: 110, label: '散步中～' },
  stretch: { duration: 98, label: '拉伸一下' },
  wiggle: { duration: 92, label: '扭扭扭～' },
  nod: { duration: 86, label: '点点头' },
  sidestep: { duration: 96, label: '侧步晃晃' },
  breathe: { duration: 104, label: '深呼吸…' },
  shimmy: { duration: 84, label: '抖抖羽毛' },
  bounce: { duration: 80, label: '弹一下' },
  sway: { duration: 92, label: '左右摇摆' },
  peek: { duration: 84, label: '探头看看' },
  twirl: { duration: 96, label: '小转圈' },
  patpat: { duration: 88, label: '拍拍肚肚' },
  cheer: { duration: 90, label: '给你打气' },
  daydream: { duration: 100, label: '发个小呆' },
  wobbleBlob: { duration: 94, label: '果冻乱抖' },
  helicopterHead: { duration: 86, label: '螺旋桨脑袋' },
  noodleWave: { duration: 96, label: '面条扭扭' },
  moonwalk: { duration: 102, label: '抽象太空步' },
  pancakeFlip: { duration: 88, label: '翻面煎饼' },
  sneakySlide: { duration: 92, label: '鬼祟滑行' },
  dizzySpiral: { duration: 98, label: '晕乎螺旋' },
  rubberBand: { duration: 90, label: '橡皮筋弹' },
  penguinDrift: { duration: 100, label: '企鹅漂移' },
  mimeBox: { duration: 96, label: '空气墙表演' },
  /** 大范围表演：位移在 drawPet 里处理，时长加长便于看清 */
  macroPatrol: { duration: 210, label: '走远溜达…' },
  macroOrbit: { duration: 240, label: '围着框转圈' },
  macroDepth: { duration: 200, label: '3D探头秀' },
};

/** 动作结束后的小连段：只接柔和过渡，避免「刚停又疯」 */
const TRANSITION_ACTION_POOL = ['nod', 'sway', 'daydream', 'patpat', 'breathe', 'stretch'];

/** 佛系主池：偏呼吸、发呆、微动（参考 QQ 宠：长时间安静 + 偶发小动作） */
const AUTO_WEIGHT_CALM = [
  ['breathe', 20],
  ['daydream', 18],
  ['nod', 14],
  ['sway', 12],
  ['stretch', 10],
  ['patpat', 9],
  ['cute', 8],
  ['peek', 6],
  ['walk', 5],
  ['twirl', 4],
  ['sidestep', 4],
  ['shimmy', 3],
  ['wiggle', 3],
];

/** 稍活泼（仍非大演） */
const AUTO_WEIGHT_SPRY = [
  ['hop', 5],
  ['bounce', 4],
  ['cheer', 4],
  ['run', 3],
  ['crawl', 3],
  ['moonwalk', 2],
];

/** 搞怪 / 大位移：低权重，避免呆板地轮流刷同一种 */
const AUTO_WEIGHT_WILD = [
  ['wobbleBlob', 2],
  ['dizzySpiral', 2],
  ['helicopterHead', 2],
  ['noodleWave', 2],
  ['penguinDrift', 2],
  ['sneakySlide', 2],
  ['pancakeFlip', 2],
  ['rubberBand', 2],
  ['mimeBox', 2],
];

const AUTO_MACRO_IDS = ['macroPatrol', 'macroOrbit', 'macroDepth'];

function scaleWeightTable(table, mul) {
  if (mul === 1) return table.slice();
  return table.map(([id, w]) => [id, Math.max(0.25, w * mul)]);
}

function pickWeightedPairs(table) {
  const total = table.reduce((s, [, w]) => s + w, 0);
  if (total <= 0) return table[0][0];
  let r = Math.random() * total;
  for (const [id, w] of table) {
    r -= w;
    if (r <= 0) return id;
  }
  return table[table.length - 1][0];
}

const INTERACTIONS_BY_LEVEL = [
  {
    minLevel: 1,
    actions: [
      '点点头',
      '挥挥手',
      '眨眼鼓励',
      '轻轻蹦一下',
      '小碎步靠近',
      '歪头看你',
      '拍拍翅膀',
      '原地转半圈',
      '蹭蹭你',
      '竖起呆毛',
      '眯眼笑一下',
      '小脚跺两下',
    ],
  },
  {
    minLevel: 6,
    actions: [
      '开心摇摆',
      '转圈庆祝',
      '抱抱手势',
      '抬橘子炫耀',
      '双手举高高',
      '小跑绕一圈',
      '比个小爱心',
      '抖抖尾巴',
      '阳光眯眼',
      '蹦跶两下',
      '转圈撒花',
      '拍拍你肩膀',
    ],
  },
  {
    minLevel: 13,
    actions: [
      '双手比赞',
      '撒星星',
      '高兴跳跃',
      '阳光光晕',
      '旋风小转',
      '能量蓄满',
      '闪亮登场',
      '霸气挥手',
      '自信挺胸',
      '给你打光',
      '全场焦点',
      '高光时刻',
    ],
  },
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 翻面阈值：超过则绘制背面简化形体 */
const BACK_THRESHOLD = 0.38;

class Lulu {
  constructor() {
    this.level = 1;
    this.xp = 0;
    this.stage = LULU_STAGES.BABY;
    this.accessories = [];
    this.unlockedActions = [];

    this.petFrame = 0;
    this.mood = 'idle';
    this.moodTimer = 0;
    this.blinkTimer = 0;
    this.nextBlinkAt = 90 + Math.floor(Math.random() * 90);
    this.sayText = '';
    this.sayTimer = 0;
    /** 佛系：少碎碎念，间隔拉长 */
    this.nextIdleChat = 520 + Math.floor(Math.random() * 400);
    this.bob = 0;
    this.hopY = 0;
    this.hopVy = 0;
    this.lookSide = 0;
    this.lookTimer = 0;
    this.legacyAction = null;
    this.legacyActionTimer = 0;
    this.moodValue = 68;
    this.interactionCooldown = 0;
    this.todayInteractionCount = 0;
    this.taskNoReactionStreak = 0;

    /** 动画节奏：low | standard | high（须先于 _nextAutoGap 初始化） */
    this.motionTier = 'standard';

    this.autoAction = null;
    this.autoActionTimer = 0;
    /** 首屏也先安静一阵，再考虑小动作（像 QQ 宠刚打开时的静置感） */
    this.nextAutoActionAt = this._nextAutoGap(200, 280);
    this._goalBoostFrames = 0;
    this.autoActionPaused = false;
    this._autoActionPhase = 0;
    /** 点击后短暂弹跳反馈（帧） */
    this._tapBounce = 0;
    /** macroDepth：斜切 + 非等比缩放，伪透视（由 drawPet 写入） */
    this._macroShear = 0;
    this._macroScaleK = 1;

    this.turn = 0;
    this.turnSmooth = 0;
    this.petDragging = false;

    /** PetStateManager 引用（由 main.js 注入） */
    this._psm = null;

    /** 酷炫动作状态 */
    this._coolActionId = null;
    this._coolActionFrame = 0;
    this._coolActionCallback = null;
    this._coolActionDuration = 0;
    /** 升级与变身特效帧 */
    this._levelUpFxFrames = 0;
    this._transformFxFrames = 0;
    /** 任务能量被吃掉时的咀嚼反馈 */
    this._eatFxFrames = 0;
    /** 动作收尾缓动，避免僵硬回位 */
    this._settleOffsetX = 0;
    this._settleOffsetY = 0;
    this._settleTilt = 0;
    this._autoActionChainDepth = 0;
    /** 发疯模式：动作期跨象限跳点 */
    this._chaosTargetX = 0;
    this._chaosTargetY = 0;
    this._chaosJumpCd = 0;
    this._chaosBurst = 0;
    /** 避免连续抽到同一动作显得呆板 */
    this._lastAutoAction = null;
    /** 0～3 皮肤变体，与 spec petVariantId 一致 */
    this.petVariantId = 0;
  }

  setPetVariantId(v) {
    const n = Number(v);
    this.petVariantId = Number.isFinite(n) ? Math.max(0, Math.min(3, Math.floor(n))) : 0;
  }

  _getPetVariantPalette() {
    const vid = this.petVariantId | 0;
    return PET_VARIANTS[((vid % 4) + 4) % 4] || PET_VARIANTS[0];
  }

  _motionPaceMul() {
    const t = this.motionTier;
    if (t === 'low') return 1.32;
    if (t === 'high') return 0.78;
    return 1;
  }

  _motionAutoCdStep() {
    const t = this.motionTier;
    if (t === 'high') return 1.18;
    if (t === 'low') return 0.72;
    return 1;
  }

  /** 全局「佛系」倍率：标准档也明显拉长静置（与 motionTier 叠乘） */
  _zenRhythmMul() {
    if (this.motionTier === 'low') return 2.15;
    if (this.motionTier === 'high') return 0.92;
    return 1.62;
  }

  _nextAutoGap(min, spread) {
    const z = this._zenRhythmMul();
    return Math.max(28, Math.floor((min + Math.random() * spread) * this._motionPaceMul() * z));
  }

  _pickNextAutoActionId() {
    const t = this.motionTier;
    const macroP = t === 'high' ? 0.085 : t === 'low' ? 0.018 : 0.042;
    if (Math.random() < macroP) {
      const id = pick(AUTO_MACRO_IDS);
      this._lastAutoAction = id;
      return id;
    }
    const calm = AUTO_WEIGHT_CALM.map(([a, w]) => [a, w]);
    const spryMul = t === 'high' ? 1.3 : t === 'low' ? 0.38 : 0.72;
    const wildMul = t === 'high' ? 1.05 : t === 'low' ? 0.2 : 0.48;
    const merged = [
      ...calm,
      ...scaleWeightTable(AUTO_WEIGHT_SPRY, spryMul),
      ...scaleWeightTable(AUTO_WEIGHT_WILD, wildMul),
    ];
    let id = pickWeightedPairs(merged);
    if (id === this._lastAutoAction) {
      const filtered = merged.filter(([x]) => x !== id);
      if (filtered.length) id = pickWeightedPairs(filtered);
    }
    this._lastAutoAction = id;
    return id;
  }

  setPetStateManager(psm) {
    this._psm = psm;
    if (psm) {
      this.moodValue = psm.moodValue;
    }
  }

  say(text, frames) {
    this.sayText = text;
    this.sayTimer = frames;
  }

  getStage() {
    const level = this.level;
    if (level >= 16) return LULU_STAGES.ADULT;
    if (level >= 11) return LULU_STAGES.YOUTH;
    if (level >= 6) return LULU_STAGES.CHILD;
    return LULU_STAGES.BABY;
  }

  getScaleMul() {
    const s = this.getStage().id;
    if (s === 'adult') return 1.08;
    if (s === 'youth') return 1.02;
    if (s === 'child') return 0.96;
    return 0.88;
  }

  onTap() {
    this.mood = 'happy';
    this.moodTimer = 56;
    this.hopVy = -9.2;
    this._tapBounce = 26;
    this.say(pick(DIALOGUE.tap), 128);
    this.lookSide = (Math.random() - 0.5) * 0.4;
    this.lookTimer = 36;
    // 暂停自动动作，交互结束后重置计时器
    this.autoActionPaused = true;
    this.autoActionPaused = false;
    if (this.autoAction) {
      this.autoAction = null;
      this._autoActionPhase = 0;
      this._autoActionChainDepth = 0;
      this._chaosTargetX = 0;
      this._chaosTargetY = 0;
      this._chaosJumpCd = 0;
      this._chaosBurst = 0;
    }
    this.nextAutoActionAt = this._nextAutoGap(160, 140);
  }

  beginPetDrag() {
    this.petDragging = true;
    this.autoActionPaused = true;
  }

  dragPet(dx) {
    this.turn = Math.max(-1, Math.min(1, this.turn - dx * 0.0048));
  }

  endPetDrag() {
    this.petDragging = false;
    // 交互结束后按档位间隔再恢复自动动作
    this.nextAutoActionAt = this._nextAutoGap(140, 120);
    this.autoActionPaused = false;
  }

  getMoodValue() {
    return Math.max(0, Math.min(100, Math.round(this.moodValue)));
  }

  getMoodLabel() {
    const m = this.getMoodValue();
    if (m >= 85) return '阳光';
    if (m >= 65) return '开心';
    if (m >= 40) return '平稳';
    return '想抱抱';
  }

  adjustMood(delta) {
    this.moodValue = Math.max(0, Math.min(100, this.moodValue + delta));
  }

  getActionText() {
    if (this.sayTimer > 0 && this.sayText) return this.sayText;
    if (this.autoAction) {
      return (AUTO_ACTION_CONFIG[this.autoAction] && AUTO_ACTION_CONFIG[this.autoAction].label) || '';
    }
    if (this.legacyAction) return this.legacyAction;
    return '';
  }

  update() {
    if (this._goalBoostFrames > 0) this._goalBoostFrames -= 1;
    if (this._levelUpFxFrames > 0) this._levelUpFxFrames -= 1;
    if (this._transformFxFrames > 0) this._transformFxFrames -= 1;
    if (this._eatFxFrames > 0) this._eatFxFrames -= 1;
    const speedFactor = this._psm ? this._psm.getMoodSpeedFactor() : 1.0;
    this.petFrame += speedFactor;
    this.bob = Math.sin(this.petFrame * 0.048) * 2.05 * speedFactor;

    this.turnSmooth += (this.turn - this.turnSmooth) * 0.34;
    if (!this.petDragging && Math.abs(this.turn) > 0.008) {
      this.turn *= 0.968;
    }

    if (this.sayTimer > 0) this.sayTimer -= 1;
    if (this.interactionCooldown > 0) this.interactionCooldown -= 1;
    if (this.moodTimer > 0) {
      this.moodTimer -= 1;
      if (this.moodTimer <= 0) this.mood = 'idle';
    }
    if (this.legacyActionTimer > 0) {
      this.legacyActionTimer -= 1;
      if (this.legacyActionTimer <= 0) this.legacyAction = null;
    }
    if (this.lookTimer > 0) this.lookTimer -= 1;
    else this.lookSide *= 0.92;

    this.nextBlinkAt -= 1;
    if (this.nextBlinkAt <= 0) {
      this.blinkTimer = 10;
      this.nextBlinkAt = 100 + Math.floor(Math.random() * 140);
    }
    if (this.blinkTimer > 0) this.blinkTimer -= 1;

    this.nextIdleChat -= 1;
    if (this.nextIdleChat <= 0 && this.mood === 'idle' && this.sayTimer <= 0) {
      if (Math.random() < 0.18) {
        this.say(pick(DIALOGUE.idle), 140);
      }
      this.nextIdleChat = 520 + Math.floor(Math.random() * 380);
      this.adjustMood(-1);
    }

    if (this._tapBounce > 0) this._tapBounce -= 1;

    if (!this.autoAction) {
      this._settleOffsetX *= 0.84;
      this._settleOffsetY *= 0.84;
      this._settleTilt *= 0.82;
      this._chaosTargetX *= 0.82;
      this._chaosTargetY *= 0.82;
      this._chaosJumpCd = 0;
      this._chaosBurst = 0;
    } else {
      this._chaosJumpCd -= 1;
      if (this._chaosJumpCd <= 0) {
        const jumpBase = 8 + Math.floor(Math.random() * 16);
        const isCrazyAction =
          this.autoAction === 'dizzySpiral' ||
          this.autoAction === 'wobbleBlob' ||
          this.autoAction === 'helicopterHead' ||
          this.autoAction === 'pancakeFlip' ||
          this.autoAction === 'mimeBox' ||
          this.autoAction === 'macroOrbit';
        this._chaosJumpCd = isCrazyAction ? Math.max(4, jumpBase - 4) : jumpBase;
        this._chaosTargetX = (Math.random() * 2 - 1) * (isCrazyAction ? 1 : 0.7);
        this._chaosTargetY = (Math.random() * 2 - 1) * (isCrazyAction ? 0.9 : 0.62);
        const burstChance =
          this.motionTier === 'high' ? 0.4 : this.motionTier === 'low' ? 0.12 : 0.2;
        this._chaosBurst = isCrazyAction ? 1 : (Math.random() < burstChance ? 1 : 0);
      }
    }

    if (this.autoAction === 'macroOrbit' || this.autoAction === 'macroPatrol') {
      const target =
        this.autoAction === 'macroOrbit'
          ? Math.sin(this._autoActionPhase * 0.024) * 0.62
          : Math.sin(this._autoActionPhase * 0.032) * 0.55;
      this.lookSide = this.lookSide * 0.84 + target * 0.16;
    }

    this.hopY += this.hopVy;
    this.hopVy += 0.55;
    if (this.hopY > 0) {
      this.hopY = 0;
      this.hopVy = 0;
    }

    // ===== 自动动作状态机 =====
    if (!this.autoActionPaused && this.legacyActionTimer <= 0) {
      if (this.autoAction) {
        this.autoActionTimer -= 1;
        this._autoActionPhase += 1;
        if (this.autoActionTimer <= 0) {
          /** 最多接一段柔和过渡（深度 0→1），大幅降低「演完一串」感 */
          const canChain = this._autoActionChainDepth < 1;
          const chainP =
            this.motionTier === 'high' ? 0.26 : this.motionTier === 'low' ? 0.06 : 0.11;
          if (canChain && Math.random() < chainP) {
            const next = pick(TRANSITION_ACTION_POOL);
            const cfg = AUTO_ACTION_CONFIG[next];
            const chainedDuration = Math.max(28, Math.floor((cfg ? cfg.duration : 80) * 0.4));
            this.autoAction = next;
            this.autoActionTimer = chainedDuration;
            this._autoActionPhase = 0;
            this._autoActionChainDepth += 1;
          } else {
            this.autoAction = null;
            this._autoActionPhase = 0;
            this._autoActionChainDepth = 0;
            this._chaosTargetX = 0;
            this._chaosTargetY = 0;
            this._chaosJumpCd = 0;
            this._chaosBurst = 0;
            this.nextAutoActionAt = this._nextAutoGap(200, 240);
          }
        }
      } else {
        this.nextAutoActionAt -= this._motionAutoCdStep();
        if (this.nextAutoActionAt <= 0) {
          const triggerChance = this._goalBoostFrames > 0
            ? (this.motionTier === 'high' ? 0.4 : this.motionTier === 'low' ? 0.14 : 0.24)
            : (this.motionTier === 'high' ? 0.3 : this.motionTier === 'low' ? 0.09 : 0.17);
          if (Math.random() < triggerChance) {
            this.autoAction = this._pickNextAutoActionId();
            const config = AUTO_ACTION_CONFIG[this.autoAction];
            this.autoActionTimer = config ? config.duration : 90;
            this._autoActionPhase = 0;
            this._autoActionChainDepth = 0;
          } else {
            this.nextAutoActionAt = this._nextAutoGap(140, 200);
          }
        }
      }
    }
  }

  drawPet(ctx, rx, ry, rw, rh, opts) {
    const screen = opts && opts.screen && opts.screen.w > 0 && opts.screen.h > 0 ? opts.screen : null;
    const refW = screen ? Math.max(rw, screen.w * 0.94) : rw;
    const refH = screen ? Math.max(rh, screen.h * 0.9) : rh;
    const anchorGroundY = ry + rh * 0.9;
    const base = Math.min(rw, rh) * 0.34 * this.getScaleMul();
    const tapLift = this._tapBounce > 0 ? Math.sin((26 - this._tapBounce) * 0.55) * 4.2 : 0;
    let cx = rx + rw / 2;
    let cy = anchorGroundY - base * 0.32 + this.bob + this.hopY + tapLift;

    this._macroShear = 0;
    this._macroScaleK = 1;

    const isMacroPatrol = this.autoAction === 'macroPatrol';
    const isMacroOrbit = this.autoAction === 'macroOrbit';
    const isMacroDepth = this.autoAction === 'macroDepth';
    const hasAction = Boolean(this.autoAction);

    if (isMacroPatrol) {
      const u = this._autoActionPhase * 0.032;
      cx += Math.sin(u) * refW * 0.46;
      cy += Math.sin(u * 2) * refH * 0.08;
    } else if (isMacroOrbit) {
      const u = this._autoActionPhase * 0.024;
      cx += Math.cos(u) * refW * 0.38;
      cy += Math.sin(u) * refH * 0.34;
    } else if (isMacroDepth) {
      const u = this._autoActionPhase * 0.046;
      this._macroShear = Math.sin(u) * 0.36;
      this._macroScaleK = 1 + Math.sin(u * 0.82) * 0.11;
    } else if (hasAction) {
      // 非 macro 动作也允许在卡片内大范围走位，避免原地小抖
      const u = this._autoActionPhase * 0.055;
      let roamXMul = 0.16;
      let roamYMul = 0.09;
      if (
        this.autoAction === 'moonwalk' ||
        this.autoAction === 'penguinDrift' ||
        this.autoAction === 'sneakySlide' ||
        this.autoAction === 'walk' ||
        this.autoAction === 'run'
      ) {
        roamXMul = 0.3;
        roamYMul = 0.14;
      } else if (
        this.autoAction === 'dizzySpiral' ||
        this.autoAction === 'wobbleBlob' ||
        this.autoAction === 'helicopterHead' ||
        this.autoAction === 'macroDepth'
      ) {
        roamXMul = 0.22;
        roamYMul = 0.2;
      }
      cx += Math.sin(u * 0.92) * refW * roamXMul;
      cy += Math.cos(u * 0.74) * refH * roamYMul;
    }

    if (hasAction) {
      const smooth = this._chaosBurst ? 0.34 : 0.16;
      this._settleOffsetX += (this._chaosTargetX * refW * 0.36 - this._settleOffsetX) * smooth;
      this._settleOffsetY += (this._chaosTargetY * refH * 0.28 - this._settleOffsetY) * smooth;
      cx += this._settleOffsetX;
      cy += this._settleOffsetY;
    }

    const padX = base * 0.34;
    let groundY;
    if (screen) {
      cx = Math.min(screen.w - padX, Math.max(padX, cx));
      const minCy = base * 0.92;
      const maxCy = screen.h - base * 0.22;
      cy = Math.max(minCy, Math.min(maxCy, cy));
      groundY = Math.min(screen.h - 5, Math.max(anchorGroundY - base * 0.12, cy + base * 0.46));
    } else {
      cx = Math.min(rx + rw - padX, Math.max(rx + padX, cx));
      groundY = anchorGroundY;
      const minCy = ry + base * 0.8;
      const maxCy = groundY + base * 0.2;
      cy = Math.max(minCy, Math.min(maxCy, cy));
    }

    ctx.save();

    let shadowA = 0.18 + Math.abs(this.turnSmooth) * 0.08;
    let shRx = base * 0.92;
    let shRy = base * 0.2;
    if (isMacroPatrol) {
      const d = Math.abs(Math.sin(this._autoActionPhase * 0.032));
      shRx *= 0.78 + d * 0.28;
      shadowA *= 0.72 + d * 0.38;
    } else if (isMacroOrbit) {
      const d = (Math.sin(this._autoActionPhase * 0.024) + 1) * 0.5;
      shRx *= 0.85 + d * 0.2;
      shRy *= 0.88 + d * 0.18;
    } else if (isMacroDepth) {
      const d = (this._macroScaleK - 0.89) / 0.22;
      shRx *= 0.92 + d * 0.12;
      shadowA *= 0.85 + d * 0.2;
    }
    ctx.fillStyle = `rgba(255, 179, 71, ${shadowA})`;
    ctx.beginPath();
    ctx.ellipse(cx, groundY + 3, shRx, shRy, 0, 0, Math.PI * 2);
    ctx.fill();

    const showBack = Math.abs(this.turnSmooth) > BACK_THRESHOLD;
    if (showBack) {
      this._drawPetBack(ctx, cx, cy, base);
    } else {
      this._drawPetFront(ctx, cx, cy, base);
    }

    ctx.restore();

    if (this._coolActionId) {
      this._drawCoolAction(ctx, cx, cy, base);
    }
    this._drawLevelAura(ctx, cx, cy, base);

    // 头顶文案气泡已关闭，避免遮挡等级与上方信息区
  }

  _drawPetFront(ctx, cx, cy, base) {
    const squash = 1 + Math.sin(this.petFrame * 0.08) * 0.02;
    const happySquash = this.mood === 'happy' ? 0.04 : 0;
    const lean = this.turnSmooth * 0.08;

    ctx.save();
    // 自动动作偏移和倾斜
    let bodyOffsetX = this._settleOffsetX;
    let bodyOffsetY = this._settleOffsetY;
    let bodyTilt = this._settleTilt;
    let eyeSquint = 0;

    const macroMove = this.autoAction === 'macroPatrol' || this.autoAction === 'macroOrbit';
    const macroDepth = this.autoAction === 'macroDepth';

    const am = 2.85;
    if (macroMove) {
      bodyOffsetX = Math.sin(this._autoActionPhase * 0.2) * 2.2;
      bodyOffsetY = Math.cos(this._autoActionPhase * 0.18) * 2.2;
    } else if (macroDepth) {
      bodyOffsetX = Math.sin(this._autoActionPhase * 0.11) * 2.8;
      bodyOffsetY = Math.cos(this._autoActionPhase * 0.12) * 2.4;
    } else if (this.autoAction === 'cute') {
      eyeSquint = 1;
      bodyOffsetY = Math.sin(this._autoActionPhase * 0.18) * 3 * am;
    } else if (this.autoAction === 'crawl') {
      bodyOffsetX = Math.sin(this._autoActionPhase * 0.12) * 4 * am;
      bodyOffsetY = Math.abs(Math.sin(this._autoActionPhase * 0.12)) * 2 * am;
    } else if (this.autoAction === 'run') {
      bodyTilt = Math.sin(this._autoActionPhase * 0.25) * 0.09;
      bodyOffsetX = Math.sin(this._autoActionPhase * 0.25) * 5 * am;
    } else if (this.autoAction === 'hop') {
      bodyOffsetY = Math.abs(Math.sin(this._autoActionPhase * 0.24)) * -8;
    } else if (this.autoAction === 'walk') {
      bodyOffsetX = Math.sin(this._autoActionPhase * 0.18) * 5 * am;
      bodyTilt = Math.sin(this._autoActionPhase * 0.18) * 0.05;
    } else if (this.autoAction === 'stretch') {
      bodyTilt = Math.sin(this._autoActionPhase * 0.14) * -0.07;
      bodyOffsetY = Math.sin(this._autoActionPhase * 0.14) * 3.5 * am;
    } else if (this.autoAction === 'wiggle' || this.autoAction === 'shimmy') {
      const sp = this.autoAction === 'shimmy' ? 0.52 : 0.38;
      bodyOffsetX = Math.sin(this._autoActionPhase * sp) * 4.2 * am;
      bodyOffsetY = Math.cos(this._autoActionPhase * (sp * 0.92)) * 2.8 * am;
    } else if (this.autoAction === 'nod') {
      bodyOffsetY = Math.sin(this._autoActionPhase * 0.32) * 5.5 * am;
      eyeSquint = 0.35;
    } else if (this.autoAction === 'sidestep') {
      bodyOffsetX = Math.sin(this._autoActionPhase * 0.22) * 6.5 * am;
      bodyTilt = Math.sin(this._autoActionPhase * 0.22) * 0.06;
    } else if (this.autoAction === 'breathe') {
      bodyOffsetY = Math.sin(this._autoActionPhase * 0.09) * 6.2 * am;
      bodyTilt = Math.sin(this._autoActionPhase * 0.09) * 0.035;
    } else if (this.autoAction === 'bounce') {
      bodyOffsetY = Math.abs(Math.sin(this._autoActionPhase * 0.28)) * -6.2;
    } else if (this.autoAction === 'sway') {
      bodyTilt = Math.sin(this._autoActionPhase * 0.16) * 0.1;
      bodyOffsetX = Math.sin(this._autoActionPhase * 0.16) * 3.8 * am;
    } else if (this.autoAction === 'peek') {
      bodyOffsetX = Math.sin(this._autoActionPhase * 0.14) * 7 * am;
      bodyTilt = Math.sin(this._autoActionPhase * 0.14) * 0.055;
    } else if (this.autoAction === 'twirl') {
      bodyTilt = Math.sin(this._autoActionPhase * 0.2) * 0.12;
      bodyOffsetY = Math.sin(this._autoActionPhase * 0.2) * 3.2 * am;
    } else if (this.autoAction === 'patpat') {
      eyeSquint = 0.5;
      bodyOffsetY = Math.sin(this._autoActionPhase * 0.26) * 3.8 * am;
    } else if (this.autoAction === 'cheer') {
      bodyOffsetY = Math.abs(Math.sin(this._autoActionPhase * 0.26)) * -6.8;
      bodyTilt = Math.sin(this._autoActionPhase * 0.26) * 0.08;
    } else if (this.autoAction === 'daydream') {
      bodyOffsetY = Math.sin(this._autoActionPhase * 0.07) * 4.5 * am;
      bodyTilt = Math.sin(this._autoActionPhase * 0.11) * 0.04;
      eyeSquint = 0.6;
    } else if (this.autoAction === 'wobbleBlob') {
      bodyOffsetX = Math.sin(this._autoActionPhase * 0.36) * 5.8 * am;
      bodyOffsetY = Math.cos(this._autoActionPhase * 0.28) * 3.8 * am;
      bodyTilt = Math.sin(this._autoActionPhase * 0.4) * 0.13;
    } else if (this.autoAction === 'helicopterHead') {
      bodyTilt = Math.sin(this._autoActionPhase * 0.56) * 0.18;
      bodyOffsetY = Math.sin(this._autoActionPhase * 0.22) * 3.2 * am;
    } else if (this.autoAction === 'noodleWave') {
      bodyOffsetX = Math.sin(this._autoActionPhase * 0.18) * 7.2 * am;
      bodyOffsetY = Math.sin(this._autoActionPhase * 0.27) * 2.5 * am;
      bodyTilt = Math.cos(this._autoActionPhase * 0.2) * 0.12;
    } else if (this.autoAction === 'moonwalk') {
      bodyOffsetX = -Math.sin(this._autoActionPhase * 0.12) * 8.2 * am;
      bodyTilt = Math.sin(this._autoActionPhase * 0.12) * -0.08;
    } else if (this.autoAction === 'pancakeFlip') {
      bodyOffsetY = Math.sin(this._autoActionPhase * 0.34) * 6.4 * am;
      bodyTilt = Math.sin(this._autoActionPhase * 0.34) * 0.2;
      eyeSquint = 0.25;
    } else if (this.autoAction === 'sneakySlide') {
      bodyOffsetX = Math.sin(this._autoActionPhase * 0.17) * 9.2 * am;
      bodyOffsetY = Math.abs(Math.sin(this._autoActionPhase * 0.17)) * -2.1 * am;
      eyeSquint = 0.45;
    } else if (this.autoAction === 'dizzySpiral') {
      bodyOffsetX = Math.sin(this._autoActionPhase * 0.42) * 5.5 * am;
      bodyOffsetY = Math.cos(this._autoActionPhase * 0.42) * 5.5 * am;
      bodyTilt = Math.sin(this._autoActionPhase * 0.42) * 0.28;
    } else if (this.autoAction === 'rubberBand') {
      bodyOffsetY = Math.sin(this._autoActionPhase * 0.52) * 7.4 * am;
      bodyOffsetX = Math.sin(this._autoActionPhase * 0.26) * 3.2 * am;
    } else if (this.autoAction === 'penguinDrift') {
      bodyOffsetX = Math.sin(this._autoActionPhase * 0.14) * 10.2 * am;
      bodyTilt = Math.sin(this._autoActionPhase * 0.22) * 0.1;
    } else if (this.autoAction === 'mimeBox') {
      bodyOffsetX = Math.sin(this._autoActionPhase * 0.3) * 3.4 * am;
      bodyOffsetY = Math.cos(this._autoActionPhase * 0.3) * 2.4 * am;
      bodyTilt = Math.sign(Math.sin(this._autoActionPhase * 0.2)) * 0.06;
      eyeSquint = 0.55;
    }
    if (this.autoAction && this._chaosBurst) {
      bodyTilt += Math.sin(this._autoActionPhase * 0.95) * 0.22;
      bodyOffsetX += Math.cos(this._autoActionPhase * 0.77) * 4.8;
    }
    this._settleOffsetX = bodyOffsetX;
    this._settleOffsetY = bodyOffsetY;
    this._settleTilt = bodyTilt;

    ctx.translate(cx + bodyOffsetX, cy + bodyOffsetY);
    ctx.rotate(bodyTilt);
    if (macroDepth && (this._macroScaleK !== 1 || this._macroShear !== 0)) {
      const k = this._macroScaleK;
      ctx.scale(k, 2 - k);
      if (this._macroShear !== 0) {
        ctx.transform(1, 0, this._macroShear, 1, 0, 0);
      }
      ctx.rotate(Math.sin(this._autoActionPhase * 0.036) * 0.11);
    }
    ctx.scale(1 - happySquash, squash);

    const bodyRy = base * 0.42;
    const bodyRx = base * 0.48;

    const pal = this._getPetVariantPalette();
    // 身体渐变（按 lulu 规范，随 petVariantId 换色）
    const gBody = ctx.createRadialGradient(-bodyRx * 0.25, -bodyRy * 0.4, base * 0.08, 0, 0, base * 0.7);
    gBody.addColorStop(0, pal.body[0]);
    gBody.addColorStop(0.35, pal.body[1]);
    gBody.addColorStop(0.7, pal.body[2]);
    gBody.addColorStop(1, pal.body[3]);
    ctx.fillStyle = gBody;
    ctx.beginPath();
    ctx.ellipse(0, bodyRy * 0.18, bodyRx, bodyRy, 0, 0, Math.PI * 2);
    ctx.fill();

    // 肚子高光（白白嫩嫩）
    ctx.fillStyle = 'rgba(255, 254, 248, 0.75)';
    ctx.beginPath();
    ctx.ellipse(0, bodyRy * 0.22, bodyRx * 0.65, bodyRy * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();

    const shortsY = bodyRy * 0.55;
    const gShorts = ctx.createLinearGradient(0, shortsY - 12, 0, shortsY + 15);
    gShorts.addColorStop(0, pal.shorts[0]);
    gShorts.addColorStop(1, pal.shorts[1]);
    ctx.fillStyle = gShorts;
    ctx.beginPath();
    ctx.ellipse(0, shortsY, bodyRx * 0.72, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    const headR = base * 0.44;
    const hx = 0;
    const hy = -bodyRy * 0.78;

    const gHead = ctx.createRadialGradient(hx - headR * 0.32, hy - headR * 0.32, headR * 0.1, hx, hy, headR * 1.1);
    gHead.addColorStop(0, pal.head[0]);
    gHead.addColorStop(0.4, pal.head[1]);
    gHead.addColorStop(1, pal.head[2]);
    ctx.fillStyle = gHead;
    ctx.beginPath();
    ctx.arc(hx, hy, headR, 0, Math.PI * 2);
    ctx.fill();

    // 头顶高光（3D软胶质感）
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.ellipse(hx - headR * 0.28, hy - headR * 0.42, headR * 0.32, headR * 0.18, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // 头顶橘子（核心识别符号，1/6头部大小，居中）
    const orangeY = hy - headR * 1.06;
    const orangeR = headR * 0.17;
    const gOrange = ctx.createRadialGradient(hx - orangeR * 0.3, orangeY - orangeR * 0.25, orangeR * 0.2, hx, orangeY, orangeR);
    gOrange.addColorStop(0, pal.orange[0]);
    gOrange.addColorStop(0.5, pal.orange[1]);
    gOrange.addColorStop(1, pal.orange[2]);
    ctx.fillStyle = gOrange;
    ctx.beginPath();
    ctx.arc(hx, orangeY, orangeR, 0, Math.PI * 2);
    ctx.fill();
    // 橘子高光
    ctx.fillStyle = 'rgba(255, 240, 100, 0.65)';
    ctx.beginPath();
    ctx.ellipse(hx - orangeR * 0.4, orangeY - orangeR * 0.35, orangeR * 0.35, orangeR * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    // 绿色小蒂
    ctx.fillStyle = '#6AAF2A';
    ctx.beginPath();
    ctx.ellipse(hx, orangeY - orangeR * 0.95, orangeR * 0.22, orangeR * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    // 叶子
    ctx.strokeStyle = '#4A8A1A';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx, orangeY - orangeR * 0.85);
    ctx.quadraticCurveTo(hx + orangeR * 0.7, orangeY - orangeR * 1.4, hx + orangeR * 0.9, orangeY - orangeR * 1.0);
    ctx.stroke();

    // 大等级外观：让变身有明确造型差异
    const stage = this.getStage().id;
    if (stage === 'child' || stage === 'youth' || stage === 'adult') {
      const scarfY = hy + headR * 0.62;
      const scarfColor = stage === 'child' ? '#FFB35E' : stage === 'youth' ? '#FF8E5E' : '#7E5BFF';
      ctx.fillStyle = scarfColor;
      ctx.beginPath();
      ctx.ellipse(hx, scarfY, headR * 0.5, headR * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (stage === 'youth' || stage === 'adult') {
      const starY = hy - headR * 0.58;
      ctx.fillStyle = 'rgba(255, 238, 170, 0.95)';
      ctx.beginPath();
      ctx.arc(hx, starY, headR * 0.055, 0, Math.PI * 2);
      ctx.fill();
    }
    if (stage === 'adult') {
      ctx.strokeStyle = 'rgba(126, 91, 255, 0.62)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(hx, hy - headR * 0.18, headR * 0.9, 0.12 * Math.PI, 0.88 * Math.PI);
      ctx.stroke();
    }

    // 超大圆钝口鼻（占脸部1/2以上）
    const snoutY = hy + headR * 0.18;
    const gSnout = ctx.createRadialGradient(hx, snoutY - headR * 0.12, headR * 0.08, hx, snoutY, headR * 0.7);
    gSnout.addColorStop(0, '#FFCC66');
    gSnout.addColorStop(0.4, '#FFB030');
    gSnout.addColorStop(0.75, '#FF9500');
    gSnout.addColorStop(1, '#E88200');
    ctx.fillStyle = gSnout;
    ctx.beginPath();
    ctx.ellipse(hx, snoutY, headR * 0.68, headR * 0.56, 0, 0, Math.PI * 2);
    ctx.fill();
    // 口鼻高光
    ctx.fillStyle = 'rgba(255, 240, 128, 0.4)';
    ctx.beginPath();
    ctx.ellipse(hx - headR * 0.2, snoutY - headR * 0.2, headR * 0.25, headR * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    // 超大圆眼睛（淡蓝虹膜）
    const eyeY = hy - headR * 0.08;
    const eyeOff = this.lookSide * headR * 0.1;
    const blink = this.blinkTimer > 0;
    const squint = eyeSquint > 0;
    if (!blink && !squint) {
      // 白色眼白
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.ellipse(hx - headR * 0.3 + eyeOff, eyeY, headR * 0.22, headR * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(hx + headR * 0.3 + eyeOff, eyeY, headR * 0.22, headR * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();

      // 淡蓝虹膜
      const gIris = ctx.createRadialGradient(hx - headR * 0.28 + eyeOff, eyeY - headR * 0.05, headR * 0.05, hx - headR * 0.3 + eyeOff, eyeY, headR * 0.18);
      gIris.addColorStop(0, '#C5E8F8');
      gIris.addColorStop(0.5, '#8ACCE8');
      gIris.addColorStop(1, '#5BADE0');
      ctx.fillStyle = gIris;
      ctx.beginPath();
      ctx.ellipse(hx - headR * 0.28 + eyeOff, eyeY + headR * 0.03, headR * 0.14, headR * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(hx + headR * 0.32 + eyeOff, eyeY + headR * 0.03, headR * 0.14, headR * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();

      // 黑色瞳孔
      ctx.fillStyle = '#1A1A2E';
      ctx.beginPath();
      ctx.ellipse(hx - headR * 0.28 + eyeOff, eyeY + headR * 0.05, headR * 0.08, headR * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(hx + headR * 0.32 + eyeOff, eyeY + headR * 0.05, headR * 0.08, headR * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();

      // 多层高光
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath();
      ctx.arc(hx - headR * 0.32 + eyeOff, eyeY - headR * 0.08, headR * 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(hx + headR * 0.28 + eyeOff, eyeY - headR * 0.08, headR * 0.05, 0, Math.PI * 2);
      ctx.fill();
      // 小高光
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.arc(hx - headR * 0.24 + eyeOff, eyeY + headR * 0.08, headR * 0.02, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(hx + headR * 0.36 + eyeOff, eyeY + headR * 0.08, headR * 0.02, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 眨眼（佛系呆萌）
      ctx.strokeStyle = '#C8A070';
      ctx.lineWidth = headR * 0.045;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx - headR * 0.48 + eyeOff, eyeY);
      ctx.quadraticCurveTo(hx - headR * 0.3 + eyeOff, eyeY - headR * 0.04, hx - headR * 0.1 + eyeOff, eyeY);
      ctx.moveTo(hx + headR * 0.1 + eyeOff, eyeY);
      ctx.quadraticCurveTo(hx + headR * 0.3 + eyeOff, eyeY - headR * 0.04, hx + headR * 0.48 + eyeOff, eyeY);
      ctx.stroke();
    }

    // 卖萌眯眼：两条弧线
    if (squint) {
      ctx.strokeStyle = '#C8A070';
      ctx.lineWidth = headR * 0.06;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(hx - headR * 0.28 + eyeOff, eyeY, headR * 0.18, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(hx + headR * 0.28 + eyeOff, eyeY, headR * 0.18, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
    }

    // 呆萌无辜眼神（半眯）
    ctx.strokeStyle = 'rgba(200, 160, 112, 0.45)';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx - headR * 0.58, eyeY - headR * 0.18);
    ctx.quadraticCurveTo(hx - headR * 0.35, eyeY - headR * 0.25, hx - headR * 0.12, eyeY - headR * 0.14);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(hx + headR * 0.12, eyeY - headR * 0.14);
    ctx.quadraticCurveTo(hx + headR * 0.35, eyeY - headR * 0.25, hx + headR * 0.58, eyeY - headR * 0.18);
    ctx.stroke();

    // 小巧半圆形耳朵（浅黄色）
    ctx.fillStyle = '#FFE4C4';
    ctx.beginPath();
    ctx.ellipse(hx - headR * 0.82, hy - headR * 0.52, headR * 0.14, headR * 0.1, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFD9A8';
    ctx.beginPath();
    ctx.ellipse(hx - headR * 0.82, hy - headR * 0.52, headR * 0.08, headR * 0.06, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFE4C4';
    ctx.beginPath();
    ctx.ellipse(hx + headR * 0.82, hy - headR * 0.52, headR * 0.14, headR * 0.1, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFD9A8';
    ctx.beginPath();
    ctx.ellipse(hx + headR * 0.82, hy - headR * 0.52, headR * 0.08, headR * 0.06, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // 表情：平时微笑，吃掉能量时张嘴+咀嚼
    const chewing = this._eatFxFrames > 0;
    if (chewing) {
      const chewP = this._eatFxFrames / 44;
      const open = 0.08 + Math.abs(Math.sin((1 - chewP) * Math.PI * 9.5)) * 0.16;
      ctx.fillStyle = '#8C3C00';
      ctx.beginPath();
      ctx.ellipse(hx, snoutY + headR * 0.33, headR * 0.12, headR * open, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 190, 140, 0.78)';
      ctx.beginPath();
      ctx.ellipse(hx, snoutY + headR * 0.35, headR * 0.06, headR * open * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = '#C07000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx - headR * 0.12, snoutY + headR * 0.32);
      ctx.quadraticCurveTo(hx, snoutY + headR * 0.38, hx + headR * 0.12, snoutY + headR * 0.32);
      ctx.stroke();
    }

    // 短粗圆手
    ctx.fillStyle = '#FFD9A8';
    ctx.beginPath();
    ctx.ellipse(hx - bodyRx * 0.88, bodyRy * 0.35, bodyRx * 0.18, bodyRx * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFE4C4';
    ctx.beginPath();
    ctx.ellipse(hx - bodyRx * 0.9, bodyRy * 0.32, bodyRx * 0.09, bodyRx * 0.065, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFD9A8';
    ctx.beginPath();
    ctx.ellipse(hx + bodyRx * 0.88, bodyRy * 0.35, bodyRx * 0.18, bodyRx * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFE4C4';
    ctx.beginPath();
    ctx.ellipse(hx + bodyRx * 0.9, bodyRy * 0.32, bodyRx * 0.09, bodyRx * 0.065, 0, 0, Math.PI * 2);
    ctx.fill();

    // 短粗圆脚
    ctx.fillStyle = '#FFCF7F';
    ctx.beginPath();
    ctx.ellipse(hx - bodyRx * 0.5, bodyRy * 0.95, bodyRx * 0.22, bodyRx * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFE4C4';
    ctx.beginPath();
    ctx.ellipse(hx - bodyRx * 0.52, bodyRy * 0.92, bodyRx * 0.1, bodyRx * 0.065, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFCF7F';
    ctx.beginPath();
    ctx.ellipse(hx + bodyRx * 0.5, bodyRy * 0.95, bodyRx * 0.22, bodyRx * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFE4C4';
    ctx.beginPath();
    ctx.ellipse(hx + bodyRx * 0.52, bodyRy * 0.92, bodyRx * 0.1, bodyRx * 0.065, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  onGoalCompleted() {
    this.say(pick(TASK_PRAISE), 110);
    /** 略提高一点动作意愿，但仍佛系，避免做完任务就狂演 */
    this._goalBoostFrames = 90;
    this._eatFxFrames = 44;
    this.mood = 'happy';
    this.moodTimer = Math.max(this.moodTimer, 68);
    if (!this.autoAction && Math.random() < 0.34) {
      let act;
      if (Math.random() < 0.035) {
        act = pick(AUTO_MACRO_IDS);
      } else {
        act = pickWeightedPairs(
          scaleWeightTable(
            [
              ['cute', 8],
              ['nod', 8],
              ['stretch', 7],
              ['sway', 7],
              ['walk', 5],
              ['hop', 3],
              ['cheer', 3],
            ],
            this.motionTier === 'high' ? 1.15 : this.motionTier === 'low' ? 0.85 : 1,
          ),
        );
      }
      this.autoAction = act;
      this.autoActionTimer = AUTO_ACTION_CONFIG[this.autoAction].duration;
      this._autoActionPhase = 0;
      this._lastAutoAction = act;
    }
  }

  onGoalConsumed() {
    this._eatFxFrames = Math.max(this._eatFxFrames, 38);
    this.hopVy = Math.min(this.hopVy, -3.2);
  }

  onLevelUp({ level, majorEvolution }) {
    this.level = level || this.level;
    this.mood = 'happy';
    this.moodTimer = 96;
    this._levelUpFxFrames = majorEvolution ? 88 : 56;
    if (majorEvolution) {
      this._transformFxFrames = 128;
      this.say('进化完成！我变得更强啦！', 138);
      this.playCoolAction('transform');
    }
  }

  _drawPetBack(ctx, cx, cy, base) {
    const squash = 1 + Math.sin(this.petFrame * 0.08) * 0.02;
    const macroDepth = this.autoAction === 'macroDepth';

    ctx.save();
    ctx.translate(cx, cy);
    if (macroDepth && (this._macroScaleK !== 1 || this._macroShear !== 0)) {
      const k = this._macroScaleK;
      ctx.scale(k, 2 - k);
      if (this._macroShear !== 0) {
        ctx.transform(1, 0, this._macroShear, 1, 0, 0);
      }
      ctx.rotate(Math.sin(this._autoActionPhase * 0.036) * 0.09);
    }
    ctx.scale(1, squash);

    const bodyRy = base * 0.44;
    const bodyRx = base * 0.48;
    const palB = this._getPetVariantPalette();
    // 背部渐变与皮肤一致
    const gBody = ctx.createRadialGradient(0, -bodyRy * 0.5, bodyRx * 0.2, 0, 0, bodyRx * 0.8);
    gBody.addColorStop(0, palB.body[2]);
    gBody.addColorStop(1, palB.body[3]);
    ctx.fillStyle = gBody;
    ctx.beginPath();
    ctx.ellipse(0, bodyRy * 0.14, bodyRx, bodyRy, 0, 0, Math.PI * 2);
    ctx.fill();

    // 背部高光
    ctx.fillStyle = 'rgba(255, 254, 248, 0.5)';
    ctx.beginPath();
    ctx.ellipse(-bodyRx * 0.15, -bodyRy * 0.3, bodyRx * 0.45, bodyRy * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    const shortsY = bodyRy * 0.5;
    const gShorts = ctx.createLinearGradient(0, shortsY - 10, 0, shortsY + 12);
    gShorts.addColorStop(0, palB.shorts[0]);
    gShorts.addColorStop(1, palB.shorts[1]);
    ctx.fillStyle = gShorts;
    ctx.beginPath();
    ctx.ellipse(0, shortsY, bodyRx * 0.7, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    const headR = base * 0.42;
    const hy = -bodyRy * 0.75;

    const gHead = ctx.createRadialGradient(0, hy - headR * 0.2, headR * 0.3, 0, hy, headR);
    gHead.addColorStop(0, palB.head[1]);
    gHead.addColorStop(1, palB.head[2]);
    ctx.fillStyle = gHead;
    ctx.beginPath();
    ctx.arc(0, hy, headR, 0, Math.PI * 2);
    ctx.fill();

    // 耳朵背面
    const earS = 0.85 + Math.abs(this.turnSmooth) * 0.15;
    ctx.fillStyle = '#FFE4C4';
    ctx.beginPath();
    ctx.ellipse(-headR * 0.82 * earS, hy - headR * 0.5, headR * 0.14, headR * 0.1, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFD9A8';
    ctx.beginPath();
    ctx.ellipse(-headR * 0.82 * earS, hy - headR * 0.5, headR * 0.08, headR * 0.06, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFE4C4';
    ctx.beginPath();
    ctx.ellipse(headR * 0.82 * earS, hy - headR * 0.5, headR * 0.14, headR * 0.1, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFD9A8';
    ctx.beginPath();
    ctx.ellipse(headR * 0.82 * earS, hy - headR * 0.5, headR * 0.08, headR * 0.06, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // 背面头顶橘子
    const orangeY = hy - headR * 1.06;
    const orangeR = headR * 0.17;
    const gOrange = ctx.createRadialGradient(-orangeR * 0.3, orangeY - orangeR * 0.3, orangeR * 0.2, 0, orangeY, orangeR);
    gOrange.addColorStop(0, '#FFCC44');
    gOrange.addColorStop(1, '#E89400');
    ctx.fillStyle = gOrange;
    ctx.beginPath();
    ctx.arc(0, orangeY, orangeR, 0, Math.PI * 2);
    ctx.fill();
    // 橘子高光
    ctx.fillStyle = 'rgba(255, 240, 100, 0.6)';
    ctx.beginPath();
    ctx.ellipse(-orangeR * 0.3, orangeY - orangeR * 0.3, orangeR * 0.3, orangeR * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    // 绿蒂
    ctx.fillStyle = '#6AAF2A';
    ctx.beginPath();
    ctx.ellipse(0, orangeY - orangeR * 0.9, orangeR * 0.18, orangeR * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  _drawLevelAura(ctx, cx, cy, base) {
    if (this._levelUpFxFrames <= 0 && this._transformFxFrames <= 0) return;
    const auraP = this._levelUpFxFrames > 0 ? this._levelUpFxFrames / 88 : 0;
    const tfP = this._transformFxFrames > 0 ? this._transformFxFrames / 128 : 0;
    const ringR = base * (0.95 + Math.sin(this.petFrame * 0.12) * 0.05);
    const alpha = Math.max(auraP * 0.45, tfP * 0.58);
    ctx.save();
    ctx.strokeStyle = tfP > 0 ? `rgba(126, 91, 255, ${alpha})` : `rgba(255, 208, 120, ${alpha})`;
    ctx.lineWidth = tfP > 0 ? 4.8 : 3.4;
    ctx.beginPath();
    ctx.arc(cx, cy - base * 0.2, ringR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = tfP > 0 ? `rgba(166, 140, 255, ${alpha * 0.7})` : `rgba(255, 236, 170, ${alpha * 0.65})`;
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.arc(cx, cy - base * 0.2, ringR * 0.82, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  _drawSpeechBubble(ctx, cx, topY, maxW, text) {
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    const lines = this._wrapText(ctx, text, maxW - 28);
    const lineH = 18;
    const padX = 14;
    const padY = 10;
    const maxLineW = lines.length ? Math.max(...lines.map((l) => ctx.measureText(l).width), 40) : 40;
    const bw = Math.min(maxW, maxLineW + padX * 2);
    const bh = lines.length * lineH + padY * 2;
    const bx = cx - bw / 2;
    const by = topY - bh - 8;

    ctx.save();
    // 暖白气泡
    ctx.fillStyle = 'rgba(255, 252, 248, 0.98)';
    ctx.strokeStyle = 'rgba(255, 179, 71, 0.5)';
    ctx.lineWidth = 2;
    canvasRoundRect(ctx, bx, by, bw, bh, 16);
    ctx.fill();
    ctx.stroke();

    // 气泡小尾巴
    ctx.fillStyle = 'rgba(255, 252, 248, 0.98)';
    ctx.beginPath();
    ctx.moveTo(cx - 7, by + bh);
    ctx.lineTo(cx + 7, by + bh);
    ctx.lineTo(cx, by + bh + 12);
    ctx.closePath();
    ctx.fill();

    // 暖棕色文字
    ctx.fillStyle = '#5B4A3A';
    lines.forEach((line, i) => {
      ctx.fillText(line, bx + padX, by + padY + 14 + i * lineH);
    });
    ctx.restore();
  }

  _wrapText(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return [text];
    const out = [];
    let cur = '';
    for (const ch of text) {
      const t = cur + ch;
      if (ctx.measureText(t).width > maxWidth && cur) {
        out.push(cur);
        cur = ch;
      } else {
        cur = t;
      }
    }
    if (cur) out.push(cur);
    return out.length ? out : [text];
  }

  // ========== 酷炫动作 ==========

  playCoolAction(actionId, callback) {
    this._coolActionId = actionId;
    this._coolActionFrame = 0;
    this._coolActionCallback = callback || null;
    const allActions = [
      ...COOL_ACTIONS.normal,
      ...COOL_ACTIONS.advanced,
      ...COOL_ACTIONS.ultimate,
    ];
    const action = allActions.find(a => a.id === actionId);
    this._coolActionDuration = action ? action.duration : 120;
  }

  _drawCoolAction(ctx, cx, cy, base) {
    if (!this._coolActionId) return;
    const progress = this._coolActionFrame / this._coolActionDuration;
    const id = this._coolActionId;

    ctx.save();
    if (id === 'heartbeat') {
      const scale = 1 + Math.sin(progress * Math.PI * 6) * 0.08 * (1 - progress);
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);
    } else if (id === 'dance') {
      const swing = Math.sin(progress * Math.PI * 4) * 0.1;
      ctx.translate(cx, cy);
      ctx.rotate(swing);
      ctx.translate(-cx, -cy);
    } else if (id === 'backflip') {
      const angle = progress * Math.PI * 2;
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.translate(-cx, -cy);
    } else if (id === 'rainbow') {
      const alpha = Math.sin(progress * Math.PI) * 0.8;
      ctx.fillStyle = `rgba(255,100,200,${alpha * 0.3})`;
      ctx.beginPath();
      ctx.arc(cx, cy - base * 0.8, base * 0.6 * progress, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'takeoff') {
      const lift = Math.sin(progress * Math.PI) * base * 0.3;
      ctx.translate(0, -lift);
    } else if (id === 'supersugar') {
      const alpha = Math.sin(progress * Math.PI);
      ctx.fillStyle = `rgba(255,50,100,${alpha * 0.4})`;
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + progress * Math.PI;
        const r = base * 0.5 * (0.5 + progress * 0.5);
        ctx.beginPath();
        ctx.arc(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, base * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (id === 'royal') {
      const glow = Math.sin(progress * Math.PI) * 0.3;
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = base * 0.5 * progress;
    } else if (id === 'transform') {
      const pulse = 1 + Math.sin(progress * Math.PI * 2) * 0.1;
      ctx.translate(cx, cy);
      ctx.scale(pulse, pulse);
      ctx.translate(-cx, -cy);
      ctx.globalAlpha = 0.5 + Math.sin(progress * Math.PI) * 0.5;
    } else if (id === 'universe') {
      const alpha = Math.sin(progress * Math.PI);
      ctx.fillStyle = `rgba(100,50,200,${alpha * 0.3})`;
      ctx.fillRect(0, 0, 400, 700);
    }
    ctx.restore();

    this._coolActionFrame++;
    if (this._coolActionFrame >= this._coolActionDuration) {
      if (this._coolActionCallback) this._coolActionCallback();
      this._coolActionId = null;
      this._coolActionFrame = 0;
    }
  }
}

module.exports = Lulu;
