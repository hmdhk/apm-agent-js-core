const Tracer = require('./tracer')
const Span = require('./span')

function createTracer (serviceFactory) {
  var performanceMonitoring = serviceFactory.getService('PerformanceMonitoring')
  var transactionService = serviceFactory.getService('TransactionService')
  var errorLogging = serviceFactory.getService('ErrorLogging')
  var loggingService = serviceFactory.getService('LoggingService')
  return new Tracer(performanceMonitoring, transactionService, loggingService, errorLogging)
}

module.exports = {
  Span,
  Tracer,
  createTracer
}
