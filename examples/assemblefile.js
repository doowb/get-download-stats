'use strict';

var assemble = require('assemble');
var download = require('../');
var app = assemble();

// custom collection to store download stats files
app.create('stats');

// when loading files, convert the content into a json object
// and check to see if the file name is a repo name.
app.onLoad(/\.json$/, function(file, next) {
  file.data.repo = (file.path.indexOf('total-npm') === -1 ? file.stem : '');
  if (file.stem === 'assemble') {
    file.data.start = '2010-01-01';
  }
  file.json = JSON.parse(file.content);
  next();
});

// before writing the file back out, convert the json back into a string
app.preWrite(/\.json$/, function(file, next) {
  file.content = JSON.stringify(file.json, null, 2);
  next();
});

// show process of downloading
app.on('progress', function(data) {
  console.log('Getting' + (data.repo ? ' [' + data.repo + '] ' : ' [total npm] ') + 'downloads for', data.day);
});

app.task('load', function(cb) {
  app.stats([__dirname + '/downloads/*.json']);
  // app.stat('total-npm.json', {content: '[]'});
  cb();
});

app.task('default', ['load'], function() {
  // restrict the date so the example doesn't download too much data.
  var start = new Date();
  start.setUTCDate(start.getUTCDate() - 10);

  return app.toStream('stats')
    .pipe(download(app, {start: start}))
    .pipe(app.dest('downloads'));
});

module.exports = app;
