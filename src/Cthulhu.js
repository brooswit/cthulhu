const {Process, EventManager, TaskManager, VirtualWebSocket} = require('brooswit-common')

const express = require('express')
const bodyParser = require('body-parser')
const enableWs = require('express-ws')

const redis = require('redis')

const LaunchDarkly = require('ldclient-node');

// LD Helpers
function createAnonLDUser(custom) {
    return {key: 'anon', anonymous: true, custom}
}

async function ldAnonVariation(ldClient, flagKey, custom, fallbackVariation) {
    return await ldClient.variation(flagKey, createAnonLDUser(custom), fallbackVariation)
}

module.exports = class Cthulhu extends Process {
    constructor({
        useRedis=false, redisHost, redisPort, redisPassword,
        useLd=false, ldSdkKey, // ldApiKey,
        useExpress=true, expressPort=process.env.PORT,
        useStream=true,  streamPath='/stream'
    }, parentProcess) {
        super(async ()=>{
            this._eventManager = new EventManager(this)
            this._taskManager = new TaskManager(this)
            this.untilReady = this.promiseTo('ready')

            const redisConfig = {
                host: redisHost,
                port: redisPort,
                password: redisPassword
            }
            if (useRedis) { this.redisClient = redis.createClient(redisConfig) }

            const ldConfig = {}
            if (!useLd) {
                ldConfig.offline = true
            } else {
                if (useRedis) {
                    ldConfig.useLdd = true
                    ldConfig.featureStore = LaunchDarkly.RedisFeatureStore(redisConfig)
                }
            }
            this.ldClient = LaunchDarkly.init(ldSdkKey, ldConfig)

            if (useExpress) {
                this.express = express()
                this.express.use(bodyParser.json())
                if (useStream) { 
                    enableWs(this.express)
                    this.express.ws(streamPath, (ws) => {
                        new VirtualWebSocket(ws, (channel) => {
                            this._handleVirtualWebSocketChannel(channel)
                        }, this)
                    })
                }
                this.express.listen(expressPort, () => {
                    console.warn('... Cthulu is ready...')
                })
            }

            await this.ldClient.waitForInitialization()
            this.emit('ready')

            await this.untilEnd
        }, parentProcess)
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

    // Events
    triggerEvent(eventName, payload) {
        console.warn(`triggerEvent ${eventName}`)
        return new Process(async () => {
            await this.unitlReady
            if (await ldAnonVariation(
                ldClient, `should-trigger-${eventName}`,
                createAnonLDUser(payload)), true
            ) {
                this._eventManager.trigger(eventName, payload)
            } else {
                console.warn(`triggerEvent ${eventName}`)
            }
        }, this)
    }
  
    hookEvent(eventName, eventHandler, parentProcess) {
        console.warn(`hookEvent ${eventName}`)
        return new Process(async () => {
            await this.unitlReady
            if (await ldAnonVariation(
                ldClient, `should-hook-${eventName}`,
                createAnonLDUser(payload)), true
            ) {
                return this._eventManager.hook(eventName, eventHandler, parentProcess)
            }
        }, this)
}
  
    // Tasks
    feedTask(taskName, payload, parentProcess) {
        console.warn(`feedTask ${taskName}`)
        return new Process(async () => {
            await this.unitlReady
            if (await ldAnonVariation(
                ldClient, `should-feed-${taskName}`,
                createAnonLDUser(payload)), true
            ) {
                return this._taskManager.feed(taskName, payload, parentProcess)
            }
        }, this)
    }
  
    requestTask(taskName, payload, responseHandler, parentProcess) {
        console.warn(`requestTask ${taskName}`)
        return new Process(async () => {
            await this.unitlReady
            if (await ldAnonVariation(
                ldClient, `should-request-${taskName}`,
                createAnonLDUser(payload)), true
            ) {
                return this._taskManager.request(taskName, payload, responseHandler, parentProcess)
            }
        }, this)
    }
  
    consumeTask(taskName, taskHandler, parentProcess) {
        console.warn(`consumeTask ${taskName}`)
        return new Process(async () => {
            await this.unitlReady
            if (await ldAnonVariation(
                ldClient, `should-consume-${taskName}`,
                createAnonLDUser(payload)), true
            ) {
                return this._taskManager.consume(taskName, taskHandler, parentProcess)
            }
        }, this)
    }
  
    subscribeTask(taskName, subscriptionHandler, parentProcess) {
        console.warn(`subscribeTask ${taskName}`)
        return new Process(async () => {
            await this.unitlReady
            if (await ldAnonVariation(
                ldClient, `should-subscribe-${taskName}`,
                createAnonLDUser(payload)), true
            ) {
                return this._taskManager.subscribe(taskName, subscriptionHandler, parentProcess)
            }
        }, this)
    }
}
