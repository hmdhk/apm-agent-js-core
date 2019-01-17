const path = require('path')
const testUtils = require('./test')
const saucelabs = require('./saucelabs')
const { generateNotice } = require('./dep-info')

function runUnitTests (launchSauceConnect) {
  var testConfig = testUtils.getTestEnvironmentVariables()
  testConfig.karmaConfigFile = path.join(__dirname, './../karma.conf.js')
  if (launchSauceConnect !== 'false') {
    return testUtils.runUnitTests(testConfig)
  } else {
    testUtils.runKarma(testConfig.karmaConfigFile)
  }
}

function runScript (scripts, scriptName, scriptArgs) {
  if (scriptName) {
    var message = `Running: ${scriptName}(${scriptArgs.map(a => "'" + a + "'").join(', ')}) \n`
    console.log(message)
    if (typeof scripts[scriptName] === 'function') {
      return scripts[scriptName].apply(this, scriptArgs)
    } else {
      throw new Error('No script with name ' + scriptName)
    }
  }
}

var scripts = {
  runUnitTests,
  generateNotice,
  launchSauceConnect: function launchSauceConnect () {
    var env = testUtils.getTestEnvironmentVariables()
    saucelabs.launchSauceConnect(env.sauceLabs, function () {
      console.log('Launched SauceConnect!')
    })
  }
}

runScript(scripts, process.argv[2], [].concat(process.argv).slice(3))
