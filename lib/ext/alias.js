const check = require('stumble-core/lib/check')


function handleShorthand(message, user) {
  const conf = this.config.extensions.alias;

  const operator = Object.keys(conf.operators)
    .find(op => message.startsWith(op))
  if (operator !== undefined) {
    message = message.substring(operator.length);

    if (message) {
      const handle = conf.operators[operator];
      const data = { handle, user, message };

      if (this.space.has('_STANDARD_PERMISSIONS_'))
        this.execute('permissions::invoke', data);
      else
        this.invoke(handle, data);
    }
  }
}


module.exports = {
  handle: 'alias',
  extensions: [],
  commands: [],
  init: stumble => {
    const conf = stumble.config.extensions.alias;
    if (conf.operators == null) conf.operators = {}
    if (conf.aliases == null) conf.aliases = {}

    // Setup aliases
    Object.entries(conf.aliases).forEach(([alias, cmdHandle]) => {
      check.command.usable(alias, stumble.commands, stumble.aliases)

      stumble.aliases.set(alias, cmdHandle)
    })

    // Handle shorthand commands (operators)
    stumble.on('message', handleShorthand);
  },
  term: stumble => {
    const conf = stumble.config.extensions.alias;
    Object.keys(conf.aliases).forEach(alias => {
      stumble.aliases.delete(alias)
    })

    stumble.removeListener('message', handleShorthands);
  },
}