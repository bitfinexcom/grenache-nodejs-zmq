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

  transport(data) {
    const transport = super.transport(data)

    transport.set({
      persist: true
    })

    return transport
  }

  _listen(transport, type, dest) {
    var socket
    
    switch (type) {
      case 'req':
      socket = zmq.socket('router')
      break
      case 'pub':
      socket = zmq.socket('pub')
      break
    }
    
    if (!socket) {
      throw new Error('Unknown socket type')
    }

    this.enhance(socket) 

    if (type === 'req') {
      socket.on('message', (client, rid, type, payload) => {
        this.handleRequest({
          reply: (rid, res) => {
            socket.send([client, rid, res])
          } 
        }, [rid.toString(), type.toString(), payload.toString()])
      })
    }

    socket.bindSync(dest)

    var bindInfo = socket._zmq.getsockopt(zmq.ZMQ_LAST_ENDPOINT)
    bindInfo = url.parse(bindInfo)

    transport.set({
      socket: socket,
      port: +bindInfo.port
    })
   
    return transport
  }

  _connect(transport, type, dest, cb) {
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
   
    socket.connect('tcp://' + dest)

    transport.set({
      socket: socket
    })
    
    transport.emit('connect')
  }

  _send(transport, data) {
    transport.socket.send(data)
  }

  stop() {
    _.each(this._transports, socket => {
      socket.close()
    })

    super.stop()
  }
}

module.exports = Client
