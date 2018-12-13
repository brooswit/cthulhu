const WebhookEventIngester = require('./WebhookEventIngester')

module.exports = class SlackIntegration {
    constructor(expressApp, token, appName) {
        console.debug(`new SlackIntegration ${appName}`)
        const webhookEventIngester = new WebhookIngester(
            expressApp,  `/injest_slack_event/${appName}`, 
            ({token, challenge, type}) => {
                console.debug(`SlackIntegration:${appName}:injestSlackEvent(${token}, ${challenge}, ${type})`)
                if (challenge) return challenge
                if (token !== token) return false
            }
        )
    }
}
