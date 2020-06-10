var errorStackParser = require('error-stack-parser')

class StackTraceService {
  constructor (configService) {
    this._configService = configService
  }
  createStackTraces (errorEvent) {
    var stackTraceService = this
    var error = errorEvent.error

    var stackTraces
    if (error) {
      stackTraces = errorStackParser.parse(error)
    }

    if (!stackTraces || stackTraces.length === 0) {
      stackTraces = [
        {
          'fileName': errorEvent.filename,
          'lineNumber': errorEvent.lineno,
          'columnNumber': errorEvent.colno
        }
      ]
    }

    stackTraces = ErrorStackNormalizer(stackTraces)

    stackTraces = stackTraces.map(function (stack) {
      if (!stack.fileName && !stack.lineNumber) {
        return {}
      }
      if (!stack.columnNumber && !stack.lineNumber) {
        return {}
      }

      var filePath = stackTraceService.cleanFilePath(stack.fileName)
      var fileName = stackTraceService.filePathToFileName(filePath)

      if (stackTraceService.isFileInline(filePath)) {
        fileName = '(inline script)'
      }

      return {
        'abs_path': stack.fileName,
        'filename': fileName,
        'function': stack.functionName || '<anonymous>',
        'lineno': stack.lineNumber,
        'colno': stack.columnNumber,
        'in_app': stackTraceService.isFileInApp(stack.filename)
      }
    })

    return stackTraces
  }

  isFileInApp (filename) {
    var pattern = this._configService.get('libraryPathPattern')
    return !RegExp(pattern).test(filename)
  }

  filterInvalidFrames (frames) {
    var result = []
    if (Array.isArray(frames)) {
      result = frames.filter(function (f) {
        return (typeof f['filename'] !== 'undefined' && typeof f['lineno'] !== 'undefined')
      })
    }
    return result
  }

  filePathToFileName (fileUrl) {
    var origin = window.location.origin || window.location.protocol + '//' + window.location.hostname + (window.location.port ? (':' + window.location.port) : '')

    if (fileUrl.indexOf(origin) > -1) {
      fileUrl = fileUrl.replace(origin + '/', '')
    }

    return fileUrl
  }

  cleanFilePath (filePath) {
    if (!filePath) {
      filePath = ''
    }

    if (filePath === '<anonymous>') {
      filePath = ''
    }

    return filePath
  }
  isFileInline (fileUrl) {
    if (fileUrl) {
      return window.location.href.indexOf(fileUrl) === 0
    } else {
      return false
    }
  }
}

function ErrorStackNormalizer (stackFrames) {
  return stackFrames.map(function (frame) {
    if (frame.functionName) {
      frame.functionName = normalizeFunctionName(frame.functionName)
    }
    return frame
  })
}

function normalizeFunctionName (fnName) {
  // SpinderMonkey name convetion (https://developer.mozilla.org/en-US/docs/Tools/Debugger-API/Debugger.Object#Accessor_Properties_of_the_Debugger.Object_prototype)

  // We use a/b to refer to the b defined within a
  var parts = fnName.split('/')
  if (parts.length > 1) {
    fnName = ['Object', parts[parts.length - 1]].join('.')
  } else {
    fnName = parts[0]
  }

  // a< to refer to a function that occurs somewhere within an expression that is assigned to a.
  fnName = fnName.replace(/.<$/gi, '.<anonymous>')

  // Normalize IE's 'Anonymous function'
  fnName = fnName.replace(/^Anonymous function$/, '<anonymous>')

  // Always use the last part
  parts = fnName.split('.')
  if (parts.length > 1) {
    fnName = parts[parts.length - 1]
  } else {
    fnName = parts[0]
  }

  return fnName
}

module.exports = StackTraceService
