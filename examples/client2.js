'use strict'

var _ = require('lodash')
var Base = require('grenache-nodejs-base')
var Client = require('./../lib/Client')

var link = new Base.Link({
  grape: 'ws://127.0.0.1:30002'
})
link.start()

var client = new Client(link, {})

var cnt = 10
var reps = 0

setTimeout(() => {
  link.lookup('test', { timeout: 1000 }, (err, data) => {
    var d1 = new Date()
    for (var i = 0; i < cnt; i++) {
      client.request(data[0], 'test', 'hello', (err, data) => {
        console.log("here", err, data)
        if (++reps === cnt) {
          var d2 = new Date()
          console.log(d2 - d1) 
        }
      })
    }
    console.log(err, data)
  })
}, 2000)
