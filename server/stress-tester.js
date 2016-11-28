const cluster = require('cluster')
const numCPUs = require('os').cpus().length
const virtualClient = require('./virtual-client')

const clientsPerCPUCore = 3

if (cluster.isMaster) {
  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork()
  }

  cluster.on('exit', function(worker, code, signal) {
    console.log('worker ' + worker.process.pid + ' died')
  })
} else {
  for (let i = 0; i < clientsPerCPUCore; i++) {
    // Start a virtual client that sends and receives messages from the server.
    // Clients have a random time when they start their connection.
    setTimeout(function() {
      virtualClient(cluster.worker.id * clientsPerCPUCore + i)
    }, Math.random()* 3000)
  }
}
