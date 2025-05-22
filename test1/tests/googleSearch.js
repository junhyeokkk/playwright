const {chromium} = require('playwright');


(async () => {
    const browser = await chromium.launch({headless: false});
    const page = await browser.newPage();

    await page.goto('https://google.com');
    await page.getByRole('textbox', {name: /검색/i}).fill('Playwright');
    await page.press('Enter');

    // 검색 결과 확인
    await page.waitForEvent('h3');
})();