// dependencies
// npm i --save-dev jasmine karma-sauce-launcher karma-failed-reporter karma-jasmine karma-spec-reporter webpack karma-webpack karma-chrome-launcher karma-sourcemap-loader babel-core babel-loader babel-preset-es2015 babel-plugin-istanbul
var baseLaunchers = {
  'SL_CHROME': {
    base: 'SauceLabs',
    browserName: 'chrome',
    version: '46'
  },
  'SL_FIREFOX': {
    base: 'SauceLabs',
    browserName: 'firefox',
    version: '42'
  },
  'SL_SAFARI9': {
    base: 'SauceLabs',
    browserName: 'safari',
    platform: 'OS X 10.11',
    version: '9.0'
  },
  'SL_IE11': {
    base: 'SauceLabs',
    browserName: 'internet explorer',
    platform: 'Windows 8.1',
    version: '11'
  },
  'SL_IE10': {
    base: 'SauceLabs',
    browserName: 'internet explorer',
    platform: 'Windows 2012',
    version: '10'
  },
  'SL_EDGE': {
    base: 'SauceLabs',
    browserName: 'microsoftedge',
    platform: 'Windows 10',
    version: '13'
  },
  'SL_ANDROID4.4': {
    base: 'SauceLabs',
    browserName: 'android',
    platform: 'Linux',
    version: '4.4'
  },
  'SL_IOS9': {
    base: 'SauceLabs',
    browserName: 'iphone',
    platform: 'OS X 10.10',
    version: '9.1'
  },
  'SL_IOS8': {
    base: 'SauceLabs',
    browserName: 'iphone',
    platform: 'OS X 10.10',
    version: '8.4'
  }
}

var specPattern = 'test/{*.spec.js,!(e2e)/*.spec.js}'

var baseConfig = {
  exclude: [
    'e2e/**/*.*'
  ],
  files: [
    specPattern
  ],
  frameworks: ['jasmine'],
  plugins: [
    'karma-sauce-launcher',
    'karma-failed-reporter',
    'karma-jasmine',
    'karma-spec-reporter',
    'karma-webpack',
    'karma-sourcemap-loader'
  ],
  webpack: {
    module: {
      loaders: [
        {
          test: /\.js$/,
          loader: 'babel-loader',
          query: {
            presets: ['babel-preset-es2015'].map(require.resolve)
          }
        }
      ]
    },
    devtool: 'inline-source-map'
  },
  browserNoActivityTimeout: 60000,
  customLaunchers: baseLaunchers,
  browsers: [],
  captureTimeout: 120000, // on saucelabs it takes some time to capture browser
  reporters: ['spec', 'failed'],
  sauceLabs: {
    testName: 'ApmJs',
    startConnect: false,
    recordVideo: false,
    recordScreenshots: true,
    options: {
      'selenium-version': '2.48.2',
      'command-timeout': 600,
      'idle-timeout': 600,
      'max-duration': 5400
    }
  }
}
function prepareConfig (defaultConfig) {
  defaultConfig.preprocessors = {}
  defaultConfig.preprocessors[specPattern] = ['webpack', 'sourcemap']

  var testConfig = defaultConfig.testConfig || {}
  var isTravis = process.env.TRAVIS
  var isSauce = testConfig
  var version = '' // userConfig.packageVersion || ''
  var buildId = 'ApmJs@' + version

  if (testConfig.mode) {
    console.log('mode: ' + testConfig.mode)
  }

  if (isTravis) {
    buildId = buildId + ' - TRAVIS #' + process.env.TRAVIS_BUILD_NUMBER + ' (' + process.env.TRAVIS_BUILD_ID + ')'
    // 'karma-chrome-launcher',
    defaultConfig.plugins.push('karma-firefox-launcher')
    defaultConfig.browsers.push('Firefox')
  } else {
    defaultConfig.plugins.push('karma-chrome-launcher')
    defaultConfig.browsers.push('Chrome')

    if (defaultConfig.coverage) {
      // istanbul code coverage
      defaultConfig.plugins.push('karma-coverage')

      var babelPlugins = defaultConfig.webpack.module.loaders[0].query.plugins || (defaultConfig.webpack.module.loaders[0].query.plugins = [])
      babelPlugins.push('istanbul')

      defaultConfig.coverageReporter = {
        includeAllSources: true,
        reporters: [
          {type: 'html', dir: 'coverage/'},
          {type: 'text-summary'}
        ],
        dir: 'coverage/'
      }
      defaultConfig.reporters.push('coverage')
    }
  // cfg.plugins.push('karma-phantomjs2-launcher')
  // cfg.browsers.push('PhantomJS2')
  }

  if (isSauce) {
    defaultConfig.concurrency = 3
    if (testConfig.branch === 'master') { // && process.env.TRAVIS_PULL_REQUEST !== 'false'
      defaultConfig.sauceLabs.build = buildId
      defaultConfig.sauceLabs.tags = ['master']
      console.log('saucelabs.build:', buildId)
    }
    defaultConfig.reporters = ['dots', 'saucelabs']
    defaultConfig.browsers = Object.keys(baseLaunchers)
    defaultConfig.transports = ['polling']
  }

  if (defaultConfig.globalConfigs) {
    var fs = require('fs')
    var dir = './tmp'
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir)
    }

    console.log('globalConfigs:', defaultConfig.globalConfigs)
    var globalConfigs = defaultConfig.globalConfigs
    fs.writeFileSync(dir + '/globals.js', 'window.globalConfigs = ' + JSON.stringify(globalConfigs) + ';', 'utf8')
    defaultConfig.files.unshift('tmp/globals.js')
  }
  return defaultConfig
}
module.exports = {
  prepareConfig: prepareConfig,
  baseConfig: baseConfig,
  baseLaunchers: baseLaunchers
}
