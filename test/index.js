var createServiceFactory = require('..').createServiceFactory
module.exports = {
  createServiceFactory: function () {
    var serviceFactory = createServiceFactory()
    if (window.globalConfigs && window.globalConfigs.useMocks) {
      var apmServer = serviceFactory.getService('ApmServer')
      apmServer._makeHttpRequest = function () {
        return Promise.resolve()
      }
    }
    return serviceFactory
  }
}
