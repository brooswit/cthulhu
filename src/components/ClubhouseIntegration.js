const WebhookIngester = require('./WebhookIngester')
// TODO: REFACTOR TO NEW PATTERNS
module.exports = class ClubhouseIngester extends Ingester {
    constructor(cthulhu, secret, appName) {
        super(cthulhu.express,  `/ingest_clubhouse_event/${appName}`,  (payload) => {
            for (let actionIndex in payload.actions) {
                let action = payload.actions[actionIndex]

                cthulhu.events.emit(`clubhouse_event:${appName}`, action)
                cthulhu.events.emit(`clubhouse_event:${appName}:${action['entity_type']}`, action)
                cthulhu.events.emit(`clubhouse_event:${appName}:${action['entity_type']}:${action['action']}`, action)
            }
        )
    }
}
