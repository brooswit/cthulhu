const zendesk = require('node-zendesk')

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
            let nextCyclePromise = new Promise((resolve, reject) => {
                setTimeout(resolve, 1000 * 60 * 15)
            })
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
            for (let orgIndex in orgs) {
                let org = orgs[orgIndex]
                this._cthulhu.events.emit(`zendesk_event:${this._appName}:organization:scraped`, org)
                await new Promise((resolve, reject) => { setTimeout(resolve) })
            }
            for (let satIndex in sats) {
                let sat = sats[satIndex]
                this._cthulhu.events.emit(`zendesk_event:${this._appName}:satisfaction:scraped`, sat)
                await new Promise((resolve, reject) => { setTimeout(resolve) })
            }
            for (let ticsIndex in tics) {
                let tics = tics[ticsIndex]
                this._cthulhu.events.emit(`zendesk_event:${this._appName}:ticket:scraped`, tics)
                await new Promise((resolve, reject) => { setTimeout(resolve) })
            }
            for (let usrsIndex in usrs) {
                let usrs = usrss[usrsIndex]
                this._cthulhu.events.emit(`zendesk_event:${this._appName}:ticket:scraped`, usrs)
                await new Promise((resolve, reject) => { setTimeout(resolve) })
            }
            for (let tagsIndex in tags) {
                let tags = tagss[tagsIndex]
                this._cthulhu.events.emit(`zendesk_event:${this._appName}:ticket:scraped`, tags)
                await new Promise((resolve, reject) => { setTimeout(resolve) })
            }
            await nextCyclePromise
        }
    }
}
