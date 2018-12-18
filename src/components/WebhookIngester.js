const {JSONparseSafe} = require('brooswit-common')

module.exports = class WebhookIngester {
    constructor(express, path, handler) {
        console.debug(`new WebhookIngester ${path}`)
        express.post(path, async (req, res) => {
            let operationData = req.body || {};
            let result = await handler(operationData)
            if(result === false) res.status(404).end();
            else res.send(result)
        })
    }
}
