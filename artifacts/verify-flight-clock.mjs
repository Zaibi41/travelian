import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true });
try {
  for (const [width, height, timezoneId] of [[1440,900,'Asia/Karachi'],[1024,768,'Asia/Karachi'],[768,1024,'America/New_York'],[375,812,'Asia/Karachi']]) {
    const context = await browser.newContext({ viewport: { width, height }, timezoneId });
    const page = await context.newPage();
    await page.route('**/flights/search', route => route.fulfill({ json: {
      searchId: 'timezone-test', providerStatus: { sooperfare: 'success' }, results: [{
        offerId: 'timezone-test', provider: 'sooperfare', airline: 'Airblue', flightNumber: 'PA-410',
        origin: 'LHE', destination: 'DXB', departureTime: '2026-10-06T15:50:00+05:00',
        arrivalTime: '2026-10-06T19:00:00+04:00', duration: '4h 10m', stops: 0,
        cabin: 'Economy', price: { total: 90000, currency: 'PKR' },
        segments: [{ origin: 'LHE', destination: 'DXB', departureTime: '2026-10-06T15:50:00+05:00',
          arrivalTime: '2026-10-06T19:00:00+04:00', flightNumber: 'PA-410', duration: '4h 10m' }],
      }],
    } }));
    await page.goto('https://travelian.pk/flights-search?from=LHE&to=DXB&depart=2026-10-06&trip=oneway', { waitUntil: 'domcontentloaded' });
    try {
      await page.locator('p:visible').filter({ hasText: /^19:00$/ }).first().waitFor({ timeout: 20000 });
    } catch (error) {
      console.log((await page.locator('body').innerText()).slice(0, 3500));
      await page.screenshot({ path: 'artifacts/flight-clock-debug.png', fullPage: true });
      throw error;
    }
    assert.equal(await page.getByText('20:00', { exact: true }).count(), 0);
    await page.locator('p:visible').filter({ hasText: /^15:50$/ }).first().waitFor();
    await page.screenshot({ path: `artifacts/flight-clock-${width}.png`, fullPage: true });
    console.log(JSON.stringify({ width, timezoneId, arrival: '19:00', departure: '15:50', status: 'passed' }));
    await context.close();
  }
} finally { await browser.close(); }
