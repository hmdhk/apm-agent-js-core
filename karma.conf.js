var karmaUtils = require('./dev-utils/karma.js')
var testUtils = require('./dev-utils/test.js')

module.exports = function (config) {
  config.set(karmaUtils.baseConfig)
  var env = testUtils.getTestEnvironmentVariables()
  var customConfig = {
    globalConfigs: {
      useMocks: false,
      agentConfig: {
        serverUrl: 'http://localhost:8200',
        serviceName: 'test',
        serviceVersion: 'test-version',
        agentName: 'apm-js-core',
        agentVersion: '0.0.1'
      }
    },
    testConfig: env
  }

  if (env.serverUrl) {
    customConfig.globalConfigs.agentConfig.serverUrl = env.serverUrl
  }

  console.log('customConfig:', JSON.stringify(customConfig, undefined, 2))
  config.set(customConfig)
  config.files.unshift('test/utils/polyfill.js')
  config.files.unshift('node_modules/es6-promise/dist/es6-promise.auto.js')
  // config.files.push({ pattern: 'test/exceptions/data/*.js', included: false, watched: false })
  config.files.push({ pattern: 'src/**/*.js', included: false, watched: true })

  var cfg = karmaUtils.prepareConfig(config)
  config.set(cfg)
}
