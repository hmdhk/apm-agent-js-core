const utils = require('../common/utils')
class SpanBase {
  // context

  constructor (name, type, options) {
    this.name = name
    this.type = type
    this.options = options || {}
    this.id = this.options.id || utils.generateRandomId(16)
    this.traceId = this.options.traceId
    this.sampled = this.options.sampled
    this.timestamp = this.options.timestamp || Date.now()
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
}

module.exports = SpanBase
