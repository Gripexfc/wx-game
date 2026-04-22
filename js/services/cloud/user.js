const { callAction, callActionOrThrow } = require('./client');

function upsertUserProfile(payload) {
  return callAction('upsertUserProfile', payload);
}

function getUserSummary(payload) {
  return callAction('getUserSummary', payload);
}

function upsertUserProfileOrThrow(payload) {
  return callActionOrThrow('upsertUserProfile', payload);
}

function getUserSummaryOrThrow(payload) {
  return callActionOrThrow('getUserSummary', payload);
}

module.exports = {
  upsertUserProfile,
  getUserSummary,
  upsertUserProfileOrThrow,
  getUserSummaryOrThrow,
};
