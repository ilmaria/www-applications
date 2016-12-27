const child_process = require('child_process')

const MAX_CLIENTS = 400
const STEP = 10

for (let i = 0; i <= MAX_CLIENTS; i += STEP) {
  console.log(`Starting script with ${i} clients...`)
  child_process.spawnSync('npm', ['run', 'stress-http', i + ''], {stdio: 'inherit'})
  console.log('Script done.\n')
}