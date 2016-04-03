'use strict'

var _ = require('lodash')
var Base = require('grenache-nodejs-base')
var Client = require('./../lib/Client')

var link = new Base.Link({
  grape: 'ws://127.0.0.1:30001'
})
link.start()

var worker = new Client(link, {})
var service = worker.listen('req', 'tcp://127.0.0.1:5000')

setInterval(function() {
  worker.announce('test', service.port, {}, () => {
    console.log('announced')
  })
}, 1000)

worker.on('request', (rid, type, payload, handler) => {
  //console.log('worker', rid, type, payload)
  handler.reply('world')
})
