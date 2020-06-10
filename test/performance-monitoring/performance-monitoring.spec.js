var createServiceFactory = require('..').createServiceFactory
var Transaction = require('../../src/performance-monitoring/transaction')
var Trace = require('../../src/performance-monitoring/trace')
var apmTestConfig = require('../apm-test-config')()

describe('PerformanceMonitoring', function () {
  var serviceFactory
  var apmServer
  var performanceMonitoring
  var configService
  var logger

  beforeEach(function () {
    serviceFactory = createServiceFactory()
    configService = serviceFactory.getService('ConfigService')
    logger = serviceFactory.getService('LoggingService')
    configService.setConfig(apmTestConfig)

    apmServer = serviceFactory.getService('ApmServer')
    performanceMonitoring = serviceFactory.getService('PerformanceMonitoring')
  })
  it('should send performance monitoring data to apm-server', function () {

    // performanceMonitoring._transactionService
    var tr = new Transaction('tr-name', 'tr-type', configService.config, logger)
    var trace1 = new Trace('trace 1', 'test-trace')
    trace1.end()
    tr.traces.push(trace1)
    tr.end()
    var payload = performanceMonitoring.convertTransactionsToServerModel([tr])
    apmServer.sendTransactions(payload)
  })

  it('should group small continuously similar traces up until the last one', function () {
    var tr = new Transaction('transaction', 'transaction')
    var trace1 = tr.startTrace('signature', 'type')
    trace1.end()
    var trace2 = tr.startTrace('signature', 'type')
    trace2.end()
    var trace3 = tr.startTrace('another-signature', 'type')
    trace3.end()
    var trace4 = tr.startTrace('signature', 'type')
    trace4.end()
    var trace5 = tr.startTrace('signature', 'type')
    trace5.end()

    tr.end()

    tr._rootTrace._start = 10
    tr._rootTrace._end = 1000

    trace1._start = 20
    trace1._end = 30

    trace2._start = 31
    trace2._end = 35

    trace3._start = 35
    trace3._end = 45

    trace4._start = 50
    trace4._end = 60

    trace5._start = 61
    trace5._end = 70

    tr.traces.sort(function (traceA, traceB) {
      return traceA._start - traceB._start
    })
    var grouped = performanceMonitoring.groupSmallContinuouslySimilarTraces(tr, 0.05)

    expect(grouped.length).toBe(4)
    expect(grouped[0].signature).toBe('transaction')
    expect(grouped[1].signature).toBe('2x signature')
    expect(grouped[2].signature).toBe('another-signature')
    expect(grouped[3].signature).toBe('2x signature')
  })

  it('should group small continuously similar traces', function () {
    var tr = new Transaction('transaction', 'transaction', { 'performance.enableStackFrames': true })
    var trace1 = tr.startTrace('signature', 'type')
    trace1.end()
    var trace2 = tr.startTrace('signature', 'type')
    trace2.end()
    var trace3 = tr.startTrace('signature', 'type')
    trace3.end()
    var trace4 = tr.startTrace('signature', 'type')
    trace4.end()
    var trace5 = tr.startTrace('another-signature', 'type')
    trace5.end()

    tr.end()

    tr._rootTrace._start = 10
    tr._rootTrace._end = 1000

    trace1._start = 20
    trace1._end = 30

    trace2._start = 31
    trace2._end = 35

    trace3._start = 35
    trace3._end = 45

    trace4._start = 50
    trace4._end = 60

    trace5._start = 60
    trace5._end = 70

    tr.traces.sort(function (traceA, traceB) {
      return traceA._start - traceB._start
    })

    var grouped = performanceMonitoring.groupSmallContinuouslySimilarTraces(tr, 0.05)

    expect(grouped.length).toBe(3)
    expect(grouped[0].signature).toBe('transaction')
    expect(grouped[1].signature).toBe('4x signature')
    expect(grouped[2].signature).toBe('another-signature')
  })

  it('should calculate browser responsiveness', function () {
    var tr = new Transaction('transaction', 'transaction', { 'performance.enableStackFrames': true })
    tr.end()

    tr._rootTrace._start = 1

    tr._rootTrace._end = 400
    tr.browserResponsivenessCounter = 0
    var resp = performanceMonitoring.checkBrowserResponsiveness(tr, 500, 2)
    expect(resp).toBe(true)

    tr._rootTrace._end = 1001
    tr.browserResponsivenessCounter = 2
    resp = performanceMonitoring.checkBrowserResponsiveness(tr, 500, 2)
    expect(resp).toBe(true)

    tr._rootTrace._end = 1601
    tr.browserResponsivenessCounter = 2
    resp = performanceMonitoring.checkBrowserResponsiveness(tr, 500, 2)
    expect(resp).toBe(true)

    tr._rootTrace._end = 3001
    tr.browserResponsivenessCounter = 3
    resp = performanceMonitoring.checkBrowserResponsiveness(tr, 500, 2)
    expect(resp).toBe(false)
  })
})
