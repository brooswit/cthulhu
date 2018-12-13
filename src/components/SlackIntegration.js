const WebhookIngester = require('./WebhookIngester')

module.exports = class SlackIntegration {
    constructor(cthulhu, expressApp, accessToken, appName) {
        console.debug(`new SlackIntegration ${appName}`)
        const webhookIngester = new WebhookIngester(
            expressApp,  `/injest_slack_event/${appName}`, 
            (payload) => {
                const {token, challenge, event} = payload
                if (token !== accessToken) return false
                if (challenge) return challenge
                cthulhu.events.emit(`slack_event:${appName}`, payload)
                cthulhu.events.emit(`slack_event:${appName}:${event.type}`, payload)
            }
        )
    }
}
