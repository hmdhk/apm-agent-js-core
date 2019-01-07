const ot = require('opentracing')
const utils = require('../common/utils')

class Span extends ot.Span {
  constructor (tracer, span) {
    super()
    this.tracer = tracer
    this.span = span
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
    return this.tracer
  }

  _setOperationName (name) {
    this.span.name = name
  }

  _addTags (keyValuePairs) {
    var tags = utils.extend({}, keyValuePairs)
    if (tags.type) {
      this.span.type = tags.type
      delete tags.type
    }

    const userId = tags['user.id']
    const username = tags['user.username']
    const email = tags['user.email']
    if (userId || username || email) {
      this.span.addContext({
        user: {
          id: userId,
          username: username,
          email: email
        }
      })
      delete tags['user.id']
      delete tags['user.username']
      delete tags['user.email']
    }

    this.span.addTags(tags)
  }

  _log (log, timestamp) {
    if (log.event === 'error') {
      if (log['error.object']) {
        this.tracer.errorLogging.logError(log['error.object'])
      } else if (log.message) {
        this.tracer.errorLogging.logError(log.message)
      }
    }
  }

  _finish (finishTime) {
    this.span.end()
    if (finishTime) {
      this.span._end = finishTime - utils.getTimeOrigin()
    }
  }
}

module.exports = Span
