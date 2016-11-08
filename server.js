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

var messagesWaitingForAcks = {};
var messageId = 0;

/**
 * Interface - Chat message
 * {
 *   (id: int) (ID is added to the message when it reaches the server)
 *   author: string
 *   content: string
 *   messageType: string ("msg" || "ack" || "serverAck")
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
  var message = req.body

  if (message.messageType === "msg") {
    // Add ID to the message to track when everyone has received it
    message.id = messageId;
    messageId += 1;

    sendServerAckToClient(res, message.id, "long poll");

    console.log('Received a long poll message:\n-', message)

    broadcast(message)
  }
  else if (message.messageType === "ack") {
    res.json({});
    console.log('Received an ack:', message);
  }
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
    var chatMessage = JSON.parse(message)

    if (chatMessage.messageType === "msg") {
      // Add ID to the message to track when everyone has received it
      chatMessage.id = messageId;
      messageId += 1;

      sendServerAckToClient(ws, chatMessage.id, "websocket");

      setMessageToWaitForAcks(ws, chatMessage.id, "websocket");

      console.log('Received a websocket message:\n-', chatMessage)

      broadcast(chatMessage)
    }
    else if (chatMessage.messageType === "ack") {
      console.log('Received an ack:', chatMessage);
      handleAck(chatMessage.id);
    }
  })
})

/**
 * Broadcast message to all clients
 * @param {Object} message - Chat message
 */
function broadcast(message) {
  // send message to websocket clients
  for (const client of wsServer.clients) {
    // Expect ack from each client the message is sent to
    messagesWaitingForAcks[message.id].acksRemaining += 1;

    // websockets can only send string or blob data, so
    // we need to turn javascript objects into string
    client.send(JSON.stringify(message))

    console.log('Sent a websocket message:', message)
  }

  // send message to long poll clients
  longPollChannel.emit('message', message)
}

// Notify the client that the server has received the message
function sendServerAckToClient(client, messageId, connectionType) {
  const message = {
    id: messageId,
    messageType: "serverAck"
  };

  if (connectionType === "websocket") {
    client.send(JSON.stringify(message));
  }
  else if (connectionType === "long poll") {
    client.json(message);
  }
  console.log('Sent a server ack:', message);
}

// The information stored in messagesWaitingForAcks is to keep track 
// of that all the clients have received the message before informing 
// it to the sender of the message
function setMessageToWaitForAcks(client, messageId, connectionType) {
  messagesWaitingForAcks[messageId] = {
    sender: client,
    acksRemaining: 0,
    connectionType: connectionType
  };
}

// Reduce the number remaining ACKs and inform the sender if everyone 
// has received the message
function handleAck(messageId) {
  messagesWaitingForAcks[messageId].acksRemaining -= 1;

  if (messagesWaitingForAcks[messageId].acksRemaining === 0) {
    const message = {
      id: messageId,
      messageType: "ack"
    };

    messagesWaitingForAcks[messageId].sender.send(JSON.stringify(message));
    console.log('Sent a ack:', message);

    delete messagesWaitingForAcks[messageId];
  }
}
