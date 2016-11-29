const cluster = require('cluster')
const numCPUs = require('os').cpus().length
const VirtualClient = require('./virtual-client')

const clientsPerCPUCore = 1

if (cluster.isMaster) {
  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork()
  }

  cluster.on('message', (worker, data) => {
    console.log(`Ack time for worker ${worker.process.id}:`, data.avgAckTime)
    console.log(`Server ack time for worker ${worker.process.id}:`, data.avgServerAckTime)
  })

  cluster.on('exit', function(worker, code, signal) {
    console.log('worker ' + worker.process.pid + ' died')
  })
} else {
  let totalAckTime = 0
  let totalServerAckTime = 0
  let clientsDone = []

  for (let i = 0; i < clientsPerCPUCore; i++) {
    // Start a virtual client that sends and receives messages from the server.
    const client = new VirtualClient(cluster.worker.id * clientsPerCPUCore + i)

    let clientDone = client.waitUntilDone().then(({ackTime, serverAckTime}) => {
      console.log('avg1')
      totalAckTime += ackTime
      totalServerAckTime += serverAckTime
    })

    clientsDone.push(clientDone)
  }

  Promise.all(clientsDone).then(() => {
    console.log('avg2')
    // Send results to master
    process.send({
      avgAckTime: totalAckTime / clientsPerCPUCore,
      avgServerAckTime: totalServerAckTime / clientsPerCPUCore
    })
  })
}
