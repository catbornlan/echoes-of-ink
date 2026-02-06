const { openBrowser, goto, click, write, press, currentURL, text, textBox, dropDown, near, button, $ } = require('taiko');
const assert = require('assert');

(async () => {
    try {
        console.log('Starting AI Evidence Verification Test...');
        await openBrowser();
        await goto('http://localhost:8000');

        // Start Game
        await click('开始游戏');
        await click('小马');
        await click('进入游戏');

        // Wait for intro to finish (click through)
        await click('跳过剧情', { waitForEvents: ['DOMContentLoaded'] }); // Assuming a skip button exists or logic to skip
        // Actually, trigger Next Phase manually via console if easier, or play through.
        // Let's use the standard "Next Phase" button.
        await click('进入下一环节'); // Into Search 1

        console.log('Entered Search Phase 1');

        // Wait for AI search to trigger (it happens on phase start)
        // Wait about 10-15 seconds for AI to potentially find something
        console.log('Waiting for AI Actions...');
        await new Promise(r => setTimeout(r, 15000));

        // Initial check: Search logs in chat
        // Look for "System" messages about evidence
        const pageText = await text('有人搜到了证据').exists();
        console.log(`AI Search Message found: ${pageText}`);

        if (!pageText) {
            console.warn("AI didn't find or reveal evidence in time. This might be random. Triggering AI search again via console.");
            await evaluate(() => window.performAISearch());
            await new Promise(r => setTimeout(r, 5000));
        }

        // Check if anything is in Public Evidence
        // We can check the DOM for items in #public-evidence-list
        const publicList = await $('#public-evidence-list').text();
        console.log(`Public Evidence List Content: ${publicList}`);

        const hasPublicEvidence = publicList.includes('暂无公开证据') === false;
        console.log(`Has Public Evidence: ${hasPublicEvidence}`);

        // If checking discussion reveal, we need to go to discussion phase
        await click('进入下一环节');
        console.log('Entered Discussion Phase 1');

        // In discussion, AI generates script. We wait for a script generation.
        await new Promise(r => setTimeout(r, 10000));

        // Check logs for [REVEAL] parsing confirmation (we can't easily see console logs from node, but we can see effects)
        // We check if new evidence appears in public list
        const publicListRound2 = await $('#public-evidence-list').text();
        console.log(`Public Evidence List Round 2: ${publicListRound2}`);

    } catch (error) {
        console.error(error);
    } finally {
        await closeBrowser();
    }
})();
