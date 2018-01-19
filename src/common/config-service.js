var utils = require('./utils')
var Subscription = require('../common/subscription')

function Config () {
  this.config = {}
  this.defaults = {
    serviceName: '',
    serviceVersion: '',
    agentName: 'js-base',
    agentVersion: '%%agent-version%%',
    serverUrl: 'http://localhost:8200',
    serverUrlPrefix: '/v1/client-side',
    active: true,
    isInstalled: false,
    debug: false,
    logLevel: 'warn',
    // performance monitoring
    browserResponsivenessInterval: 500,
    browserResponsivenessBuffer: 3,
    checkBrowserResponsiveness: true,
    enable: true,
    enableStackFrames: false,
    groupSimilarSpans: true,
    similarSpanThreshold: 0.05,
    captureInteractions: false,
    sendVerboseDebugInfo: false,
    includeXHRQueryString: false,
    capturePageLoad: true,
    ignoreTransactions: [],
    throttlingRequestLimit: 20,
    throttlingInterval: 30000, // 30s
    queueLimit: 20,
    flushInterval: 500,

    hasRouterLibrary: false,

    context: {},
    platform: {}
  }

  this._changeSubscription = new Subscription()
  this.filters = []
}

Config.prototype.isActive = function isActive () {
  return this.get('active')
}

Config.prototype.addFilter = function addFilter (cb) {
  if (typeof cb !== 'function') {
    throw new Error('Argument to must be function')
  }
  this.filters.push(cb)
}

Config.prototype.applyFilters = function applyFilters (data) {
  for (var i = 0; i < this.filters.length; i++) {
    data = this.filters[i](data)
    if (!data) {
      return
    }
  }
  return data
}

Config.prototype.init = function () {
  var scriptData = _getConfigFromScript()
  this.setConfig(scriptData)
}

Config.prototype.get = function (key) {
  return utils.arrayReduce(key.split('.'), function (obj, i) {
    return obj && obj[i]
  }, this.config)
}

Config.prototype.getEndpointUrl = function getEndpointUrl (endpoint) {
  var url = this.get('serverUrl') + this.get('serverUrlPrefix') + '/' + endpoint
  return url
}

Config.prototype.set = function (key, value) {
  var levels = key.split('.')
  var max_level = levels.length - 1
  var target = this.config

  utils.arraySome(levels, function (level, i) {
    if (typeof level === 'undefined') {
      return true
    }
    if (i === max_level) {
      target[level] = value
    } else {
      var obj = target[level] || {}
      target[level] = obj
      target = obj
    }
  })
}

Config.prototype.setUserContext = function (userContext) {
  var context = {}
  if (typeof userContext.id === 'string' || typeof userContext.id === 'number') {
    context.id = userContext.id
  }
  if (typeof userContext.username === 'string') {
    context.username = userContext.username
  }
  if (typeof userContext.email === 'string') {
    context.email = userContext.email
  }
  this.set('context.user', context)
}

Config.prototype.setCustomContext = function (customContext) {
  this.set('context.custom', customContext)
}

Config.prototype.getAgentName = function () {
  var version = this.config['agentVersion']
  if (!version) {
    version = 'dev'
  }
  return this.get('agentName') + '/' + version
}

Config.prototype.setConfig = function (properties) {
  properties = properties || {}
  this.config = utils.merge({}, this.defaults, this.config, properties)

  this._changeSubscription.applyAll(this, [this.config])
}

Config.prototype.subscribeToChange = function (fn) {
  return this._changeSubscription.subscribe(fn)
}

Config.prototype.isValid = function () {
  var requiredKeys = ['serviceName', 'serverUrl']
  var values = utils.arrayMap(requiredKeys, utils.functionBind(function (key) {
    return (this.config[key] === null) || (this.config[key] === undefined) || (this.config[key] === '')
  }, this))

  return utils.arrayIndexOf(values, true) === -1
}

var _getConfigFromScript = function () {
  var script = utils.getCurrentScript()
  var config = _getDataAttributesFromNode(script)
  return config
}

function _getDataAttributesFromNode (node) {
  var dataAttrs = {}
  var dataRegex = /^data\-([\w\-]+)$/

  if (node) {
    var attrs = node.attributes
    for (var i = 0; i < attrs.length; i++) {
      var attr = attrs[i]
      if (dataRegex.test(attr.nodeName)) {
        var key = attr.nodeName.match(dataRegex)[1]

        // camelCase key
        key = utils.arrayMap(key.split('-'), function (group, index) {
          return index > 0 ? group.charAt(0).toUpperCase() + group.substring(1) : group
        }).join('')

        dataAttrs[key] = attr.value || attr.nodeValue
      }
    }
  }

  return dataAttrs
}

Config.prototype.isPlatformSupported = function () {
  return typeof Array.prototype.forEach === 'function' &&
    typeof JSON.stringify === 'function' &&
    typeof Function.bind === 'function' &&
    window.performance &&
    typeof window.performance.now === 'function' &&
    utils.isCORSSupported()
}

module.exports = Config
