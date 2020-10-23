'use strict';

module.exports = extension => {
  switch (extension) {
  case 'alias':
  case 'api':
  case 'audio':
  case 'audioplayer':
  case 'audiostream':
  case 'database':
  case 'greeter':
  case 'info':
  case 'io':
  case 'log':
  case 'messenger':
  case 'movement':
  case 'parser':
  case 'permissions':
  case 'system':
  case 'time':
  case 'tts':
  case 'usersystem':
  case 'util':
    return true;
  default:
    return false;
  }
};
