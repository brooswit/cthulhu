const EventEmitter = require('events')

module.exports = class QueryRequester {
  constructor () {
    this._events = new EventEmitter()
    this._lookupHandlerByPromise = {}
  }

  off (event, promise) {
    const handleResult = this._lookupHandlerByPromise[promise]
    this._events.off(event, handleResult)
    delete this._lookupHandlerByPromise[promise]
  }

  on (requestName, promise) {
    const handleResult = this._lookupHandlerByPromise[promise] = async (provisionIndex, handleResult, payload) => {
      let index = provisionIndex()
      let result, error
      try {
        result = await promise(payload)
      } catch (err) {
        error = err
      }
      handleResult(index, error, result)
    }
    this._events.on(requestName, handleResult)
  }

  request (requestName, payload) {
    return new Promise((resolve, reject) => {
      let results = []
      let errors = []
      let errored = false

      function provisionIndex () {
        let index = results.length - 1
        results.push(undefined)
        errors.push(undefined)
        return index
      }

      function handleResult (index, error, result) {
        errored = errored || !!error
        results[index] = result
        errors[index] = error
        for (let resultIndex in results) {
          if (!results[resultIndex]) return
        }
        errors = errored ? errors : null
        resolve(errors, results)
      }

      this._events.emit(requestName, provisionIndex, handleResult, payload)
    })
  }
}
