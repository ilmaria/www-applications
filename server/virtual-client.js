const WebSocket = require('ws')
const serverAddress = 'ws://localhost:8080'

class VirtualClient {
  constructor(id) {
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
            this.sendMessage(ws, 'content 1')
          }, 1000)
        })

        ws.on('message', (msg) => {
          const message = JSON.parse(msg)

          if (msg.messageType === "msg") {
            this.sendAck(ws, msg.id)
          } else if (msg.messageType === 'ack') {
            const timeDiff = process.hrtime(this.timer)
            // Time in microseconds
            this.ackTime = timeDiff[0] * 1e6 + timeDiff[1] / 1e3
            console.log('avg3')

            resolve({
              ackTime: this.ackTime,
              serverAckTime: this.serverAckTime
            })
          } else if (msg.messageType === 'serverAck') {
            console.log('avg4')
            const timeDiff = process.hrtime(this.timer)
            // Time in microseconds
            this.serverAckTime = timeDiff[0] * 1e6 + timeDiff[1] / 1e3
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

module.exports = VirtualClient
