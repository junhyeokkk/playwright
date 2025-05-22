const { test, expect } = require('./har-test');
import * as fs from "node:fs";
import path from "node:path";
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
const { getSSIMScore } = require('./compareSSIM'); // SSIM 유틸 함수 가져오기

// 공통 사항
// test title : {testNo.} {페이지} - {기능명} - {세부항목번호}D

// 공통 함수

// test.use({ video: 'on' });

// 각각의 테스트 전에 작동해야 하는 코드
test.beforeEach(async ({ page }) => {
    // 공통적으로 사용하는 기본 페이지 이동
    await page.goto('http://localhost:9007/#/home');
});

// 6. 메인 - 메뉴 (각 메뉴 페이지 <-> 메인 페이지 이동이 정상적이다.)
test('6. 메인 - 메뉴', async ({ page }) => {
    const baseUrl = 'http://localhost:9007/#';

    // 사이드 바 메뉴 (img의 alt값 -> name)
    const menuItems = [
        { name: 'Carbon Intensity Indicators', path: '/cii-monitoring' },
        { name: 'Leg Performance', path: '/leg-performance' },
        { name: 'China ECDS', path: '/china-ecds' },
        { name: 'Noon Report', path: '/noon-report' },
    ];

    // 공통 동작 함수
    const testMenuNavigation = async (menuName, expectedPath) => {
        await page.getByRole('img', { name: menuName }).click();
        await expect(page).toHaveURL(`${baseUrl}${expectedPath}`);
        await page.waitForTimeout(1000);

        await page.getByRole('img', { name: 'HOME' }).click();
        await expect(page).toHaveURL(`${baseUrl}/home`);
        await page.waitForTimeout(1000);
    };

    // 초기 페이지로 이동
    await page.goto(`${baseUrl}/home`);

    // 각 메뉴 테스트 반복 실행
    for (const item of menuItems) {
        await testMenuNavigation(item.name, item.path);
    }
});

// 8. 메인 - 기준시 변경 (LTC <-> UTC 변경시, Map/항차리스트/모든 페이지에 정상 반영된다.)

// 시간 파싱 유틸 (초 있음/없음, 오프셋 있음/없음 모두 처리)
function parseTimeWithOffset(rawText) {
    const match = rawText.match(/(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2})(?::(\d{2}))?(?: \(([-+]\d+)\))?/);
    if (!match) throw new Error(`시간 형식 불일치: ${rawText}`);

    const hour = parseInt(match[2], 10);
    const minute = parseInt(match[3], 10);
    const second = match[4] ? parseInt(match[4], 10) : 0;
    const offset = match[5] ? parseInt(match[5], 10) : 0;

    return { hour, minute, second, offset, raw: rawText };
}

// 클릭 -> 시간 추출 전체 처리 함수
async function getTimeFromSource(page, source, waitMs = 1000) {
    await page.locator(source.clickSelector, { hasText: source.label }).click();
    await page.waitForTimeout(waitMs);
    const rawText = await source.valueLocator(page).innerText();
    return parseTimeWithOffset(rawText);
}

// 공통 소스 생성 함수
function createTimeSource(zone, valueLocator) {
    return {
        label: zone,
        clickSelector: '.ant-segmented-item-label',
        valueLocator,
    };
}

test('8. 메인 - 기준시 변경', async ({ page }) => {
    // 1. MainPage - .popup-time-info[0], .popup-time-info[1], .normal-table-body-tr

    // popup 0
    const utcPopup0 = createTimeSource('UTC', (p) => p.locator('.popup-time-info').nth(0));
    const ltcPopup0 = createTimeSource('LTC', (p) => p.locator('.popup-time-info').nth(0));

    const utcTime0 = await getTimeFromSource(page, utcPopup0);
    const ltcTime0 = await getTimeFromSource(page, ltcPopup0);
    const expectedLtcHour0 = (utcTime0.hour + ltcTime0.offset + 24) % 24;
    expect(ltcTime0.hour).toBe(expectedLtcHour0);

    // popup 1
    const utcPopup1 = createTimeSource('UTC', (p) => p.locator('.popup-time-info').nth(1));
    const ltcPopup1 = createTimeSource('LTC', (p) => p.locator('.popup-time-info').nth(1));

    const utcTime1 = await getTimeFromSource(page, utcPopup1);
    const ltcTime1 = await getTimeFromSource(page, ltcPopup1);
    const expectedLtcHour1 = (utcTime1.hour + ltcTime1.offset + 24) % 24;
    expect(ltcTime1.hour).toBe(expectedLtcHour1);

    // table - UTC
    const utcTableSource = createTimeSource('UTC', (p) =>
        p.locator('.normal-table-body-tr').first().locator('td').nth(3).locator('.table-data-item')
    );
    const utcTable = await getTimeFromSource(page, utcTableSource);
    const utcStandardHour = (utcTable.hour - utcTable.offset + 24) % 24;

    // table - LTC
    const ltcTableSource = createTimeSource('LTC', (p) =>
        p.locator('.normal-table-body-tr').first().locator('td').nth(3).locator('.table-data-item')
    );
    const ltcTable = await getTimeFromSource(page, ltcTableSource);
    const ltcStandardHour = (ltcTable.hour - ltcTable.offset + 24) % 24;

    expect(ltcStandardHour).toBe(utcStandardHour);
    expect(ltcTable.minute).toBe(utcTable.minute);

});

// 10. 메인 - Setting (1) Basic data

test.describe.serial('10. 메인 - Setting (1)', () => {

// 입력 필드 값들을 배열로 추출
async function getInputValues(locator) {
    const values = [];
    const count = await locator.count();
    for (let i = 0; i < count; i++) {
        values.push(await locator.nth(i).inputValue());
    }
    return values;
}

// 설정 버튼 클릭 함수
async function openSettings(page) {
    await page.locator('div', { hasText: /^LTCUTCCONNECTED$/ }).locator('img').nth(1).click();
    await page.waitForTimeout(1000); // 안정성 확보
}

    test('10. 메인 - Setting (1) Basic data - 1', async ({ page }) => {
        const inputSelector = '.css-h6glbe > .Left-area > .basic-area input';

        // 1. 설정 열기
        await openSettings(page);

        // 2. 현재 입력값들 저장
        const inputFields = page.locator(inputSelector);
        const originalValues = await getInputValues(inputFields);
        const count = originalValues.length;
        console.log(`총 input 필드 수: ${count}`);
        console.log('기존 입력된 값 목록:', originalValues);

        // 3. 변경할 데이터 정의 (인덱스 기반)
        const updatedValues = [...originalValues];
        const newShipName = 'SOLAR GLORYdd';
        const changeMap = new Map([[0, newShipName]]); // 향후 다수 수정 가능

        // 4. 필드 수정
        for (const [index, newValue] of changeMap.entries()) {
            await inputFields.nth(index).fill(newValue);
            updatedValues[index] = newValue;
        }

        await page.waitForTimeout(1000); // 대기 여유

        // 5. 저장 후 새로고침
        await page.locator('.modal-save').click();
        await page.reload();

        // 6. 설정 다시 열기
        await openSettings(page);

        // 7. 변경 후 값 비교
        const inputFieldsAfter = page.locator(inputSelector);
        const newValues = await getInputValues(inputFieldsAfter);

        for (let i = 0; i < count; i++) {
            console.log(`필드 ${i} | 기대값: "${updatedValues[i]}", 실제값: "${newValues[i]}"`);
            expect(newValues[i]).toBe(updatedValues[i]);
        }
    });

    // 10-2. (입력한 내용 변경 후 저장하지 않고 탭 이동 시도시 문구 표시된다.)
    test('10. 메인 - Setting (1) Basic data - 2', async ({ page }) => {

        // 1. 설정 버튼 클릭
        await openSettings(page);

        // 2. .basic-area 안의 모든 input 필드 선택
        const inputFields = page.locator('.css-h6glbe > .Left-area > .basic-area input');
        const count = await inputFields.count();

        // 3. 입력값 저장할 배열 생성
        console.log(`총 input 필드 수: ${count}`);
        const originalValues = [];

        // 4. 배열에 모든 입력값 삽입
        for (let i = 0; i < count; i++) {
            const value = await inputFields.nth(i).inputValue();
            originalValues.push(value);
        }

        console.log('기존 입력된 값 목록:', originalValues);

        // 5. 설정 내용 변경 --> 초기에 일단 Ship Name 변경
        await page.locator('.input-list-area > .css-tz27hi > .setting-input-area').first().click();
        await page.locator('.input-list-area > .css-tz27hi > .setting-input-area').first().fill('qwer');

        await page.waitForTimeout(3000); // 3초 대기 (대기하니까 됨)

        // 6. 입력 배열에 일단 index[0]인 shipname 변경 ! >> 초기 하드코딩
        const updatedValues = [...originalValues];
        updatedValues[0] = 'SOLAR GLORYdsd';

        // 7. 탭바 클릭
        await page.getByText('Program update').click();

        // 검증!!
        // 정상적이라면 탭이 넘어가지않고 .btn-wrap > .footer-validation 생성
        // /img/images/main/setting/not_c_icn.png 이미지랑
        // Please save the contents before leaving the tab. 해당 텍스트를 가지고있는 div가 생성되어야함

        // 8. 검증: 경고 문구와 아이콘이 나타나는지 확인
        const warningText = page.locator('.btn-wrap .footer-validation > div');
        await expect(warningText).toHaveText('Please save the contents before leaving the tab.');

        // 아이콘 대신 텍스트가 포함된 전체 영역이 보이는지 확인
        await expect(warningText).toBeVisible();
        await page.waitForTimeout(1000); // 1초 대기
    });
});

// 11. 메인 - Setting (2) Program update
test(' 11. 메인 - Setting (2) Program update', async ({page}) => {

    // 1. 설정 버튼 클릭
    await page.locator('img[src="/img/images/header/icon-header-setting.svg"]').click();

    // 2. 탭바 클릭
    await page.getByText('Program update').click();

    await page.waitForTimeout(2000);

    // 3. 토글 요소 지정
    const programSwitch = page.locator('.toggle-area').nth(0).locator('button.ant-switch');
    const weatherSwitch = page.locator('.toggle-area').nth(1).locator('button.ant-switch');

    // 4. 토글 요소 상태 저장
    const programChecked = (await programSwitch.getAttribute('aria-checked')) === 'true';
    const weatherChecked = (await weatherSwitch.getAttribute('aria-checked')) === 'true';

    console.log('초기 상태:', { programChecked, weatherChecked });

    // 5. 상태 토글
    await programSwitch.click();
    await weatherSwitch.click();

    const expectedProgramState = !programChecked;
    const expectedWeatherState = !weatherChecked;

    await page.waitForTimeout(1000); // 1초 대기

    // 6. 저장
    await page.locator('.modal-save').click();

    // 7. 페이지 새로고침
    await page.reload();

    await page.waitForTimeout(2000);

    // 8. 다시 설정 → 프로그램 업데이트 탭 진입
    await page.locator('img[src="/img/images/header/icon-header-setting.svg"]').click();
    await page.getByText('Program update').click();

    // 9. 새 상태 확인
    const newProgramChecked = (await programSwitch.getAttribute('aria-checked')) === 'true';
    const newWeatherChecked = (await weatherSwitch.getAttribute('aria-checked')) === 'true';

    console.log('변경 후 상태:', {
        programUpdate: newProgramChecked,
        weatherUpdate: newWeatherChecked,
    });

    // 10. 검증
    expect(newProgramChecked).toBe(expectedProgramState);
    expect(newWeatherChecked).toBe(expectedWeatherState);

    await page.waitForTimeout(1000); // 1초 대기
});

// 13. 메인 - Map (Map line)
test.describe.serial('13. 메인 - Map (Map line)', () => {

    // 13-1. 모든 Map line이 정상적으로 on/off 된다.
    // Map은 canvas 요소로 되어있으므로 명확하게 토글되었을때 어떤 요소가 바뀌는지 파악이 어려움
    // -> 토글 전 이미지 요소랑 토글 후 이미지를 캡처하여 png로 변환후 pixelmatch 라이브러리를 통한 이미지 변경 여부 확인

    // 이미지 저장 함수
    function saveImage(buffer, label, type) {
        const dir = path.join(__dirname, 'screenshots');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        const filePath = path.join(dir, `${label}_${type}.png`);
        fs.writeFileSync(filePath, buffer);
    }

    test('13. 메인 - Map (Map line) - canvas 이미지 변경 검증', async ({ page }) => {

        // 1. 동정보고 섹션 닫기 <- 버튼 클릭
        await page.getByRole('button', { name: 'arrow' }).click();

        // 2. mapLine 섹션 오픈 클릭
        await page.getByRole('img', { name: 'mapLine' }).click();
        await page.waitForTimeout(1000);

        // 3. 각 토글 라벨을 배열로 삽입
        const toggleLabels = ['GMDSS', 'loadLine', 'timeZone', 'VRA', 'warZone', 'myIdLine'];
        const canvas = page.locator('#map');

        await page.waitForTimeout(500);

        for (const label of toggleLabels) {
            const toggle = page.locator(`label[for="${label}"]`);

            // 클릭 전 이미지 저장
            const beforeBuffer = await canvas.screenshot();
            saveImage(beforeBuffer, label, 'before');

            // 토글 클릭
            await toggle.click();
            await page.waitForSelector('#map', { state: 'visible' });
            await page.waitForTimeout(1000);

            // 클릭 후 이미지 저장
            const afterBuffer = await canvas.screenshot();
            saveImage(afterBuffer, label, 'after');

            // PNG 디코딩
            const beforePNG = PNG.sync.read(beforeBuffer);
            const afterPNG = PNG.sync.read(afterBuffer);

            // 이미지 크기 일치 확인
            expect(beforePNG.width).toBe(afterPNG.width);
            expect(beforePNG.height).toBe(afterPNG.height);

            // 픽셀 비교
            const { width, height } = beforePNG;
            const diff = new PNG({ width, height });
            const diffPixels = pixelmatch(
                beforePNG.data,
                afterPNG.data,
                diff.data,
                width,
                height,
                { threshold: 0.1 }
            );

            console.log(`[${label}] 픽셀 차이: ${diffPixels}`);
            expect(diffPixels).toBeGreaterThan(3500); // 명확한 기준은 추후 선정

            // 원상복구
            await toggle.click();
            await page.waitForTimeout(1000);
        }
    });
})

// 17. 메인 - 리포트 삭제
// 17-1. 리포트 삭제 아이콘이 정상 표시된다. (호버시 가장 위에있는 리포트)
test('17. 메인 - 리포트 삭제 - 1', async ({ page }) => {

    // 1. 아이콘이 포함된 부모 요소에 hover
    await page.locator('.table-event-icon-main-wrapper').first().hover();

    // 2. 해당 이미지가 나타나는지 확인
    const deleteIcon = page.locator('.icon-main-td.icon-main-td__del img[src="/img/images/main/eventlist/icon-main-delete.svg"]');
    await expect(deleteIcon).toBeVisible();
});

// 19. 동정보고 작성 - 전반적인 리포트 작성
// a. 자동 계산 필드가 정확하게 계산된다
// b. Map 상 항로가 이전 리포트와 현재 리포트를 연결한다.
// c. Tab으로 이동시 자동 계산 필드 입력이 불가하다.
// d. 컴퓨터 시간대를 변경하여 리포트를 전송한다.
test('19. 동정보고 작성 - 전반적인 리포트 작성', async ({page}) => {

    // LTC (2025-02-05T12:00:00.000) 형식 -> (2025-02-05 12:00:00) 변환
    function formatDateToLocal(value) {
        const date = new Date(value);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
    }

    // 동적으로 텍스트를 받아 입력 필드 있는 섹션 요소 리턴 함수
    // -> 입력 필드가 있는 요소는 text를 가지는 요소의 부모 요소의 형제 요소
    async function getLocatorByText(page, text) {
        const categoryTitle = page.locator('.category-title', { hasText: text });
        const categoryNameArea = categoryTitle.locator('..');

        return categoryNameArea.locator('xpath=following-sibling::div[1]');
    }

    // 입력 필드 값 삽입 함수
    // skipKeys : 입력이 필요 없는 필드를 쉽게 건너뛰기
    // formatters : 입력 전에 포맷을 바꿔야 할 경우 유용 (LTC)
    // postActions : 특정 필드 입력 후 추가 조작이 필요한 경우
    async function fillSectionInputs(page, sectionName, sectionData, options = {}) {
        const section = await getLocatorByText(page, sectionName);
        const skipKeys = options.skipKeys || [];
        const formatters = options.formatters || {};
        const postActions = options.postActions || {};
        const delayAfterFill = options.delayAfterFill !== false; // 기본값 true

        for (const [key, value] of Object.entries(sectionData)) {
            if (skipKeys.includes(key)) {
                console.log(`스킵된 필드: ${key}`);
                continue;
            }

            await page.waitForTimeout(300);

            let inputLocator = section.locator(`input[data-tagkey="${key}"]`);
            if (await inputLocator.count() === 0) {
                inputLocator = section.locator(`[data-tagkey="${key}"] input`);
            }

            // 각각 입력필드마다 속성에 따른 조건
            if (await inputLocator.count() > 0) {
                const input = inputLocator.first();
                const hasReadOnly = await input.evaluate(el => el.hasAttribute('readonly'));
                const isEnabled = await input.isEnabled();
                const isVisible = await input.isVisible();

                if (isEnabled && !hasReadOnly && isVisible) {
                    await input.scrollIntoViewIfNeeded();

                    // value 형식 변경해야할 때
                    let inputValue = String(value);
                    if (typeof formatters[key] === 'function') {
                        inputValue = formatters[key](value);
                    }

                    // 입력 필드 삽입
                    await input.fill(inputValue);

                    // 입력값 삽입 후 추가적인 동작이 필요할 경우
                    if (typeof postActions[key] === 'function') {
                        await postActions[key](page, input);
                    }

                    // 입력값 텀을 주어 입력이 제대로 되게 예방
                    if (delayAfterFill) {
                        await page.waitForTimeout(200);
                    }
                } else {
                    console.log(`입력 불가 (disabled 또는 readonly 상태): ${key}`);
                }
            } else {
                console.warn(`입력 필드 찾지 못함: ${key}`);
            }
        }
    }

    // JSON 파일
    const files = ['20250204095525-NOON_AT_SEA-0.json', '20250205102358-NOON_AT_SEA-0.json'];

    // 파일 배열의 개수만큼 반복
    for(const file of files){

        // 1. JSON 파일 읽기, JSON 파싱
        const jsonPath = path.join(__dirname, `../files/JSON/${file}`);
        const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

        // 2. ADD EVENT 버튼 클릭
        await page.getByRole('button', { name: 'ADD EVENT' }).click();

        // 3. Next Event 클릭 (추후 develop 초기 Noon 고정)
        await page.getByRole('paragraph').filter({ hasText: 'Noon at sea' }).nth(1).click();

        await page.waitForTimeout(1000);

        // 요소가 너무 다르기 때문에 각 섹션별로 입력 필드 채우는 반복문 분리
        // -> 어떤것은 input data-tagkey가 키값이고, input 태그 감싸는 div의 data-key인것도 있음
        // -> 또한 input 태그가 일반 input 상태, disable 상태, readonly 상태 별로 너무 다양해서 하나씩 다 대응 코드 짜야함

        // 4. Main 입력값 삽입
        await fillSectionInputs(page, 'MAIN', jsonData["MAIN"], {
            skipKeys: [],

            formatters: {
                DATE_EVENT_LTC: formatDateToLocal,
            },
            postActions: {
                DATE_EVENT_LTC: async (page) => {
                    await page.locator('.right-header').click();
                    const targetInput = page.getByRole('textbox', { name: 'YYYY-MM-DD HH:mm' }).nth(1);
                    await expect(targetInput).toHaveValue(/.+/, { timeout: 10000 });
                },

                ZONE_TIME: async (page) => {
                    const zoneKey = jsonData.MAIN.ZONE_TIME;
                    await page.locator('[data-tagkey="ZONE_TIME"]').click();
                    await page.waitForSelector(`div[data-key="${zoneKey}"]`);
                    await page.locator(`div[data-key="${zoneKey}"]`).click();
                }
            }
        });


        // 5. NAVIGATION 입력값 삽입
        await fillSectionInputs(page, 'NAVIGATION', jsonData["NAVIGATION"], { delayAfterFill: true });

        // NEXT_PORT_INFO 건너뛰기 (요청사항) ==> JSON은 KRTJI 정답지는 DANGJIN, SOUTH KOREA 임
        // -> 드롭다운이라 입력 자체가 되지않음
        // NEXT_PORT_CODE 건너뛰기 ==> 해당 INPUT은 숨겨져있음 -> 입력 불가

        // 6. VOYAGE PLAN 입력값 삽입
        await fillSectionInputs(page, 'VOYAGE PLAN', jsonData["VOYAGE_PLAN"], {
            skipKeys: ['NEXT_PORT_INFO', 'NEXT_PORT_CODE'],
        });

        // 7. LOADING CONDITION 입력값 삽입
        await fillSectionInputs(page, 'LOADING CONDITION', jsonData["LOADING_CONDITION"]);

        // 8. OIL CONSUMPTION 입력값 삽입
        await fillSectionInputs(page, 'OIL CONSUMPTION', jsonData["OIL_CONSUMPTION"]);

        // 9. WEATHER 입력값 삽입
        await fillSectionInputs(page, 'WEATHER', jsonData["WEATHER"], { delayAfterFill: true });

        // 10. 약간의 텀
        await page.waitForTimeout(1000);

        // 11. save 버튼 클릭
        await page.locator('div').filter({ hasText: /^SAVE$/ }).first().click();

        // 12. 약간의 텀
        await page.waitForTimeout(2000);

        // 13. 만약 경고창이 뜰 경우 CLOSE 버튼 클릭
        const alert = page.getByText('WARNING');
        if (await alert.isVisible()) {
            await page.getByText('CLOSE').click();
        }

        // 14. MAIN 화면 반영을 위한 텀
        await page.waitForTimeout(2000);
    }
});

// 20. 동정보고 작성 - Passage plan
test('20. 동정보고 작성 - Passage plan', async ({ page }) => {

    // 1. 동정보고 항목 클릭 (테이블 첫 번째 행)
    await page.locator('.normal-table-body-tr').first().click();
    await page.waitForTimeout(2000);

    // 2. Passage Plan 버튼 클릭
    await page.locator('div').filter({ hasText: /^PASSAGE PLAN$/ }).nth(1).click();

    // 3. Attach File 버튼 클릭 (필요 시)
    // await page.locator('div').filter({ hasText: /^Attach File$/ }).first().click();

    // 4. 파일 경로
    const folderPath = path.join(__dirname, '../files/240311 PASSAGE PLAN');

    // 정답지 경로
    const answerFilePath = path.join(__dirname, '../files/validation_map.txt');

    // 정답지 파일 읽기 (형식 : {파일명},{성공여부 true/false})
    const validationMap = fs.readFileSync(answerFilePath, 'utf8').split('\n')
        .filter(line => line.trim() !== '') // 빈 라인 있다면 다음 라인으로 넘어가기
        .map(line => {
            const [fileName, result] = line.split(',');
            if (!fileName || !result) {
                console.warn(`정상적인 라인이 아닙니다: ${line}`); // 잘못된 형식
                return null; // 잘못된 라인은 무시
            }
            return { fileName: fileName.trim(), expectedResult: result.trim() === 'true' };
        })
        .filter(entry => entry !== null); // 잘못된 항목 필터링

    // 필터를 통해 파일만 필터링
    const files = fs.readdirSync(folderPath).filter(file => fs.statSync(path.join(folderPath, file)).isFile());

    if (files.length === 0) {
        throw new Error('폴더에 업로드할 파일이 없습니다.');
    }

    console.log('필터링 된 파일 : ' + files);

    // 5. 모든 파일을 업로드
    for (const file of files) {
        const filePath = path.join(folderPath, file);

        console.log('업로드한 파일 경로 : ' + filePath);

        // 6. input 요소 찾고 파일 업로드
        const fileInput = page.locator('input[type="file"][name="image"]');
        await fileInput.setInputFiles(filePath);

        console.log('업로드 한 파일 : ' + file);

        await page.waitForTimeout(1000);

        // 7. 업로드 오류 확인 - 오류 메시지 영역이 보이면 실패
        const errorArea = page.locator('.modal-error-area');
        const isUploadSuccessful = !(await errorArea.isVisible({ timeout: 2000 })); // 3초 안에 나타나면 실패

        // 8. 업로드한 파일이 정답지에 있는지 확인
        const validationResult = validationMap.find(entry => entry.fileName === file);
        if (validationResult) {
            console.log(`업로드한 파일 ${file}의 예상 결과: ${validationResult.expectedResult ? '성공' : '실패'}`);
        } else {
            console.log('정답지에 해당 파일명이 없습니다.');
        }

        // 검증: 성공 여부 확인
        const isValid = validationResult ? validationResult.expectedResult === isUploadSuccessful : false;

        // 결과 출력
        if (isValid) {
            console.log(`테스트 성공: 파일 ${file}의 업로드 성공 여부가 예상과 일치합니다.`);
        } else {
            console.log(`테스트 실패: 파일 ${file}의 업로드 성공 여부가 예상과 일치하지 않습니다.`);
        }
    }
});

// 21. 동정보고 작성 - Correction 기능
test.describe.serial('21. 동정보고 작성 - Correction 기능', () => {

    // 21-1. 정책에 맞는 Correction 암호 입력시 Correction 값을 입력할 수 있다.
    test('21. 동정보고 작성 - Correction 기능 - 1', async ({ page }) => {

        // 1. 동정보고 항목 클릭 (테이블 첫 번째 행)
        await page.locator('.normal-table-body-tr').first().click();
        await page.waitForTimeout(2000);

        // 2. Correction 아이콘 클릭
        await page.locator('div')
            .filter({ hasText: /^MAIN ENGINEGENERATORAUX\. BOILEROTHERTOTALCORRECTIONROB$/ })
            .locator('img')
            .click();
        await page.waitForTimeout(2000);

        // 3. 잠금 해제 모달이 뜨는지 확인
        const lockPage = page.locator('.ant-modal-body');
        await expect(lockPage).toBeVisible();

        // 4. URL에서 타입 문자열 추출 및 특수문자 제거
        const url = page.url(); // http://localhost:9007/#/template/NOON_AT_SEA/20250203093935-NOON_AT_SEA-0
        const match = url.match(/\/template\/([^/]+)/); // 'NOON_AT_SEA'
        const typeString = match ? match[1].replace(/[^a-zA-Z0-9]/g, '') : 'UNKNOWN'; // 'NOONATSEA'

        // 5. .css-1jomkuu 텍스트에서 버전 숫자 추출 (예: 'v.1.7.1' -> '171')
        // --> .css-1jomkuu 보다 정확한 선택자 추출 확인 ??클래스 이름이 변경하는가 => (선택할수 있는 요소가 해당 클래스값 뿐)
        const versionText = await page.locator('.css-1jomkuu').innerText(); // 'v.1.7.1'
        const versionNumbers = versionText.match(/\d+/g)?.join('') || '000'; // '171'

        // 6. 최종 입력 값 생성: LAB021 + version + type
        const finalInput = `LAB021${versionNumbers}${typeString}`;
        console.log('최종 입력 값:', finalInput);

        // 7. 텍스트 박스에 입력
        const textbox = page.getByRole('dialog').getByRole('textbox');
        await textbox.fill(finalInput);

        // 8. OK 버튼 클릭
        await page.getByText('OK', { exact: true }).click();

        // 9. 락 해제 아이콘이 나타나는지 검증
        const unlockIcon = page.locator('img[src="/img/images/template/icon_unlock.svg"]');
        await expect(unlockIcon).toBeVisible();

        // 21-2. 입력한 Correction 값에 따라 ROB가 계산된다.

        // 1. 기존 ROB값 저장 (숫자만 추출)
        const robText = await page.locator('div:nth-child(8) > div > div > .table-pivoting-body > .table').first().inputValue();
        const robNumber = parseFloat(robText.replace(/[^\d.-]/g, '')) || 0;

        // 2. CORRECTION 값 입력 (임의의 값 10)
        const correctionValue = 10;
        await page.locator('div:nth-child(7) > div > div > .table-pivoting-body > .table').first().click();
        await page.locator('.ant-popover-open > .table-pivoting-body > .table').fill(String(correctionValue));

        // 3. ROB 값 재확인 (입력 후 변경된 값)
        await page.waitForTimeout(2000); // UI 반영 시간 대기
        const changedRobText = await page.locator('div:nth-child(8) > div > div > .table-pivoting-body > .table').first().inputValue();
        const changedRobNumber = parseFloat(changedRobText.replace(/[^\d.-]/g, '')) || 0;

        console.log('바뀐 RobText : ', changedRobText );
        console.log('바뀐 RobText NUM 변환값 : ', changedRobNumber );

        // 4. 기대값 계산 및 검증
        const expectedRob = robNumber + correctionValue;
        console.log('더한 넘버 num1', expectedRob );

        expect(changedRobNumber).toBeCloseTo(expectedRob, 2); // 소수점 두자리까지 비교 >> 변경가능

        console.log(`기존 ROB: ${robNumber}, 입력 Correction: ${correctionValue}, 변경된 ROB: ${changedRobNumber}`);

        //-------------------------------------------------------------------------------------------------//
        // 21-3. Eng. Log Book 파일을 필수로 첨부해야 한다.
        // CORRECTION값 변경 후 파일 첨부 없이 클릭 send 버튼 클릭
        await page.getByText('SEND').click();

        // 바뀌어야하는것
        // 1. send버튼 비활성화
        // 2. .fileTag-img-text-area > .error-mess 요소 생성 > div.innertext = Log book file missing. Please attach log book.
        // 3. 우측 .alert 클래스 생성

        // SEND 버튼이 비활성화 (css 색깔이 바뀌는듯함 = 선택자요소 파악 불가능 >> 보류)
        // const sendButton = page.getByText('SEND');
        // await expect(sendButton).toBeDisabled();

        // 에러 메시지 확인
        const errorMessage = page.locator('.fileTag-img-text-area .error-mess');
        await expect(errorMessage).toBeVisible();
        await expect(errorMessage).toHaveText('Log book file missing. Please attach log book.');

        // 우측 경고(alert) 영역이 표시되어야 함
        const alertBox = page.locator('.message-text');
        await expect(alertBox).toBeVisible();

        console.log('Log Book 파일 미첨부 시 UI 검증 완료');

        // 파일 첨부 후 send 클릭
        await page.getByText('File Attach', { exact: true }).click();

        // // 동적 변동 가능성 대비 변수 선언
        // const logbook = 'node.png';
        //
        // await page.locator('.css-16iekxk').setInputFiles(logbook);

    });
});

