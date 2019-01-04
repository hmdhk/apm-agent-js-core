const BaseSpan = require('./span-base')

class Span extends BaseSpan {
  constructor (name, type, options) {
    super(name, type, options)
    this.parentId = this.options.parentId
    this.subType = undefined
    this.action = undefined
    if (this.type.indexOf('.') !== -1) {
      var fields = this.type.split('.', 3)
      this.type = fields[0]
      this.subType = fields[1]
      this.action = fields[2]
    }
    this.sync = this.options.sync
  }
}

module.exports = Span
