import { Selector } from 'testcafe';

fixture('Homepage').page('http://localhost:4200');

test('should display the app title', async t => {
  const body = Selector('body');

  await t.expect(body.exists).ok('Page body should exist');
});

test('should navigate without errors', async t => {
  const { error } = await t.getBrowserConsoleMessages();

  await t.expect(error.length).eql(0, 'Should have no console errors');
});
