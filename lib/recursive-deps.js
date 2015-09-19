var Promise = require('bluebird');
var path = require('path');
var fs = require('fs-promise');
var detective = require('detective');
var flatten = require('fj-flatten');

module.exports = function(paths) {
  if (typeof paths === 'string') {
    paths = [paths];
  }

  return extractDeps(paths, []).map(function(required) {
    if (required.match(/^\//)) return false;

    return required.replace(/^([^\/]+).*$/g, '$1');
  }).filter(Boolean);
};

function extractDeps(paths, processedDeps) {
  if (typeof paths === 'string') {
    paths = [paths];
  }

  return Promise.map(paths, function(srcPath) {
    return fs.exists(srcPath).then(function(exists) {
      if (!exists) return [];

      return fs.readFile(srcPath, 'utf-8').then(function(src) {
        return detective(src).map(function (required) {
          if (required.match(/^[\/.]/g)) {
            return path.resolve(path.dirname(srcPath), required);
          } else {
            return required;
          }
        });
      });
    });
  }).then(flatten).each(function(dep) {
    if (processedDeps.indexOf(dep) === -1) {
      processedDeps.push(dep);
      if (dep.match(/^\//g)) {
        return extractDeps([dep], processedDeps);
      }
    }
  }).then(function() {
    return processedDeps;
  });
}