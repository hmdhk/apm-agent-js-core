// Source: opentracing/lib/test/api_compatibility.js
const ot = require('opentracing')

function apiCompatibilityChecks (createTracer, options) {
  if (options === void 0) {
    options = { skipBaggageChecks: false, skipInjectExtractChecks: false }
  }
  describe('OpenTracing API Compatibility', function () {
    var tracer
    var span
    beforeEach(function () {
      tracer = createTracer()
      span = tracer.startSpan('test-span')
    })
    describe('Tracer', function () {
      describe('startSpan', function () {
        it('should handle Spans and SpanContexts', function () {
          expect(function () {
            tracer.startSpan('child', { childOf: span })
          }).not.toThrow(Error)
          expect(function () {
            tracer.startSpan('child', { childOf: span.context() })
          }).not.toThrow(Error)
        })
      })
      describe('inject', function () {
        ;(options.skipInjectExtractChecks ? it.skip : it)(
          'should not throw exception on required carrier types',
          function () {
            var spanContext = span.context()
            var textCarrier = {}
            var binCarrier = new ot.BinaryCarrier([1, 2, 3])
            expect(function () {
              tracer.inject(spanContext, ot.FORMAT_TEXT_MAP, textCarrier)
            }).not.toThrow(Error)
            expect(function () {
              tracer.inject(spanContext, ot.FORMAT_BINARY, binCarrier)
            }).not.toThrow(Error)
            expect(function () {
              tracer.inject(spanContext, ot.FORMAT_BINARY, {})
            }).not.toThrow(Error)
          }
        )
        ;(options.skipInjectExtractChecks ? it.skip : it)(
          'should handle Spans and SpanContexts',
          function () {
            var textCarrier = {}
            expect(function () {
              tracer.inject(span, ot.FORMAT_TEXT_MAP, textCarrier)
            }).not.toThrow(Error)
            expect(function () {
              tracer.inject(span.context(), ot.FORMAT_TEXT_MAP, textCarrier)
            }).not.toThrow(Error)
          }
        )
      })
      describe('extract', function () {
        ;(options.skipInjectExtractChecks ? it.skip : it)(
          'should not throw exception on required carrier types',
          function () {
            var textCarrier = {}
            var binCarrier = new ot.BinaryCarrier([1, 2, 3])
            expect(function () {
              tracer.extract(ot.FORMAT_TEXT_MAP, textCarrier)
            }).not.toThrow(Error)
            expect(function () {
              tracer.extract(ot.FORMAT_BINARY, binCarrier)
            }).not.toThrow(Error)
            expect(function () {
              tracer.extract(ot.FORMAT_BINARY, {})
            }).not.toThrow(Error)
            expect(function () {
              tracer.extract(ot.FORMAT_BINARY, { buffer: null })
            }).not.toThrow(Error)
          }
        )
      })
    })
    describe('Span', function () {
      ;(options.skipBaggageChecks ? xit : it)(
        'should set baggage and retrieve baggage',
        function () {
          span.setBaggageItem('some-key', 'some-value')
          var val = span.getBaggageItem('some-key')
          expect(val).toEqual('some-value')
        }
      )
      describe('finish', function () {
        it('should not throw exceptions on valid arguments', function () {
          span = tracer.startSpan('test-span')
          expect(function () {
            return span.finish(Date.now())
          }).not.toThrow(Error)
        })
      })
    })
    describe('Reference', function () {
      it('should handle Spans and span.context()', function () {
        expect(function () {
          return new ot.Reference(ot.REFERENCE_CHILD_OF, span)
        }).not.toThrow(Error)
        expect(function () {
          return new ot.Reference(ot.REFERENCE_CHILD_OF, span.context())
        }).not.toThrow(Error)
      })
    })
  })
}
exports.default = apiCompatibilityChecks
