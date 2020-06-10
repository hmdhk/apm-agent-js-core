var ConfigService = require('../../src/common/config-service')

describe('config', function () {
  var config
  beforeEach(function () {
    config = new ConfigService()
    config.init()
  })
  it('should merge configs with already set configs', function () {
    expect(config.get('debug')).toBe(false)
    expect(config.get('appName')).toBe('')

    config.setConfig({
      appName: 'appName'
    })

    expect(config.get('debug')).toBe(false)
    expect(config.get('appName')).toBe('appName')

    config.setConfig({
      debug: true
    })

    expect(config.get('debug')).toBe(true)
    expect(config.get('appName')).toBe('appName')

    config.setConfig({
      debug: false,
      appName: null
    })

    expect(config.get('debug')).toBe(false)
    expect(config.get('appName')).toBe(null)
  })

  xit('should deep merge configs', function () {
    expect(config.get('performance.enable')).toBe(true)
    expect(config.get('performance.enableStackFrames')).toBe(false)

    config.setConfig({
      performance: {
        enableStackFrames: true
      }
    })

    expect(config.get('performance.enable')).toBe(true)
    expect(config.get('performance.enableStackFrames')).toBe(true)
  })

  it('should return undefined if the config does not exists', function () {
    expect(config.get('context')).toEqual({})
    expect(config.get('context.user')).toBe(undefined)
    config.set('context.user', {test: 'test'})
    expect(config.get('context.user')).toEqual({test: 'test'})
    expect(config.get('nonexisting.nonexisting')).toBe(undefined)
    expect(config.get('context.nonexisting.nonexisting')).toBe(undefined)
  })
})
