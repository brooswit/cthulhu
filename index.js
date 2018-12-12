const EventEmitter = require('events')
const {TaskManager, MethodRegistry} = require('brooswit-common')
const WebhookIngester = require('./src/components/WebhookIngester')
const SlackIntergration = require('./src/components/SlackIntergration')

class Cthulhu {
    constructor() {
        this.events = new EventEmitter()
        this.operations = new MethodRegistry()
        this.tasks = new TaskManager()
    }
}

Cthulhu.WebhookIngester = WebhookIngester
Cthulhu.SlackIntergration = SlackIntergration

module.exports = Cthulhu
