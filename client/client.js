var ws = new WebSocket('ws:localhost:8080')

ws.onopen = function() {
  var message = {
    sender: 'minä',
    msg: 'Hello there. How are you?'
  }
  ws.send(JSON.stringify(message))
}

ws.onmessage = function(msg) {
  var chatMsg = JSON.parse(msg.data)
  displayMessage(chatMsg)
}


function displayMessage(chatMsg) {
  var li = document.createElement('li')
  li.textContent = chatMsg.msg

  var messageList = document.querySelector('#message-list')
  messageList.appendChild(li)
}

function sendMessage() {
  var input = document.querySelector('#chat-input')
  var msg = {
    sender: 'minä',
    msg: input.value
  }
  ws.send(JSON.stringify(msg))
  input.value = ''
}
