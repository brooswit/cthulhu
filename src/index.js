const EventEmitter = new require('events')

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
        this._tasks = []
        this._events = new EventEmitter()
    }

    async requestTask(name, payload) {
        let task = this.addTask(name,payload)
        return await task.untilComplete()
    }

    addTask(name, payload) {
        let task = new Task(name, payload)
        this._tasks[name] = this._tasks[name] || new AsyncArray()
        this._tasks[name].push(new Task(payload))
        return task
    }

    async consumeTask(name, handler) {
        this._tasks[name] = this._tasks[name] || new AsyncArray()
        let task = await this._tasks[name].shift()
        if (await task.handle(handler) === false) {
            this._tasks[name].unshift()
        }
    }

    triggerEvent(eventName, payload) {
        this._events.emit(eventName, payload)
    }

    async consumeEvent(eventname) {
        const resolver = new Resolver()
        this._events.once(eventname, resolver.resolve)
        result = await resolver
        return result
    }
}
