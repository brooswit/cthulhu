const zendesk = require('node-zendesk')
module.exports = class ZendeskIntegration {
    constructor(cthulhu, zdUsername, zdToken, appName) {
        console.debug(`new ZendeskIntegration ${appName}`)
        let zendeskClient = zendesk.createClient({
            username:  zdUsername,
            token:     zdToken,
            remoteUri: `https://${appName}.zendesk.com/api/v2`
        })
    }
}
