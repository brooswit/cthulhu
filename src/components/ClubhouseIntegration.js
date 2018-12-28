const Ingester = require('./TaskIngester')
module.exports = class ClubhouseEventIngester extends TaskIngester {
  constructor(cthulhu, secret, appName) {
    super(cthulhu,  `ingest_clubhouse_event/${appName}`)
    cthulhu.subscribeTask(`ingest_clubhouse_event/${appName}`, (payload) => {
      for (let actionIndex in payload.actions) {
        let action = payload.actions[actionIndex]

        cthulhu.events.emit(`clubhouse_event/${appName}`, action)
        cthulhu.events.emit(`clubhouse_event/${appName}/${action['entity_type']}`, action)
        cthulhu.events.emit(`clubhouse_event/${appName}/${action['entity_type']}/${action['action']}`, action)
      }
    })
  }
}
