const {Routine, EventManager, TaskManager, VirtualWebSocket} = require('brooswit-common')

module.exports = class Cthulhu extends Routine {
    constructor({ expressApp, redisClient, ldClient }, parentRoutine) {
        super(async () => {
            await this._ldClient.waitForInitialization()
            if (expressApp.ws) {
                expressApp.ws('/stream', (ws) => {
                    new VirtualWebSocket(ws, (channel) => {
                        this._handleVirtualWebSocketChannel(channel)
                    }, this)
                })
            }
            this.emit('ready')
            await this.untilEnd
        }, parentRoutine)
        this.log.info('STARTING')

        this._eventManager = new EventManager(this)
        this._taskManager = new TaskManager(this)
        this.untilReady = this.promiseTo('ready')

        this._expressApp = expressApp
        this._ldClient = ldClient
        this._redisClient = redisClient
    }

    async _handleVirtualWebSocketChannel(channel) {
        channel.subscribeTo(channel.observe('event/trigger'), (eventName, payload) => {
            this.triggerEvent(eventName, payload)
            channel.end()
        })
        channel.subscribeTo(channel.observe('event/hook'), (eventName) => {
            this.hookEvent(eventName, (payload) => {
                channel.send('event', payload)
            }, channel)
        })
        channel.subscribeTo(channel.observe('task/add'), (taskName, payload) => {
            this.feedTask(taskName, payload, channel)
            channel.end()
        })
        channel.subscribeTo(channel.observe('task/request'), (taskName, payload) => {
            this.requestTask(taskName, payload, (taskResult) => {
                channel.send('task/complete', taskResult)
                channel.end()
            }, channel)
        })
        channel.subscribeTo(channel.observe('task/consume'), (taskName) => {
            this.consumeTask(taskName, async (task) => {
                await this._handleChannelTask(channel, task),
                channel.end()
            }, channel)
        })
        channel.subscribeTo(channel.observe('task/subscribe'), (taskName) => {
            this.subscribeTask(taskName, async (task) => {
                await this._handleChannelTask(channel, task)
            }, channel)
        })
        await channel.untilEnd
    }

    async _handleChannelTask(channel, task) {
        channel.send('task', task)
        const taskResult = await Promise.race([
            channel.promiseTo(`task/complete`),
            channel.untilEnd
        ])
        task.resolve(taskResult)
    }

    getVariation(variation, identity, attributes, fallback, callback) {
        if (!this._ldClient) return fallback

        const key = identity || 'anonymous'
        const anonymous = key === 'anonymous'
        const privateAttributeNames = ['currentTIme']
        const custom = Object.assign(attributes, { currentTIme: Date.now() })

        let ldUser = { key, anonymous, custom, privateAttributeNames }

        this._ldClient.variation(variation, ldUser, fallback, (error, variation) => {
            this.log.warn(error)
            callback(variation)
        })
    }

    async variation({feature, identity = undefined, attributes = undefined, fallback = undefined}) {
        if (!feature || !this._ldClient) return fallback
        else {
            let ldUser = {}
            ldUser.key = identity || 'anonymous'
            ldUser.anonymous = !!identity
            ldUser.custom = attributes
            return(await this._ldClient.variation(feature, ldUser, fallback))
        }
    }

    getCache(path, callback) {
        console.log(callback)
        if (!this._redisClient) { callback() }
        else {
            this._redisClient.get(path, (error, value) => {
                if (error) { this.log.warn(error) }
                callback(value)
            })
        }
    }

    setCache(path, value, ms, callback) {
        if (!this._redisClient) { callback() }
        else {
            this._redisClient.set(path, value, 'EX', (ms ? ms / chrono.second : Infinity), (error) => {
                if (error) { this.log.warn(error) }
                callback(error)
            },)
        }
    }

    // Events
    triggerEvent(eventName, payload) {
        this._eventManager.trigger(eventName, payload)
    }
  
    hookEvent(eventName, eventHandler, parentRoutine) {
        return this._eventManager.hook(eventName, eventHandler, parentRoutine)
    }
  
    // Tasks
    feedTask(taskName, payload, parentRoutine) {
        return this._taskManager.feed(taskName, payload, parentRoutine)
    }
  
    requestTask(taskName, payload, responseHandler, parentRoutine) {
        return this._taskManager.request(taskName, payload, responseHandler, parentRoutine)
    }
  
    consumeTask(taskName, taskHandler, parentRoutine) {
        return this._taskManager.consume(taskName, taskHandler, parentRoutine)
    }
  
    subscribeTask(taskName, subscriptionHandler, parentRoutine) {
        return this._taskManager.subscribe(taskName, subscriptionHandler, parentRoutine)
    }
}
