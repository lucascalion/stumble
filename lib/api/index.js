const express = require('express')
const cors = require('cors')

function createApp(stumble, conf) {
  const router = express.Router()
  const app = express()

  app.use(
    express.json({
      type: () => true
    }),
    cors(),
  )

  router.get('/', function (req, res) {
    res.send('Hello World!')
  })

  router.post('/commands/:cmd/invoke', function (req, res) {
    const cmd = req.params.cmd
    if (!conf.cmdWhitelist.includes(cmd)) {
      res.status(403).send({
        error: { message: "Command not in whitelist" }
      })
      return
    }

    // Ugly hack to avoid crashes when bot responds.
    // Immediate responses are retrieved and forwarded to the client.
    const responses = []
    userMock = {
      sendMessage(message) { responses.push(message) }
    }
    const data = {
      message: req.body.message || "",
      user: userMock,
    }
    stumble.invoke(cmd, data)
    res.status(200).send({
      status: "ok",
      responses,
    })
  })

  router.get('/sounds', function (req, res, next) {
    const db = stumble.execute('database::use');
    db.all("SELECT * FROM audiofiles", (err, rows) => {
      if (err) {
        return next(err)
      }
      const sounds = rows.map(row => ({
        id: row.key,
        uploader: row.dir,
        date: row.mstimestamp,
      }))
      res.status(200).send({ sounds })
    })
  })

  app.use(conf.basePath, router)

  app.use(function errorHandler(err, req, res, next) {
    if (res.headersSent) {
      return next(err)
    }
    res.status(500).send({
      error: { message: err.message }
    })
  })

  app.use(function (req, res, next) {
    res.status(404).send({
      error: { message: "Not Found" }
    })
  })

  return app
}

exports.run = function run(stumble, conf) {
  const host = conf.host || 'localhost'
  const port = conf.port || 3000
  const cmdWhitelist = conf.cmdWhitelist || []
  const basePath = conf.basePath || '/'
  const app = createApp(stumble, { basePath, cmdWhitelist })
  const server = app.listen(port, host, function () {
    console.log(`HTTP server listening on ${host}:${port} for API calls`)
  })

  return server
}
