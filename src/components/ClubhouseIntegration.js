const WebhookIngester = require('./WebhookIngester')

module.exports = class ClubhouseIntegration {
    constructor(cthulhu, secret, appName) {
        console.debug(`new ClubhouseIntegration ${appName}`)
        const webhookIngester = new WebhookIngester(
            cthulhu.express,  `/ingest_clubhouse_event/${appName}`, 
            (payload) => {
                for (let actionIndex in payload.actions) {
                    let action = payload.actions[actionIndex]

                    cthulhu.events.emit(`clubhouse_event:${appName}`, action)
                    cthulhu.events.emit(`clubhouse_event:${appName}:${action['entity_type']}`, action)
                    cthulhu.events.emit(`clubhouse_event:${appName}:${action['entity_type']}:${action['action']}`, action)
                }
            }
        )
    }
}
