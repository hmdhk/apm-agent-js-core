var ApmServer = require('../../src/common/apm-server')
var createServiceFactory = require('..').createServiceFactory

describe('ApmServer', function () {
  var serviceFactory
  var apmServer
  beforeEach(function () {
    serviceFactory = createServiceFactory()
    apmServer = serviceFactory.getService('ApmServer')
  })
  it('should not send transctions when the list is empty', function () {
    spyOn(apmServer, '_postJson')
    var result = apmServer.sendTransactions([])
    expect(result).toBeUndefined()
    expect(apmServer._postJson).not.toHaveBeenCalled()
  })
})
