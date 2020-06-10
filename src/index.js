// export public core APIs.

var ErrorLogging = require('./error-logging')
var PerformanceMonitoring = require('./performance-monitoring')

var ServiceFactory = require('./common/service-factory')
module.exports = {
  createServiceFactory: function () {
    var serviceFactory = new ServiceFactory()
    serviceFactory.init()
    ErrorLogging.initServiceFactory(serviceFactory)
    PerformanceMonitoring.initServiceFactory(serviceFactory)
    return serviceFactory
  },
  ServiceFactory: ServiceFactory,
  patchCommon: require('./common/patching/patch-common')
}
