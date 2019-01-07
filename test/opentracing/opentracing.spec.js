const apiCompatibilityChecks = require('./api_compatibility').default

const ElasticTracer = require('../../src/opentracing/tracer')
const createServiceFactory = require('..').createServiceFactory

apiCompatibilityChecks(
  () => {
    var serviceFactory = createServiceFactory()
    var performanceMonitoring = serviceFactory.getService('PerformanceMonitoring')
    var transactionService = serviceFactory.getService('TransactionService')
    var errorLogging = serviceFactory.getService('ErrorLogging')
    var configService = serviceFactory.getService('ConfigService')
    configService.setConfig({
      active: true
    })
    return new ElasticTracer(performanceMonitoring, transactionService, errorLogging)
  },
  { skipBaggageChecks: true }
)
