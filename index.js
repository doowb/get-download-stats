/*!
 * get-download-stats <https://github.com/doowb/get-download-stats>
 *
 * Copyright (c) 2016, Brian Woodward.
 * Licensed under the MIT License.
 */

'use strict';

var extend = require('extend-shallow');
var through = require('through2');
var async = require('async');
var sort = require('array-sort');
var get = require('download-stats').get;

module.exports = function(app, options) {
  var opts = extend({start: '2010-01-01'}, options);

  return through.obj(function(file, enc, cb) {
    var repo = opts.repo;
    var stream = this;
    var downloads = file.json || [];
    downloads = sort(downloads, 'day').reverse();

    repo = repo || (file.data && file.data.repo);

    var start = (downloads.length === 0 ? (file.data.start || opts.start) : downloads[0].day);
    if (typeof start === 'string') {
      start += ' 00:00:00';
    }
    if (start instanceof Date) {
      normalizeDate(start);
    }

    var day = new Date(start);
    var now = new Date();
    normalizeDate(now);

    if (repo) {
      app.emit('progress', {repo: repo, day: (day + ' to ' + now)});
      get(day, now, repo)
        .on('data', function(data) {
          downloads.push(data);
        })
        .on('error', function(err) {
          stream.emit('error', err);
          stream.push(file);
          return cb();
        })
        .on('end', function() {
          downloads = sort(downloads, 'day').reverse();
          file.json = downloads;
          stream.push(file);
          cb();
        });
      return;
    }

    async.whilst(function() {
      day.setUTCDate(day.getUTCDate() + 1);
      return day < now;
    }, function(next) {
      app.emit('progress', {day: day});
      get(day, day, repo)
        .on('data', function(data) {
          downloads.push(data);
        })
        .on('error', next)
        .on('end', next);
    }, function(err) {
      if (err) {
        stream.emit('error', err);
        stream.push(file);
        return cb();
      }
      downloads = sort(downloads, 'day').reverse();
      file.json = downloads;
      stream.push(file);
      cb();
    });
  });
};

function normalizeDate(date) {
  date.setUTCDate(date.getUTCDate() - 1);
  date.setHours(0);
  date.setMinutes(0);
  date.setSeconds(0);
}
