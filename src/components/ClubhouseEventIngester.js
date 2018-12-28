const TaskIngester = require('./TaskIngester')

module.exports = class ClubhouseEventIngester {
  constructor(cthulhu, secret, appName) {
    let taskName = `ingest_clubhouse_event/${appName}` // TODO: change to `ingest/clubhouse/${appName}`
    cthulhu.subscribeTask(taskName, (payload) => {
      for (let actionIndex in payload.actions) {
        let actionData = payload.actions[actionIndex]
        let {entity_type, }
        cthulhu.events.emit(`clubhouse/${appName}`, actionData)
        cthulhu.events.emit(`clubhouse/${appName}/${actionData['entity_type']}`, actionData)
        cthulhu.events.emit(`clubhouse/${appName}/${actionData['entity_type']}/${actionData['action']}`, action)
      }
    })
    new TaskIngester(cthulhu,  taskName)
  }
}
