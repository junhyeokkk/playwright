const base = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// video, har 저장 폴더
const harDir = path.resolve(__dirname, 'har');
const videoDir = path.resolve(__dirname, 'videos');

// 폴더가 없으면 생성
if (!fs.existsSync(harDir)) fs.mkdirSync(harDir, { recursive: true });
if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });

const test = base.test.extend({
    context: async ({ browser }, use, testInfo) => {
        const harPath = path.join(harDir, `test-${Date.now()}.har`);

        const context = await browser.newContext({
            recordHar: {
                path: harPath,
                content: 'embed', // 응답 내용 포함
            },
            recordVideo: {
                dir: videoDir, // 동영상 저장 경로
                size: { width: 1280, height: 720 }, // 해상도 설정
            },
        });

        await use(context);
        await context.close(); // HAR 저장, Video 저장 둘 다 여기서 처리됨
    },

    page: async ({ context }, use) => {
        const page = await context.newPage();
        await use(page);
    },
});

const { expect } = base;

module.exports = { test, expect };
