const WebhookIngester = require('./WebhookIngester')

module.exports = class ClubhouseIntegration {
    constructor(cthulhu, expressApp, secret, appName) {
        console.debug(`new ClubhouseIntegration ${appName}`)
        const webhookIngester = new WebhookIngester(
            expressApp,  `/ingest_clubhouse_event/${appName}`, 
            ({actions}) => {
                console.log(JSON.stringify(payload))
                for (actionIndex in actions) {
                    let action = actions[action]

                    cthulhu.events.emit(`clubhouse_event:${appName}`, action)
                    cthulhu.events.emit(`clubhouse_event:${appName}:${action['entity_type']}`, action)
                    cthulhu.events.emit(`clubhouse_event:${appName}:${action['entity_type']}:${action['action']}`, action)
                }
            }
        )
    }
}
