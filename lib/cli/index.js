#!/usr/bin/env node

var waoStart = function(yargs) {
  argv = yargs.option('p', {
          alias: 'port',
          description: 'WAOアプリを起動するportを指定します'
        })
        .default('p', '1111')
        .help('help')
        .argv;

  require('./start').start(argv.p);
};

require('yargs')
  .usage('Usage: $0 <command> [options]')
  .command('init', 'カレントディレクトリにWAOアプリのひな形を作ります', require('./init').init)
  .command('start', 'WAOアプリを起動します', waoStart)
  .command('stop', 'WAOアプリを停止します')
  .command('version', 'waoのバージョンを表示します', require('./version').readVersion)
  .demand(1)
  .help('h')
  .alias('h', 'help')
  .epilog('copyright 2015')
  .argv;
