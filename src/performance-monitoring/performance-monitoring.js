class PerformanceMonitoring {
  constructor (apmServer, configService, loggingService, zoneService, transactionService) {
    this._apmServer = apmServer
    this._configService = configService
    this._logginService = loggingService
    this._zoneService = zoneService
    this._transactionService = transactionService
  }

  init () {
    this._zoneService.initialize(window.Zone.current)
    this.scheduleTransactionSend()
  }

  scheduleTransactionSend () {
    var logger = this._logginService
    var self = this
    var trService = this._transactionService

    setInterval(function () {
      var transactions = trService.getTransactions()
      if (transactions.length > 0) {
        var promise = self.sendTransactions(transactions)
        if (promise) {
          promise.then(undefined, function () {
            logger.debug('Failed sending transactions!')
          })
        }
        trService.clearTransactions()
      }
    }, 5000)
  }

  setTransactionContextInfo (transaction) {
    var context = this._configService.get('context')
    if (context) {
      transaction.addContextInfo(context)
    }
  }

  sendTransactions (transactions) {
    var performanceMonitoring = this
    var browserResponsivenessInterval = this._configService.get('browserResponsivenessInterval')
    var checkBrowserResponsiveness = this._configService.get('checkBrowserResponsiveness')

    transactions.forEach(function (transaction) {
      transaction.traces.sort(function (traceA, traceB) {
        return traceA._start - traceB._start
      })

      if (performanceMonitoring._configService.get('groupSimilarTraces')) {
        var similarTraceThreshold = performanceMonitoring._configService.get('similarTraceThreshold')
        transaction.traces = performanceMonitoring.groupSmallContinuouslySimilarTraces(transaction, similarTraceThreshold)
      }
      performanceMonitoring.setTransactionContextInfo(transaction)
    })

    var filterTransactions = transactions.filter(function (tr) {
      if (checkBrowserResponsiveness && !tr.isHardNavigation) {
        var buffer = performanceMonitoring._configService.get('browserResponsivenessBuffer')

        var duration = tr._rootTrace.duration()
        var wasBrowserResponsive = performanceMonitoring.checkBrowserResponsiveness(tr, browserResponsivenessInterval, buffer)
        if (!wasBrowserResponsive) {
          performanceMonitoring._logginService.debug('Transaction was discarded! browser was not responsive enough during the transaction.', ' duration:', duration, ' browserResponsivenessCounter:', tr.browserResponsivenessCounter, 'interval:', browserResponsivenessInterval)
          return false
        }
      }
      return true
    })

    var payload = this.convertTransactionsToServerModel(filterTransactions)
    this._logginService.debug('Sending Transactions to apm server.', transactions.length)

    // todo: check if transactions are already being sent
    var promise = this._apmServer.sendTransactions(payload)
    return promise
  }

  convertTransactionsToServerModel (transactions) {
    return transactions.map(function (transaction) {
      var traces = transaction.traces.map(function (trace) {
        return {
          name: trace.signature,
          type: trace.type,
          start: trace._start,
          duration: trace.duration()
        }
      })
      return {
        id: transaction.id,
        timestamp: transaction.timestamp,
        name: transaction.name,
        type: transaction.type,
        duration: transaction.duration(),
        traces: traces,
        context: transaction.contextInfo,
        unknownName: transaction.unknownName
      }
    })
  }

  groupSmallContinuouslySimilarTraces (transaction, threshold) {
    var transDuration = transaction.duration()
    var traces = []
    var lastCount = 1
    transaction.traces
      .forEach(function (trace, index) {
        if (traces.length === 0) {
          traces.push(trace)
        } else {
          var lastTrace = traces[traces.length - 1]

          var isContinuouslySimilar = lastTrace.type === trace.type &&
            lastTrace.signature === trace.signature &&
            trace.duration() / transDuration < threshold &&
            (trace._start - lastTrace._end) / transDuration < threshold

          var isLastTrace = transaction.traces.length === index + 1

          if (isContinuouslySimilar) {
            lastCount++
            lastTrace._end = trace._end
          }

          if (lastCount > 1 && (!isContinuouslySimilar || isLastTrace)) {
            lastTrace.signature = lastCount + 'x ' + lastTrace.signature
            lastCount = 1
          }

          if (!isContinuouslySimilar) {
            traces.push(trace)
          }
        }
      })
    return traces
  }

  checkBrowserResponsiveness (transaction, interval, buffer) {
    var counter = transaction.browserResponsivenessCounter
    if (typeof interval === 'undefined' || typeof counter === 'undefined') {
      return true
    }

    var duration = transaction._rootTrace.duration()
    var expectedCount = Math.floor(duration / interval)
    var wasBrowserResponsive = counter + buffer >= expectedCount

    return wasBrowserResponsive
  }

}

module.exports = PerformanceMonitoring
