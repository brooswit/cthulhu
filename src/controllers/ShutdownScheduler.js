const {chrono, Routine} = require('brooswit-common')

module.exports = class RestartScheduler extends Routine {
    constructor(cthulhu, parent) {
        super(async () => {
            this.log.info('started')
            await chrono.delay(1 * chrono.hour)
            process.exit();
        }, parent)
    }
}
