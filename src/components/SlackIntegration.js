const WebhookIngester = require('./WebhookIngester')
// TODO: REFACTOR TO NEW PATTERNS
module.exports = class SlackIntegration {
    constructor(cthulhu, token, appName) {
        console.debug(`new SlackIntegration ${appName}`)
        const webhookIngester = new WebhookIngester(
            cthulhu.express,  `/ingest_slack_event/${appName}`, 
            (payload) => {
                if (payload.token !== token) return false
                if (payload.challenge) return payload.challenge
                cthulhu.events.emit(`slack_event:${appName}`, payload)
                cthulhu.events.emit(`slack_event:${appName}:${payload.event.type}`, payload)
                if (payload.event.type === "reaction_added") {
                    cthulhu.events.emit(`slack_event:${appName}:${payload.event.type}:${payload.event.item.reaction}`, payload)
                }
            }
        )
    }
}
