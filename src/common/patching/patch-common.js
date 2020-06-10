var patchXMLHttpRequest = require('./xhr-patch')

function patchCommon () {
  patchXMLHttpRequest()
}

module.exports = patchCommon
