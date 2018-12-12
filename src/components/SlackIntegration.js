const WebhookIngester = require('./WebhookIngester')

module.exports = class SlackIntergration {
    constructor(cthulhu, express, token, appName) {
        this._cthulhu = cthulhu
        this._express = express

        this._token = token
        this._appName = appName

        this._cthulhu.operation.register(`injest_slack_event_${appName}`, this.injestSlackEvent)
    }

    injestSlackEvent({token, challenge, type}) {
        if (challenge) return challenge
        if (this._token !== token) return false
    }
}
