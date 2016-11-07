const http = require('http')
const EventEmitter = require('events').EventEmitter
const express = require('express')
const app = express()
const WebSocketServer = require('ws').Server
const bodyParser = require('body-parser')

const httpPort = 8000
const wsPort = 8080

const longPollChannel = new EventEmitter()
longPollChannel.setMaxListeners(Infinity)

/**
 * Interface - Chat message
 * {
 *   author: string
 *   content: string
 * }
 */

//----------------------------------
// HTTP
//----------------------------------
app.use(express.static('client'))

// needed for parsing long poll body data 
app.use(bodyParser.json())

app.get('/', (req, res) => {
  res.render('client/index.html')
})

/**
 * Clients use GET request to receive long poll messages. This blocks
 * until `longPollChannel` receives a new message and then send it
 * back to the client.
 */
app.get('/long-poll', (req, res) => {
  longPollChannel.once('message', (message) => {
    // send received message as json
    res.json(message)

    console.log('Sent a long poll message:', message)
  })
})

/**
 * Clients use POST request for sending long poll messages.
 */
app.post('/long-poll', (req, res) => {
  const message = req.body

  console.log('Received a long poll message:\n-', message)

  broadcast(message)
  
  res.status(200).end()
})

app.listen(httpPort, () => {
  console.log('Serve listening on port %s', httpPort)
})



//----------------------------------
// Websocket
//----------------------------------
const wsServer = new WebSocketServer({ port: wsPort })

wsServer.on('connection', (ws) => {
  ws.on('message', (message) => {
    const chatMessage = JSON.parse(message)

    console.log('Received a websocket message:\n-', chatMessage)

    broadcast(chatMessage)
  })
})

/**
 * Broadcast message to all clients
 * @param {Object} message - Chat message
 */
function broadcast(message) {
  // send message to websocket clients
  for (const client of wsServer.clients) {
    // websockets can only send string or blob data, so
    // we need to turn javascript objects into string
    client.send(JSON.stringify(message))

    console.log('Sent a websocket message:', message)
  }

  // send message to long poll clients
  longPollChannel.emit('message', message)
}
