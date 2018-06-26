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

function patchXMLHttpRequest(callback) {

  const XMLHttpRequestPrototype = XMLHttpRequest.prototype;

  let oriAddListener = XMLHttpRequestPrototype[ADD_EVENT_LISTENER_STR];
  let oriRemoveListener = XMLHttpRequestPrototype[REMOVE_EVENT_LISTENER_STR];
  if (!oriAddListener) {
    const XMLHttpRequestEventTarget = window['XMLHttpRequestEventTarget'];
    if (XMLHttpRequestEventTarget) {
      const XMLHttpRequestEventTargetPrototype = XMLHttpRequestEventTarget.prototype;
      oriAddListener = XMLHttpRequestEventTargetPrototype[ADD_EVENT_LISTENER_STR];
      oriRemoveListener = XMLHttpRequestEventTargetPrototype[REMOVE_EVENT_LISTENER_STR];
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
      oriAddListener = target[ADD_EVENT_LISTENER_STR];
      oriRemoveListener = target[REMOVE_EVENT_LISTENER_STR];
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
    var result = sendNative.apply(target, data.args);
    XMLHttpRequest[XHR_SCHEDULED] = true;
    return result;
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
      var result = scheduleTask(task);

      if (self[XHR_SYNC]) {
        invokeTask(task)
      }
      return result
    });

  const abortNative = patchMethod(XMLHttpRequestPrototype, 'abort', () => function (self, args) {
    const task = self[XHR_TASK];
    if (task && typeof task.type == 'string') {
      // If the XHR has already been aborted, do nothing.
      if ((task.data && task.data.aborted)) {
        return;
      }
      clearTask(task);
    }
    return abortNative.apply(self, args);
  });
}


module.exports = {
  patchXMLHttpRequest: patchXMLHttpRequest,
  XHR_URL,
  XHR_METHOD
}