const crypto = require('crypto')
const path = require('path')

const Promise = require('bluebird')
const fs = Promise.promisifyAll(require('fs'))
const googleTTS = require('google-tts-api')
const request = require('request-promise')

const mkd = Promise.promisify(require('../gutil').mkd)

const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64; rv:58.0) Gecko/20100101 Firefox/58.0'


/* Default error handler for async commands */
function asyncErrorHandler(wrappedFunction) {
  return async function(data, ...args) {
    try {
      const result = await wrappedFunction.call(this, data, ...args)
      return result
    } catch (err) {
      console.error(err)
      this.emit('error', err)
      if (data.user) {
        data.user.sendMessage(`An error occurred: ${err}`)
      }
    }
  }
}


const tts = {
  handle: 'tts',
  exec: asyncErrorHandler(async function tts(data) {
    // Parse optional lang parameter in the following form: lang>message
    const cmdPattern = /^(.{0,7})>(.+)$/
    const cmdText = this.execute('parser::htmltotext', {
      html: data.message
    }).trim()
    const res = cmdPattern.exec(cmdText)
    let lang = 'fr'
    let message
    if (res !== null) {
      lang = res[1]
      message = res[2]
    } else {
      message = cmdText
    }

    const cacheDir = this.config.extensions.tts._cacheDir
    // Generate filename
    const hash = crypto.createHash('md5')
    hash.update(cmdText)
    const digest = hash.digest('hex')
    const filepath = path.join(cacheDir, digest)

    // Generate and save voice message if not in cache
    fileInCache = await fs.accessAsync(filepath, fs.constants.F_OK)
      .return(true).catchReturn(false)
    if (!fileInCache) {
      const ttsUrl = await googleTTS(message, lang, 1)
      const result = await request({
        url: ttsUrl,
        encoding: null,  // return response as a buffer
        headers: {
          'User-Agent': USER_AGENT,
        },
      })
      await fs.writeFileAsync(filepath, result)
    }

    this.execute('audio::playfile', {
      filename: filepath,
      gain: 1.0,
      targetSessions: data.targetSessions,
      done: perr => {
        if (perr && perr.code !== 'APKILL')
          data.user.sendMessage('Audio output got tied up.');
      }
    })
  }),
  info: () => `<pre>
USAGE: tts TEXT
SHORTHAND: >TEXT

  </pre>`
}


const ttsRand = {
  handle: 'tts::rand',
  exec: asyncErrorHandler(async function tts(data) {
    const cacheDir = this.config.extensions.tts._cacheDir
    const filenames = await fs.readdirAsync(cacheDir)
    const filename = filenames[Math.floor(Math.random() * filenames.length)];
    const filepath = path.join(cacheDir, filename)

    this.execute('audio::playfile', {
      filename: filepath,
      gain: 1.0,
      targetSessions: data.targetSessions,
      done: perr => {
        if (perr && perr.code !== 'APKILL')
          data.user.sendMessage('Audio output got tied up.');
      }
    })
  }),
  info: () => `<pre>
USAGE: tts::rand TEXT
SHORTHAND: rand

Play a random message
from the TTS cache.
  </pre>`
}


module.exports = {
  handle: 'tts',
  needs: ['audio', 'parser'],
  extensions: [],
  commands: [tts, ttsRand],
  init: async (stumble) => {
    const conf = stumble.config.extensions.tts;
    conf.directory = path.resolve(conf.directory);

    // Prepare cache directory
    const cacheDir = path.join(conf.directory, "cache")
    conf._cacheDir = cacheDir
    await mkd(cacheDir)  // let process crash if this fails
  },
};
