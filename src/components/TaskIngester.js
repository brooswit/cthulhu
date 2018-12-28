const {JSONparseSafe} = require('brooswit-common')
// TODO: REFACTOR TO NEW PATTERNS
module.exports = class TaskIngester {
    constructor(cthulhu, express, path) {
        let taskName = path.replace('/',':')
        express.post(`/${path}`, async (req, res) => {
            cthulhu.requestTask(taskName, req.body || {}, res.send, res)
        })
    }
}
