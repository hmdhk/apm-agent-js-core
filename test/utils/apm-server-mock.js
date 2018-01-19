var Subscription = require('../../src/common/subscription')
class ApmServerMock {
  constructor (apmServer) {
    var subscription = this.subscription = new Subscription()
    var _apmServer = this._apmServer = apmServer
    var calls = this.calls = {}

    function captureCall (methodName, call) {
      if (calls[methodName]) {
        calls[methodName].push(call)
      }else {
        calls[methodName] = [call]
      }
      subscription.applyAll(this, [call])
    }
    function applyMock (methodName, captureFn) {
      var args = Array.prototype.slice.call(arguments)
      args.splice(0, 2)
      var result
      var mocked = false
      if (_apmServer) {
        result = _apmServer[methodName].apply(_apmServer, args)
      }else {
        result = Promise.resolve()
        mocked = true
      }
      var call = {args: args, mocked: mocked}
      captureFn(methodName, call)
      return result
    }

    function spyOn (service, methodName) {
      var _orig = service[methodName]
      return service[methodName] = function () {
        var args = Array.prototype.slice.call(arguments)
        var call = {args: args,mocked: false}
        captureCall(methodName, call)
        return _orig.apply(service, arguments)
      }
    }

    this.sendErrors = _apmServer ?
      spyOn(_apmServer, 'sendErrors') :
      applyMock.bind(_apmServer, 'sendErrors', captureCall)
    this.sendTransactions = _apmServer ?
      spyOn(_apmServer, 'sendTransactions') :
      applyMock.bind(_apmServer, 'sendTransactions', captureCall)

    this.addError = applyMock.bind(_apmServer, 'addError', captureCall)
    this.addTransaction = applyMock.bind(_apmServer, 'addTransaction', captureCall)
  }
  init () {}
}

module.exports = ApmServerMock
