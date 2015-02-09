var App = require('../lib/app');

describe('App', function(){
  it('initialize', function(){
    expect(typeof App !== 'undefined').toBeTruthy();
  });
});