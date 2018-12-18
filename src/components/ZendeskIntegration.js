const zendesk = require('node-zendesk')

async function delay (time) {
    return new Promise((resolve) => { setTimeout(resolve, time) })
}

module.exports = class ZendeskIntegration {
    constructor(cthulhu, zdUsername, zdToken, appName) {
        this._cthulhu = cthulhu
        this._zdUsername = zdUsername
        this._zdToken = zdToken
        this._appName = appName

        this.client = zendesk.createClient({
            username:  zdUsername,
            token:     zdToken,
            remoteUri: `https://${appName}.zendesk.com/api/v2`
        })
        
        console.debug(`new ZendeskIntegration ${appName}`)
        this._main()
    }

    async _main() {
        while(true) {
            console.warn(`Scraping Zendesk resources`)
            let nextCyclePromise = delay(1000 * 60 * 15)
            let fetchOrgsPromise = new Promise((resolve, reject) => {
                this.client.organizations.list( (err, req, response) => {
                    if(err) reject(err)
                    else resolve(response)
                })
            })
            let fetchSatisfactionsPromise = new Promise((resolve, reject) => {
                this.client.satisfactionratings.list( (err, req, response) => {
                    if(err) reject(err)
                    else resolve(response)
                })
            })
            let fetchTicketsPromise = new Promise((resolve, reject) => {
                this.client.tickets.list( (err, req, response) => {
                    if(err) reject(err)
                    else resolve(response)
                })
            })
            let fetchUsersPromise = new Promise((resolve, reject) => {
                this.client.users.list( (err, req, response) => {
                    if(err) reject(err)
                    else resolve(response)
                })
            })
            let fetchTagsPromise = new Promise((resolve, reject) => {
                this.client.tags.list( (err, req, response) => {
                    if(err) reject(err)
                    else resolve(response)
                })
            })
            let [orgs, sats, tics, usrs, tags] = await Promise.all([fetchOrgsPromise, fetchSatisfactionsPromise, fetchTicketsPromise, fetchUsersPromise, fetchTagsPromise])
            console.warn(`Found ${orgs.length} Zendesk Organizations`)
            console.warn(`Found ${sats.length} Zendesk Satisfactions`)
            console.warn(`Found ${tics.length} Zendesk Tickets`)
            console.warn(`Found ${usrs.length} Zendesk Users`)
            console.warn(`Found ${tags.length} Zendesk Tags`)
            console.warn(`Processing found Zendesk resources`)
            for (let orgIndex in orgs) {
                let org = orgs[orgIndex]
                this._cthulhu.events.emit(`zendesk_event:${this._appName}:organization:scraped`, org)
                await delay(1)
            }
            for (let satIndex in sats) {
                let sat = sats[satIndex]
                this._cthulhu.events.emit(`zendesk_event:${this._appName}:satisfaction:scraped`, sat)
                await delay(1)
            }
            for (let ticIndex in tics) {
                let tic = tics[ticIndex]
                this._cthulhu.events.emit(`zendesk_event:${this._appName}:ticket:scraped`, tic)
                await delay(1)
            }
            for (let usrIndex in usrs) {
                let usr = usrs[usrIndex]
                this._cthulhu.events.emit(`zendesk_event:${this._appName}:user:scraped`, usr)
                await delay(1)
            }
            for (let tagIndex in tags) {
                let tag = tags[tagIndex]
                this._cthulhu.events.emit(`zendesk_event:${this._appName}:tag:scraped`, tag)
                await delay(1)
            }
            console.warn(`Done processing found Zendesk resources`)
            await nextCyclePromise
        }
    }
}
