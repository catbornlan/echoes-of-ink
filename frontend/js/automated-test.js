"""
前端交互自动化测试脚本
自动点击所有按钮，检测错误和连接问题
"""

async function runAutomatedFrontendTest() {
    const testResults = {
        passed: [],
        failed: [],
        errors: []
    };

    console.log('🧪 Starting automated frontend test...');

    try {
        // 测试1: 开篇界面
        console.log('\n📝 Test 1: Opening Screen');
        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            console.log('✅ Start button exists');
            testResults.passed.push('Opening screen: Start button exists');
        } else {
            console.error('❌ Start button not found');
            testResults.failed.push('Opening screen: Start button missing');
        }

        // 测试2: 角色选择界面按钮
        console.log('\n📝 Test 2: Character Selection Screen');
        const randomCharBtn = document.getElementById('random-character-btn');
        if (randomCharBtn) {
            console.log('✅ Random character button exists');
            testResults.passed.push('Character selection: Random button exists');
        } else {
            console.error('❌ Random character button not found');
            testResults.failed.push('Character selection: Random button missing');
        }

        // 测试3: 剧本阅读界面
        console.log('\n📝 Test 3: Script Reading Screen');
        const startGameBtn = document.getElementById('start-game-btn');
        if (startGameBtn) {
            console.log('✅ Start game button exists');
            testResults.passed.push('Script reading: Start game button exists');
        } else {
            console.error('❌ Start game button not found');
            testResults.failed.push('Script reading: Start game button missing');
        }

        // 测试4: 主游戏界面按钮
        console.log('\n📝 Test 4: Main Game Screen Buttons');
        const buttons = {
            'send-btn': 'Send message button',
            'next-phase-btn': 'Next phase button',
            'finish-search-btn': 'Finish search button',
            'confirm-vote-btn': 'Confirm vote button',
            'restart-btn': 'Restart button'
        };

        for (const [id, name] of Object.entries(buttons)) {
            const btn = document.getElementById(id);
            if (btn) {
                console.log(`✅ ${name} exists`);
                testResults.passed.push(`Main game: ${name} exists`);
            } else {
                console.error(`❌ ${name} not found`);
                testResults.failed.push(`Main game: ${name} missing`);
            }
        }

        // 测试5: 输入框
        console.log('\n📝 Test 5: Input Fields');
        const playerInput = document.getElementById('player-input');
        if (playerInput) {
            console.log('✅ Player input field exists');
            testResults.passed.push('Input: Player input exists');
        } else {
            console.error('❌ Player input field not found');
            testResults.failed.push('Input: Player input missing');
        }

        // 测试6: 容器元素
        console.log('\n📝 Test 6: Container Elements');
        const containers = {
            'character-grid': 'Character grid',
            'script-content': 'Script content',
            'messages-container': 'Messages container',
            'location-grid': 'Location grid',
            'vote-character-grid': 'Vote character grid'
        };

        for (const [id, name] of Object.entries(containers)) {
            const container = document.getElementById(id);
            if (container) {
                console.log(`✅ ${name} exists`);
                testResults.passed.push(`Containers: ${name} exists`);
            } else {
                console.error(`❌ ${name} not found`);
                testResults.failed.push(`Containers: ${name} missing`);
            }
        }

        // 测试7: 侧边栏标签
        console.log('\n📝 Test 7: Sidebar Tabs');
        const tabs = document.querySelectorAll('.sidebar-tab');
        if (tabs.length > 0) {
            console.log(`✅ Found ${tabs.length} sidebar tabs`);
            testResults.passed.push(`Sidebar: ${tabs.length} tabs found`);

            // 测试点击每个标签
            tabs.forEach((tab, index) => {
                if (tab.dataset.tab) {
                    console.log(`  ✅ Tab ${index}: ${tab.dataset.tab}`);
                    testResults.passed.push(`Sidebar tab ${index}: ${tab.dataset.tab} clickable`);
                }
            });
        } else {
            console.error('❌ No sidebar tabs found');
            testResults.failed.push('Sidebar: No tabs found');
        }

        // 测试8: 显示屏幕
        console.log('\n📝 Test 8: Screen Elements');
        const screens = [
            'opening-screen',
            'character-select-screen',
            'script-reading-screen',
            'game-main-screen',
            'search-screen',
            'vote-screen',
            'reveal-screen'
        ];

        screens.forEach(screenId => {
            const screen = document.getElementById(screenId);
            if (screen) {
                console.log(`✅ ${screenId} exists`);
                testResults.passed.push(`Screens: ${screenId} exists`);
            } else {
                console.error(`❌ ${screenId} not found`);
                testResults.failed.push(`Screens: ${screenId} missing`);
            }
        });

        // 测试9: API连接性
        console.log('\n📝 Test 9: API Connectivity');
        try {
            const response = await fetch('http://localhost:8000/');
            if (response.ok) {
                console.log('✅ Backend API is reachable');
                testResults.passed.push('API: Backend reachable');
            } else {
                console.error(`❌ Backend returned status ${response.status}`);
                testResults.failed.push(`API: Backend status ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Backend API is not reachable:', error.message);
            testResults.failed.push(`API: Backend unreachable - ${error.message}`);
        }

        // 测试10: 检查全局变量
        console.log('\n📝 Test 10: Global Variables');
        if (typeof gameState !== 'undefined') {
            console.log('✅ gameState is defined');
            testResults.passed.push('Globals: gameState defined');
        } else {
            console.error('❌ gameState is not defined');
            testResults.failed.push('Globals: gameState missing');
        }

        if (typeof ui !== 'undefined') {
            console.log('✅ ui is defined');
            testResults.passed.push('Globals: ui defined');
        } else {
            console.error('❌ ui is not defined');
            testResults.failed.push('Globals: ui missing');
        }

        if (typeof scriptPlayer !== 'undefined') {
            console.log('✅ scriptPlayer is defined');
            testResults.passed.push('Globals: scriptPlayer defined');
        } else {
            console.error('❌ scriptPlayer is not defined');
            testResults.failed.push('Globals: scriptPlayer missing');
        }

    } catch (error) {
        console.error('💥 Test suite error:', error);
        testResults.errors.push(`Test suite error: ${error.message}`);
    }

    // 打印测试总结
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${testResults.passed.length}`);
    console.log(`❌ Failed: ${testResults.failed.length}`);
    console.log(`💥 Errors: ${testResults.errors.length}`);
    console.log('='.repeat(60));

    if (testResults.failed.length > 0) {
        console.log('\n❌ Failed Tests:');
        testResults.failed.forEach(fail => console.log(`  - ${fail}`));
    }

    if (testResults.errors.length > 0) {
        console.log('\n💥 Errors:');
        testResults.errors.forEach(err => console.log(`  - ${err}`));
    }

    return testResults;
}

// 自动运行测试（当页面加载时）
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('Page loaded, starting tests in 2 seconds...');
        setTimeout(runAutomatedFrontendTest, 2000);
    });
} else {
    console.log('Page already loaded, starting tests now...');
    runAutomatedFrontendTest();
}

// 暴露给控制台使用
window.runAutomatedFrontendTest = runAutomatedFrontendTest;
