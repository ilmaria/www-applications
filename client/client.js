console.log('hello')

var ws = new WebSocket('ws:localhost:8080')

ws.onopen = function() {
  ws.send('message from client')
}

ws.onmessage = function(msg) {
  console.log('received:', msg.data)
}
