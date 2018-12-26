const WebSocket = require('ws')

module.exports = class Minion {
  constructor (url) {
    this._internalEvents = new EventEmitter()
    this._nextRequestId = 0
    this._isStarting = false
    this._isClosed = false

    this.promiseToStart = new PromiseToEmit(this._internalEvents, 'ready')
    this.promiseToClose = new PromiseToEmit(this._internalEvents, 'close')
  }

  start() {
    if (this._isStarting) return
    if (this._isClosed) return
    this._isStarting = true
    console.warn('Starting Minion...')
    this._lifecycle()
  }

  async _lifecycle() {
    if (this._isClosed) return
    this._ws = new WebSocket(`ws://${url}/stream`);
    await new PromiseToEmit(this._ws, 'open')
    this._ws.on('message', this._handleMessage.bind(this))
    console.warn('... Minion is ready ...')
    this._internalEvents.emit('started')
    await new PromiseToEmit(this._ws, 'close')
    this.promiseToStart = new PromiseToEmit(this._internalEvents, 'ready')
    this._lifecycle()
  }

  close() {
    if (this._isClosed) return
    await this.promiseToStart

    this._isClosed = true
    this._internalEvents.emit('close')
    this._ws.close()
  }

  // Events
  triggerEvent(eventName, value) {
    return this._send('triggerEvent', eventName, value)
  }

  hookEvent(eventName, callback, context) {
    return this._subscribe('hookEvent', eventName, callback, context)
  }

  // Tasks
  feedTask(taskName, payload) {
    return this._send('feedTask', taskName, payload)
  }

  requestTask(taskName, payload, responseHandler, context) {
    return this._fetch('requestTask', taskName, payload, responseHandler, context)
  }

  consumeTask(taskName, taskHandler, context) {
    return this._request('consumeTask', taskName, taskHandler, context)
  }

  subscribeTask(taskName, subscriptionHandler, context) {
    return this._subscribe('subscribeTask', taskName, subscriptionHandler, context)
  }

  _send(methodName, methodCatagory, payload) {
    return this._fetch(methodName, methodCatagory, payload)
  }

  _fetch(methodName, methodCatagory, payload, callback, context) {
    return new Process(async (process) => {
      await this.promiseToStart
      if (this._isClosed) return process.close()
      
      const requestId = this._nextRequestId ++
      this._ws.send(JSON.stringify({ requestId, methodName, methodCatagory, payload}))
      this._internalEvents.once(callback, context)
    })
  }

  async _request(methodName, methodCatagory, requestHandler, context) {
    return new Process(async (process) => {
      this._fetch(methodName, methodCatagory, ({responseId, payload})=>{
        payload = await requestHandler.call(context, payload)
        this.send('respond', {responseId, payload})
      })
    })
  }

  async _subscribe(methodName, methodCatagory, subscriptionHandler, context) {
    return new Process(async (process) => {
      // TODO: REFACTOR TO NEW PATTERNS
      // let {requestId, responseId, payload} = await this._fetch(methodName, methodCatagory)
      // this._internalEvents.on(`response:${requestId}`, subscriptionHandler, context)
    })
  }

  _handleMessage(str) {
    const message = JSONparseSafe(str, {})
    const {requestId, ackId, value} = message
    this._internalEvents.emit(requestId, {ackId, value})
  }
}