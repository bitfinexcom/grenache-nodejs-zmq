'use strict'

var _ = require('lodash')
var Base = require('grenache-nodejs-base')
var Client = require('./../lib/Client')

var gc = new Base.Link({
  grape: 'ws://127.0.0.1:30001'
})
gc.start()

var tc = new Client(gc, {})
var service = tc.listen('req', 'tcp://127.0.0.1:5000')

setInterval(function() {
  tc.grape.announce('test', service.port, {}, () => {
    console.log('announced')
  })
}, 1000)

service.socket.on('message', (rid, type, payload, reply) => {
  //console.log('here', rid, type, payload)
  service.socket.send([rid, type, 'world'])
})
