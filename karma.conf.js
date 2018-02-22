var karmaUtils = require('./dev-utils/karma.js')
var testUtils = require('./dev-utils/test.js')

module.exports = function (config) {
  // temporarily set firefox version to 44 due to apm-server#676 issue
  karmaUtils.baseConfig.customLaunchers.SL_FIREFOX.version = '44'
  config.set(karmaUtils.baseConfig)
  var testConfig = testUtils.getTestConfig()
  testConfig.agentConfig
  var customConfig = {
    globalConfigs: {
      useMocks: testConfig.useMocks,
      agentConfig: {
        serverUrl: testConfig.agentConfig.serverUrl,
        serviceName: 'apm-agent-js-core-test',
        serviceVersion: 'test-version',
        agentName: 'apm-js-core',
        agentVersion: '0.0.1'
      }
    },
    testConfig: testConfig.env
  }

  console.log('customConfig:', customConfig)
  config.set(customConfig)
  config.files.unshift('test/utils/polyfill.js')
  // config.files.unshift('node_modules/elastic-apm-js-zone/dist/zone.js')
  config.files.unshift('node_modules/es6-promise/dist/es6-promise.auto.js')
  // config.files.push({ pattern: 'test/exceptions/data/*.js', included: false, watched: false })
  config.files.push({ pattern: 'src/**/*.js', included: false, watched: true })

  var cfg = karmaUtils.prepareConfig(config)
  config.set(cfg)
}
