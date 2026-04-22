const { callAction, callActionOrThrow } = require('./client');

function followUser(payload) {
  return callAction('followUser', payload);
}

function unfollowUser(payload) {
  return callAction('unfollowUser', payload);
}

function listFollowing(payload) {
  return callAction('listFollowing', payload);
}

function getFriendFeed(payload) {
  return callAction('getFriendFeed', payload);
}

module.exports = {
  followUser,
  unfollowUser,
  listFollowing,
  getFriendFeed,
  followUserOrThrow: (p) => callActionOrThrow('followUser', p),
  unfollowUserOrThrow: (p) => callActionOrThrow('unfollowUser', p),
};
