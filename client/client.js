// websocket connection is default
var connection = WebsocketConnection()

connection.onmessage = function(message) {
  console.log('Received a message:\n', message)
  displayMessage(message)
}

// toggle connection button
document.querySelector('#toggle-connection')
  .addEventListener("click", function() {
    connection = toggleConnectionType(connection)
    document.querySelector('#connection-type').textContent = connection.type
  })

// Also submit messages by pressing `enter`
document.querySelector('#chat-input')
  .addEventListener("keyup", function(event) {
    if (event.keyCode == 13) {
      document.querySelector('#send-button').click();
    }
  })

/**
 * Close the current connection and make a new one with
 * different connection type.
 */
function toggleConnectionType(oldConnection) {
  var newConnection
  oldConnection.close()

  if (oldConnection.type == 'websocket') {
    newConnection = LongPollConnection()
  } else {
    newConnection = WebsocketConnection()
  }

  newConnection.onmessage = oldConnection.onmessage

  return newConnection
}

/**
 * Make a connection with websocket.
 * A connection object has following properties:
 * @property {Function} send      - Send a message to server.
 * @property {Function} onmessage - Callback when receiving a message
 *                                  from server.
 * @property {Function} close     - Close the connection.
 * @property {string}   type      - Connection type
 *                                  ('websocket' or 'long poll').
 */
function WebsocketConnection() {
  var ws = new WebSocket('ws:localhost:8080')
  
  var connection = {
    send: function(message) {
      // websockets can only send string or blob data, so
      // we need to turn javascript objects into string
      ws.send(JSON.stringify(message))
    },
    onmessage: function() {},
    close: ws.close.bind(ws),
    type: 'websocket'
  }
  
  // do this because websocket onmessage receives an event object
  // with the message in data property (also, message is in string format)
  ws.onmessage = function(event) {
    var message = JSON.parse(event.data)

    // augment message with connection type for debugging purposes
    message.connectionType = 'websocket'

    connection.onmessage(message)
  }

  return connection
}

/**
 * Make a connection with long polling.
 * A connection object has following properties:
 * @property {Function} send      - Send a message to server.
 * @property {Function} onmessage - Callback when receiving a message
 *                                  from server.
 * @property {Function} close     - Close the connection.
 * @property {string}   type      - Connection type
 *                                  ('websocket' or 'long poll').
 */
function LongPollConnection() {
  var connection = {
    send: function(message) {
      fetch('/long-poll', {
        method: 'post',
        headers: new Headers({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify(message)
      })
    },
    onmessage: function() {},
    close: function() {
      longPollLoop = function() {}
    },
    type: 'long poll'
  }

  var longPollLoop = function() {
    fetch('/long-poll')
      .then(function(response) {
        return response.json()
      })
      .then(function(message) {
        // augment message with connection type for debugging purposes
        message.connectionType = 'long poll'

        connection.onmessage(message)
      })
      .then(longPollLoop)
  }

  longPollLoop()

  return connection
}

function displayMessage(chatMessage) {
  var li = document.createElement('li')
  li.textContent = chatMessage.author + ':' + ' ' + chatMessage.content

  var messageList = document.querySelector('#message-list')
  messageList.appendChild(li)
}

function sendMessage() {
  var chatInput = document.querySelector('#chat-input')
  var username = document.querySelector('#username')

  var message = {
    author: username.value || username.placeholder,
    content: chatInput.value
  }

  connection.send(message)

  // clear chat input field
  chatInput.value = ''
}
