const TaskIngester = require('./TaskIngester')

module.exports = class ClubhouseEventIngester {
  constructor(cthulhu, secret, appName) {
    let taskName = `ingest_clubhouse_event/${appName}` // TODO: change to `ingest/clubhouse/${appName}`
    cthulhu.subscribeTask(taskName, (payload) => {
      for (let actionIndex in payload.actions) {
        let action = payload.actions[actionIndex]

        cthulhu.events.emit(`clubhouse/${appName}`, action)
        cthulhu.events.emit(`clubhouse/${appName}/${action['entity_type']}`, action)
        cthulhu.events.emit(`clubhouse/${appName}/${action['entity_type']}/${action['action']}`, action)
      }
    })
    new TaskIngester(cthulhu,  taskName)
  }
}
