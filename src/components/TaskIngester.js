// TODO: REFACTOR TO NEW PATTERNS
module.exports = class TaskIngester {
    constructor(cthulhu, path) {
        let taskName = path.replace('/', ':')
        cthulhu.express.post(`/${path}`, async (req, res) => {
            cthulhu.requestTask(taskName, {body: req.body}, res.send, res)
        })
    }
}
