/**
 * 单入口云函数：event.action + event.payload
 * 与 docs/.../2026-04-22-好友激励与四宠物首启设计-design.md 第 15 节对齐。
 */
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

const USERS = 'users';
const FOLLOWS = 'follows';
const CHEER_LOGS = 'cheer_logs';
const VISIT_LOGS = 'visit_logs';
const SHARE_LINKS = 'share_links';

const INTERACTION_ACTIONS = [
  { actionId: 'cheer_clap_01', category: 'cheer', tease: false },
  { actionId: 'cheer_flag_01', category: 'cheer', tease: false },
  { actionId: 'pk_sprint_01', category: 'pk', tease: false },
  { actionId: 'pk_jump_01', category: 'pk', tease: false },
  { actionId: 'tease_face_01', category: 'tease', tease: true },
];

function ok(data, idempotent) {
  const out = { success: true, data: data == null ? {} : data };
  if (idempotent) out.idempotent = true;
  return out;
}

function fail(code, message) {
  return { success: false, code, message: message || code };
}

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const OPENID = wxContext.OPENID;
  const action = event && event.action;
  const payload = (event && event.payload) || {};

  try {
    switch (action) {
      case 'upsertUserProfile':
        return await handleUpsertUserProfile(OPENID, payload);
      case 'getUserSummary':
        return await handleGetUserSummary(OPENID, payload);
      case 'followUser':
        return await handleFollowUser(OPENID, payload);
      case 'unfollowUser':
        return await handleUnfollowUser(OPENID, payload);
      case 'listFollowing':
        return await handleListFollowing(OPENID, payload);
      case 'getFriendFeed':
        return await handleGetFriendFeed(OPENID, payload);
      case 'getHostPublicPage':
        return await handleGetHostPublicPage(OPENID, payload);
      case 'resolveSceneToken':
        return await handleResolveSceneToken(OPENID, payload);
      case 'recordVisitInteraction':
        return await handleRecordVisit(OPENID, payload);
      case 'sendCheer':
        return await handleSendCheer(OPENID, payload);
      case 'listVisitorsToday':
        return await handleListVisitorsToday(OPENID, payload);
      case 'getCheerInbox':
        return await handleGetCheerInbox(OPENID, payload);
      default:
        return fail('INVALID_PARAM', 'unknown action');
    }
  } catch (e) {
    console.error('[luluApi]', action, e);
    return fail('INTERNAL', e.message || 'INTERNAL');
  }
};

async function handleUpsertUserProfile(OPENID, payload) {
  if (!OPENID) return fail('UNAUTH', '需要登录');
  const {
    nickName, avatarUrl, petVariantId, petName, petTeaseEnabled,
  } = payload;
  const doc = {
    openId: OPENID,
    updatedAt: Date.now(),
  };
  if (nickName != null) doc.nickName = String(nickName).slice(0, 32);
  if (avatarUrl != null) doc.avatarUrl = String(avatarUrl).slice(0, 512);
  if (petVariantId != null) doc.petVariantId = Math.max(0, Math.min(3, Number(petVariantId) || 0));
  if (petName != null) doc.petName = String(petName).slice(0, 16);
  if (typeof petTeaseEnabled === 'boolean') doc.petTeaseEnabled = petTeaseEnabled;

  await db.collection(USERS).doc(OPENID).set({ data: doc });
  return ok({ saved: true });
}

async function handleGetUserSummary(OPENID, payload) {
  if (!OPENID) return fail('UNAUTH', '需要登录');
  const targetId = payload.openId || OPENID;
  if (targetId !== OPENID) {
    return fail('INVALID_PARAM', '仅可查自己；查他人请用 getHostPublicPage');
  }
  let u;
  try {
    const res = await db.collection(USERS).doc(targetId).get();
    u = res.data;
  } catch (e) {
    return fail('HOST_NOT_FOUND', '用户不存在');
  }
  if (!u) {
    return fail('HOST_NOT_FOUND', '用户不存在');
  }
  return ok({
    openId: targetId,
    nickName: u.nickName || '',
    avatarUrl: u.avatarUrl || '',
    petVariantId: u.petVariantId != null ? u.petVariantId : 0,
    petName: u.petName || '',
    level: u.level != null ? u.level : 1,
    todayDoneCount: u.todayDoneCount != null ? u.todayDoneCount : 0,
    streakDays: u.streakDays != null ? u.streakDays : 0,
    petTeaseEnabled: u.petTeaseEnabled !== false,
  });
}

async function handleFollowUser(OPENID, payload) {
  if (!OPENID) return fail('UNAUTH', '需要登录');
  const followeeOpenId = payload.followeeOpenId;
  if (!followeeOpenId) return fail('INVALID_PARAM', '缺少 followeeOpenId');
  if (followeeOpenId === OPENID) return fail('FOLLOW_SELF', '不能关注自己');
  const exist = await db.collection(FOLLOWS)
    .where({ followerOpenId: OPENID, followeeOpenId })
    .count();
  if (exist.total > 0) return ok({ following: true }, true);
  await db.collection(FOLLOWS).add({
    data: {
      followerOpenId: OPENID,
      followeeOpenId,
      createdAt: Date.now(),
    },
  });
  return ok({ following: true });
}

async function handleUnfollowUser(OPENID, payload) {
  if (!OPENID) return fail('UNAUTH', '需要登录');
  const followeeOpenId = payload.followeeOpenId;
  if (!followeeOpenId) return fail('INVALID_PARAM', '缺少 followeeOpenId');
  const res = await db.collection(FOLLOWS)
    .where({ followerOpenId: OPENID, followeeOpenId })
    .get();
  if (!res.data || res.data.length === 0) return ok({ following: false }, true);
  await db.collection(FOLLOWS).doc(res.data[0]._id).remove();
  return ok({ following: false });
}

async function handleListFollowing(OPENID, payload) {
  if (!OPENID) return fail('UNAUTH', '需要登录');
  const limit = Math.min(50, Math.max(1, Number(payload.limit) || 20));
  const res = await db.collection(FOLLOWS)
    .where({ followerOpenId: OPENID })
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  return ok({ items: (res.data || []).map((d) => ({ followeeOpenId: d.followeeOpenId, createdAt: d.createdAt })) });
}

async function handleGetFriendFeed(OPENID, payload) {
  if (!OPENID) return fail('UNAUTH', '需要登录');
  const limit = Math.min(50, Math.max(1, Number(payload.limit) || 20));
  const f = await db.collection(FOLLOWS)
    .where({ followerOpenId: OPENID })
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  const rows = f.data || [];
  const key = todayKey();
  const items = [];
  for (const row of rows) {
    const id = row.followeeOpenId;
    const u = await db.collection(USERS).doc(id).get();
    const ud = u.data || {};
    const cheered = await db.collection(CHEER_LOGS)
      .where({ fromOpenId: OPENID, toOpenId: id, dateKey: key })
      .count();
    items.push({
      followeeOpenId: id,
      displayName: ud.petName || ud.nickName || '用户',
      avatarUrl: ud.avatarUrl || '',
      petVariantId: ud.petVariantId != null ? ud.petVariantId : 0,
      cheerGivenToday: cheered.total > 0,
    });
  }
  return ok({ items, nextCursor: null, hasMore: false });
}

async function handleGetHostPublicPage(OPENID, payload) {
  const hostOpenId = payload.hostOpenId;
  if (!hostOpenId) return fail('INVALID_PARAM', '缺少 hostOpenId');
  let ud;
  try {
    const u = await db.collection(USERS).doc(hostOpenId).get();
    ud = u.data;
  } catch (e) {
    return fail('HOST_NOT_FOUND', '用户不存在');
  }
  if (!ud) return fail('HOST_NOT_FOUND', '用户不存在');
  let isFollowing = false;
  if (OPENID) {
    const c = await db.collection(FOLLOWS)
      .where({ followerOpenId: OPENID, followeeOpenId: hostOpenId })
      .count();
    isFollowing = c.total > 0;
  }
  return ok({
    hostOpenId,
    displayName: ud.petName || ud.nickName || '小伙伴',
    avatarUrl: ud.avatarUrl || '',
    petVariantId: ud.petVariantId != null ? ud.petVariantId : 0,
    canFollow: hostOpenId !== OPENID,
    isFollowing,
    canVisit: hostOpenId !== OPENID,
    teaseEnabled: ud.petTeaseEnabled !== false,
  });
}

async function handleResolveSceneToken(OPENID, payload) {
  const token = payload.token;
  if (!token) return fail('INVALID_PARAM', '缺少 token');
  const one = await db.collection(SHARE_LINKS)
    .where({ token: String(token), revoked: false })
    .limit(1)
    .get();
  if (one.data && one.data.length) {
    const d = one.data[0];
    if (d.expiresAt && Date.now() > d.expiresAt) {
      return fail('INVALID_OR_EXPIRED_TOKEN', '链接已过期');
    }
    return ok({ hostOpenId: d.hostOpenId });
  }
  const users = await db.collection(USERS)
    .where({ publicLinkToken: String(token) })
    .limit(1)
    .get();
  if (users.data && users.data.length) {
    return ok({ hostOpenId: users.data[0]._id || users.data[0].openId });
  }
  return fail('INVALID_OR_EXPIRED_TOKEN', '无效 token');
}

function pickCategory({ teaseEnabled, isFirstVisit }) {
  if (isFirstVisit) return 'cheer';
  if (teaseEnabled === false) {
    const pCheer = 0.5 / 0.85;
    return Math.random() < pCheer ? 'cheer' : 'pk';
  }
  const r = Math.random();
  if (r < 0.5) return 'cheer';
  if (r < 0.85) return 'pk';
  return 'tease';
}

async function handleRecordVisit(OPENID, payload) {
  if (!OPENID) return fail('UNAUTH', '需要登录');
  const hostOpenId = payload.hostOpenId;
  if (!hostOpenId) return fail('INVALID_PARAM', '缺少 hostOpenId');
  if (hostOpenId === OPENID) return fail('VISIT_SELF', '不能访问自己');
  const entrySource = payload.entrySource || 'share_query';
  const dateK = todayKey();
  const hostU = await db.collection(USERS).doc(hostOpenId).get();
  if (!hostU.data) return fail('HOST_NOT_FOUND', '用户不存在');
  const teaseEnabled = hostU.data.petTeaseEnabled !== false;

  const firstQ = await db.collection(VISIT_LOGS)
    .where({ visitorOpenId: OPENID, hostOpenId, dateKey: dateK })
    .count();
  const isFirstVisit = firstQ.total === 0;

  const fullQ = await db.collection(VISIT_LOGS)
    .where({ visitorOpenId: OPENID, hostOpenId, dateKey: dateK, fullPlay: true })
    .count();
  const fullPlay = fullQ.total < 3;

  const category = pickCategory({ teaseEnabled, isFirstVisit });
  const pool = INTERACTION_ACTIONS.filter((a) => a.category === category && (category !== 'tease' || teaseEnabled));
  const action = pool[Math.floor(Math.random() * pool.length)] || INTERACTION_ACTIONS[0];
  const actionId = action.actionId;

  const dup = await db.collection(VISIT_LOGS)
    .where({
      visitorOpenId: OPENID,
      hostOpenId,
      dateKey: dateK,
      interactionActionId: actionId,
    })
    .count();
  if (dup.total > 0) {
    return ok({
      category,
      actionId,
      fullPlay,
      teaseDisabled: !teaseEnabled,
      firstVisitToHostToday: isFirstVisit,
      reward: null,
    }, true);
  }

  await db.collection(VISIT_LOGS).add({
    data: {
      visitorOpenId: OPENID,
      hostOpenId,
      dateKey: dateK,
      entrySource,
      interactionCategory: category,
      interactionActionId: actionId,
      fullPlay,
      createdAt: Date.now(),
    },
  });

  return ok({
    category,
    actionId,
    fullPlay,
    teaseDisabled: !teaseEnabled,
    firstVisitToHostToday: isFirstVisit,
    reward: isFirstVisit ? { type: 'visit_coin', value: 1 } : null,
  });
}

async function handleSendCheer(OPENID, payload) {
  if (!OPENID) return fail('UNAUTH', '需要登录');
  const toOpenId = payload.toOpenId;
  if (!toOpenId) return fail('INVALID_PARAM', '缺少 toOpenId');
  if (toOpenId === OPENID) return fail('CHEER_SELF', '不能给自己加油');
  const follow = await db.collection(FOLLOWS)
    .where({ followerOpenId: OPENID, followeeOpenId: toOpenId })
    .count();
  if (follow.total === 0) return fail('NOT_FOLLOWING', '需要先关注');
  const dateK = todayKey();
  const docId = `cheer_${OPENID}_${toOpenId}_${dateK}`.replace(/[/.]/g, '_');
  const exist = await db.collection(CHEER_LOGS).doc(docId).get();
  if (exist.data) {
    return ok({ rewardKind: 'mood', rewardValue: 2, dateKey: dateK }, true);
  }
  await db.collection(CHEER_LOGS).doc(docId).set({
    data: {
      fromOpenId: OPENID,
      toOpenId,
      dateKey: dateK,
      rewardType: 'mood',
      rewardValue: 2,
      createdAt: Date.now(),
    },
  });
  return ok({ rewardKind: 'mood', rewardValue: 2, toOpenId, dateKey: dateK });
}

async function handleListVisitorsToday(OPENID, payload) {
  if (!OPENID) return fail('UNAUTH', '需要登录');
  const dateK = todayKey();
  const res = await db.collection(VISIT_LOGS)
    .where({ hostOpenId: OPENID, dateKey: dateK })
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get();
  const byVisitor = {};
  for (const row of res.data || []) {
    const v = row.visitorOpenId;
    if (!byVisitor[v] || byVisitor[v].lastTime < row.createdAt) {
      byVisitor[v] = {
        visitorOpenId: v,
        lastTime: row.createdAt,
        category: row.interactionCategory,
        actionId: row.interactionActionId,
      };
    }
  }
  const items = [];
  for (const k of Object.keys(byVisitor)) {
    const u = await db.collection(USERS).doc(k).get();
    const ud = u.data || {};
    const b = byVisitor[k];
    items.push({
      visitorOpenId: k,
      displayName: ud.petName || ud.nickName || '访客',
      avatarUrl: ud.avatarUrl || '',
      petVariantId: ud.petVariantId != null ? ud.petVariantId : 0,
      lastTime: b.lastTime,
      interactionSummary: b.actionId
        ? { category: b.category, actionId: b.actionId }
        : undefined,
    });
  }
  return ok({ dateKey: dateK, items, nextCursor: null, hasMore: false });
}

async function handleGetCheerInbox(OPENID, payload) {
  if (!OPENID) return fail('UNAUTH', '需要登录');
  const dateK = payload.dateKey || todayKey();
  const res = await db.collection(CHEER_LOGS)
    .where({ toOpenId: OPENID, dateKey: dateK })
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();
  const items = [];
  for (const row of res.data || []) {
    const u = await db.collection(USERS).doc(row.fromOpenId).get();
    const ud = u.data || {};
    items.push({
      fromOpenId: row.fromOpenId,
      displayName: ud.petName || ud.nickName || '好友',
      avatarUrl: ud.avatarUrl || '',
      rewardKind: row.rewardType || 'mood',
      rewardValue: row.rewardValue != null ? row.rewardValue : 2,
      createdAt: row.createdAt,
    });
  }
  return ok({ dateKey: dateK, items, nextCursor: null, hasMore: false });
}
