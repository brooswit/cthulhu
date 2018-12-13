const EventEmitter = require('events')
const {TaskManager, MethodRegistry} = require('brooswit-common')
const WebhookEventIngester = require('./src/components/WebhookEventIngester')
const SlackIntegration = require('./src/components/SlackIntegration')

class Cthulhu {
    constructor() {
        this.events = new EventEmitter()
        this.operations = new MethodRegistry()
        this.tasks = new TaskManager()
        console.warn("...Cthulhu is ready...")
    }
}

Cthulhu.WebhookEventIngester = WebhookEventIngester
Cthulhu.SlackIntegration = SlackIntegration

module.exports = Cthulhu
