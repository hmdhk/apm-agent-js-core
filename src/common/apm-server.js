var Queue = require('./queue')
var throttle = require('./throttle')

class ApmServer {
  constructor (configService, loggingService) {
    this._configService = configService
    this._loggingService = loggingService
    this.logMessages = {
      invalidConfig: { message: 'Configuration is invalid!', level: 'warn' }
    }

    this.errorQueue = undefined
    this.transactionQueue = undefined

    this.initialized = false
    this._throttledMakeRequest
  }

  init () {
    if (this.initialized) {
      return
    }
    this.initialized = true

    this.initErrorQueue()
    this.initTransactionQueue()
    this.initThrottledMakeRequest()
  }

  createServiceObject () {
    var cfg = this._configService
    var serviceObject = {
      name: cfg.get('serviceName'),
      version: cfg.get('serviceVersion'),
      agent: {
        name: cfg.get('agentName'),
        version: cfg.get('agentVersion')
      },
      language: {
        name: 'javascript'
      }
    }
    return serviceObject
  }

  initThrottledMakeRequest () {
    var apmServer = this
    var throttlingRequestLimit = apmServer._configService.get('throttlingRequestLimit')
    var throttlingInterval = apmServer._configService.get('throttlingInterval')
    this._throttledMakeRequest = throttle(apmServer._makeHttpRequest.bind(apmServer),
      function (method, url) {
        apmServer._loggingService.warn('ElasticAPM: Dropped request to ' + url + ' due to throttling!')
      }, {
        limit: throttlingRequestLimit,
        interval: throttlingInterval
      })
  }

  _postJson (endPoint, payload) {
    if (!this._throttledMakeRequest) {
      this.initThrottledMakeRequest()
    }

    return this._throttledMakeRequest('POST',
      endPoint,
      JSON.stringify(payload),
      {'Content-Type': 'application/json'})
  }

  _makeHttpRequest (method, url, payload, headers) {
    return new Promise(function (resolve, reject) {
      var xhr = new window.XMLHttpRequest()
      xhr.open(method, url, true)
      xhr.timeout = 10000

      if (headers) {
        for (var header in headers) {
          if (headers.hasOwnProperty(header)) {
            xhr.setRequestHeader(header, headers[header])
          }
        }
      }

      xhr.onreadystatechange = function (evt) {
        if (xhr.readyState === 4) {
          var status = xhr.status
          if (status === 0 || status > 399 && status < 600) {
            // An http 4xx or 5xx error. Signal an error.
            var err = new Error(url + ' HTTP status: ' + status)
            err.xhr = xhr
            reject(err)
          } else {
            resolve(xhr.responseText)
          }
        }
      }

      xhr.onerror = function (err) {
        reject(err)
      }

      xhr.send(payload)
    })
  }

  _createQueue (onFlush) {
    var queueLimit = this._configService.get('queueLimit')
    var flushInterval = this._configService.get('flushInterval')
    return new Queue(onFlush, {
      queueLimit: queueLimit,
      flushInterval: flushInterval
    })
  }

  initErrorQueue () {
    var apmServer = this
    if (this.errorQueue) {
      this.errorQueue.flush()
    }
    this.errorQueue = this._createQueue(function (errors) {
      var p = apmServer.sendErrors(errors)
      if (p) {
        p.then(undefined, function (reason) {
          apmServer._loggingService.debug('Failed sending errors!', reason)
        })
      }
    })
  }
  initTransactionQueue () {
    var apmServer = this
    if (this.transactionQueue) {
      this.transactionQueue.flush()
    }
    this.transactionQueue = this._createQueue(function (transactions) {
      var p = apmServer.sendTransactions(transactions)
      if (p) {
        p.then(undefined, function (reason) {
          apmServer._loggingService.debug('Failed sending transactions!', reason)
        })
      }
    })
  }
  addError (error) {
    if (!this.errorQueue) {
      this.initErrorQueue()
    }
    this.errorQueue.add(error)
  }
  addTransaction (transaction) {
    if (!this.transactionQueue) {
      this.initTransactionQueue()
    }
    this.transactionQueue.add(transaction)
  }

  warnOnce (logObject) {
    if (logObject.level === 'warn') {
      logObject.level = 'debug'
      this._loggingService.warn(logObject.message)
    } else {
      this._loggingService.debug(logObject.message)
    }
  }

  sendErrors (errors) {
    if (this._configService.isValid()) {
      if (errors && errors.length > 0) {
        var payload = {
          service: this.createServiceObject(),
          errors: errors
        }
        payload = this._configService.applyFilters(payload)
        var endPoint = this._configService.getEndpointUrl('errors')
        return this._postJson(endPoint, payload)
      }
    } else {
      this.warnOnce(this.logMessages.invalidConfig)
    }
  }

  sendTransactions (transactions) {
    if (this._configService.isValid()) {
      if (transactions && transactions.length > 0) {
        var payload = {
          service: this.createServiceObject(),
          transactions: transactions
        }
        payload = this._configService.applyFilters(payload)
        var endPoint = this._configService.getEndpointUrl('transactions')
        return this._postJson(endPoint, payload)
      }
    } else {
      this.warnOnce(this.logMessages.invalidConfig)
    }
  }

}

module.exports = ApmServer
