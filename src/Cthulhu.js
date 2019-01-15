const {promiseToEmit, Process, EventEmitter, JSONparseSafe, EventManager, TaskManager} = require('brooswit-common')

const express = require('express')
const bodyParser = require('body-parser')
const enableWs = require('express-ws')

class CthulhuHeart extends Process {
    constructor() {
        super(async ()=>{
            await this.promiseToClose
        })
        this._eventManager = new EventManager()
        this._taskManager = new TaskManager()
    }
  
    // Events
    triggerEvent(eventName, payload) {
        console.warn(`triggerEvent ${eventName}`)
        return this._eventManager.trigger(eventName, payload)
    }
  
    hookEvent(eventName, eventHandler, context, parentProcess) {
        console.warn(`hookEvent ${eventName}`)
        return this._eventManager.hook(eventName, eventHandler, context, parentProcess)
    }
  
    // Tasks
    feedTask(taskName, payload, parentProcess) {
        console.warn(`feedTask ${taskName}`)
        return this._taskManager.feed(taskName, payload, this, parentProcess)
    }
  
    requestTask(taskName, payload, responseHandler, context, parentProcess) {
        console.warn(`requestTask ${taskName}`)
        return this._taskManager.request(taskName, payload, responseHandler, context, this, parentProcess)
    }
  
    consumeTask(taskName, taskHandler, context, parentProcess) {
        console.warn(`consumeTask ${taskName}`)
        return this._taskManager.consume(taskName, taskHandler, context, this, parentProcess)
    }
  
    subscribeTask(taskName, subscriptionHandler, context, parentProcess) {
        console.warn(`subscribeTask ${taskName}`)
        return this._taskManager.subscribe(taskName, subscriptionHandler, context, this, parentProcess)
    }
}

class CthulhuClientHandler extends Process {
    constructor(cthulhu, ws) {
        super(async () => {
            this._cthulhu = cthulhu
            this._ws = ws
            this._internalEvents = new EventEmitter()
            this._nextResponseId = 0

            this._ws.on('close', this.close.bind(this))
            this._ws.on('message', this._handleMessage.bind(this))
            await this.promiseToClose
            this._ws.close()
        }, cthulhu)
    }

    async _handleMessage(message) {
        const { requestId, responseId, methodName, methodCatagory, payload} = JSONparseSafe(message, {})
        if (methodName === 'response') {
            this._internalEvents.emit(`response:${responseId}`, payload)
        } else {
            if (methodName === 'triggerEvent') {
                this._cthulhu.triggerEvent(methodCatagory, payload)
            } else if (methodName === 'hookEvent') {
                this._cthulhu.hookEvent(methodCatagory, async (payload) => {
                    this._respond(requestId, payload)
                }, this)
            } else if (methodName === 'feedTask') {
                this._cthulhu.feedTask(methodCatagory, payload, this)
            } else if (methodName === 'requestTask') {
                this._cthulhu.requestTask(methodCatagory, {payload}, async (payload) => {
                    return await this._request(requestId, payload, this)
                })
            } else if (methodName === 'consumeTask') {
                this._cthulhu.consumeTask(methodCatagory, async (payload) => {
                    return await this._request(requestId, payload, this)
                })
            } else if (methodName === 'subscribeTask') {
                this._cthulhu.subscribeTask(methodCatagory, async (payload) => {
                    return await this._request(requestId, payload, this)
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

        return await Promise.race([
            this.promiseToClose,
            promiseToEmit(this._internalEvents, `response:${responseId}`)
        ])
    }
}

module.exports = class Cthulhu extends CthulhuHeart {
    constructor() {
        super(async ()=>{
            await this.promiseToClose
        })
        this._internalEvents = new EventEmitter()
        this.promiseToClose = new Promise(()=>{})
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
}
