// export public core APIs.

var ErrorLogging = require('./error-logging')
var PerformanceMonitoring = require('./performance-monitoring')

var ServiceFactory = require('./common/service-factory')
var utils = require('./common/utils')
var patching = require('./common/patching')
module.exports = {
  createServiceFactory: function () {
    var serviceFactory = new ServiceFactory()
    serviceFactory.registerCoreServices()
    ErrorLogging.registerServices(serviceFactory)
    PerformanceMonitoring.registerServices(serviceFactory)
    return serviceFactory
  },
  ServiceFactory: ServiceFactory,
  patching: patching,
  utils: utils
}
