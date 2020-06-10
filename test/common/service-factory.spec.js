describe('ServiceFactory', function () {
  var ServiceFactory = require('../../src/common/service-factory')

  var configService
  var logger
  beforeEach(function () {
    var serviceFactory = new ServiceFactory()
    serviceFactory.init()
    configService = serviceFactory.getService('ConfigService')

    logger = Object.create(serviceFactory.getService('LoggingService'))
    serviceFactory.registerServiceInstance('LoggingService', logger)
    spyOn(logger, 'debug')
  })

  it('should set correct log level', function () {
    expect(configService.get('debug')).toBe(false)
    expect(configService.get('logLevel')).toBe('warn')
    expect(logger.getLevel()).toBe(logger.levels.WARN)

    configService.setConfig({debug: true})
    expect(configService.get('debug')).toBe(true)
    expect(logger.getLevel()).toBe(logger.levels.DEBUG)

    configService.setConfig({debug: false})
    expect(configService.get('debug')).toBe(false)
    expect(logger.getLevel()).toBe(logger.levels.WARN)

    configService.setConfig({logLevel: 'trace', debug: true})
    expect(logger.getLevel()).toBe(logger.levels.TRACE)

    configService.setConfig({logLevel: 'warn', debug: false})
    expect(logger.getLevel()).toBe(logger.levels.WARN)
  })
})
