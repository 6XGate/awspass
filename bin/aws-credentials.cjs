#!/usr/bin/env node
require('ts-node').register()
const process = require('process')
const { kExitSuccess, kExitFailure, toMessage } = require('../utils/system')
const main = require('../main.ts').default

Object.defineProperties(global, {
    kMainFilename: { value: __filename }
})

main()
    .then(() => process.exit(kExitSuccess))
    .catch(reason => {
        console.error(toMessage(reason))
        process.exit(kExitFailure)
    })
