'use strict'

var uuid = require('uuid')
var zmq = require('zmq')
var url = require('url')
var _ = require('lodash')
var Base = require('grenache-nodejs-base')

class Client extends Base.Client {
  
  constructor(grape, conf) {
    super(grape, conf)
  }

  enhance(socket) {
    socket.identity = new Buffer(uuid.v4())
    socket.setsockopt('linger', 1)
  }

  listen(type, dest) {
    var socket
    var needListener = false
    
    switch (type) {
      case 'req':
      socket = zmq.socket('router')
      needListener = true
      break
      case 'pub':
      socket = zmq.socket('pub')
      break
    }
    
    this.enhance(socket) 
       
    if (needListener) {
      socket.on('message', (client, rid, type, data) => {
        this.emit(
          'request', rid.toString(), type.toString(), data.toString(), {
            end: (res) => {
              this.socket.send([client, rid, res])
            }
          }
        )
      })
    }
    
    socket.bindSync(dest)

    var bindInfo = socket._zmq.getsockopt(zmq.ZMQ_LAST_ENDPOINT)
    bindInfo = url.parse(bindInfo)
 
    socket._sDest = dest
    socket._sDir = 'server'
    socket._sType = type
    socket._sPort = +bindInfo.port
    
    var target = this._targets[dest] = {
      socket: socket,
      port: socket._sPort,
      connected: true
    }

    return this._targets[dest]
  }

  _connect(type, dest, cb) {
    var socket

    switch (type) {
      case 'req':
      socket = zmq.socket('dealer')
      break
      case 'sub':
      socket = zmq.socket('sub')
      break
    }
      
    this.enhance(socket) 
 
    socket.on('message', (rid, data) => {
      //console.log("Transport.onMessage", rid, data)
      this.handleReply(rid.toString(), data.toString())
    })
   
    socket.connect(dest)
    socket._sDest = dest
    socket._sDir = 'client'
    socket._sType = type 

    var target = this._targets[dest] = {
      socket: socket,
      connected: true,
      _queue: [cb]
    }
    
    setImmediate(() => {
      _.each(target._queue, cb => {
        cb()     
      })
      target._queue = []
    })
  }

  _request(dest, type, payload, cb) {
    var target = this._targets[dest]
    var req = this.req(type, payload, {}, cb)
    target.socket.send([req.rid, type, payload])
  }

  publish(dest, chan, payload) {
    var target = this._targets[dest]
    target.socket.send(chan + ' ' + payload)
  }

  stop() {
    _.each(this._targets, socket => {
      socket.close()
    })

    super.stop()
  }
}

module.exports = Client
