var ApmServer = require('../../src/common/apm-server')
var Transaction = require('../../src/performance-monitoring/transaction')
var createServiceFactory = require('..').createServiceFactory

function generateTransaction (count) {
  var result = []
  for (var i = 0;i < count;i++) {
    result.push(new Transaction('transaction #' + i, 'transaction', {}))
  }
  return result
}
describe('ApmServer', function () {
  var serviceFactory
  var apmServer
  var configService
  var loggingService
  beforeEach(function () {
    serviceFactory = createServiceFactory()
    configService = serviceFactory.getService('ConfigService')
    loggingService = serviceFactory.getService('LoggingService')
    apmServer = serviceFactory.getService('ApmServer')
  })

  it('should not send transctions when the list is empty', function () {
    spyOn(apmServer, '_postJson')
    var result = apmServer.sendTransactions([])
    expect(result).toBeUndefined()
    expect(apmServer._postJson).not.toHaveBeenCalled()
  })

  it('should report http errors', function (done) {
    var apmServer = new ApmServer(configService, loggingService)
    configService.setConfig({
      serverUrl: 'http://localhost:54321',
      serviceName: 'test-service'
    })
    var result = apmServer.sendTransactions([{test: 'test'}])
    expect(result).toBeDefined()
    result.then(function () {
      fail('Request should have failed!')
    }, function (reason) {
      expect(reason).toBeDefined()
      done()
    })
  })

  it('should check config validity before making request to the server', function () {
    spyOn(apmServer, '_postJson')
    spyOn(loggingService, 'warn')
    spyOn(loggingService, 'debug')
    expect(configService.isValid()).toBe(false)

    var result = apmServer.sendTransactions([{test: 'test'}])
    expect(result).toBeUndefined()
    expect(apmServer._postJson).not.toHaveBeenCalled()
    expect(loggingService.warn).toHaveBeenCalled()
    expect(loggingService.debug).not.toHaveBeenCalled()

    loggingService.warn.calls.reset()
    var result = apmServer.sendErrors([{test: 'test'}])
    expect(result).toBeUndefined()
    expect(apmServer._postJson).not.toHaveBeenCalled()
    expect(loggingService.warn).not.toHaveBeenCalled()
    expect(loggingService.debug).toHaveBeenCalled()

    configService.setConfig({serviceName: 'serviceName'})
    expect(configService.isValid()).toBe(true)
    apmServer.sendTransactions([{test: 'test'}])
    expect(apmServer._postJson).toHaveBeenCalled()
    expect(loggingService.warn).not.toHaveBeenCalled()
  })

  it('should queue items', function () {
    spyOn(loggingService, 'warn').and.callThrough()
    configService.setConfig({
      serviceName: 'serviceName',
      throttlingRequestLimit: 1
    })
    expect(configService.isValid()).toBe(true)
    spyOn(apmServer, '_postJson').and.callThrough()
    spyOn(apmServer, '_makeHttpRequest').and.callThrough()
    apmServer.init()
    spyOn(apmServer, '_throttledMakeRequest').and.callThrough()

    var trs = generateTransaction(19)
    trs.forEach(apmServer.addTransaction.bind(apmServer))
    expect(apmServer.transactionQueue.items.length).toBe(19)
    expect(apmServer._postJson).not.toHaveBeenCalled()
    trs = generateTransaction(1)
    trs.forEach(apmServer.addTransaction.bind(apmServer))

    expect(apmServer._postJson).toHaveBeenCalled()
    expect(apmServer._makeHttpRequest).toHaveBeenCalled()
    expect(apmServer.transactionQueue.items.length).toBe(0)

    apmServer._makeHttpRequest.calls.reset()
    loggingService.warn.calls.reset()
    trs = generateTransaction(20)
    trs.forEach(apmServer.addTransaction.bind(apmServer))
    expect(apmServer._throttledMakeRequest).toHaveBeenCalled()
    expect(loggingService.warn).toHaveBeenCalledWith('ElasticAPM: Dropped request to http://localhost:8200/v1/client-side/transactions due to throttling!')
    expect(apmServer._makeHttpRequest).not.toHaveBeenCalled()
  })

  it('should init queue if not initialized before', function (done) {
    configService.setConfig({flushInterval: 200})
    spyOn(apmServer, 'sendErrors')
    spyOn(apmServer, 'sendTransactions')

    expect(apmServer.errorQueue).toBeUndefined()
    apmServer.addError({})
    expect(apmServer.errorQueue).toBeDefined()

    expect(apmServer.transactionQueue).toBeUndefined()
    apmServer.addTransaction({})
    expect(apmServer.transactionQueue).toBeDefined()

    expect(apmServer.sendErrors).not.toHaveBeenCalled()
    expect(apmServer.sendTransactions).not.toHaveBeenCalled()

    apmServer.init()

    expect(apmServer.sendErrors).toHaveBeenCalled()
    expect(apmServer.sendTransactions).toHaveBeenCalled()

    apmServer.sendErrors.calls.reset()
    apmServer.sendTransactions.calls.reset()

    apmServer.addTransaction({})
    apmServer.addError({})

    apmServer.init()

    expect(apmServer.sendErrors).not.toHaveBeenCalled()
    expect(apmServer.sendTransactions).not.toHaveBeenCalled()

    setTimeout(() => {
      expect(apmServer.sendErrors).toHaveBeenCalled()
      expect(apmServer.sendTransactions).toHaveBeenCalled()
      done()
    }, 300)
  })

  it('should report http errors', function (done) {
    spyOn(loggingService, 'debug').and.callThrough()
    var apmServer = new ApmServer(configService, loggingService)
    var _sendErrors = apmServer.sendErrors
    apmServer.sendErrors = function () {
      var result = _sendErrors.apply(apmServer, arguments)
      result.then(function () {
        fail('Request should have failed!')
      }, function () {
        setTimeout(() => {
          expect(loggingService.debug)
            .toHaveBeenCalledWith('Failed sending errors!', jasmine.objectContaining({}))
          done()
        })
      })
      return result
    }
    configService.setConfig({
      serverUrl: 'http://localhost:54321',
      serviceName: 'test-service'
    })
    apmServer.addError([{test: 'test'}])

    expect(loggingService.debug).not.toHaveBeenCalled()
    apmServer.errorQueue.flush()
  })
})
