const axios = require('axios')

module.exports = async function consumeFetchInternalApiTasks(cthulhu) {
        let task = await cthulhu.tasks.consume('fetch_internal_api')
        // let {method, url} = task.payload
        // let result = await axios[method](url, {
        //     'X-LD-Private': 'allowed'
        // })
        // task.resolve(result)
        task.resolve(null)
}
