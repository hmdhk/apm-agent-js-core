var PerformanceMonitoring = require('./performance-monitoring')
var TransactionService = require('./transaction-service')
var ZoneService = require('./zone-service')

module.exports = {
  PerformanceMonitoring: PerformanceMonitoring,
  initServiceFactory: function initServiceFactory (serviceFactory) {
    var configService = serviceFactory.getService('ConfigService')
    var loggingService = serviceFactory.getService('LoggingService')

    serviceFactory.registerServiceCreator('ZoneService', function () {
      return new ZoneService(loggingService, configService)
    })

    serviceFactory.registerServiceCreator('TransactionService', function () {
      var zoneService = serviceFactory.getService('ZoneService')
      return new TransactionService(zoneService, loggingService, configService)
    })

    serviceFactory.registerServiceCreator('PerformanceMonitoring', function () {
      var apmService = serviceFactory.getService('ApmServer')
      var zoneService = serviceFactory.getService('ZoneService')
      var transactionService = serviceFactory.getService('TransactionService')
      return new PerformanceMonitoring(apmService, configService, loggingService, zoneService, transactionService)
    })
  }
}
