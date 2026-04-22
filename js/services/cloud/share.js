const { callAction } = require('./client');

function resolveSceneToken(payload) {
  return callAction('resolveSceneToken', payload);
}

module.exports = { resolveSceneToken };
