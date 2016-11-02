var http = require('http')
var express = require('express')
var app = express()
var WebSocketServer = require('ws').Server

var httpPort = 8000
var wsPort = 8080

//HTTP
app.use(express.static('client'))

app.get('/', function(req, res) {
  res.render('client/index.html')
})

app.listen(httpPort, function() {
  console.log('Serve listening on port %s', httpPort)
})


//Websocket
var wsServer = new WebSocketServer({ port: wsPort });

wsServer.on('connection', function(ws) {
  ws.on('message', function(msg) {
    console.log('Received a websocket message:\n-', JSON.parse(msg));
    ws.send(msg)
  });
});
