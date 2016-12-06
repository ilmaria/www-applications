const http = require('http')

class HttpClient {
  constructor(id) {
    this.id = id
    this.timer = null
    this.ackTime = 0
    this.serverAckTime = 0
  }

  waitUntilDone() {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        this.timer = process.hrtime()
        this.sendMessage(JSON.stringify({
          author: 'user_' + this.id,
          content: 'message content',
          messageType: 'msg'
        })).then((resp) => {
          if (resp.messageType === 'serverAck') {
            const timeDiff = process.hrtime(this.timer)
            // Time in milliseconds
            this.serverAckTime = timeDiff[0] * 1e3 + timeDiff[1] / 1e6

            this.get(`http://localhost:8000/long-poll-ack?id=${resp.id}`, (resp) => {
              if (resp.messageType === 'ack') {
                const timeDiff = process.hrtime(this.timer)
                this.ackTime = timeDiff[0] * 1e3 + timeDiff[1] / 1e6
                resolve({
                  ackTime: this.ackTime,
                  serverAckTime: this.serverAckTime
                })
              }
            })
          }
        })
      }, this.id * 5)

      this.onMessage((msg) => {
        if (msg.messageType === "msg") {
          this.sendAck()
        }
      })
    })
  }

  sendMessage(content) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 8000,
        path: '/long-poll',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(content)
        }
      }

      const req = http.request(options, (res) => {
        res.setEncoding('utf8')
        let rawData = ''
        res.on('data', (chunk) => rawData += chunk)

        res.on('end', () => {
          try {
            let parsedData = JSON.parse(rawData)
            resolve(parsedData)
          } catch (e) {
            console.log(e.message)
            reject(e)
          }
        })
      })

      req.on('error', (e) => {
        console.log(`Got error: ${e.message}`)
        reject(e)
      })

      // write data to request body
      req.write(content)
      req.end()
    })
  }

  sendAck() {
    this.sendMessage(JSON.stringify({
      id: this.id,
      messageType: 'ack'
    }))
  }

  onMessage(callback) {
    this.get('http://localhost:8000/long-poll', (response) => {
      callback(response)
      this.onMessage(callback)
    })
  }

  get(url, callback) {
    http.get(url, (res) => {
      const statusCode = res.statusCode
      const contentType = res.headers['content-type']

      let error
      if (statusCode !== 200) {
        error = new Error(`Request Failed.\n` +
                          `Status Code: ${statusCode}`)
      } else if (!/^application\/json/.test(contentType)) {
        error = new Error(`Invalid content-type.\n` +
                          `Expected application/json but received ${contentType}`)
      }
      if (error) {
        console.log(error.message)
        // consume response data to free up memory
        res.resume()
        return
      }

      res.setEncoding('utf8')
      let rawData = ''
      res.on('data', (chunk) => rawData += chunk)
      res.on('end', () => {
        try {
          let parsedData = JSON.parse(rawData)
          callback(parsedData)
        } catch (e) {
          console.log(e.message)
        }
      })
    }).on('error', (e) => {
      console.log(`Got error: ${e.message}`)
    })
  }
}

module.exports = HttpClient
