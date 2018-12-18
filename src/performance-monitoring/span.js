const utils = require('../common/utils')
const BaseSpan = require('./span-base')

class Span extends BaseSpan {
  constructor (name, type, options) {
    super(name, type, options)
    this.parentId = this.options.parentId
    this.onSpanEnd = this.options.onSpanEnd
    this.subType = undefined
    this.action = undefined
    if (type.indexOf('.') !== -1) {
      var fields = type.split('.', 3)
      this.type = fields[0]
      this.subType = fields[1]
      this.action = fields[2]
    }
    this.ended = false
    this._end = undefined
    this.sync = this.options.sync
    this._start = window.performance.now()
  }

  end () {
    if (this.ended) {
      return
    }

    this._end = window.performance.now()

    this.ended = true
    if (typeof this.onSpanEnd === 'function') {
      this.onSpanEnd(this)
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

module.exports = Span
