const {JSONparseSafe} = require('brooswit-common')

module.exports = class WebhookEventIngester {
    constructor(cthulhuInstance, expressApp, eventName) {
        console.debug(`new WebhookIngester ${`/${eventName}`}`)
        expressApp.post(`/${eventName}`, async (req, res) => {
            console.debug(`WebhookIngester:${eventName}:handled`)
            console.log(req.body)
            let operationData = req.body || {};
            await cthulhuInstance.events.emit(eventName, operationData)
            res.send(200)
        })
    }
}