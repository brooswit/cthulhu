const EventEmitter = require('events')
const {TaskManager, MethodRegistry} = require('brooswit-common')
const WebhookIngester = require('./src/components/WebhookIngester')
const SlackIntegration = require('./src/components/SlackIntegration')

class Cthulhu {
    constructor() {
        this.events = new EventEmitter()
        this.operations = new MethodRegistry()
        this.tasks = new TaskManager()
    }
}

Cthulhu.WebhookIngester = WebhookIngester
Cthulhu.SlackIntegration = SlackIntegration

module.exports = Cthulhu
