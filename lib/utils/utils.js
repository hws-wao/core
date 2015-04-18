
exports.isOmitParameter = function(target) {
  if (target.match(/^_/)) {
    return true;
  }
  return false;
};
