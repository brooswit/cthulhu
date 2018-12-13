const WebhookIngester = require('./WebhookIngester')

module.exports = class SlackIntegration {
    constructor(cthulhu, expressApp, accessToken, appName) {
        console.debug(`new SlackIntegration ${appName}`)
        const webhookIngester = new WebhookIngester(
            expressApp,  `/injest_slack_event/${appName}`, 
            (payload) => {
                const {token, challenge, type, event} = payload
                if (token !== accessToken) return false
                if (challenge) return challenge
                cthulhu.events.emit(`slack:${appName}:${event.type}`, payload)
            }
        )
    }
}
