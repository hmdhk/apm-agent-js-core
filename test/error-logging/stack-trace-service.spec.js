var StackTraceService = require('../../src/error-logging/stack-trace-service')
var createServiceFactory = require('..').createServiceFactory

describe('StackTraceService', function () {
  it('should produce correct number of frames', function (done) {
    var serviceFactory = createServiceFactory()
    var configService = serviceFactory.getService('ConfigService')
    var stackTraceService = new StackTraceService(configService)
    setTimeout(function () {
      try {
        throw new Error('test error')
      } catch(error) {
        var stackTraces = stackTraceService.createStackTraces({error})
        expect(stackTraces.length).toBe(4)
        done()
      }
    }, 1)
  })
})
