const {JSONsafeParse, TaskManager, MethodRegistry} = require('brooswit-common')

const EventEmitter = require('events')

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
        this.operations = new CthulhuOperations()
        this.tasks = new CthulhuTasks()

        this.express = express()
        enableWs(this.express)
        this.express.use(bodyParser.json())
            .ws('/stream', this._handleStream)

    }

    _handleStream(ws) {
        const webSocketBridge = new WebSocketBridge(this, ws)
    }

    ready() {
        this.express.listen(process.env.PORT || 8888)
        console.warn("...Cthulhu is ready...")
    }
}

class CthulhuEvents {
    constructor(cthulhu) {
        this._cthulhu = cthulhu

        this._events = new EventEmitter()
    }
    async emit(eventName, value) {
        return this._events.emit(eventName, value)
    }
    async on(eventName, callback) {
        return this._events.on(eventName, callback)
    }
}

class CthulhuOperations {
    constructor(cthulhu) {
        this._cthulhu = cthulhu

        this._methods = new MethodRegistry()
    }
    async execute(operationName, value) {
        return this._methods.execute(operationName, value)
    }
    async register(operationName, callback) {
        return this._methods.register(operationName, callback)
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
    async consumer(taskName, callback) {
        return this._tasks.consumer(taskName, callback)
    }
}

class WebSocketBridge {
    constructor(cthulhu, ws) {
        this._cthulhu = cthulhu
        this._ws = ws
        this._ws.on('message', this._handleMessage)
        this._ws.on('close', this.destroy)
    }

    async _handleMessage(str) {
        const {rerRefId, resourceType, action, resourceName, value} = JSONsafeParse(str, {})
        let respond = (value) => { this._ws.send.call({rerRefId, value}) }
        let result

        switch(resourceType) {
            case 'events':
                switch(action) {
                    case 'on':
                        result = this._cthulhu.events.on(resourceName, respond); break
                    case 'emit':
                        result = this._cthulhu.events.emit(resourceName); break
                }
                break
            case 'operations':
                switch(action) {
                    case 'register':
                        result = this._cthulhu.operations.register(resourceName, respond); break
                    case 'execute':
                        result = await this._cthulhu.operations.execute(resourceName, value); break
                }
                break
            case 'tasks':
                switch(action) {
                    case 'consumer':
                        result = this._cthulhu.tasks.consumer(resourceName, respond); break
                    case 'add':
                        result = await this._cthulhu.tasks.add(resourceName, value); break
                }
                break
        }
        return {rerRefId, value: result}
    }

    destroy() {
        // TODO //
    }
}

class Minion {
    constructor (url) {
        this._ws = new WebSocket(`ws://${url}/stream`);
        this._ws.on('message', this._handleMessage)
        this._nextReqRefId = 0
        this._openPromise = new Promise((resolve) => {
            this._ws.on('open', resolve)
        })

        this.events = new MinionEvents(this)
        this.operations = new MinionOperations(this)
        this.tasks = new MinionTasks(this)
    }

    async _request(resourceType, action, value) {
        await untilReady()
        const reqRefId = this._nextReqRefId ++
        this._ws.send({ resourceType, action, value, reqRefId })
        return await new Promise((resolve) => { this._responseEvents.once(reqRefId, resolve) })
    }

    async _listen(resourceType, action, value, callback) {
        await untilReady()
        const reqRefId = this._nextReqRefId ++
        this._ws.send({ resourceType, action, value, reqRefId })
        const resRefId = await new Promise((resolve) => {this._responseEvents.once(reqRefId, resolve) })
        this._responseEvents.on(reqRefId, callback)
        return resRefId
    }

    async untilReady() {
        await this._readyPromise
    }

    _handleMessage(str) {
        const message = JSONsafeParse(str, {})
        const {reqRefId, value} = message
        this._responseEvents.emit(reqRefId, value)
    }

    ready() {}

}

class MinionEvents {
    constructor(minion) {
        this._minion = minion
    }
    async emit(eventName, value) {
        return await this._minion._request('events', 'emit', value, callback)
    }
    async on(eventName, callback) {
        return await this._minion._listen('events', 'on', eventName, callback)
    }
}

class MinionOperations {
    constructor(minion) {
        this._minion = minion
    }
    async execute(eventName, value) {
        return await this._minion._request('operations', 'execute', value, callback)
    }
    async register(eventName, callback) {
        return await this._minion._listen('operations', 'register', eventName, callback)
    }
}

class MinionTasks {
    constructor(minion) {
        this._minion = minion
    }
    async add(eventName, value) {
        return await this._minion._request('tasks', 'add', value, callback)
    }
    async consumer(eventName, callback) {
        return await this._minion._listen('tasks', 'consumer', eventName, callback)
    }
}

Cthulhu.Minion = Minion
Cthulhu.WebhookIngester = WebhookIngester
Cthulhu.SlackIntegration = SlackIntegration
Cthulhu.SalesforceIntegration = SalesforceIntegration
Cthulhu.ClubhouseIntegration = ClubhouseIntegration
Cthulhu.ZendeskIntegration = ZendeskIntegration

module.exports = Cthulhu
