function buildInboxSnapshot(source) {
  const payload = source && typeof source === 'object' ? source : {};
  const cheerItems = Array.isArray(payload.cheerItems) ? payload.cheerItems : [];
  const visitItems = Array.isArray(payload.visitItems) ? payload.visitItems : [];
  const pendingItems = Array.isArray(payload.pendingItems) ? payload.pendingItems : [];

  return {
    cheerCount: cheerItems.length,
    visitCount: visitItems.length,
    pendingCount: pendingItems.length,
    unreadCount: cheerItems.length + visitItems.length + pendingItems.length,
    cheerItems,
    visitItems,
    pendingItems,
  };
}

async function fetchInboxSnapshot() {
  try {
    const { getCheerInbox } = require('./cloud/cheer');
    const { listVisitorsToday } = require('./cloud/visit');
    const [cheerRes, visitRes] = await Promise.all([
      getCheerInbox({ pageSize: 20 }),
      listVisitorsToday({ pageSize: 20 }),
    ]);

    const cheerItems = cheerRes && cheerRes.success && cheerRes.data
      ? (cheerRes.data.items || cheerRes.data.list || [])
      : [];
    const visitItems = visitRes && visitRes.success && visitRes.data
      ? (visitRes.data.items || visitRes.data.list || [])
      : [];

    return buildInboxSnapshot({
      cheerItems: cheerItems.slice(0, 10).map((item, idx) => ({
        nickName: item.nickName || item.fromNickName || '好友',
        createdAt: item.createdAt || Date.now(),
        fromOpenId: item.fromOpenId || item.openId || item.uid || '',
        id: item.id || `cheer_${item.fromOpenId || item.openId || item.uid || 'na'}_${idx}`,
      })),
      visitItems: visitItems.slice(0, 10).map((item, idx) => ({
        nickName: item.nickName || item.visitorNickName || '好友',
        createdAt: item.createdAt || Date.now(),
        visitorOpenId: item.visitorOpenId || item.openId || item.uid || '',
        id: item.id || `visit_${item.visitorOpenId || item.openId || item.uid || 'na'}_${idx}`,
      })),
      pendingItems: [],
    });
  } catch (e) {
    return buildInboxSnapshot(null);
  }
}

module.exports = {
  buildInboxSnapshot,
  fetchInboxSnapshot,
};
