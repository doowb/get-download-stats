'use strict';

var assemble = require('assemble');
var stats = require('../');
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
    .pipe(stats(app, {start: start, prop: 'downloads'}))
    .pipe(app.dest('downloads'));
});

module.exports = app;
