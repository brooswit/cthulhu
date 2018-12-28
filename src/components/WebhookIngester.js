const {JSONparseSafe} = require('brooswit-common')
// TODO: REFACTOR TO NEW PATTERNS
module.exports = class WebhookIngester {
    constructor(cthulhu, express, path) {
        let eventName = path.replace('/',':')
        console.debug(`new WebhookIngester ${path}`)
        express.post(`/${path}`, async (req, res) => {
            let operationData = req.body || {};
            let result = await handler(operationData)
            if(result === false) res.status(404).end();
            else res.send(result)
        })
    }
}
