const {JSONparseSafe} = require('brooswit-common')

module.exports = class WebhookIngester {
    constructor(cthulhuInstance, expressApp, operationName) {
        console.debug(`new WebhookIngester ${operationName}`)
        this._cthulhuInstance = cthulhuInstance
        this._expressApp = expressApp
        this._operationName = operationName

        this._expressApp.post(`/${operationName}`, this._handleRequest)
    }

    async _handleRequest(req, res) {
        console.debug(`WebhookIngester:${operationName}:_handleRequest`)
        let operationData = JSONparseSafe(req.body) || {}
        
        await this._cthulhuInstance.operations.execute(this._operationName, operationData)
        res.send(200)
    }
}