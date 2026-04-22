const { callAction, callActionOrThrow } = require('./client');

function sendCheer(payload) {
  return callAction('sendCheer', payload);
}

function getCheerInbox(payload) {
  return callAction('getCheerInbox', payload);
}

module.exports = {
  sendCheer,
  getCheerInbox,
  sendCheerOrThrow: (p) => callActionOrThrow('sendCheer', p),
};
