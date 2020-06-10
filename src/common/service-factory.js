var ApmServer = require('./apm-server')
var ConfigService = require('./config-service')
var Logger = require('loglevel')

var patchUtils = require('./patching/patch-utils')
var utils = require('./utils')
class ServiceFactory {
  constructor () {
    this._serviceCreators = {}
    this._serviceInstances = {}
  }
  init () {
    var serviceFactory = this

    this.registerServiceCreator('ConfigService', function () {
      var configService = new ConfigService()
      configService.init()
      return configService
    })

    this.registerServiceCreator('ApmServer', function () {
      return new ApmServer(serviceFactory.getService('ConfigService'))
    })

    function setLogLevel (loggingService, configService) {
      if (configService.get('debug') === true && configService.config.logLevel !== 'trace') {
        loggingService.setLevel('debug', false)
      } else {
        loggingService.setLevel(configService.get('logLevel'), false)
      }
    }

    var configService = serviceFactory.getService('ConfigService')
    setLogLevel(Logger, configService)
    configService.subscribeToChange(function (newConfig) {
      setLogLevel(Logger, configService)
    })

    this.registerServiceInstance('LoggingService', Logger)
    this.registerServiceInstance('PatchUtils', patchUtils)
    this.registerServiceInstance('Utils', utils)
  }

  registerServiceCreator (name, creator) {
    this._serviceCreators[name] = creator
  }

  registerServiceInstance (name, instance) {
    this._serviceInstances[name] = instance
  }

  getService (name) {
    if (!this._serviceInstances[name]) {
      if (typeof this._serviceCreators[name] === 'function') {
        this._serviceInstances[name] = this._serviceCreators[name](this)
      } else {
        throw new Error('Can not get service, No creator for: ' + name)
      }
    }
    return this._serviceInstances[name]
  }
}

module.exports = ServiceFactory
