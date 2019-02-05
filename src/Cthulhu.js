const {Routine, EventManager, TaskManager, VirtualWebSocket} = require('brooswit-common')
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

module.exports = class Cthulhu extends Routine {
    constructor({
        useRedis=false, redisHost, redisPort, redisPassword,
        useLd=false, ldSdkKey, // ldApiKey,
        useExpress=true, expressPort=process.env.PORT,
        useStream=true,  streamPath='/stream'
    }, parentRoutine) {
        super(async () => {
            await this.ldClient.waitForInitialization()
            if (useExpress) {
                this.express = await new Promise((resolve)=>{
                    this.log.info('USING EXPRESS')
                    let expressApp = express()
                    expressApp.use(bodyParser.json())
                    if (useStream) {
                        this.log.info('USING STREAM')
                        enableWs(expressApp)
                        expressApp.ws(streamPath, (ws) => {
                            new VirtualWebSocket(ws, (channel) => {
                                this._handleVirtualWebSocketChannel(channel)
                            }, this)
                        })
                    }
                    expressApp.listen(expressPort, () => {
                        this.log.info('READY')
                        resolve(expressApp)
                    })
                })
            }
            this.emit('ready')

            await this.untilEnd
        }, parentRoutine)
        this.log.info('STARTING')

        this._eventManager = new EventManager(this)
        this._taskManager = new TaskManager(this)
        this.untilReady = this.promiseTo('ready')

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
        if (!useLd) {
            ldConfig.offline = true
        } else {
            this.log.info('USING LAUNCHDARKLY')
            if (useRedis) {
                ldConfig.useLdd = true
                ldConfig.featureStore = LaunchDarkly.RedisFeatureStore(redisConfig)
            }
        }
        this.ldClient = LaunchDarkly.init(ldSdkKey, ldConfig)
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
        return new Routine(async () => {
            await this.unitlReady
            if (await ldAnonVariation( this.ldClient, `should-trigger-${eventName}`, payload, true)) {
                this._eventManager.trigger(eventName, payload)
            } else {
                this.log(`suppressed`)
            }
        }, this, `triggerEvent:${eventName}`)
    }
  
    hookEvent(eventName, eventHandler, parentRoutine) {
        return new Routine(async () => {
            await this.unitlReady
            if (await ldAnonVariation( this.ldClient, `should-hook-${eventName}`, payload, true)) {
                return this._eventManager.hook(eventName, eventHandler, parentRoutine)
            } else {
                this.log(`suppressed`)
            }
        }, this, `hookEvent:${eventName}`)
}
  
    // Tasks
    feedTask(taskName, payload, parentRoutine) {
        return new Routine(async () => {
            await this.unitlReady
            if (await ldAnonVariation( this.ldClient, `should-feed-${eventName}`, payload, true)) {
                return this._taskManager.feed(taskName, payload, parentRoutine)
            } else {
                this.log(`suppressed`)
            }
        }, this, `feedTask:${eventName}`)
    }
  
    requestTask(taskName, payload, responseHandler, parentRoutine) {
        return new Routine(async () => {
            await this.unitlReady
            if (await ldAnonVariation( this.ldClient, `should-request-${eventName}`, payload, true)) {
                return this._taskManager.request(taskName, payload, responseHandler, parentRoutine)
            }
        }, this)
    }
  
    consumeTask(taskName, taskHandler, parentRoutine) {
        return new Routine(async () => {
            await this.unitlReady
            if (await ldAnonVariation(
                this.ldClient, `should-consume-${taskName}`,
                createAnonLDUser()), true
            ) {
                return this._taskManager.consume(taskName, taskHandler, parentRoutine)
            }
        }, this)
    }
  
    subscribeTask(taskName, subscriptionHandler, parentRoutine) {
        return new Routine(async () => {
            await this.unitlReady
            if (await ldAnonVariation(
                this.ldClient, `should-subscribe-${taskName}`,
                createAnonLDUser()), true
            ) {
                return this._taskManager.subscribe(taskName, subscriptionHandler, parentRoutine)
            }
        }, this)
    }
}
