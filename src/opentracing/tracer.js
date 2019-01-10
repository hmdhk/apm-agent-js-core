const { Tracer: otTracer } = require('opentracing/lib/tracer')
const {
  REFERENCE_CHILD_OF,
  FORMAT_TEXT_MAP,
  FORMAT_HTTP_HEADERS,
  FORMAT_BINARY
} = require('opentracing/lib/constants')
const { Span: NoopSpan } = require('opentracing/lib/span')

const { getTimeOrigin, find } = require('../common/utils')
const Span = require('./span')

class Tracer extends otTracer {
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

        var childRef = find(options.references, function (ref) {
          return ref.type() === REFERENCE_CHILD_OF
        })
        if (childRef) {
          spanOptions.parentId = childRef.referencedContext().id
        }
      }
    }

    var span
    var currentTransaction = this.transactionService.getCurrentTransaction()

    if (currentTransaction && !currentTransaction.ended) {
      span = this.transactionService.startSpan(name, undefined, spanOptions)
    } else {
      span = this.transactionService.startTransaction(name, undefined, spanOptions)
    }

    if (!span) {
      return new NoopSpan()
    }

    if (spanOptions.timestamp) {
      span._start = spanOptions.timestamp - getTimeOrigin()
    }
    var otSpan = new Span(this, span)
    if (options && options.tags) {
      otSpan.addTags(options.tags)
    }
    return otSpan
  }

  _inject (spanContext, format, carrier) {
    switch (format) {
      case FORMAT_TEXT_MAP:
      case FORMAT_HTTP_HEADERS:
        this.performanceMonitoring.injectDtHeader(spanContext, carrier)
        break
      case FORMAT_BINARY:
        this.loggingService.debug(
          'Elastic APM OpenTracing: binary carrier format is not supported.'
        )
        break
    }
  }

  _extract (format, carrier) {
    var ctx
    switch (format) {
      case FORMAT_TEXT_MAP:
      case FORMAT_HTTP_HEADERS:
        ctx = this.performanceMonitoring.extractDtHeader(carrier)
        break
      case FORMAT_BINARY:
        this.loggingService.debug(
          'Elastic APM OpenTracing: binary carrier format is not supported.'
        )
        break
    }

    if (!ctx) {
      ctx = null
    }
    return ctx
  }
}

module.exports = Tracer
