'use strict';

const Promise = require('bluebird')


const GREETINGS = [
  "Hello",
  "Coucou",
  "Salut",
  "Kikou",
  "Ciao",
  "Bonjour",
  "Bonsoir",
  "Bijour",
]

const YALL = [
  "tout le monde",
  "les gens",
  "les kidz",
  "les potos",
  "la compagnie",
]


function Greeter(stumble, greetings = GREETINGS, yall = YALL) {

  const db = Promise.promisifyAll(stumble.execute('database::use'));

  async function init() {
    stumble.on('connect', onStumbleConnect)
    if (stumble.client && stumble.client.ready) {
      onStumbleConnect(stumble.client)
    }

    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS greeterprefs(
        name TEXT UNIQUE,
        ignore INTEGER
      )
    `);
  }

  function destroy() {
    stumble.removeListener('connect', onStumbleConnect)
    if (stumble.client && stumble.client.ready) {
      stumble.client.removeListener('user-move', onUserMove)
      stumble.client.removeListener('user-connect', onUserConnect)
    }
  }

  function onStumbleConnect(client) {
    client.on('user-move', onUserMove)
    client.on('user-connect', onUserConnect)
  }

  async function greet(user) {
    const rows = await db.allAsync(
      'SELECT * FROM greeterprefs WHERE ignore = 1'
    )
    const ignoredUsernames = rows.map(row => row.name)
    const audioTargets = stumble.client.user.channel.users
      .filter(user =>
        user.session !== stumble.client.user.session &&
        !ignoredUsernames.includes(user.name)
      )
      .map(user => user.session)
    if (audioTargets.length === 0) {
      return
    }

    const greet = randomPick(greetings)
    const target = (user == null) ? randomPick(yall) : user.name
    const message = `${greet} ${target} !`
    console.log(message)

    stumble.invoke('tts', {
        message,
        targetSessions: audioTargets,
    })
  }

  function onUserMove(user, oldChannel, newChannel) {
    const self = this.user
    if (self === user) {
      if (newChannel.users.length > 2) {
        greet()
      } else if (newChannel.users.length === 2) {
        const otherUser = newChannel.users.find(u => u !== self)
        greet(otherUser)
      }
    } else if (self.channel === newChannel) {
      greet(user)
    }
  }

  function onUserConnect(user) {
    if (this.user.channel.users.includes(user)) {
      greet(user)
    }
  }

  return {
    init, destroy, greet, db, greetings, yall
  }
}


async function toggleIgnore(stumble, data, ignore = true) {
  const greeter = stumble.space.get('greeter.instance')
  await greeter.db.runAsync(
    'REPLACE INTO greeterprefs (name, ignore) VALUES (?, ?)',
    data.user.name, ignore
  )
  if (ignore) {
    data.user.sendMessage("No greetings for you anymore.")
  } else {
    data.user.sendMessage("I will happily greet you again!")
  }

}


const greetCmd = {
  handle: 'greet',
  exec: function greet(data) {
    const greeter = this.space.get('greeter.instance')
    const greeting = randomPick(greeter.greetings)
    const target = data.message.trim() || randomPick(greeter.yall)
    const message = `${greeting} ${target} !`
    this.invoke('tts', { message })
  },
  info: () => `<pre>
USAGE: greet [username]

Manually greet a user,
or a group of people if
no username is specified.
  </pre>`
}


const ignoreCmd = {
  handle: 'greeter::ignore',
  exec: function ignore(data) {
    return toggleIgnore(this, data, true)
  },
  info: () => `<pre>
USAGE: greeter::ignore

Stop voice greetings for sender
  </pre>`
}


const unignoreCmd = {
  handle: 'greeter::unignore',
  exec: function unignore(data) {
    return toggleIgnore(this, data, false)
  },
  info: () => `<pre>
USAGE: greeter::unignore

Remove sender from greeter ignore-list
  </pre>`
}


function randomPick(array) {
  return array[Math.floor(Math.random() * array.length)];
}


module.exports = {
  handle: 'greeter',
  needs: ['database', 'tts'],
  extensions: [],
  commands: [greetCmd, ignoreCmd, unignoreCmd],
  init: stumble => {
    const conf = stumble.config.extensions.greeter;
    const greeter = Greeter(stumble, conf.greetings, conf.yall)
    stumble.space.set('greeter.instance', greeter)
    greeter.init()
  },
  term: stumble => {
    const greeter = stumble.space.get('greeter.instance')
    greeter.destroy()
    stumble.space.delete('greeter.instance')
  },
};
