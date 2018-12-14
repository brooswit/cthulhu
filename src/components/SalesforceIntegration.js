const WebhookIngester = require('./WebhookIngester')

module.exports = class SalesforceIntegration {
    constructor(cthulhu, expressApp, token, accountName) {
        console.debug(`new SalesforceIntegration ${accountName}`)
        const webhookIngester = new WebhookIngester(
            expressApp,  `/ingest_salesforce_event/${accountName}/enterprise_deal_close`, 
            (payload) => {
                if (payload.token !== token) return false
                if (payload.challenge) return payload.challenge
                cthulhu.events.emit(`salesforce_event:${accountName}`, payload)
                cthulhu.events.emit(`salesforce_event:${accountName}:injest_salesforce_event`, payload)
            }
        )
    }
}
