const { Actor } = require('apify');
const fs = require('fs');

Actor.main(async () => {
    const input = await Actor.getInput();
    const { urls } = input;
    const cookies = JSON.parse(fs.readFileSync('src/cookies.json'));

    const browser = await Actor.launchPuppeteer({
        useChrome: true,
        stealth: true,
        headless: true,
    });

    const page = await browser.newPage();
    await page.setCookie(...cookies);

    for (const url of urls) {
        await page.goto(url, { waitUntil: 'networkidle2' });
        await autoScroll(page);

        const comments = await page.evaluate(() => {
            const items = [];
            const nodes = document.querySelectorAll('[data-e2e="comment-item"]');
            nodes.forEach(node => {
                const username = node.querySelector('[data-e2e="comment-user-name"]')?.innerText || '';
                const text = node.querySelector('[data-e2e="comment-level-1"]')?.innerText || '';
                const likes = node.querySelector('[data-e2e="comment-like-count"]')?.innerText || '0';
                items.push({ username, text, likes });
            });
            return items;
        });

        await Actor.pushData({ video_url: url, total_comments: comments.length, comments });
        await Actor.sleep(Math.random() * 4000 + 3000);
    }

    await browser.close();
});

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 300;
            const timer = setInterval(() => {
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight > document.body.scrollHeight * 2) {
                    clearInterval(timer);
                    resolve();
                }
            }, 1000);
        });
    });
}