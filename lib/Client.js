'use strict'

var uuid = require('uuid')
var zmq = require('zmq')
var url = require('url')
var _ = require('lodash')
var Base = require('grenache-nodejs-base')

class Transport extends Base.Transport {

  constructor(data) {
    super(data)
  }

  send(data) {
    this.socket.send(data)
  }
} 

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
      break
      case 'pub':
      socket = zmq.socket('pub')
      break
    }
    
    this.enhance(socket) 

    var transport = this._transports[dest] = new Transport({
      dir: 'server',
      type: type,
      socket: socket,
      connected: true
    })

    if (type === 'req') {
      socket.on('message', (client, rid, type, data) => {
        transport.emit(
          'request', rid.toString(), type.toString(), data.toString(),
          {
            reply: res => {
              transport.send([client, rid, res])
            }
          }
        )
      })
    }

    socket.bindSync(dest)

    var bindInfo = socket._zmq.getsockopt(zmq.ZMQ_LAST_ENDPOINT)
    bindInfo = url.parse(bindInfo)
      
    transport.port = +bindInfo.port
   
    return transport
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
      this.handleReply(rid.toString(), data.toString())
    })
   
    socket.connect(dest)

    var transport = this._transports[dest] = new Transport({
      dir: 'client',
      type: type,
      socket: socket,
      connected: true,
      _queue: [cb]
    })
    
    setImmediate(() => {
      _.each(transport._queue, cb => {
        cb()     
      })
      transport._queue = []
    })
  }

  stop() {
    _.each(this._transports, socket => {
      socket.close()
    })

    super.stop()
  }
}

module.exports = Client
