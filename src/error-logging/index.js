var ErrorLogging = require('./error-logging')

module.exports = {
  ErrorLogging: ErrorLogging,
  initServiceFactory: function initServiceFactory (serviceFactory) {
    serviceFactory.registerServiceCreator('ErrorLogging', function () {
      var apmService = serviceFactory.getService('ApmServer')
      var configService = serviceFactory.getService('ConfigService')
      return new ErrorLogging(apmService, configService)
    })
  }
}
