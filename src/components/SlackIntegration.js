const WebhookIngester = require('./WebhookIngester')

module.exports = class SlackIntegration {
    constructor(cthulhu, expressApp, token, appName) {
        console.debug(`new SlackIntegration ${appName}`)
        const webhookIngester = new WebhookIngester(
            expressApp,  `/injest_slack_event/${appName}`, 
            ({token, challenge, type}) => {
                console.debug(`SlackIntegration:${appName}:injestSlackEvent(${token}, ${challenge}, ${type})`)
                if (challenge) return challenge
                if (token !== token) return false
            }
        )
    }
}
