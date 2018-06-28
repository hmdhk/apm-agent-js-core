// export public core APIs.

var ErrorLogging = require('./error-logging')
var PerformanceMonitoring = require('./performance-monitoring')

var ServiceFactory = require('./common/service-factory')
var utils = require('./common/utils')
module.exports = {
  createServiceFactory: function () {
    var serviceFactory = new ServiceFactory()
    serviceFactory.registerCoreServices()
    ErrorLogging.registerServices(serviceFactory)
    PerformanceMonitoring.registerServices(serviceFactory)
    return serviceFactory
  },
  ServiceFactory: ServiceFactory,
  utils: utils
}
