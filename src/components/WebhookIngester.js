const {JSONparseSafe} = require('brooswit-common')

module.exports = class WebhookIngester {
    constructor(cthulhu, express, operationName) {
        this._cthulhu = cthulhu
        this._express = express
        this._operationName = operationName
        server.post(`/${operationName}`, this._handleRequest)
    }

    async _handleRequest(res, req) {
        let operationData = JSONparseSafe(req.body) || {}
        await this._cthulhu.operations.execute(this._operationName, operationData)
        res.send(200)
    }
}