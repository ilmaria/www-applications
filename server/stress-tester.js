const cluster = require('cluster')
const numCPUs = require('os').cpus().length
const WsClient = require('./ws-client')
const HttpClient = require('./http-client')

const clientsPerCPUCore = 10
let VirtualClient

if (process.argv[2] === '--http') {
  VirtualClient = HttpClient
} else {
  VirtualClient = WsClient
}

if (cluster.isMaster) {
  // Fork workers.
  console.log(`Spawning ${numCPUs} clients...`)
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork()
  }

  let messages = 0

  cluster.on('message', (worker, data) => {
    console.log(`<worker ${worker.id}>`)
    console.log(` - Ack time        ${data.avgAckTime.toFixed(2)}ms`)
    console.log(` - Server ack time ${data.avgServerAckTime.toFixed(2)}ms`)

    if (++messages === numCPUs) {
      process.exit()
    }
  })

  cluster.on('exit', function(worker, code, signal) {
    console.log('<worker ' + worker.id + '> died')
  })
} else {
  let totalAckTime = 0
  let totalServerAckTime = 0
  let clientsDone = []

  for (let i = 0; i < clientsPerCPUCore; i++) {
    // Start a virtual client that sends and receives messages from the server.
    const client = new VirtualClient(cluster.worker.id * clientsPerCPUCore + i)

    let clientDone = client.waitUntilDone().then(({ackTime, serverAckTime}) => {
      totalAckTime += ackTime
      totalServerAckTime += serverAckTime
    })

    clientsDone.push(clientDone)
  }

  Promise.all(clientsDone).then(() => {
    // Send results to master
    process.send({
      avgAckTime: totalAckTime / clientsPerCPUCore,
      avgServerAckTime: totalServerAckTime / clientsPerCPUCore
    })
  })
}
