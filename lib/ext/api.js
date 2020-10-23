'use strict';

const api = require('../api')

module.exports = {
  handle: 'api',
  needs: ['audio', 'audioplayer', 'database'],
  init: stumble => {
    const apiConf = stumble.config.extensions.api;
    const server = api.run(stumble, apiConf)
    stumble.space.set('api.server', server);
  },
  term: stumble => {
    const server = stumble.space.get('api.server');
    server.close()
  },
  extensions: []
};
