/*!
 * get-download-stats <https://github.com/doowb/get-download-stats>
 *
 * Copyright (c) 2016, Brian Woodward.
 * Licensed under the MIT License.
 */

'use strict';

var utils = require('./utils');

/**
 * Pipeline plugin used to get npm download stats for a repository
 * starting at the specified date or all dates.
 *
 * All options below may also be set on the `file.data` property before piping through the stream.
 * See the example `assemblefile.js` for setting up middleware.
 *
 * ```js
 * app.src('path/to/files/*.json')
 *   .pipe(stats(app, options))
 *   .pipe(app.dest('path/to/files'));
 * ```
 * @param  {Object} `app` Instance of an application that inherits from Templates (required for emitting events).
 * @param  {Object} `options` Options to control start date, repo, and property on the json object to use.
 * @param  {String|Date} `start` Date to start getting downloads.
 * @param  {String} `repo` Name of repository to get. If undefined, total downloads for npm will be pulled.
 * @param  {String} `prop` Property to use in the json file to store the downloads array.
 * @return {Stream} Stream to be used in a pipeline.
 * @api public
 * @name stats
 */

module.exports = function(app, options) {
  var opts = utils.extend({start: '2010-01-01'}, options);

  return utils.through.obj(function(file, enc, cb) {
    var fileData = file.data || {};
    var jsonData = file.json || utils.tryParse(file.content);
    var jsonProp = opts.prop || fileData.prop;
    var dataProp = jsonProp || 'downloads';

    var stream = this;
    var results = {};
    var repo = opts.repo || fileData.repo;
    results[dataProp] = ((jsonProp ? jsonData[jsonProp] : jsonData) || []).map(utils.Data);
    results[dataProp] = utils.sort(results[dataProp], 'day').reverse();

    var start = (results[dataProp].length === 0 ? (fileData.start || opts.start) : results[dataProp][0].day);
    if (typeof start === 'string') {
      start += ' 00:00:00';
    }
    if (start instanceof Date) {
      utils.normalizeDate(start, 1);
    }

    var day = new Date(start);
    var now = new Date();
    utils.normalizeDate(now, 0);

    // faster to get all days for an individual repo
    if (repo) {
      app.emit('progress', {repo: repo, day: (day + ' to ' + now)});
      return utils.stats.get(day, now, repo)
        .on('data', handle)
        .on('error', done)
        .on('end', done);
    }

    // get individual days when getting all npm downloads
    utils.async.whilst(function() {
      day.setUTCDate(day.getUTCDate() + 1);
      return day < now;
    }, function(next) {
      app.emit('progress', {day: day});
      utils.stats.get(day, day)
        .on('data', handle)
        .on('error', next)
        .on('end', next);
    }, done);

    // handle adding data to the downloads array
    function handle(data) {
      utils.union(results, dataProp, [utils.Data(data)].filter(filter));
    }

    // filter out data items already in the downloads array
    function filter(data) {
      return results[dataProp].filter(function(item) {
        return (item.toString() === data.toString());
      }).length === 0;
    }

    // sync up json data and file contents
    function updateFile() {
      if (jsonProp) {
        jsonData[jsonProp] = results[dataProp];
      } else {
        jsonData = results[dataProp];
      }
      if (file.json) {
        file.json = jsonData;
      } else {
        file.content = JSON.stringify(jsonData, null, 2);
      }
    }

    // update `file` when processing is finished
    function done(err) {
      if (err) {
        stream.emit('error', err);
        stream.push(file);
        return cb();
      }
      results[dataProp] = utils.sort(results[dataProp], 'day').reverse();
      updateFile();
      stream.push(file);
      cb();
    }
  });
};
