const { callAction, callActionOrThrow } = require('./client');

function getHostPublicPage(payload) {
  return callAction('getHostPublicPage', payload);
}

function recordVisitInteraction(payload) {
  return callAction('recordVisitInteraction', payload);
}

function listVisitorsToday(payload) {
  return callAction('listVisitorsToday', payload);
}

module.exports = {
  getHostPublicPage,
  recordVisitInteraction,
  listVisitorsToday,
  getHostPublicPageOrThrow: (p) => callActionOrThrow('getHostPublicPage', p),
  recordVisitInteractionOrThrow: (p) => callActionOrThrow('recordVisitInteraction', p),
};
