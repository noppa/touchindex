const args = require('process').argv.slice(2);
const fs = require('fs');
const path = require('path');

// Helpers
const isHtmlFile = file => file.ext === 'html';
const isIndexFile = file => file.filename === 'index';
const negate = fn => x => !fn(x);
const writeFile = (pathname, file) => new Promise((resolve, reject) => {
  fs.writeFile(pathname, file, (err) => {
    if (err) reject(err);
    else resolve();
  });
});

const
  defaultOptions = {
    scriptType: 'script',
    title: 'title',
    dir: '.'
  },
  handlers = {
    html (opts, filename, otherResults = []) {
      const injectables = otherResults.map(result => result.inject).sort();
      const template =
`<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>${opts.title}</title>${injectables.map(tag => `
    ${tag}`).join('')}
  </head>
  <body>
      <h1>Hello World!</h1>
  </body>
</html>
`;
      return { template, inject: undefined, filename };
    },
    js (opts, filename) {
      const template = `console.log('Hello World!');` + '\n';
      let { scriptType } = opts;
      if (scriptType !== 'module') {
        scriptType = 'text/javascript';
      }
      const inject = `<script type="${scriptType} src="${filename}"></script>`;
      return { template, inject, filename };
    },
    mjs (opts, ...rest) {
      return handlers.js({...opts, ...{ scriptType: 'module' }}, ...rest);
    },
    css (opts, filename) {
      const template = `
h1 {
  text-align: center;
  font-family: Verdana, sans-serif;
}`;
      const inject = `<link rel="stylesheet" type="text/css" href="${filename}"/>`;
      return { template, inject, filename };
    }
  };

const
  optionRegex = new RegExp(
    `^--?(${Object.keys(defaultOptions).join('|')})(=| )([a-zA-Z]+)`),
  fileRegex = new RegExp(
    `^([a-zA-Z]+\\.)?(${Object.keys(handlers).join('|')})$`);

const options = {...defaultOptions};
const files = [];

// Parse arguments.
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
    let [, filename, ext] = fileMatch;
    filename = filename ? filename.slice(0, filename.length - 1) : 'index';
    files.push({ filename, ext });
  } else {
    throw new Error('Invalid option ' + arg);
  }
}

if (files.length === 0) {
  files.push({ filename: 'index', ext: 'html' });
}

const htmlFiles = files.filter(isHtmlFile);
const indexHtml = htmlFiles.find(isIndexFile);

const resourceFileResults = files
  .filter(negate(isHtmlFile))
  .map(file => handlers[file.ext](options, file.filename + '.' + file.ext));
console.log(resourceFileResults);

const htmlFileResults = htmlFiles
  .filter(negate(isIndexFile))
  .map(file =>
    handlers.html(options, file.filename + '.html', indexHtml ? undefined : resourceFileResults));

if (indexHtml) {
  htmlFileResults.push(handlers.html(options, 'index.html', resourceFileResults));
}

const promises = resourceFileResults
  .concat(htmlFileResults)
  .map(result => {
    const pathname = path.join(options.dir, result.filename);
    return writeFile(result.template, pathname).then(() => pathname);
  });

Promise.all(promises).then(pathnames => {
  console.log('Done! These files were created:\n' + pathnames.join('\n'));
});
