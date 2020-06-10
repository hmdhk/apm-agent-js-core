var utils = require('../common/utils')

function Trace (signature, type, options) {
  var opts = options || {}
  if (typeof opts.onTraceEnd === 'function') {
    this.onTraceEnd = opts.onTraceEnd
  } else {
    this.onTraceEnd = function () {} // this.transaction._onTraceEnd
  }
  this.signature = signature
  this.type = type
  this.ended = false
  this._parent = null
  this._end = null

  // Start timers
  this._start = window.performance.now()
}

Trace.prototype.end = function () {
  this._end = window.performance.now()

  this.ended = true
  this.onTraceEnd(this)
}

Trace.prototype.duration = function () {
  if (utils.isUndefined(this.ended) || utils.isUndefined(this._start)) {
    return null
  }

  var diff = this._end - this._start

  return parseFloat(diff)
}

Trace.prototype.startTime = function () {
  if (!this.ended || !this.transaction.ended) {
    return null
  }

  return this._start
}

Trace.prototype.parent = function () {
  return this._parent
}

Trace.prototype.setParent = function (val) {
  this._parent = val
}

module.exports = Trace
