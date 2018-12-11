const EventEmitter = new require('events')

const TaskManager = require('./src/TaskManager')
const WebhookIngester = require('./components/WebhookIngester')

class Task {
    constructor(payload) {
        this._payload = payload
        this._promise = new Resolver()
    }

    async handle(handler) {
        try {
            this._promise.resolve(await handler(payload))
            return true
        } catch(e) {
            this.addTask(payload);
            console.warn(e)
            return false
        }
    }

    async untilComplete() {
        return await this._promise
    }
}

class Cthulhu {
    constructor() {
        this._tasks = new TaskManager()
        this._events = new EventEmitter()
    }

    async _handleRequest(res, req) {
        //req.query.token
        this.triggerEvent(req.query.name, req.body)
        res.sendStatus(200)
    }

    addTask(taskName, taskData) {
        return this._tasks.addTask(taskName, taskData)
    }

    consumeTask(taskName) {
        return await this._tasks.consumeTask(taskNames)
    }s

    emitEvent(eventName, payload) {
        this._events.emit(eventName, payload)
    }

    onEvent(eventName, handler) {
        this._events.on(eventName, handler)
    }
}

Cthulhu.WebhookIngester = WebhookIngester

module.exports = Cthulhu