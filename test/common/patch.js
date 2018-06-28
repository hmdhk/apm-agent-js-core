var patchAll = require('../../src/common/patching/').patchAll
if (!window['__patchSubscription']) {
    console.log('patchservice')
    window['__patchSubscription'] = patchAll()
}
