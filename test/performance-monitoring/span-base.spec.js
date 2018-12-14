var SpanBase = require('../../src/performance-monitoring/span-base')
describe('SpanBase', function () {
  it('should addTags', function () {
    var span = new SpanBase()
    span.addTags({ test: 'passed', 'test.new': 'new' })
    expect(span.context).toEqual({ tags: { test: 'passed', test_new: 'new' } })
  })

  it('should addContext', function () {
    var span = new SpanBase()
    span.addContext({ test: { ctx: 'hamid' } })
    expect(span.context).toEqual({ test: { ctx: 'hamid' } })
  })
})
