const utils = require('../common/utils')
class SpanBase {
  // context

  constructor (name, type, options) {
    this.options = options || {}
    this.name = name || this.options.name || 'Unknown'
    this.type = type || this.options.type || 'custom'
    this.id = this.options.id || utils.generateRandomId(16)
    this.traceId = this.options.traceId
    this.sampled = this.options.sampled
    this.timestamp = this.options.timestamp || Date.now()
    this.ended = false
    this._start = window.performance.now()
    this._end = undefined
    this.onEnd = this.options.onEnd
  }

  ensureContext () {
    if (!this.context) {
      this.context = {}
    }
  }

  addTags (tags) {
    this.ensureContext()
    var ctx = this.context
    if (!ctx.tags) {
      ctx.tags = {}
    }
    var keys = Object.keys(tags)
    keys.forEach(function (k) {
      utils.setTag(k, tags[k], ctx.tags)
    })
  }

  addContext (context) {
    if (!context) return
    this.ensureContext()
    utils.merge(this.context, context)
  }

  end () {
    if (this.ended) {
      return
    }
    this.ended = true
    this._end = window.performance.now()

    this.callOnEnd()
  }

  callOnEnd () {
    if (typeof this.onEnd === 'function') {
      this.onEnd(this)
    }
  }

  duration () {
    if (utils.isUndefined(this._end) || utils.isUndefined(this._start)) {
      return null
    }

    var diff = this._end - this._start

    return parseFloat(diff)
  }
}

module.exports = SpanBase
