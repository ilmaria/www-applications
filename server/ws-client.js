const WebSocket = require('ws')
const serverAddress = 'ws://localhost:8080'

class WsClient {
  constructor(id, clientCount) {
    this.id = id
    this.timer = null
    this.ackTime = 0
    this.serverAckTime = 0

    // Connect to server after a timeout
    this.ws = new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve(new WebSocket(serverAddress))
      }, id * 5)
    })
  }

  waitUntilDone() {
    return this.ws.then((ws) => {
      return new Promise((resolve, reject) => {
        ws.on('open', () => {
          // Wait until other clients have connected the server.
          setTimeout(() => {
            this.timer = process.hrtime()
            this.sendMessage(ws, 'message content')
          }, 1000 + this.id * 5)
        })

        ws.on('message', (message) => {
          const msg = JSON.parse(message)
          if (msg.messageType === "msg") {
            this.sendAck(ws, msg.id)
          } else if (msg.messageType === 'serverAck') {
            const timeDiff = process.hrtime(this.timer)
            // Time in milliseconds
            this.serverAckTime = timeDiff[0] * 1e3 + timeDiff[1] / 1e6

            resolve({
              ackTime: 0,
              serverAckTime: this.serverAckTime
            })
          }
        })
      })
    })
  }

  sendMessage(ws, content) {
    ws.send(JSON.stringify({
      author: 'user_' + this.id,
      content: content,
      messageType: 'msg'
    }))
  }

  sendAck(ws, id) {
    ws.send(JSON.stringify({
      id: id,
      messageType: "ack"
    }))
  }
}

module.exports = WsClient
