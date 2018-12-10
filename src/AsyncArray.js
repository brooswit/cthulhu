const Resolver = require('Resolver')

module.exports = class AsyncArray {
    constructor() {
        this._array = []
        this._requestQueue = []
    }
    
    push(value){
        this._array.push(value)
        this._feedConsumer()
    }

    unshift(value){
        this._array.unshift(value)
        this._feedConsumer()
    }

    async pop() {
        await this._waitForContent()
        return this._array.pop()
    }
    
    async shift() {
        await this._waitForContent()
        return this._array.shift()
    }

    _feedConsumer() {
        let request = this._requestQueue.shift()
        if (request) request.resolve()
    }

    async _waitForContent() {
        if(this._array.length===0) {
            let resolver = new Resolver()
            this._requestQueue.push(resolver)
            await resolver
        }
    }
}
