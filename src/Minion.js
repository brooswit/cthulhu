const {EventEmitter, JSONparseSafe, promiseToEmit, Process} = require('brooswit-common')
const WebSocket = require('ws')

module.exports = class Minion {
  constructor (url) {
    this._url = url

    this._internalEvents = new EventEmitter()
    this._nextRequestId = 0
    this._isStarting = false

    this._process = new Process(async ()=>{
      await promiseToEmit(this._internalEvents, 'start')
      console.warn('Starting Minion...')
      while (this._process.active) {
        this._ws = new WebSocket(`ws://${url}/stream`);

        await promiseToEmit(this._ws, 'open')
        this._ws.on('message', this._handleMessage.bind(this))
        console.warn('... Minion is ready ...')
        this._internalEvents.emit('ready')

        await promiseToEmit(this._ws, 'close')
        this._internalEvents.emit('restart')
        console.log('restarting...')
        this.promiseToReady = promiseToEmit(this._internalEvents, 'ready')
      }
    })

    this.promiseToReady = promiseToEmit(this._internalEvents, 'ready')
  }

  start() {
    this._internalEvents.emit('start')
  }

  close() {
    this._close()
  }

  _handleMessage(message) {
    const {requestId, responseId, payload} = JSONparseSafe(message, {})
    this._internalEvents.emit(`response:${requestId}`, {responseId, payload})
  }

  async _close() {
    if (this._process.closed) return
    await this.promiseToReady

    this._process.close()
    this._ws.close()
  }

  // Events
  triggerEvent(eventName, payload) {
    return this._send('triggerEvent', eventName, {payload})
  }

  hookEvent(eventName, callback, context) {
    return this._subscribe('hookEvent', eventName, callback, context)
  }

  // Tasks
  feedTask(taskName, payload) {
    return this._send('feedTask', taskName, {payload})
  }

  requestTask(taskName, payload, responseHandler, context) {
    return this._fetch('requestTask', taskName, {payload}, responseHandler, context)
  }

  consumeTask(taskName, taskHandler, context) {
    return this._request('consumeTask', taskName, taskHandler, context)
  }

  subscribeTask(taskName, subscriptionHandler, context) {
    return this._subscribe('subscribeTask', taskName, subscriptionHandler, context)
  }

  _send(methodName, methodCatagory, data) {
    return this._fetch(methodName, methodCatagory, data)
  }

  _fetch(methodName, methodCatagory, data = {}, fetchHandler, fetchContext) {
    return new Process(async (process) => {
      await this.promiseToReady
      if (process.closed) return
      console.log(methodName, methodCatagory)

      const requestId = this._nextRequestId ++
      this._ws.send(JSON.stringify(Object.assign({}, data, {
        requestId, methodName, methodCatagory
      })))

      if (process.closed) return
      if (!fetchHandler) return process.close()

      let {responseId, payload} = await promiseToEmit(this._internalEvents, `response:${requestId}`)
      if (process.closed) return

      fetchHandler.call(fetchContext, payload, responseId)
      process.close()
    }, this._process)
  }

  _request(methodName, methodCatagory, requestHandler, context) {
    return new Process(async (process) => {
      this._fetch(methodName, methodCatagory, async (payload, responseId) => {
        payload = await requestHandler.call(context, payload)
        this._send('response', '', {responseId, payload})
      })
    }, this._process)
  }

  _subscribe(methodName, methodCatagory, subscriptionHandler, subscriptionContext) {
    return new Process(async (process) => {
      await this.promiseToReady
      if (process.closed) return
      console.log(methodName, methodCatagory)
      
      const requestId = this._nextRequestId ++
      this._ws.send(JSON.stringify({ requestId, methodName, methodCatagory}))
      if (!subscriptionHandler) return process.close()
      if (process.closed) return

      const handleResponse = async ({responseId, payload}) => {
        payload = await subscriptionHandler.call(subscriptionContext, payload)
        this._send('response', '', {responseId, payload})
      }
      this._internalEvents.on(`response:${requestId}`, handleResponse)
      await this._process.promiseToClose
      this._internalEvents.off(`response:${requestId}`, handleResponse)
      process.close()
    }, this._process)
  }
}
