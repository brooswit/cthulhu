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

class Cthulhu {
    constructor() {
        this._state = Cthulhu.STATE.READY
        this._internalEvents = new EventEmitter()

        this._taskManager = new TaskManager()
        this._eventManager = new EventManager()

        this.express = express()
        enableWs(this.express)
        this.express.use(bodyParser.json())
            .ws('/stream', (ws) => { new CthulhuClientHandler(this, ws) })

        this.promiseToStart = new PromiseToEmit(this._internalEvents, 'started')
    }

    async start() {
        return await new Promise((resolve) => {
            this.express.listen(process.env.PORT || 8888, resolve)
        })
    }
        
    close() {
        this._internalEvents.emit('close')
    }

    // Events
    async triggerEvent(eventName, payload) {
        await this.promiseToStart
        this._eventManager.trigger(eventName, payload)
    }

    async hookEvent(eventName, eventHandler, context) {
        await this.promiseToStart
        this._eventManager.hook(eventName, eventHandler, context)
    }

    // Tasks
    async feedTask(taskName, payload) {
        await this.promiseToStart
        this._taskManager.feed(taskName, payload)
    }

    async requestTask(taskName, payload, responseHandler, context) {
        await this.promiseToStart
        this._taskManager.request(taskName, payload, responseHandler, context)
    }

    async consumeTask(taskName, taskHandler, context) {
        await this.promiseToStart
        this._taskManager.consume(taskName, taskHandler, context)
    }

    async subscribeTask(taskName, subscriptionHandler, context) {
        await this.promiseToStart
        return this._taskManager.subscribe(taskName, subscriptionHandler, context)
    }
}

let nextAckId = 0
class CthulhuClientHandler {
    constructor(cthulhu, ws) {
        this._boundClose = this.close.bind(this)
        this._cthulhu = cthulhu
        this._ws = ws

        this._ackEmitter = new EventEmitter()

        this._cthulhu._internalEvents.on('close', this._boundClose)
        this._ws.on('close', this._boundClose)

        this._ws.on('message', this._handleMessage.bind(this))
    }

    async _handleMessage(str) {
        const { requestId, responseId, methodName, methodCatagory, payload} = JSONparseSafe(str, {})
        // const {ackId, reqRefId, resourceType, action, resourceName, value} = JSONparseSafe(str, {})
        if (methodName === 'response') {
            this._internalEvents.emit(`response:${responseId}`, payload)
        } else {
            if (methodName === 'triggerEvent') {
                this._cthulhu.triggerEvent(methodCatagory, payload)
            } else if (methodName === 'hookEvent') {
                let hookProcess = await this._cthulhu.hookEvent(eventName, (payload) => {
                    this._send({requestId, payload})
                })

                this._ws.on('close', ()=>{
                    hookProcess.close()
                })
            } else if (methodName === 'feedTask') {
                this._cthulhu.feedTask(methodCatagory, payload)
            } else if (methodName === 'requestTask') {
                let requestProcess = this._cthulhu.requestTask(taskName, payload, (payload) => {
                    response = await this._request({requestId, payload})
                })

                this._ws.on('close', ()=>{
                    requestProcess.close()
                })

                let responsePayload = await new PromiseToEmit(this._internalEvents, `response:${responseId}`)

            } else if (methodName === 'consumeTask') {

            } else if (methodName === 'subscribeTask') {

            }
            let result = null

            if (resourceType === 'events') {
                if (action === 'trigger') {
                    result = await this._cthulhu.events.trigger(resourceName, value)
                }
                if (action === 'hook') {
                    let hookId = await this._cthulhu.events.hook(resourceName, this._request);
                    this._ws.on('close', ()=>{
                        this._cthulhu.events.stop(hookId)
                    })
                }
            }
            if (resourceType === 'tasks') {
                if (action === 'add') {
                    result = await this._cthulhu.tasks.add(resourceName, value); break
                }
                if (action === 'subscribe') {
                    let subId = await this._cthulhu.tasks.subscribe(resourceName, this._request); break
                    this._ws.on('close', ()=>{
                        this._cthulhu.tasks.unsubscribe(subId)
                    })
                }
            }
            this._respond(reqRefId, result)
        }
    }

    close() {
        this._cthulhu._internalEvents.off('close', this._boundClose)        
        this._ws.close()
    }

    async _respond (reqRefId, value) {
        this._ws.send(JSON.stringify({reqRefId, value}))
    }

    async _request (reqRefId, value) {
        const ackId = nextAckId++
        let resolution, rejection

        this._ws.send(JSON.stringify({ackId, reqRefId, value}))

        let result = await new Promise((resolve, reject) => {
            this._ackEmitter.on(ackId, resolution = resolve)
            this._ws.on('close', rejection = reject)
        })

        this._ackEmitter.off(ackId, resolution)
        this._ws.off('close', rejection)

        return result
    }

}

class PromiseToEmit extends Promise {
    constructor(emitter, eventName, errorEventName) {
        super((resolve, reject) => {
            emitter.once(eventName, resolve)
            if (errorEventName) {
                emitter.once(errorEventName, reject)
            }
        })
    }
}

class Minion {
    constructor (url) {
        this.events = new MinionEvents(this)
        this.tasks = new MinionTasks(this)

        this._internalEvents = new EventEmitter()
        this._nextReqRefId = 0

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
        this._send('triggerEvent', eventName, value)
    }

    hookEvent(eventName, callback, context) {
        return this._subscribe('hookEvent', eventName, callback, context)
    }

    // Tasks
    async requestTask(taskName, payload) {
        return this._fetch('requestTask', taskName, payload)
    }

    async feedTask(taskName, payload) {
        this._send('feedTask', taskName, payload)
    }

    async consumeTask(taskName, taskHandler) {
        return this._request('consumeTask', taskName, taskHandler)
    }

    async subscribeTask(taskName, callback, context) {
        return this._subscribe('subscribeTask', taskName, callback, context)
    }

    async _fetch(methodName, methodCatagory, payload) {
        if (this._isClosed) return
        await this.promiseToStart
        
        const requestId = this._nextRequestId ++
        this._ws.send(JSON.stringify({ requestId, methodName, methodCatagory, payload}))
        return await new PromiseToEmit(this._internalEvents, `response:${requestId}`)
    }

    async _send(methodName, methodCatagory, payload) {
        this._fetch(methodName, methodCatagory, payload)
    }

    async _request(methodName, methodCatagory, requestHandler, context) {
        let {responseId, payload} = await this._fetch(methodName, methodCatagory)
        payload = await requestHandler.call(context, payload)
        this._send('respond', '', {responseId, payload})
        return resRefId
    }

    async _subscribe(methodName, methodCatagory, subscriptionHandler, context) {
        let {requestId, responseId, payload} = await this._fetch(methodName, methodCatagory)
        this._internalEvents.on(`response:${requestId}`, subscriptionHandler, context)
    }

    _ack(ackId, value) {
        this._ws.send(JSON.stringify({ ackId, action: 'ack', value}))
    }

    async _request(resourceType, action, resourceName, value) {
        await this.promiseToStart()
        const reqRefId = this._nextReqRefId ++
        this._ws.send(JSON.stringify({ reqRefId, resourceType, action, resourceName, value}))
        return await new Promise((resolve) => { this._internalEvents.once(reqRefId, resolve) })
    }

    async _listen(resourceType, action, resourceName, value, callback) {
        await this._request(resourceType, action, resourceName, value) 
        const resRefId = value
        this._internalEvents.on(reqRefId, function({ackId, value}) {
            this._ack(ackId, value)
            callback(value)
        })
        return resRefId
    }

    _handleMessage(str) {
        const message = JSONparseSafe(str, {})
        const {reqRefId, ackId, value} = message
        this._internalEvents.emit(reqRefId, {ackId, value})
    }

    ready() {}
}

class MinionEvents {
    constructor(minion) {
        this._minion = minion
    }
    async trigger(eventName, value) {
        return await this._minion._request('events', 'trigger', eventName, value, callback)
    }
    async hook(eventName, callback) {
        return await this._minion._listen('events', 'hook', eventName, null, callback)
    }
}

class MinionTasks {
    constructor(minion) {
        this._minion = minion
    }
    async add(taskName, value) {
        return await this._minion._request('tasks', 'add', taskName, value, callback)
    }
    async consume(taskName, callback) {
        return await this._minion._listen('tasks', 'consume', taskName, null, callback)
    }
}

Cthulhu.Minion = Minion
Cthulhu.WebhookIngester = WebhookIngester
Cthulhu.SlackIntegration = SlackIntegration
Cthulhu.SalesforceIntegration = SalesforceIntegration
Cthulhu.ClubhouseIntegration = ClubhouseIntegration
Cthulhu.ZendeskIntegration = ZendeskIntegration

module.exports = Cthulhu
