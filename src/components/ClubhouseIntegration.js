const WebhookIngester = require('./WebhookIngester')

module.exports = class ClubhouseIntegration {
    constructor(cthulhu, expressApp, secret, appName) {
        console.debug(`new ClubhouseIntegration ${appName}`)
        const webhookIngester = new WebhookIngester(
            expressApp,  `/ingest_clubhouse_event/${appName}`, 
            (payload) => {
                console.log(payload)
                if (payload.secret !== secret) return false
                cthulhu.events.emit(`clubhouse_event:${appName}`, payload)
            }
        )
    }
}
