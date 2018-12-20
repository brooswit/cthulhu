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

        this.events = new CthulhuEvents()
        this.tasks = new CthulhuTasks()

        this.express = express()
        enableWs(this.express)
        this.express.use(bodyParser.json())
            .ws('/stream', (ws) => { new WebSocketBridge(this, ws) })
    }

    ready() {
        this.express.listen(process.env.PORT || 8888)
        console.warn("...Cthulhu is ready...")
    }
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
        console.warn('new client')
        this._cthulhu = cthulhu
        this._ws = ws
        this._eventEmitter = new EventEmitter()

        this._ws.on('message', this._handleMessage.bind(this))
        this._ws.on('close', this.destroy.bind(this))
    }

    async _handleMessage(str) {
        console.warn('_handleMessage')
        const {ackId, reqRefId, resourceType, action, resourceName, value} = JSONparseSafe(str, {})
        console.warn({ackId, reqRefId, resourceType, action, resourceName, value})
        let respond = async (value) => {
            const ackId = nextAckId++
            this._ws.send(JSON.stringify({ackId, reqRefId, value}))
            return await new Promise((resolve) => {
                this._eventEmitter.once(`ack:${ackId}`, resolve)
            })
        }
        let result

        if (action === 'ack') {
            this._eventEmitter.emit(`ack:${ackId}`, value)
        }
        switch(resourceType) {
            case 'events':
                switch(action) {
                    case 'trigger':
                        result = this._cthulhu.events.trigger(resourceName, value); break
                    case 'hook':
                        result = this._cthulhu.events.hook(resourceName, respond); break
                    case 'respond':
                        result = this._cthulhu.events.respond(resourceName, value); break
                        break
                }
                break
            case 'tasks':
                switch(action) {
                    case 'add':
                        result = await this._cthulhu.tasks.add(resourceName, value); break
                    case 'consume':
                        result = this._cthulhu.tasks.consume(resourceName, respond); break
                    case 'ack':
                        result = this._cthulhu.tasks.respond(resourceName, value); break
                        break
                }
                break
        }
    }

    destroy() {
        // TODO //
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
        const resRefId = await new Promise((resolve) => {this._responseEvents.once(reqRefId, resolve) })
        this._responseEvents.on(reqRefId, function(value) {
            this._ws.send(JSON.stringify({ runRefId, resourceType, action: 'ack'}))
            callback(value)
        })
        return resRefId
    }

    async untilReady() {
        await this._openPromise
    }

    _handleMessage(str) {
        const message = JSONparseSafe(str, {})
        const {reqRefId, value} = message
        this._responseEvents.emit(reqRefId, value)
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
