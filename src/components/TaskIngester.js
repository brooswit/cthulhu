const {JSONparseSafe} = require('brooswit-common')
// TODO: REFACTOR TO NEW PATTERNS
module.exports = class TaskIngester {
    constructor(cthulhu, express, path) {
        let taskName = path.replace('/',':')
        express.post(`/${path}`, async (req, res) => {
            let operationData = req.body || {};
            let result = cthulhu.requestTask(taskName)
            let result = await handler(operationData)
            if(result === false) res.status(404).end();
            else res.send(result)
        })
    }
}
