'use strict';

/**
 * Module dependencies
 */

var utils = require('lazy-cache')(require);

/**
 * Temporarily re-assign `require` to trick browserify and
 * webpack into reconizing lazy dependencies.
 *
 * This tiny bit of ugliness has the huge dual advantage of
 * only loading modules that are actually called at some
 * point in the lifecycle of the application, whilst also
 * allowing browserify and webpack to find modules that
 * are depended on but never actually called.
 */

var fn = require;
require = utils;

/**
 * Lazily required module dependencies
 */

require('array-sort', 'sort');
require('async');
require('download-stats', 'stats');
require('extend-shallow', 'extend');
require('through2', 'through');
require('union-value', 'union');

/**
 * Restore `require`
 */

require = fn;

/**
 * Due to differences in times throughout the day when running
 * set all times to midnight UTC.
 */

utils.normalizeDate = function(date, days) {
  date.setDate(date.getDate() - days);
  date.setUTCHours(0);
  date.setUTCMinutes(0);
  date.setUTCSeconds(0);
};

/**
 * Try to parse a content string into a JSON object.
 */

utils.tryParse = function(content) {
  try {
    var data = JSON.parse(content);
    return data;
  } catch(err) {
    return {};
  }
};

/**
 * Data object used to ensure days aren't duplicated in the downloads array.
 */

function Data(obj) {
  if (!(this instanceof Data)) {
    return new Data(obj);
  }
  this.day = obj.day;
  this.downloads = obj.downloads;
}

Data.prototype.toString = function() {
  return '[' + this.day + ']: ' + this.downloads;
};

utils.Data = Data;

/**
 * Expose `utils` modules
 */

module.exports = utils;
