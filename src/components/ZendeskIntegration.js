const zendesk = require('node-zendesk')

module.exports = class ZendeskIntegration {
    constructor(cthulhu, zdUsername, zdToken, appName) {
        this._cthulhu = cthulhu
        this._zdUsername = zdUsername
        this._zdToken = zdToken
        this._appName = appName

        this._zendeskClient = zendesk.createClient({
            username:  zdUsername,
            token:     zdToken,
            remoteUri: `https://${appName}.zendesk.com/api/v2`
        })
        
        console.debug(`new ZendeskIntegration ${appName}`)
        this._main()
    }
    async _main() {
        while(true) {
            let nextCyclePromise = new Promise((resolve, reject) => {
                setTimeout(resolve, 1000 * 60 * 15)
            })
            let orgs = await new Promise((resolve, reject) => {
                this._zendeskClient.organizations.list( (err, req, response) => {
                    if(err) reject(err)
                    else resolve(response)
                })
            })
            console.log('zendesk stuff scraped')
            for (orgIndex in orgs) {
                let org = orgs[orgIndex]
                this._cthulhu.events.emit(`zendesk_event:${this._appName}:organization:scraped`, org)
            }
            await nextCyclePromise
        }
    }
}
