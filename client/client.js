var ws = new WebSocket('ws:localhost:8080')

ws.onmessage = function(event) {
  var chatMessage = JSON.parse(event.data)
  displayMessage(chatMessage)
  console.log('Received a websocket message:\n', chatMessage)
}

// Also submit messages by pressing `enter`
document.querySelector('#chat-input')
  .addEventListener("keyup", function(event) {
    if (event.keyCode == 13) {
      document.querySelector('#send-button').click();
    }
  })


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
    author: username.value,
    content: chatInput.value
  }

  // websockets can only send string or blob data, so
  // we need to turn javascript objects into string
  ws.send(JSON.stringify(message))

  // clear chat input field
  chatInput.value = ''
}
