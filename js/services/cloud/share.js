const { callAction } = require('./client');

function resolveSceneToken(payload) {
  return callAction('resolveSceneToken', payload);
}

function createShareToken(payload) {
  return callAction('createShareToken', payload);
}

module.exports = {
  resolveSceneToken,
  createShareToken,
};
