const AsyncArray = require('./src/AsyncArray')

module.exports = class TaskManager {
    constructor() {
        this._arrays = {}
    }

    addTask(taskName, taskData) {
        this._arrays[taskName] = this._arrays[taskName] || new AsyncArray()
        this._arrays[taskName].push(taskData)
    }

    async consumeTask(taskName) {
        this._arrays[taskName] = this._arrays[taskName] || new AsyncArray()
        return await this._arrays[taskName].shift()
    }
}