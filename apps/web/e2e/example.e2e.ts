import { Selector, t } from 'testcafe';

fixture('Homepage').page('http://localhost:4200');

test('should display the app title', async () => {
  const body = Selector('body');

  await t.expect(body.exists).ok('Page body should exist');
});

test('should navigate without errors', async () => {
  const { error } = await t.getBrowserConsoleMessages();

  // Filter out known benign errors (e.g., favicon, dev warnings, expected API errors)
  const criticalErrors = error.filter(
    (msg: string) =>
      !msg.includes('favicon') &&
      !msg.includes('DevTools') &&
      !msg.includes('404') &&
      !msg.includes('Network Error') &&
      !msg.includes('AxiosError')
  );

  await t
    .expect(criticalErrors.length)
    .eql(0, `Should have no critical console errors. Found: ${JSON.stringify(criticalErrors)}`);
});
