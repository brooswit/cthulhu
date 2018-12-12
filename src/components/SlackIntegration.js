const WebhookIngester = require('./WebhookIngester')

module.exports = class SlackIntegration {
    constructor(cthulhu, expressApp, token, appName) {
        console.debug(`new SlackIntegration ${appName}`)

        this._cthulhu = cthulhu
        this._expressApp = expressApp

        this._token = token
        this._appName = appName
        
        let operationName = `injest_slack_event/${appName}`

        this._webhookIngester = new WebhookIngester(cthulhu, expressApp, operationName)
        this._cthulhu.operations.register(operationName, this.injestSlackEvent.bind(this))
    }

    injestSlackEvent(token, challenge, type) {
        console.debug(`SlackIntegration:${this._appName}:injestSlackEvent(${token}, ${challenge}, ${type})`)
        if (challenge) return challenge
        if (this._token !== token) return false
    }
}
