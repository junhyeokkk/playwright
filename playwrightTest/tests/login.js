const { chromium } = require('playwright');

// 네이버 로그인 테스트 코드
(async () => {
    const browser = await chromium.launch({
        headless: false
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // 브라우저 콘솔 로그 출력
    page.on('console', msg => {
        console.log('브라우저 콘솔:', msg.text());
    });

    try {
        // 네이버 로그인 시도
        await page.goto('https://www.naver.com/');
        await page.getByRole('link', { name: 'NAVER 로그인' }).click();
        await page.getByRole('textbox', { name: '아이디 또는 전화번호' }).fill('loveu9911');
        await page.getByRole('textbox', { name: '아이디 또는 전화번호' }).press('Tab');
        await page.getByRole('textbox', { name: '비밀번호' }).fill('lovesay9911');
        await page.locator('#log\\.login').click();

        // 로그인 성공 판단 (메일함 존재 여부)
        const isLoggedIn = await page.getByText('메일').isVisible().catch(() => false);

        if (isLoggedIn) {
            console.log('로그인 성공!');
        } else {
            console.log('로그인 실패!');
            await page.screenshot({ path: 'login_failed.png', fullPage: true });
        }

    } catch (err) {
        console.error('예외 발생:', err.message);
        await page.screenshot({ path: 'error_during_login.png', fullPage: true });
    } finally {
        await context.close();
        await browser.close();
    }
})();
