const WebSocket = require('ws')

const serverAddress = 'ws://localhost:8080'

function virtualClient(id) {
  const ws = new WebSocket(serverAddress)

  ws.on('open', () => {
    ws.send(JSON.stringify({
      author: 'user_' + id,
      content: 'message content ' + id,
      messageType: 'msg'
    }))
  })

  ws.on('message', (msg) => {
    const message = JSON.parse(msg)

    if (msg.messageType === "msg") {
      const response = {
        id: msg.id,
        messageType: "ack"
      }
      ws.send(JSON.stringify(response))
    }
  })
}

module.exports = virtualClient
