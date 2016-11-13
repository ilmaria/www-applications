// websocket connection is default
var connection = WebsocketConnection()

connection.onmessage = function(message) {
  if (message.messageType === "msg") {
    sendAckToServer(message.id);

    console.log('Received a message:\n', message)
    displayMessage(message)
  }
  else if (message.messageType === "serverAck"){
    console.log("Received a server ack for message: " + message.id);
  }
  else if (message.messageType === "ack"){
    console.log("Received an ack for message: " + message.id);
  }
}

// Change used technology to websocket
document.querySelector('#websocket')
  .addEventListener("change", function(event) {
    connection = toggleConnectionType(event.target.id);
  });

// Change used technology to long poll
document.querySelector('#longpoll')
  .addEventListener("change", function(event) {
    connection = toggleConnectionType(event.target.id);
  });

// Also submit messages by pressing `enter`
document.querySelector('#chat-input')
  .addEventListener("keyup", function(event) {
    if (event.keyCode == 13) {
      document.querySelector('#send-button').click();
    }
  })

// Also submit username by pressing `enter`
document.querySelector('#username-input')
  .addEventListener("keyup", function(event) {
    if (event.keyCode == 13) {
      document.querySelector('#save-username-button').click();
    }
  })

// TODO: Send selected file
document.querySelector('#select-file')
  .addEventListener("change", function(event) {
    var chatInput = document.querySelector('#chat-input');
    chatInput.value = event.target.value;
    
  })

/**
 * Close the current connection and make a new one with
 * different connection type.
 */
function toggleConnectionType(newConnectionName) {
  var newConnection;
  connection.close();

  if (newConnectionName === 'websocket') {
    newConnection = WebsocketConnection();
  } else {
    newConnection = LongPollConnection();
  }

  newConnection.onmessage = connection.onmessage;

  return newConnection;
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
        .then(function(response) {
          return response.json();
        })
        .then(function(responseMessage) {
          if (responseMessage.messageType === "serverAck") {
            console.log("Received a server ack for message: " + responseMessage.id);

            fetch('/long-poll-ack?id=' + responseMessage.id)
              .then(function(response) {
                return response.json();
              })
              .then(function(ackResponseMessage) {
                if (ackResponseMessage.messageType === "ack") {
                  console.log("Received an ack for message: " + ackResponseMessage.id);
                }
              });
          }
        });
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
  var span = document.createElement('span')

  span.textContent = chatMessage.author + ': ' + chatMessage.content

  var username = sessionStorage.getItem('username')
  if (chatMessage.author === username) {
    li.className = 'own-message'
  }

  var messageList = document.querySelector('#message-list')
  li.appendChild(span)
  messageList.appendChild(li)
}

function sendMessage() {
  var chatInput = document.querySelector('#chat-input')
  var username = sessionStorage.getItem('username')

  var message = {
    author: username,
    content: chatInput.value,
    messageType: "msg"
  }

  connection.send(message)

  // clear chat input field
  chatInput.value = ''
}

// Trigger file select when clicking the file select button
function selectFile() {
  var selectFileInput = document.querySelector('#select-file');
  selectFileInput.click();
}

// Let the server know that the message is received
function sendAckToServer(messageId) {
  var message = {
    id: messageId,
    messageType: "ack"
  };
  connection.send(message);
}

// Use the username provided in URL parameters or show username dialog
// Example URL with username: http://localhost:8000/?username=John123
function setupUsername() {
  var query = window.location.search.substring(1);
  var usernameKey = "username=";
  var indexOfUsernameQuery = query.indexOf(usernameKey);

  if (indexOfUsernameQuery < 0) {
    var usernameDialog = document.querySelector(".dialog");
    usernameDialog.removeAttribute("hidden");

    var usernameInput = document.querySelector('#username-input');
    usernameInput.focus();
  } else {
    sessionStorage.setItem("username", query.substring(usernameKey.length));
  }
}

// Save username to sessionStorage and hide username dialog
function saveUsername() {
  var username = document.querySelector('#username-input').value || "User";
  sessionStorage.setItem("username", username);

  var usernameDialog = document.querySelector(".dialog");
  usernameDialog.setAttribute("hidden", "");

  var chatInput = document.querySelector('#chat-input');
  chatInput.focus();
}

setupUsername();
