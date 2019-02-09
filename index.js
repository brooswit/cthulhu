(async () => {
    const express = require('express')
    const bodyParser = require('body-parser')
    const enableWs = require('express-ws')

    const express = await new Promise((resolve)=>{
        let expressApp = express()
        enableWs(expressApp)
        expressApp.use(bodyParser.json())
        expressApp.listen(expressPort, () => {
            resolve(expressApp)
        })
    })
    const redis = require('redis')

    // useRedis=false, redisHost, redisPort, redisPassword,
    // useLd=false, ldUseRedis=false, ldSdkKey, // ldApiKey,
    // useExpress=true, expressPort=process.env.PORT,
    // useStream=true,  streamPath='/stream'
    // }
    const LaunchDarkly = require('ldclient-node');Cthulhu = require('./src/Cthulhu')
    Cthulhu.Minion = require('./src/Minion')
    Cthulhu.TaskIngester = require('./src/components/TaskIngester')
    Cthulhu.ClubhouseEventIngester = require('./src/components/ClubhouseEventIngester')

    // Cthulhu.SlackIntegration = require('./src/components/SlackIntegration')
    // Cthulhu.SalesforceIntegration = require('./src/components/SalesforceIntegration')
    // Cthulhu.ZendeskIntegration = require('./src/components/ZendeskIntegration')

    module.exports = Cthulhu
})()