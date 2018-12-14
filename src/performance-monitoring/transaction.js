const Span = require('./span')
const SpanBase = require('./span-base')

var utils = require('../common/utils')

class Transaction extends SpanBase {
  constructor (name, type, options, logger) {
    super()
    this.id = utils.generateRandomId(16)
    this.traceId = utils.generateRandomId()
    this.timestamp = undefined
    this.name = name
    this.type = type
    this.ended = false
    this._isDone = false
    this._logger = logger
    this._options = options || {}

    this.marks = undefined

    this.spans = []
    this._activeSpans = {}

    this._scheduledTasks = {}
    this.doneCallback = function noop () {}

    this._rootSpan = new Span('transaction', 'transaction')

    this.duration = this._rootSpan.duration.bind(this._rootSpan)
    this.nextAutoTaskId = 0

    this.isHardNavigation = false

    this.sampled = Math.random() <= this._options.transactionSampleRate
  }

  addNavigationTimingMarks () {
    var marks = utils.getNavigationTimingMarks()
    var paintMarks = utils.getPaintTimingMarks()
    if (marks) {
      var agent = {
        timeToFirstByte: marks.responseStart,
        domInteractive: marks.domInteractive,
        domComplete: marks.domComplete
      }
      if (paintMarks['first-contentful-paint']) {
        agent.firstContentfulPaint = paintMarks['first-contentful-paint']
      }
      this.addMarks({ navigationTiming: marks, agent })
    }
  }

  addMarks (obj) {
    this.marks = utils.merge(this.marks || {}, obj)
  }

  mark (key) {
    var skey = key.replace(/[.*]/g, '_')
    var now = window.performance.now() - this._rootSpan._start
    var custom = {}
    custom[skey] = now
    this.addMarks({ custom: custom })
  }

  redefine (name, type, options) {
    this.name = name
    this.type = type
    this._options = options
  }

  startSpan (name, type, options) {
    if (this.ended) {
      return
    }
    var transaction = this
    var opts = typeof options === 'undefined' ? {} : options

    opts.onSpanEnd = function (trc) {
      transaction._onSpanEnd(trc)
    }
    opts.traceId = this.traceId
    opts.sampled = this.sampled

    var span = new Span(name, type, opts)
    this._activeSpans[span.id] = span

    return span
  }

  isFinished () {
    var scheduledTasks = Object.keys(this._scheduledTasks)
    return scheduledTasks.length === 0
  }

  detectFinish () {
    if (this.isFinished()) this.end()
  }

  end () {
    if (this.ended) {
      return
    }
    this.ended = true

    // truncate active spans
    for (var sid in this._activeSpans) {
      var span = this._activeSpans[sid]
      span.type = span.type + '.truncated'
      span.end()
    }

    var metadata = utils.getPageMetadata()
    this.addContext(metadata)
    this._rootSpan.end()

    this._adjustStartToEarliestSpan()
    this._adjustEndToLatestSpan()
    this.doneCallback(this)
  }

  addTask (taskId) {
    // todo: should not accept more tasks if the transaction is alreadyFinished]
    if (typeof taskId === 'undefined') {
      taskId = 'autoId' + this.nextAutoTaskId++
    }
    this._scheduledTasks[taskId] = taskId
    return taskId
  }

  removeTask (taskId) {
    delete this._scheduledTasks[taskId]
    this.detectFinish()
  }

  addEndedSpans (existingSpans) {
    this.spans = this.spans.concat(existingSpans)
  }

  _onSpanEnd (span) {
    this.spans.push(span)
    span._scheduledTasks = Object.keys(this._scheduledTasks)
    // Remove span from _activeSpans
    delete this._activeSpans[span.id]
  }

  _adjustEndToLatestSpan () {
    var latestSpan = findLatestNonXHRSpan(this.spans)

    if (latestSpan) {
      this._rootSpan._end = latestSpan._end

      // set all spans that now are longer than the transaction to
      // be truncated spans
      for (var i = 0; i < this.spans.length; i++) {
        var span = this.spans[i]
        if (span._end > this._rootSpan._end) {
          span._end = this._rootSpan._end
          span.type = span.type + '.truncated'
        }
        if (span._start > this._rootSpan._end) {
          span._start = this._rootSpan._end
        }
      }
    }
  }

  _adjustStartToEarliestSpan () {
    var span = getEarliestSpan(this.spans)

    if (span && span._start < this._rootSpan._start) {
      this._rootSpan._start = span._start
    }
  }
}

function findLatestNonXHRSpan (spans) {
  var latestSpan = null
  for (var i = 0; i < spans.length; i++) {
    var span = spans[i]
    if (
      span.type &&
      span.type.indexOf('ext') === -1 &&
      span.type !== 'transaction' &&
      (!latestSpan || latestSpan._end < span._end)
    ) {
      latestSpan = span
    }
  }
  return latestSpan
}

function getEarliestSpan (spans) {
  var earliestSpan = null

  spans.forEach(function (span) {
    if (!earliestSpan) {
      earliestSpan = span
    }
    if (earliestSpan && earliestSpan._start > span._start) {
      earliestSpan = span
    }
  })

  return earliestSpan
}

module.exports = Transaction
