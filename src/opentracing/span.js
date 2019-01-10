const { Span: otSpan } = require('opentracing/lib/span')
const { extend, getTimeOrigin } = require('../common/utils')
const Transaction = require('../performance-monitoring/transaction')

class Span extends otSpan {
  constructor (tracer, span) {
    super()
    this.__tracer = tracer
    this.span = span
    this.isTransaction = span instanceof Transaction
    this.spanContext = {
      id: span.id,
      traceId: span.traceId,
      sampled: span.sampled
    }
  }

  _context () {
    return this.spanContext
  }

  _tracer () {
    return this.__tracer
  }

  _setOperationName (name) {
    this.span.name = name
  }

  _addTags (keyValuePairs) {
    var tags = extend({}, keyValuePairs)
    if (tags.type) {
      this.span.type = tags.type
      delete tags.type
    }

    if (this.isTransaction) {
      const userId = tags['user.id']
      const username = tags['user.username']
      const email = tags['user.email']
      if (userId || username || email) {
        this.span.addContext({
          user: {
            id: userId,
            username,
            email
          }
        })
        delete tags['user.id']
        delete tags['user.username']
        delete tags['user.email']
      }
    }

    this.span.addTags(tags)
  }

  _log (log, timestamp) {
    if (log.event === 'error') {
      if (log['error.object']) {
        this.__tracer.errorLogging.logError(log['error.object'])
      } else if (log.message) {
        this.__tracer.errorLogging.logError(log.message)
      }
    }
  }

  _finish (finishTime) {
    this.span.end()
    if (finishTime) {
      this.span._end = finishTime - getTimeOrigin()
    }
  }
}

module.exports = Span
