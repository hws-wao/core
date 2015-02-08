var FileNotFoundError = function(message) {
    this.name = "FileNotFoundError";
    this.message = message || '指定されたファイルが見つかりませんでした。';
};

FileNotFoundError.prototype = new Error();
FileNotFoundError.prototype.constructor = FileNotFoundError;

module.exports = FileNotFoundError;
