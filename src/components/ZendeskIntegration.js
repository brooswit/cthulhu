const zendesk = require('node-zendesk')
module.exports = class ZendeskIntegration {
    constructor(cthulhu, zdUsername, zdToken, appName) {
        console.debug(`new ZendeskIntegration ${appName}`)
        let zendeskClient = zendesk.createClient({
            username:  zdUsername,
            token:     zdToken,
            remoteUri: `https://${appName}.zendesk.com/api/v2`
        })
        
        this._main()
    }
    async _main() {
        while(true) {
            let nextCyclePromise = new Promise((resolve, reject) => {
                setTimeout(1000 * 60 * 15, resolve)
            })
            let orgs = await new Promise((resolve, reject) => {
                zendeskClient.organizations.list( (err, req, response) => {
                    if(err) reject(err)
                    else resolve(response)
                })
            })
            console.log('zendesk stuff scraped')
            for (orgIndex in orgs) {
                let org = orgs[orgIndex]
                cthulhu.events.emit(`zendesk_event:${appName}:organization:scraped`, org)
            }
            await nextCyclePromise
        }
    }
}
