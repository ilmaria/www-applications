// websocket connection is default
var connection = WebsocketConnection();
var fileInfos = [];

connection.onmessage = function(message) {
  if (message.messageType === "msg") {
    sendAckToServer(message.id);

    console.log("Received a message:\n", message);
    displayMessage(message)
  }
  else if (message.messageType === "serverAck") {
    console.log("Received a server ack:\n", message);
  }
  else if (message.messageType === "ack") {
    console.log("Received a client ack:\n", message);
  }
  else if (message.messageType === "fileInfo") {
    console.log("Received file information:\n", message);
    storeFileInfo(message);
  }
  else {
    console.log("Received a file:\n", message);
    displayFile(message);
  }
}

// Change used technology to websocket
$("#websocket").on("change", function(event) {
  connection = toggleConnectionType(event.target.id);
});

// Change used technology to long poll
$("#longpoll").on("change", function(event) {
  connection = toggleConnectionType(event.target.id);
});

// Also submit messages by pressing `enter`
$('#chat-input').on("keyup", function(event) {
  if (event.keyCode === 13) {
    $("#send-button").click();
  }
});

// Also submit username by pressing `enter`
$("#username-input").on("keyup", function(event) {
  if (event.keyCode === 13) {
    $("#save-username-button").click();
  }
});

// Send selected file
$("#select-file").on("change", function(event) {
  sendFile(event.target.files[0]);
});

/**
 * Close the current connection and make a new one with
 * different connection type.
 */
function toggleConnectionType(newConnectionName) {
  var newConnection;
  connection.close();

  if (newConnectionName === "websocket") {
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
  var ws = new WebSocket("ws:" + window.location.hostname + ":8080")
  
  var connection = {
    send: function(message) {
      if (message instanceof Blob === false) {
        // websockets can only send string or blob data, so
        // we need to turn javascript objects into string
        message = JSON.stringify(message);
      }

      ws.send(message);
    },
    onmessage: function() {},
    close: ws.close.bind(ws),
    type: "websocket"
  }
  
  // do this because websocket onmessage receives an event object
  // with the message in data property (also, message is in string format
  // and file is a blob object)
  ws.onmessage = function(event) {
    var message = event.data;

    if (typeof(message) === "string") {
      message = JSON.parse(message);
    }

    connection.onmessage(message);
  }

  return connection;
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
      var headers;
      if (message instanceof Blob === false) {
        headers = new Headers({'Content-Type': "application/json"});
        message = JSON.stringify(message);
      }
      else {
        contentType = null;
        var form = new FormData();
        form.append('file', message);
        message = form;
      }

      fetch("/long-poll", {
        method: "post",
        headers: headers,
        body: message
      })
        .then(function(response) {
          return response.json();
        })
        .then(function(serverAckResponse) {
          if (serverAckResponse.messageType === "serverAck") {
            console.log("Received a server ack:\n", serverAckResponse);

            fetch("/long-poll-ack?id=" + serverAckResponse.id)
              .then(function(response) {
                return response.json();
              })
              .then(function(clientAckResponse) {
                if (clientAckResponse.messageType === "ack") {
                  console.log("Received a client ack:\n", clientAckResponse);
                }
              })
              .catch(function(e) {
                console.log("Failed to receive client ack for message: " + serverAckResponse.id);
              });
          }
        });
    },
    onmessage: function() {},
    close: function() {
      // Cancel all pending requests http requests
      window.stop();
    },
    type: "long poll"
  }

  var longPollLoop = function() {
    fetch("/long-poll")
      .then(function(response) {
        return response.json();
      })
      .then(function(message) {
        connection.onmessage(message);
      })
      .then(longPollLoop);
  }

  longPollLoop();

  return connection;
}

function displayMessage(chatMessage) {
  var ownMessageClass = "";
  var username = sessionStorage.getItem("username");
  if (chatMessage.author === username) {
    ownMessageClass = "own-message";
  }

  $("#message-list").append(
    $("<li>", {class: ownMessageClass}).append(
      $("<span>").text(chatMessage.author + ": " + chatMessage.content)
    )
  ).scrollTop($("#message-list")[0].scrollHeight);
}

function displayFile(file) {
  if (fileInfos.length > 0) {
    var fileInfo = fileInfos[0];
    sendAckToServer(fileInfo.id);

    var ownMessageClass = "";
    var username = sessionStorage.getItem("username");
    if (fileInfo.author === username) {
      ownMessageClass = "own-message";
    }

    var url = window.URL.createObjectURL(file);

    $("#message-list").append(
      $("<li>", {class: ownMessageClass}).append(
        $("<span>")
          .text(fileInfo.author + ": ")
          .append($("<a>", {href: url, download: fileInfo.content}).text(fileInfo.content))
      )
    ).scrollTop($("#message-list")[0].scrollHeight);

    fileInfos.shift();
  }
}

function storeFileInfo(fileInfo) {
  fileInfos.push(fileInfo);
  if (fileInfo.path !== undefined) {
    getFile(fileInfo.path);
  }
}

// When file has been uploaded with long poll the file has to be fetched from the URL given
function getFile(path) {
  fetch(location.origin + "/" + path)
    .then(function(response) {
      return response.blob();
    })
    .then(function(blob) {
      displayFile(blob);
    })
}

function sendMessage() {
  var message = {
    author: sessionStorage.getItem("username"),
    content: $("#chat-input").val(),
    messageType: "msg"
  }

  connection.send(message);

  // clear chat input field
  $("#chat-input").val("");
}

// Send a message and a file as blob. The message contains the file name and author
function sendFile(file) {
  var username = sessionStorage.getItem("username");

  var message = {
    author: username,
    content: file.name,
    messageType: "fileInfo"
  };

  connection.send(message);

  reader = new FileReader();
  reader.onload = function(event) {
    var blobFile = new Blob([event.target.result], {type : file.type});
    connection.send(blobFile);
  }
  reader.readAsArrayBuffer(file);
}

// Trigger file select when clicking the file select button
function selectFile() {
  $("#select-file").click();
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
    sessionStorage.setItem("username", "Anonymous");
    $("#usernameModal").modal("show");
    $("#username-input").focus();
  } else {
    sessionStorage.setItem("username", query.substring(usernameKey.length));
    $("#chat-input").focus();
  }
}

// Save username to sessionStorage and hide username dialog
function saveUsername() {
  sessionStorage.setItem("username", $("#username-input").val());

  $(".dialog").hide();
  $("#chat-input").focus();
}

setupUsername();
