const {JSONparseSafe, MethodManager, TaskManager} = require('brooswit-common')

const WebSocket = require('ws')

const express = require('express')
const bodyParser = require('body-parser')
const enableWs = require('express-ws')

const WebhookIngester = require('./src/components/WebhookIngester')
const SlackIntegration = require('./src/components/SlackIntegration')
const SalesforceIntegration = require('./src/components/SalesforceIntegration')
const ClubhouseIntegration = require('./src/components/ClubhouseIntegration')
const ZendeskIntegration = require('./src/components/ZendeskIntegration')


class EventManager {
    trigger(eventName, payload) {

    }

    hook(eventName, callback, context) {

    }
}

class CthulhuCore {
    constructor() {
        this._taskManager = new TaskManager()
        this._eventManager = new EventManager()
    }

    // Events
    triggerEvent(eventName, payload) {
        return this._eventManager.trigger(eventName, payload)
    }

    hookEvent(eventName, eventHandler, context) {
        return this._eventManager.hook(eventName, eventHandler, context)
    }

    // Tasks
    feedTask(taskName, payload) {
        return this._taskManager.feed(taskName, payload)
    }

    requestTask(taskName, payload, responseHandler, context) {
        return this._taskManager.request(taskName, payload, responseHandler, context)
    }

    consumeTask(taskName, taskHandler, context) {
        return this._taskManager.consume(taskName, taskHandler, context)
    }

    subscribeTask(taskName, subscriptionHandler, context) {
        return this._taskManager.subscribe(taskName, subscriptionHandler, context)
    }
}

class Cthulhu extends CthulhuCore {
    constructor() {
        super()
        this._internalEvents = new EventEmitter()

        this.express = express()
        enableWs(this.express)
        this.express.use(bodyParser.json())
            .ws('/stream', (ws) => { new CthulhuClientHandler(this, ws) })

        this.promiseToStart = new PromiseToEmit(this._internalEvents, 'started')
    }

    start(callback) {
        this.express.listen(process.env.PORT || 8888, callback)
    }
        
    close() {
        this._internalEvents.emit('close')
    }
}

class CthulhuClientHandler {
    constructor(cthulhu, ws) {
        this._cthulhu = cthulhu
        this._ws = ws

        this._internalEvents = new EventEmitter()
        this._nextResponseId = 0
        
        this._boundClose = this.close.bind(this)

        this._cthulhu._internalEvents.on('close', this._boundClose)
        this._ws.on('close', this._boundClose)

        this._ws.on('message', this._handleMessage.bind(this))
    }

    async _handleMessage(str) {
        const { requestId, responseId, methodName, methodCatagory, payload} = JSONparseSafe(str, {})
        // const {ackId, requestId, resourceType, action, resourceName, value} = JSONparseSafe(str, {})
        if (methodName === 'response') {
            this._internalEvents.emit(`response:${responseId}`, payload)
        } else {
            if (methodName === 'triggerEvent') {
                this._cthulhu.triggerEvent(methodCatagory, payload)
            } else if (methodName === 'hookEvent') {
                let hookProcess = await this._cthulhu.hookEvent(eventName, (payload) => {
                    this._respond(requestId, payload)
                })

                this._ws.on('close', ()=>{
                    hookProcess.close()
                })
            } else if (methodName === 'feedTask') {
                this._cthulhu.feedTask(methodCatagory, payload)
            } else if (methodName === 'requestTask') {
                let requestProcess = this._cthulhu.requestTask(taskName, payload, (payload) => {
                    return await this._request(requestId, payload)
                })

                this._ws.on('close', () => {
                    requestProcess.close()
                })
            } else if (methodName === 'consumeTask') {
                let consumeProcess = this._cthulhu.consumeTask(taskName, (payload) => {
                    return await this._request(requestId, payload)
                })

                this._ws.on('close', () => {
                    consumeProcess.close()
                })
            } else if (methodName === 'subscribeTask') {
                let subscriptionProcess = this._cthulhu.subscribeTask(taskName, (payload) => {
                    return await this._request(requestId, payload)
                })

                this._ws.on('close', () => {
                    subscriptionProcess.close()
                })
            }
        }
    }

    close() {
        this._cthulhu._internalEvents.off('close', this._boundClose)        
        this._ws.close()
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
            this._ws.on('close', rejection = reject)
        })

        this._internalEvents.off(`response:${responseId}`, resolution)
        this._ws.off('close', rejection)

        return result
    }

}

class Minion {
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

    close() {
        if (this._isClosed) return
        await this.promiseToStart

        this._isClosed = true
        this._internalEvents.emit('close')
        this._ws.close()
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

    // Events
    triggerEvent(eventName, value) {
        return this._send('triggerEvent', eventName, value)
    }

    hookEvent(eventName, callback, context) {
        return this._subscribe('hookEvent', eventName, callback, context)
    }

    // Tasks
    feedTask(taskName, payload) {
    // feedTask(taskName, payload) {
        return this._send('feedTask', taskName, payload)
    }

    requestTask(taskName, payload, responseHandler, context) {
    // requestTask(taskName, payload) {
        return this._fetch('requestTask', taskName, payload)
    }

    consumeTask(taskName, taskHandler, context) {
    // consumeTask(taskName, taskHandler) {
        return this._request('consumeTask', taskName, taskHandler)
    }

    subscribeTask(taskName, subscriptionHandler, context) {
    // subscribeTask(taskName, callback, context) {
        return this._subscribe('subscribeTask', taskName, callback, context)
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
            // let {responseId, payload} = await this._fetch(methodName, methodCatagory)
            // payload = await requestHandler.call(context, payload)
            // this._send('respond', '', {responseId, payload})
            // return resRefId
        })
    }

    async _subscribe(methodName, methodCatagory, subscriptionHandler, context) {
        return new Process(async (process) => {
            // let {requestId, responseId, payload} = await this._fetch(methodName, methodCatagory)
            // this._internalEvents.on(`response:${requestId}`, subscriptionHandler, context)
        })
    }

    _handleMessage(str) {
        const message = JSONparseSafe(str, {})
        const {requestId, ackId, value} = message
        this._internalEvents.emit(requestId, {ackId, value})
    }

    // OLD

    // _ack(ackId, value) {
    //     return new Process(async (process) => {
    //         this._ws.send(JSON.stringify({ ackId, action: 'ack', value}))
    //     })
    // }

    // async _request(resourceType, action, resourceName, value) {
    //     await this.promiseToStart()
    //     const requestId = this._nextRequestId ++
    //     this._ws.send(JSON.stringify({ requestId, resourceType, action, resourceName, value}))
    //     return await new Promise((resolve) => { this._internalEvents.once(requestId, resolve) })
    // }

    // async _listen(resourceType, action, resourceName, value, callback) {
    //     await this._request(resourceType, action, resourceName, value) 
    //     const resRefId = value
    //     this._internalEvents.on(requestId, function({ackId, value}) {
    //         this._ack(ackId, value)
    //         callback(value)
    //     })
    //     return resRefId
    // }

    // ready() {}
}

Cthulhu.Minion = Minion
Cthulhu.WebhookIngester = WebhookIngester
Cthulhu.SlackIntegration = SlackIntegration
Cthulhu.SalesforceIntegration = SalesforceIntegration
Cthulhu.ClubhouseIntegration = ClubhouseIntegration
Cthulhu.ZendeskIntegration = ZendeskIntegration

module.exports = Cthulhu
