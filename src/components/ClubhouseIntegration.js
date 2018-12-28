const Ingester = require('./TaskIngester')
module.exports = class ClubhouseEventIngester extends TaskIngester {
  constructor(cthulhu, secret, appName) {
    let taskName = `ingest_clubhouse_event/${appName}`
    super(cthulhu,  taskName)
    cthulhu.subscribeTask(taskName, (payload) => {
      for (let actionIndex in payload.actions) {
        let action = payload.actions[actionIndex]

        cthulhu.events.emit(`clubhouse_event/${appName}`, action)
        cthulhu.events.emit(`clubhouse_event/${appName}/${action['entity_type']}`, action)
        cthulhu.events.emit(`clubhouse_event/${appName}/${action['entity_type']}/${action['action']}`, action)
      }
    })
  }
}
