module.exports = class WebhookIngester {
    constructor(eventName, express, cthulhu) {
        this._express = express
        this._cthulhu = cthulhu
        this._eventName = eventName
        server.post(`/${eventName}`, this._handleRequest)
    }

    async _handleRequest(res, req) {
        this._cthulhu.emitEvent(this._eventName, req.body)
        res.sendStatus(200)
    }
}