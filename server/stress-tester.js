const cluster = require('cluster')
const fs = require('fs')
const numCPUs = require('os').cpus().length
const WsClient = require('./ws-client')
const HttpClient = require('./http-client')

let VirtualClient
let resultFile = ''

if (process.argv[2] === '--http') {
  VirtualClient = HttpClient
  resultFile = 'stress-test-results-http.csv'
} else {
  VirtualClient = WsClient
  resultFile = 'stress-test-results-ws.csv'
}

const totalClients = Number(process.argv[3])
const clientsPerCPUCore = Math.floor(totalClients / numCPUs)
const extraClients = totalClients % numCPUs

if (cluster.isMaster) {
  // Fork workers.
  console.log(`Using ${numCPUs} CPU cores...`)
  for (let i = 0; i < numCPUs; i++) {
    var worker = cluster.fork()
  }

  let messages = 0
  let avgTimes = []

  cluster.on('message', (worker, data) => {
    const ack = data.avgAckTime.toFixed(2)
    const serverAck = data.avgServerAckTime.toFixed(2)
    console.log(`<worker ${worker.id}>`)
    console.log(` - Ack time        ${ack}ms`)
    console.log(` - Server ack time ${serverAck}ms`)

    avgTimes.push(Number(serverAck))

    if (++messages === numCPUs) {
      const sum = avgTimes.reduce((a, b) => a + b)
      const avgTime = (sum / avgTimes.length).toFixed(2)

      fs.writeFileSync(resultFile, `${totalClients},${avgTime}\n`, {flag: 'a'})
      process.exit()
    }
  })

  cluster.on('exit', function(worker, code, signal) {
    console.log('<worker ' + worker.id + '> died')

    if (++messages === numCPUs) {
      process.exit()
    }
  })

  spawnClients(extraClients)
} else {
  spawnClients(clientsPerCPUCore)
}

function spawnClients(clients) {
  let totalAckTime = 0
  let totalServerAckTime = 0
  let clientsDone = []
  const id = cluster.isWorker ? cluster.worker.id : 0
  for (let i = 0; i < clients; i++) {
    // Start a virtual client that sends and receives messages from the server.
    const client = new VirtualClient(id  * clients + i, clients)

    let clientDone = client.waitUntilDone().then(({ackTime, serverAckTime}) => {
      totalAckTime += ackTime
      totalServerAckTime += serverAckTime
    })

    clientsDone.push(clientDone)
  }

  Promise.all(clientsDone).then(() => {
    // Send results to master
    process.send({
      avgAckTime: totalAckTime / clients,
      avgServerAckTime: totalServerAckTime / clients
    })
  }).catch(err => {
    if (!cluster.isMaster) {
      worker.kill()
    }
  })
}