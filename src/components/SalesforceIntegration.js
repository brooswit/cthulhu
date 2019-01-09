const WebhookIngester = require('./WebhookIngester')
// TODO: REFACTOR TO NEW PATTERNS
module.exports = class SalesforceIntegration {
    constructor(cthulhu, token, accountName) {
        const webhookIngester = new WebhookIngester(
            cthulhu.express,  `/ingest_salesforce_event/${accountName}/enterprise_deal_close`, 
            (payload) => {
                if (payload.token !== token) return false
                if (payload.challenge) return payload.challenge
                cthulhu.events.emit(`salesforce_event:${accountName}`, payload)
                cthulhu.events.emit(`salesforce_event:${accountName}:injest_salesforce_event`, payload)
            }
        )
    }
}
