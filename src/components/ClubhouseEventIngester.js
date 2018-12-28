const TaskIngester = require('./TaskIngester')

module.exports = class ClubhouseEventIngester {
  constructor(cthulhu, clubhouseSecret, clubhouseAppName) {
    let taskName = `ingest_clubhouse_event/${clubhouseAppName}` // TODO: change to `ingest/clubhouse/${appName}`
    cthulhu.subscribeTask(taskName, this._injestClubhouseTask, this)
    new TaskIngester(cthulhu,  taskName)
  }

  _injestClubhouseTask(payload) {
    for (let actionIndex in payload.actions) {
      let actionPayload = payload.actions[actionIndex]
      let {entity_type, action} = actionPayload
      cthulhu.events.emit(`clubhouse/${appName}`, actionPayload)
      cthulhu.events.emit(`clubhouse/${appName}/${entity_type}`, actionPayload)
      cthulhu.events.emit(`clubhouse/${appName}/${entity_type}/${action}`, actionPayload)
    }
  }
}
