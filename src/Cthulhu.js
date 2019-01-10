const {JSONparseSafe, EventManager, TaskManager} = require('brooswit-common')

const EventEmitter = require('events')
const express = require('express')
const bodyParser = require('body-parser')
const enableWs = require('express-ws')

class CthulhuHeart{
  constructor() {
    this._eventManager = new EventManager()
    this._taskManager = new TaskManager()
  }

  // Events
  triggerEvent(eventName, payload) {
      console.warn(`triggerEvent ${eventName}`)
    return this._eventManager.trigger(eventName, payload)
  }

  hookEvent(eventName, eventHandler, context) {
      console.warn(`hookEvent ${eventName}`)
      return this._eventManager.hook(eventName, eventHandler, context)
  }

  // Tasks
  feedTask(taskName, payload) {
      console.warn(`feedTask ${taskName}`)
      return this._taskManager.feed(taskName, payload)
  }

  requestTask(taskName, payload, responseHandler, context) {
      console.warn(`requestTask ${taskName}`)
      return this._taskManager.request(taskName, payload, responseHandler, context)
  }

  consumeTask(taskName, taskHandler, context) {
      console.warn(`consumeTask ${taskName}`)
      return this._taskManager.consume(taskName, taskHandler, context)
  }

  subscribeTask(taskName, subscriptionHandler, context) {
      console.warn(`subscribeTask ${taskName}`)
      return this._taskManager.subscribe(taskName, subscriptionHandler, context)
  }
}

class CthulhuClientHandler {
  constructor(cthulhu, ws) {
    this._cthulhu = cthulhu
    this._ws = ws
    this._internalEvents = new EventEmitter()
    this._internalEvents.setMaxListeners(65535)
    this._nextResponseId = 0

    this._cthulhu._internalEvents.once('close', this.close, this)
    this._ws.once('close', this.close.bind(this))
    this._ws.on('message', this._handleMessage.bind(this))
  }

  close() {
    this._cthulhu._internalEvents.off('close', this.close, this)        
    this._ws.close()
  }

  async _handleMessage(message) {
    const { requestId, responseId, methodName, methodCatagory, payload} = JSONparseSafe(message, {})
    if (methodName === 'response') {
        this._internalEvents.emit(`response:${responseId}`, payload)
    } else {
        if (methodName === 'triggerEvent') {
            this._cthulhu.triggerEvent(methodCatagory, payload)
        } else if (methodName === 'hookEvent') {
            let hookProcess = await this._cthulhu.hookEvent(methodCatagory, async (payload) => {
                this._respond(requestId, payload)
            })

            this._ws.once('close', ()=>{
                hookProcess.close()
            })
        } else if (methodName === 'feedTask') {
            this._cthulhu.feedTask(methodCatagory, payload)
        } else if (methodName === 'requestTask') {
            let requestProcess = this._cthulhu.requestTask(methodCatagory, {payload}, async (payload) => {
                return await this._request(requestId, payload)
            })

            this._ws.once('close', () => {
                requestProcess.close()
            })
        } else if (methodName === 'consumeTask') {
            let consumeProcess = this._cthulhu.consumeTask(methodCatagory, async (payload) => {
                return await this._request(requestId, payload)
            })

            this._ws.once('close', () => {
                consumeProcess.close()
            })
        } else if (methodName === 'subscribeTask') {
            let subscriptionProcess = this._cthulhu.subscribeTask(methodCatagory, async (payload) => {
                return await this._request(requestId, payload)
            })

            this._ws.once('close', () => {
                subscriptionProcess.close()
            })
        }
    }
  }

  async _respond (requestId, payload) {
      this._ws.send(JSON.stringify({requestId, payload}))
  }

  async _request (requestId, payload) {
      const responseId = this._nextResponseId++
      let resolution, rejection
      

      this._ws.send(JSON.stringify({responseId, requestId, payload}))

      let result = await new Promise((resolve, reject) => {
          this._internalEvents.on(`response:${responseId}`, resolution = resolve)
          this._ws.once('close', rejection = reject)
      })

      this._internalEvents.off(`response:${responseId}`, resolution)
      this._ws.off('close', rejection)

      return result
  }
}

module.exports = class Cthulhu extends CthulhuHeart {
  constructor() {
    super()
    this._internalEvents = new EventEmitter()

    this.express = express()
    enableWs(this.express)
    this.express.use(bodyParser.json())
      .ws('/stream', (ws) => {
        new CthulhuClientHandler(this, ws)
    })
}

  start(callback) {
    if (this._isStarting) return
    console.warn('Starting Cthulu...')
    this._isStarting = true
    this.express.listen(process.env.PORT || 8888, () => {
        console.warn('... Cthulu is ready...')
        callback && callback()
    })
  }
      
  close() {
      this._internalEvents.emit('close')
  }
}
