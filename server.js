var http = require('http')
var express = require('express')
var app = express()
var WebSocketServer = require('ws').Server

var port = 8000
var wsPort = 8080

//HTTP
app.use(express.static('client'))

app.get('/', function(req, res) {
  res.render('client/index.html')
})

app.listen(port, function() {
  console.log('Serve listening on port %s', port)
})


//Websocket
var wsServer = new WebSocketServer({ port: wsPort });

wsServer.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    console.log('received: %s', message);
  });

  ws.send('something');
});
