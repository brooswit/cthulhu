const zendeskClientFactory = require('node-zendesk')
module.exports = class ZendeskIntegration {
    constructor(cthulhu, secret, appName) {
        console.debug(`new ZendeskIntegration ${appName}`)
        let zendeskClient = zendeskClientFactory.createClient({
            username:  'jwinstead@launchdarkly.com',
            token:     'NS422LzY5HilrF0HAagtyyHq7Hdkge6Mkee4IeH4',
            remoteUri: 'https://launchdarklysupport.zendesk.com/api/v2'
        })

        (async () => {
            while(true) {
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
            }
        })()
    }
}
