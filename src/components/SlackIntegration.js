const WebhookEventIngester = require('./WebhookEventIngester')

module.exports = class SlackIntegration {
    constructor(cthulhu, expressApp, token, appName) {
        console.debug(`new SlackIntegration ${appName}`)
        const eventName = `injest_slack_event/${appName}`
        const webhookEventIngester = new WebhookEventIngester(cthulhu, expressApp, eventName)
        cthulhu.events.on(eventName, this.injestSlackEvent, ({token, challenge, type}) => {
            console.debug(`SlackIntegration:${appName}:injestSlackEvent(${token}, ${challenge}, ${type})`)
            if (challenge) return challenge
            if (token !== token) return false
        })
    }
}
