class ApmServer {
  constructor (configService) {
    this._configService = configService
  }

  createAppObject () {
    var cfg = this._configService
    var appObject = {
      name: cfg.get('appName'),
      agent: {
        name: cfg.get('agentName'),
        version: cfg.get('agentVersion')
      }
    }
    return appObject
  }
  _postJson (endPoint, payload) {
    return this._makeHttpRequest('POST',
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

  sendErrors (errors) {
    var payload = {
      app: this.createAppObject(),
      errors: errors
    }
    payload = this._configService.applyFilters(payload)
    var endPoint = this._configService.getEndpointUrl('errors')
    return this._postJson(endPoint, payload)
  }

  sendTransactions (transactions) {
    if (transactions.length === 0) {
      return
    }
    var payload = {
      app: this.createAppObject(),
      transactions: transactions
    }
    payload = this._configService.applyFilters(payload)
    var endPoint = this._configService.getEndpointUrl('transactions')
    return this._postJson(endPoint, payload)
  }
}

module.exports = ApmServer
