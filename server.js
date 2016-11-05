const http = require('http')
const express = require('express')
const app = express()
const WebSocketServer = require('ws').Server

const httpPort = 8000
const wsPort = 8080

let httpClients = []

// HTTP
app.use(express.static('client'))

app.get('/', (req, res) => {
  res.render('client/index.html')
})

app.listen(httpPort, () => {
  console.log('Serve listening on port %s', httpPort)
})


// Websocket
const wsServer = new WebSocketServer({ port: wsPort })

wsServer.on('connection', (ws) => {
  ws.on('message', (message) => {
    console.log('Received a websocket message:\n-', JSON.parse(message))

    // broadcast message to all clients
    for (const client of [...wsServer.clients, ...httpClients]) {
      client.send(message)
    }
  })
})
