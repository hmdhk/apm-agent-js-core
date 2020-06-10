var karmaUtils = require('./dev-utils/karma.js')

module.exports = function (config) {
  config.set(karmaUtils.baseConfig)
  var customeConfig = {
    globalConfigs: {
      useMocks: false,
      agentConfig: {
        apiOrigin: 'http://localhost:8200',
        appName: 'test',
        agentName: 'apm-js-core',
        agentVersion: '0.0.1'
      }
    },
    testConfig: {
      sauceLabs: process.env.MODE && process.env.MODE.startsWith('saucelabs'),
      branch: process.env.TRAVIS_BRANCH,
      mode: process.env.MODE
    }
  }

  if (customeConfig.testConfig.sauceLabs) {
    customeConfig.globalConfigs.useMocks = true
  }
  config.set(customeConfig)
  config.files.unshift('test/utils/polyfill.js')
  config.files.unshift('node_modules/opbeat-zone/dist/zone.js')
  // config.files.push({ pattern: 'test/exceptions/data/*.js', included: false, watched: false })
  config.files.push({ pattern: 'src/**/*.js', included: false, watched: true })
  delete config.customLaunchers['SL_IOS8']

  var cfg = karmaUtils.prepareConfig(config)
  config.set(cfg)
}
