import {expect, test} from "@playwright/test";

// 일자 : 2025-04-24
// 내용 : playwright 및 js 언어 친숙화를 위한 연습 예제
// 이름 : 최준혁

// 1. 네이버 타이틀 확인
test('네이버 타이틀 확인', async ({page}) => {
    await page.goto('http://naver.com');
    await expect(page).toHaveTitle(/NAVER/);
});

// 2. Google 검색창에 텍스트 입력하고 결과 확인
test('Google 검색창에 텍스트 입력하고 결과 확인', async ({page}) => {
   await page.goto('https://google.com');
   await page.locator('textarea[name="q"]').fill('chatGPT');
   await page.keyboard.press('Enter');
   await expect(page).toHaveURL(/search/);
});

// 3. 드롭다운 선택하기
test('드롭다운 선택하기', async ({page}) => {
   await page.goto('https://www.w3schools.com/tags/tryit.asp?filename=tryhtml_select');
   await page.frameLocator('#iframeResult').locator('#cars').selectOption('saab');
   const selected = await page.frameLocator('#iframeResult').locator('select').inputValue();
   expect(selected).toBe('saab');
});

// 4. 모달 팝업 열고 닫기 테스트
test('모달 열고 닫기', async ({ page }) => {
    test.setTimeout(60000);

    // 페이지 접속
    await page.goto('https://www.w3schools.com/howto/howto_css_modals.asp', {
        waitUntil: 'domcontentloaded'
    });
    // 모달 열기 버튼 클릭
    await page.locator('button.ws-btn.w3-dark-grey').click();
    // 모달이 보이는지 확인 (id01 = 모달 전체 박스)
    await expect(page.locator('#id01')).toBeVisible();
    // 닫기 버튼 클릭 (span)
    await page.locator('.w3-button.w3-xlarge.w3-display-topright.w3-hover-red.w3-hover-opacity').click();
    // 모달이 사라졌는지 확인
    await expect(page.locator('#id01')).toBeHidden(); // expect : 검증할때 필요한 함수 어디에서 어떤행동인지 검증하는가?
});

// 5. 네이버 로그인 테스트
test('네이버 로그인 테스트', async ({page}) => {
    // 네이버 페이지 이동
    await page.goto('https://naver.com');
    // 로그인 버튼 클릭
    await page.locator('.MyView-module__link_login___HpHMW').click();
    // id 입력
    await page.fill('.input_id', 'qwer123' || '');
    // pw 입력
    await page.fill('.input_pw', 'qwer123' || '');
    // 로그인 버튼 클릭
    await page.locator('button#log.login').click();
    // 로그인 성공 확인
    await expect(page).toHaveURL(/naver\.com/); //toHaveURL ==> URL이 바뀌었는지 확인
})