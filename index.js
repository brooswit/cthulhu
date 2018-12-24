const {MethodManager, HookManager, JSONparseSafe, TaskManager, MethodRegistry} = require('brooswit-common')

const WebSocket = require('ws')

const express = require('express')
const bodyParser = require('body-parser')
const enableWs = require('express-ws')

const WebhookIngester = require('./src/components/WebhookIngester')
const SlackIntegration = require('./src/components/SlackIntegration')
const SalesforceIntegration = require('./src/components/SalesforceIntegration')
const ClubhouseIntegration = require('./src/components/ClubhouseIntegration')
const ZendeskIntegration = require('./src/components/ZendeskIntegration')

class Cthulhu {
    constructor() {
        this._state = Cthulhu.STATE.READY
        this.internalEvents = new EventEmitter()
        this.events = new CthulhuEvents()
        this.tasks = new CthulhuTasks()

        this.express = express()
        enableWs(this.express)
        this.express.use(bodyParser.json())
            .ws('/stream', (ws) => { new WebSocketBridge(this, ws) })
    }

    async start() {
        return await new Promise((resolve) => {
            this.express.listen(process.env.PORT || 8888, resolve)
        })
    }

    close() {}
}

class CthulhuEvents {
    constructor(cthulhu) {
        this._cthulhu = cthulhu

        this._methodManager = new MethodManager()
    }
    async trigger(eventName, value) {
        return this._methodManager.trigger(eventName, value)
    }
    async hook(eventName, callback, context) {
        return this._methodManager.hook(eventName, callback, context)
    }
}

class CthulhuTasks {
    constructor(cthulhu) {
        this._cthulhu = cthulhu

        this._tasks = new TaskManager()
    }
    async add(taskName, value) {
        return this._tasks.add(taskName, value)
    }
    async consume(taskName, callback) {
        return this._tasks.consumer(taskName, callback)
    }
}

let nextAckId = 0
class WebSocketBridge {
    constructor(cthulhu, ws) {
        this._cthulhu = cthulhu
        this._ws = ws

        this._ackEmitter = new EventEmitter()

        this._cthulhu.internalEvents.on('close', this.close.bind(this))
        this._ws.on('close', this.close.bind(this))

        this._ws.on('message', this._handleMessage.bind(this))
    }

    async _handleMessage(str) {
        console.warn('_handleMessage')
        const {ackId, reqRefId, resourceType, action, resourceName, value} = JSONparseSafe(str, {})
        console.warn({ackId, reqRefId, resourceType, action, resourceName, value})
        let respond = async (value) => {
            this._ws.send(JSON.stringify({reqRefId, value}))
        }

        let request = async (value) => {
            const ackId = nextAckId++
            this._ws.send(JSON.stringify({ackId, reqRefId, value}))
            let resolution, rejection
            let result = await new Promise((resolve, reject) => {
                this._ackEmitter.once(ackId, resolution = resolve)
                this._ws.on('close', rejection = reject)
            })
            this._ackEmitter.off(ackId, resolution)
            this._ws.off('close', rejection)
            return result
        }

        let result = null
        if (action === 'ack') {
            this._ackEmitter.emit(ackId, value)
        } else {
            switch(resourceType) {
                case 'events':
                    switch(action) {
                        case 'trigger':
                            result = await this._cthulhu.events.trigger(resourceName, value); break
                        case 'hook':
                            let hookId = await this._cthulhu.events.hook(resourceName, request);
                            this._ws.on('close', ()=>{
                                this._cthulhu.events.stop(hookId)
                            })
                            break;
                    }
                    break
                case 'tasks':
                    switch(action) {
                        case 'add':
                            result = await this._cthulhu.tasks.add(resourceName, value); break
                        case 'consume':
                            result = await this._cthulhu.tasks.consume(resourceName, request); break
                    }
                    break
            }
            respond(result)
        }
    }

    close() {
        this._ws.close()
    }
}

class Minion {
    constructor (url) {
        console.warn('Starting Minion...')
        this._ws = new WebSocket(`ws://${url}/stream`);
        this._ws.on('message', this._handleMessage.bind(this))
        this._nextReqRefId = 0
        this._responseEvents = new EventEmitter()
        this._openPromise = new Promise((resolve) => {
            this._ws.on('open', resolve)
        })

        this.events = new MinionEvents(this)
        this.tasks = new MinionTasks(this)

        this._ws.on('open', ()=>{
            console.warn('... Minion is ready ...')
        })
    }

    async _request(resourceType, action, resourceName, value) {
        await this.untilReady()
        const reqRefId = this._nextReqRefId ++
        this._ws.send(JSON.stringify({ reqRefId, resourceType, action, resourceName, value}))
        return await new Promise((resolve) => { this._responseEvents.once(reqRefId, resolve) })
    }

    async _listen(resourceType, action, resourceName, value, callback) {
        await this.untilReady()
        const reqRefId = this._nextReqRefId ++
        this._ws.send(JSON.stringify({ reqRefId, resourceType, action, resourceName, value}))
        const {ackId, value} = await new Promise((resolve) => {this._responseEvents.once(reqRefId, resolve) })
        const resRefId = values
        this._responseEvents.on(reqRefId, function(value) {
            this._ws.send(JSON.stringify({ ackId, action: 'ack', value}))
            callback(value)
        })
        return resRefId
    }

    async untilReady() {
        await this._openPromise
    }

    _handleMessage(str) {
        const message = JSONparseSafe(str, {})
        const {reqRefId, ackId, value} = message
        this._responseEvents.emit(reqRefId, {ackId, value})
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
