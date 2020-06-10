module.exports = function () {
  return globalConfigs && globalConfigs.agentConfig || {
      apiOrigin: 'http://localhost:8200',
      appName: 'test',
      agentName: 'apm-js-core',
      agentVersion: '0.0.1'
  }
}
