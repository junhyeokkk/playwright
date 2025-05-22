const sharp = require('sharp');
const { ssim } = require('ssim.js');

async function getSSIMScore(beforeBuffer, afterBuffer) {
    try {
        const before = await sharp(beforeBuffer)
            .ensureAlpha()
            .resize(800)
            .raw()
            .toBuffer({ resolveWithObject: true });

        const after = await sharp(afterBuffer)
            .ensureAlpha()
            .resize(800)
            .raw()
            .toBuffer({ resolveWithObject: true });

        const result = ssim(
            {
                data: before.data,
                width: before.info.width,
                height: before.info.height,
            },
            {
                data: after.data,
                width: after.info.width,
                height: after.info.height,
            }
        );

        return result.mssim;
    } catch (e) {
        console.error('Error in getSSIMScore:', e);
        return undefined;
    }
}

module.exports = { getSSIMScore };
