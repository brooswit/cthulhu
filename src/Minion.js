const {Process, VirtualWebSocket} = require('brooswit-common')
const WebSocket = require('ws')

module.exports = class Minion extends Process {
    constructor(url, parentProcess) {
        super(async () => {
            this.untilReady = this.promiseTo(`ready`)
            this._webSocket = new WebSocket(`ws://${url}/stream`)
            this._virtualWebSocket = new VirtualWebSocket(ws, undefined, this)
            await this.untilEnd
        }, parentProcess)
    }

    // Events
    triggerEvent(eventName, payload) {
        console.warn(`triggerEvent ${eventName}`)
        return this._virtualWebSocket.open(async (virtualWebSocketChannel) => {
            virtualWebSocketChannel.send(`event/trigger`, {eventName, payload})
            await virtualWebSocketChannel.untilEnd
        }, this)
    }
  
    hookEvent(eventName, callback) {
        console.warn(`hookEvent ${eventName}`)
        return this._virtualWebSocket.open(async (virtualWebSocketChannel) => {
            virtualWebSocketChannel.send(`event/hook`, {eventName})
            virtualWebSocketChannel.subscribeTo(virtualWebSocketChannel.observe(`event`), (payload) => {
                callback(payload)
            }, virtualWebSocketChannel)
            await virtualWebSocketChannel.untilEnd
        }, this)
    }
  
    // Tasks
    feedTask(taskName, payload) {
        console.warn(`feedTask ${taskName}`)
        return this._virtualWebSocket.open(async (virtualWebSocketChannel) => {
            virtualWebSocketChannel.send(`task/feed`, {taskName, payload})
            await virtualWebSocketChannel.untilEnd
        }, this)
    }
  
    requestTask(taskName, payload, responseHandler) {
        console.warn(`requestTask ${taskName}`)
        return this._virtualWebSocket.open(async (virtualWebSocketChannel) => {
            virtualWebSocketChannel.send(`task/request`, {taskName, payload})
            const result = await virtualWebSocketChannel.promiseTo(`task/complete`)
            responseHandler(result)
            await virtualWebSocketChannel.untilEnd
        }, this)
    }
  
    consumeTask(taskName, taskHandler) {
        console.warn(`consumeTask ${taskName}`)
        return this._virtualWebSocket.open(async (virtualWebSocketChannel) => {
            virtualWebSocketChannel.send(`task/consume`, {taskName})
            const payload = await virtualWebSocketChannel.promiseTo(`task`)
            this._handleTask(virtualWebSocketChannel, taskHandler, payload)            
            await virtualWebSocketChannel.untilEnd
        }, this)
    }
  
    subscribeTask(taskName, subscriptionHandler) {
        console.warn(`subscribeTask ${taskName}`)
        return this._virtualWebSocket.open(async (virtualWebSocketChannel) => {
            virtualWebSocketChannel.send(`task/subscribe`, {taskName})
            virtualWebSocketChannel.subscribeTo(virtualWebSocketChannel.observe(`task`), async (payload) => {
                await this._handleTask(virtualWebSocketChannel, subscriptionHandler, payload)
            }, virtualWebSocketChannel)
            await virtualWebSocketChannel.untilEnd
        }, this)
    }

    async _handleTask(virtualWebSocketChannel, taskHandler, taskPayload) {
        const task = new Resolver()
        task.payload = taskPayload
        taskHandler(task)
        const result = await task
        virtualWebSocketChannel.send(`task/complete`, result)
    }
}
