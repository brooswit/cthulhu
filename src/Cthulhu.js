const {Routine, EventManager, TaskManager, VirtualWebSocket} = require('brooswit-common')

module.exports = class Cthulhu extends Routine {
    constructor({ express, launchDarkly, redis }, parentRoutine) {
        super(handleProcess, parentRoutine)
        this.log.info('STARTING')

        this._eventManager = new EventManager(this)
        this._taskManager = new TaskManager(this)
        this.untilReady = this.promiseTo('ready')

        this._express = express

        const redisConfig = {
            host: redisHost,
            port: redisPort,
            password: redisPassword
        }
        if (useRedis) {
            this.log.info('USING REDIS')
            this.redisClient = redis.createClient(redisConfig)
        }

        const ldConfig = {}
        ldConfig.capacity = 100000
        if (!useLd) {
            ldConfig.offline = true
        } else {
            this.log.info('USING LAUNCHDARKLY')
            if (ldUseRedis) {
                ldConfig.useLdd = true
                ldConfig.featureStore = LaunchDarkly.RedisFeatureStore(redisConfig)
            }
        }
        this._ldClient = LaunchDarkly.init(ldSdkKey, ldConfig)
        async function handleProcess () {
            await this._ldClient.waitForInitialization()
            if (express.ws) {
                express.ws(streamPath, (ws) => {
                    new VirtualWebSocket(ws, (channel) => {
                        this._handleVirtualWebSocketChannel(channel)
                    }, this)
                })
            }
            this.emit('ready')

            await this.untilEnd
        }
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

    identify({identity, attributes}) {
        if (!this._ldClient) return fallback
        else {
            let ldUser = {}
            ldUser.key = identity || 'anonymous'
            ldUser.anonymous = !!identity
            ldUser.custom = attributes
            this._ldClient.identify(ldUser)
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
