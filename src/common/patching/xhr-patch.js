var patchUtils = require('./patch-utils')

const apmSymbol = patchUtils.apmSymbol
const patchMethod = patchUtils.patchMethod

const XHR_TASK = apmSymbol('xhrTask');
const XHR_LISTENER = apmSymbol('xhrListener');
const XHR_SCHEDULED = apmSymbol('xhrScheduled');

const XHR_SYNC = apmSymbol('xhrSync');
const XHR_URL = apmSymbol('xhrURL');
const XHR_METHOD = apmSymbol('xhrMethod');

export const ADD_EVENT_LISTENER_STR = 'addEventListener';
export const REMOVE_EVENT_LISTENER_STR = 'removeEventListener';

export const ZONE_SYMBOL_ADD_EVENT_LISTENER = 'addEventListener';
export const ZONE_SYMBOL_REMOVE_EVENT_LISTENER = 'removeEventListener';

function patchXMLHttpRequest(callback) {

  const XMLHttpRequestPrototype = XMLHttpRequest.prototype;

  let oriAddListener = XMLHttpRequestPrototype[ZONE_SYMBOL_ADD_EVENT_LISTENER];
  let oriRemoveListener = XMLHttpRequestPrototype[ZONE_SYMBOL_REMOVE_EVENT_LISTENER];
  if (!oriAddListener) {
    const XMLHttpRequestEventTarget = window['XMLHttpRequestEventTarget'];
    if (XMLHttpRequestEventTarget) {
      const XMLHttpRequestEventTargetPrototype = XMLHttpRequestEventTarget.prototype;
      oriAddListener = XMLHttpRequestEventTargetPrototype[ZONE_SYMBOL_ADD_EVENT_LISTENER];
      oriRemoveListener = XMLHttpRequestEventTargetPrototype[ZONE_SYMBOL_REMOVE_EVENT_LISTENER];
    }
  }

  const READY_STATE_CHANGE = 'readystatechange';
  const SCHEDULE = 'schedule';
  const INVOKE = 'invoke';
  const CLEAR = 'clear';


  function invokeTask(task) {
    task.state = INVOKE
    callback(INVOKE, task)
  }

  function scheduleTask(task) {
    XMLHttpRequest[XHR_SCHEDULED] = false;
    task.state = SCHEDULE
    callback(SCHEDULE, task)
    const data = task.data
    const target = data.target;
    // remove existing event listener
    const listener = target[XHR_LISTENER];
    if (!oriAddListener) {
      oriAddListener = target[ZONE_SYMBOL_ADD_EVENT_LISTENER];
      oriRemoveListener = target[ZONE_SYMBOL_REMOVE_EVENT_LISTENER];
    }

    if (listener) {
      oriRemoveListener.call(target, READY_STATE_CHANGE, listener);
    }
    const newListener = target[XHR_LISTENER] = () => {
      if (target.readyState === target.DONE) {
        // sometimes on some browsers XMLHttpRequest will fire onreadystatechange with
        // readyState=4 multiple times, so we need to check task state here
        if (!data.aborted && XMLHttpRequest[XHR_SCHEDULED] && task.state === SCHEDULE) {
          invokeTask(task)
        }
      }
    };

    oriAddListener.call(target, READY_STATE_CHANGE, newListener);

    const storedTask = target[XHR_TASK];
    if (!storedTask) {
      target[XHR_TASK] = task;
    }
    sendNative.apply(target, data.args);
    XMLHttpRequest[XHR_SCHEDULED] = true;
    return task;
  }

  function clearTask(task) {
    task.state = CLEAR
    callback(CLEAR, task)
    const data = task.data
    // Note - ideally, we would call data.target.removeEventListener here, but it's too late
    // to prevent it from firing. So instead, we store info for the event listener.
    data.aborted = true;
  }

  const openNative =
    patchMethod(XMLHttpRequestPrototype, 'open', () => function (self, args) {
      self[XHR_METHOD] = args[0];
      self[XHR_SYNC] = args[2] == false;
      self[XHR_URL] = args[1];
      return openNative.apply(self, args);
    });


  const XMLHTTPREQUEST_SOURCE = 'XMLHttpRequest.send';
  const sendNative =
    patchMethod(XMLHttpRequestPrototype, 'send', () => function (self, args) {
      const task = {
        source: XMLHTTPREQUEST_SOURCE,
        state: '',
        type: 'macroTask',
        data: {
          target: self,
          method: self[XHR_METHOD],
          url: self[XHR_URL],
          args: args,
          aborted: false
        }
      };
      return scheduleTask(task);
    });

  const abortNative = patchMethod(XMLHttpRequestPrototype, 'abort', () => function (self, args) {
    const task = self[XHR_TASK];
    if (task && typeof task.type == 'string') {
      // If the XHR has already completed, do nothing.
      // If the XHR has already been aborted, do nothing.
      // Fix #569, call abort multiple times before done will cause
      // macroTask task count be negative number
      if ((task.data && task.data.aborted)) {
        return;
      }
      clearTask(task);
    }
    return abortNative.apply(self, args);
    // Otherwise, we are trying to abort an XHR which has not yet been sent, so there is no
    // task
    // to cancel. Do nothing.
  });
}


module.exports = {
  patchXMLHttpRequest: patchXMLHttpRequest,
  XHR_URL,
  XHR_METHOD
}