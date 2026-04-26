function buildSocialSnapshot(game) {
  const goalManager = game && game.goalManager ? game.goalManager : null;
  const commitments = goalManager ? goalManager.getTodayCommitments() : [];
  const completedCount = commitments.filter((item) => item && item.completed).length;

  let pulseLine = '今天还没有新动态';
  if (commitments.length > 0 && completedCount === 0) {
    pulseLine = '完成第一个目标，点亮好友脉冲';
  } else if (commitments.length > 0) {
    pulseLine = `你今天已完成 ${completedCount}/${commitments.length}`;
  }

  return {
    pulseLine,
    visitedCount: 0,
    cheerCount: 0,
    hasFreshPulse: completedCount > 0,
    followingCount: 0,
    feedCount: 0,
    feedItems: [],
  };
}

async function fetchSocialSnapshot() {
  try {
    const { listFollowing, getFriendFeed } = require('./cloud/social');
    const [followingRes, feedRes] = await Promise.all([
      listFollowing({ pageSize: 8 }),
      getFriendFeed({ pageSize: 8 }),
    ]);

    const followingItems = followingRes && followingRes.success && followingRes.data
      ? (followingRes.data.items || followingRes.data.list || [])
      : [];
    const feedItemsRaw = feedRes && feedRes.success && feedRes.data
      ? (feedRes.data.items || feedRes.data.list || [])
      : [];
    const feedItems = feedItemsRaw.slice(0, 8).map((item, idx) => ({
      nickName: item.nickName || item.petName || '好友',
      summary: item.summary || item.desc || item.text || '今天也在坚持',
      updatedAt: item.updatedAt || item.createdAt || Date.now(),
      hostOpenId: item.openId || item.hostOpenId || item.uid || '',
      id: item.id || `feed_${item.openId || item.hostOpenId || item.uid || 'na'}_${idx}`,
    }));

    let pulseLine = '今天还没有新动态';
    if (feedItems.length > 0) {
      const first = feedItems[0] || {};
      const nick = first.nickName || first.petName || '好友';
      pulseLine = `${nick} 今天也在坚持`;
    } else if (followingItems.length > 0) {
      pulseLine = `已关注 ${followingItems.length} 位伙伴`;
    }

    return {
      pulseLine,
      visitedCount: 0,
      cheerCount: 0,
      hasFreshPulse: feedItems.length > 0,
      followingCount: followingItems.length,
      feedCount: feedItems.length,
      feedItems,
    };
  } catch (e) {
    return {
      pulseLine: '动态同步中',
      visitedCount: 0,
      cheerCount: 0,
      hasFreshPulse: false,
      followingCount: 0,
      feedCount: 0,
      feedItems: [],
    };
  }
}

module.exports = {
  buildSocialSnapshot,
  fetchSocialSnapshot,
};
