const express = require('express')
const bodyParser = require('body-parser')
const enableWs = require('express-ws')

const redis = require('redis')

const LaunchDarkly = require('ldclient-node');Cthulhu = require('./src/Cthulhu')
Cthulhu.Minion = require('./src/Minion')
Cthulhu.TaskIngester = require('./src/components/TaskIngester')
Cthulhu.ClubhouseEventIngester = require('./src/components/ClubhouseEventIngester')

// Cthulhu.SlackIntegration = require('./src/components/SlackIntegration')
// Cthulhu.SalesforceIntegration = require('./src/components/SalesforceIntegration')
// Cthulhu.ZendeskIntegration = require('./src/components/ZendeskIntegration')

module.exports = Cthulhu
