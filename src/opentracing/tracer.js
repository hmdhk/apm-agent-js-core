const ot = require('opentracing')
const Noop = require('opentracing/lib/noop')
const Span = require('./span')
const utils = require('../common/utils')

class Tracer extends ot.Tracer {
  constructor (performanceMonitoring, transactionService, loggingService, errorLogging) {
    super()
    this.performanceMonitoring = performanceMonitoring
    this.transactionService = transactionService
    this.loggingService = loggingService
    this.errorLogging = errorLogging
  }

  _startSpan (name, options) {
    var spanOptions = {}
    if (options) {
      spanOptions.timestamp = options.startTime
      if (options.childOf) {
        spanOptions.parentId = options.childOf.id
      } else if (options.references && options.references.length > 0) {
        if (options.references.length > 1) {
          this.loggingService.debug(
            'Elastic APM OpenTracing: Unsupported number of references, only the first childOf reference will be recorded.'
          )
        }

        var childRef = options.references.find(function (ref) {
          return ref.type() === ot.REFERENCE_CHILD_OF
        })
        if (childRef) {
          spanOptions.parentId = childRef.referencedContext().id
        }
      }
    }

    var span
    if (this.transactionService.getCurrentTransaction()) {
      span = this.transactionService.startSpan(name, undefined, spanOptions)
    } else {
      span = this.transactionService.startTransaction(name, undefined, spanOptions)
    }

    if (!span) {
      return Noop.span
    }

    if (spanOptions.timestamp) {
      span._start = spanOptions.timestamp - utils.getTimeOrigin()
    }
    var otSpan = new Span(this, span)
    if (options && options.tags) {
      otSpan.addTags(options.tags)
    }
    return otSpan
  }

  _inject (spanContext, format, carrier) {
    switch (format) {
      case ot.FORMAT_TEXT_MAP:
      case ot.FORMAT_HTTP_HEADERS:
        this.performanceMonitoring.injectDtHeader(spanContext, carrier)
        break
      case ot.FORMAT_BINARY:
        break
    }
  }

  _extract (format, carrier) {
    var ctx
    switch (format) {
      case ot.FORMAT_TEXT_MAP:
      case ot.FORMAT_HTTP_HEADERS:
        ctx = this.performanceMonitoring.extractDtHeader(carrier)
        break
      case ot.FORMAT_BINARY:
        break
    }

    if (!ctx) {
      ctx = null
    }
    return ctx
  }
}

module.exports = Tracer
