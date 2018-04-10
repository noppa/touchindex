const args = require('process').argv.slice(2);
const fs = require('fs');
const path = require('path');

const
  defaultOptions = {
    scriptType: 'script'
  },
  handlers = {
    html (opts, fileName) {

    },
    js (opts, fileName) {
    },
    mjs (opts, fileName) {
      return handlers.js({...opts, ...{ scriptType: 'module' }});
    },
    css () {

    }
  };

const
  optionRegex = new RegExp(
    `^--?(${Object.keys(defaultOptions).join('|')})(=| )([a-zA-Z]+)`),
  fileRegex = new RegExp(
    `^([a-zA-Z]+\\.)?(${Object.keys(handlers).join('|')})$`);

const options = {}, files = [];

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (!arg) continue;
  const optMatch = (arg + ' ' + (args[i + 1] || '')).match(optionRegex);
  const fileMatch = !optMatch ? arg.match(fileRegex) : null;

  if (optMatch) {
    const [, optName, matchType, optValue] = optMatch;
    options[optName] = optValue;
    if (matchType === ' ') {
      i++;
    }
  } else if (fileMatch) {
    let [, fileName, ext] = fileMatch;
    fileName = fileName ? fileName.slice(0, fileName.length - 1) : 'index';
    files.push({ fileName, ext });
  } else {
    throw new Error('Invalid option ' + arg);
  }
}

console.log(options, files);
