const WebhookIngester = require('./WebhookIngester')

module.exports = class SlackIntegration {
    constructor(cthulhu, express, token, appName) {
        this._cthulhu = cthulhu
        this._express = express

        this._token = token
        this._appName = appName
        
        let operationName = `injest_slack_event/${appName}`

        this._webhookIngester = new WebhookIngester(cthulhu, express, operationName)
        this._cthulhu.operations.register(operationName, this.injestSlackEvent)
    }

    injestSlackEvent(token, challenge, type) {
        if (challenge) return challenge
        if (this._token !== token) return false
    }
}
