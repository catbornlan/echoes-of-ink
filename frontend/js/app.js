// 主应用控制器 - 使用Phase系统
// 确保在DOMContentLoaded后初始化

document.addEventListener('DOMContentLoaded', () => {
    console.log('游戏初始化...');

    // 初始化phase系统（在phase-control.js中定义）
    if (typeof renderPhase === 'function') {
        renderPhase(GAME_PHASES.WELCOME, true);
    }

    // 设置所有事件监听器
    setupAllEventListeners();
});

// 交互式圆桌讨论状态
let isInDiscussion = false;
let discussionMode = null; // 'intro', 'discuss_1', 'discuss_2'

// 设置所有事件监听器
function setupAllEventListeners() {
    console.log('设置事件监听器...');

    // ====== 欢迎页面 ======
    const startBtn = document.getElementById('btn-start-game');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            console.log('开始游戏按钮被点击');
            goToPhase(GAME_PHASES.SELECT_CHAR);
            loadCharacters();
        });
    }

    // ====== 角色选择 ======
    const randomBtn = document.getElementById('random-character-btn');
    if (randomBtn) {
        randomBtn.addEventListener('click', () => {
            const randomChar = gameState.characters[Math.floor(Math.random() * gameState.characters.length)];
            selectCharacter(randomChar);
        });
    }

    // ====== 进入游戏 ======
    const enterGameBtn = document.getElementById('btn-enter-game');
    if (enterGameBtn) {
        enterGameBtn.addEventListener('click', async () => {
            goToPhase(GAME_PHASES.GAME_MAIN);
            await startGamePhase();
        });
    }

    // ====== 消息发送 ======
    const sendBtn = document.getElementById('send-btn');
    const playerInput = document.getElementById('player-input');

    if (sendBtn) {
        sendBtn.addEventListener('click', sendPlayerMessage);
    }

    if (playerInput) {
        playerInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendPlayerMessage();
            }
        });

        // 输入框聚焦时暂停剧本播放
        playerInput.addEventListener('focus', () => {
            if (window.scriptPlayer) {
                scriptPlayer.pause();
            }
        });
    }

    // ====== 下一环节 ======
    const nextPhaseBtn = document.getElementById('next-phase-btn');
    if (nextPhaseBtn) {
        nextPhaseBtn.addEventListener('click', () => {
            if (isInDiscussion) {
                endDiscussion();
            }
            advanceToNextPhase();
        });
    }

    // ====== 搜证完成 ======
    const finishSearchBtn = document.getElementById('finish-search-btn');
    if (finishSearchBtn) {
        finishSearchBtn.addEventListener('click', finishSearch);
    }

    // ====== 侧边栏标签 ======
    document.querySelectorAll('.sidebar-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;

            // 更新标签激活状态
            document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('tab-active'));
            tab.classList.add('tab-active');

            // 显示对应内容
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.add('hidden');
            });
            document.getElementById(`${targetTab}-tab`)?.classList.remove('hidden');

            // 切换标签时刷新侧边栏内容（特别是证据列表）
            ui.updateSidebar();
        });
    });

    // ====== 投票 ======
    const submitVoteBtn = document.getElementById('submit-vote-btn');
    if (submitVoteBtn) {
        submitVoteBtn.addEventListener('click', submitVote);
    }

    // ====== 真相揭晓 ======
    const revealTruthBtn = document.getElementById('reveal-truth-btn');
    if (revealTruthBtn) {
        revealTruthBtn.addEventListener('click', revealTruth);
    }

    // ====== 重新开始 ======
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            location.reload();
        });
    }

    // ====== 证据模态框 ======
    const closeEvidenceBtn = document.getElementById('close-evidence-btn');
    if (closeEvidenceBtn) {
        closeEvidenceBtn.addEventListener('click', () => {
            document.getElementById('evidence-modal').classList.remove('modal-open');
        });
    }

    const publicEvidenceBtn = document.getElementById('public-evidence-btn');
    if (publicEvidenceBtn) {
        publicEvidenceBtn.addEventListener('click', async () => {
            const evidenceId = publicEvidenceBtn.dataset.evidenceId;
            if (evidenceId) {
                await gameState.makeEvidencePublic(evidenceId);
                ui.updateSidebar();
            }
        });
    }

    console.log('所有事件监听器设置完成');
}

// 加载角色列表
async function loadCharacters() {
    console.log('加载角色列表...');

    // 确保gameState已初始化
    if (!gameState.characters || gameState.characters.length === 0) {
        console.log('初始化gameState...');
        const success = await gameState.initialize();
        if (!success) {
            console.error('GameState初始化失败');
            return;
        }
    }

    console.log(`加载${gameState.characters.length}个角色`);
    ui.renderCharacterGrid(gameState.characters, 'character-grid', selectCharacter);
}

// 选择角色
// 选择角色
async function selectCharacter(character) {
    console.log('选择角色:', character.name);

    try {
        ui.showLoading(true, '准备剧本', '案件即将开始，众人尚未察觉危机四伏…');

        // 开始游戏会话
        await gameState.startGame(character.id);

        // 获取角色剧本
        const script = await gameState.getCharacterScript(character.id);

        // 更新侧边栏以显示剧本
        ui.updateSidebar();

        ui.showLoading(false);

        // 进入剧本阅读阶段
        goToPhase(GAME_PHASES.READ_SCRIPT);

        // 显示剧本
        document.getElementById('character-name-title').textContent = character.name;
        document.getElementById('script-content').innerHTML = `
            <h3>角色：${character.role}</h3>
            <p><strong>年龄：</strong>${character.age}岁</p>
            <p><strong>动机：</strong>${character.motivation}</p>
            <h4>剧本内容：</h4>
            <pre style="white-space: pre-wrap; font-family: 'Courier Prime', monospace;">${character.full_script}</pre>
        `;
    } catch (error) {
        ui.showLoading(false);
        ui.showToast('选择角色失败: ' + error.message, 'error');
    }
}

// 开始游戏主流程
async function startGamePhase() {
    ui.updatePhaseIndicator(gameState.currentPhase);
    ui.updateSidebar();

    // 开始自我介绍环节
    await startIntroPhase();
}

// 自我介绍环节（固定顺序播放）
async function startIntroPhase() {
    console.log('Starting Intro Phase with fixed order...');

    ui.updatePhaseIndicator('intro');

    // 禁用输入框（自我介绍环节不可发言）
    if (window.updateInputState) {
        window.updateInputState();
    }

    ui.addMessage({
        speaker: '系统',
        content: '案发第二天清晨，所有人被召集到大厅。李四发现了马良的尸体，现在开始相互介绍。',
        is_player: false
    });

    // 固定顺序：薛名医-杏儿花-小马(玩家)-李四-夏仙姑-吴村霸
    const introOrder = ['xueming', 'xingerhua', 'xiaoma', 'lisi', 'xiaoxianggu', 'wuxingque'];

    await playIntrosInOrder(introOrder);
}

// 按顺序播放自我介绍
async function playIntrosInOrder(order) {
    for (let i = 0; i < order.length; i++) {
        const charId = order[i];
        const char = gameState.characters.find(c => c.id === charId);

        if (!char) {
            console.warn(`Character not found: ${charId}`);
            continue;
        }

        if (charId === gameState.playerCharacter) {
            // 玩家轮次：等待输入
            await waitForPlayerIntro(char);
        } else {
            // NPC轮次：播放预设介绍
            await new Promise(resolve => setTimeout(resolve, 2000));
            ui.addMessage({
                speaker: char.name,
                content: char.preset_intro,
                action: `${char.name}微微颔首`,
                is_player: false,
                timestamp: Date.now()
            });
        }
    }

    // 所有人介绍完毕
    setTimeout(() => {
        ui.addMessage({
            speaker: '系统',
            content: '自我介绍环节结束。现在进入圆桌讨论，你可以提出问题或分享线索。',
            is_player: false
        });

        startInteractiveDiscussion();
        updateNextPhaseButtonText(GAME_PHASES.INTRO);
    }, 2000);
}

// 等待玩家自我介绍
function waitForPlayerIntro(playerChar) {
    return new Promise((resolve) => {
        const input = document.getElementById('player-input');
        const sendBtn = document.getElementById('send-btn');

        ui.addMessage({
            speaker: '系统',
            content: `现在轮到你（${playerChar.name}）自我介绍。`,
            is_player: false
        });

        // 开放输入
        input.disabled = false;
        sendBtn.disabled = false;
        input.placeholder = '输入你的自我介绍…';
        input.focus();

        // 创建清理函数
        const cleanup = () => {
            sendBtn.removeEventListener('click', handleIntro);
            input.removeEventListener('keypress', handleKeyPress);
        };

        // 处理回车
        const handleKeyPress = (e) => {
            if (e.key === 'Enter') {
                handleIntro();
            }
        };

        // 处理提交
        const handleIntro = async () => {
            const content = input.value.trim();
            if (!content) {
                ui.showToast('请输入自我介绍', 'warning');
                return;
            }

            // 添加玩家消息
            ui.addMessage({
                speaker: playerChar.name,
                content: content,
                is_player: true,
                timestamp: Date.now()
            });

            input.value = '';
            input.disabled = true;
            sendBtn.disabled = true;

            // 移除事件监听并完成
            cleanup();
            resolve();
        };

        sendBtn.addEventListener('click', handleIntro);
        input.addEventListener('keypress', handleKeyPress);
    });
}

// 发送玩家消息
async function sendPlayerMessage() {
    const input = document.getElementById('player-input');
    const content = input.value.trim();

    if (!content) return;

    // 如果在讨论模式，使用讨论处理逻辑
    if (isInDiscussion) {
        await handleDiscussionInput(content);
        return;
    }

    // 非讨论模式：自我介绍或其他场景
    const playerChar = gameState.getCharacter(gameState.playerCharacter);
    const message = {
        speaker: playerChar.name,
        content: content,
        is_player: true,
        timestamp: Date.now()
    };

    // 显示消息（只添加到UI，不需要双重添加）
    ui.addMessage(message);

    // 清空输入框
    input.value = '';

    // 如果剧本正在播放且暂停，重新生成剧本
    if (scriptPlayer.isPaused) {
        await handlePlayerInterruption(content);
    } else if (gameState.currentPhase === 'intro') {
        // 自我介绍后，播放NPC自我介绍
        await playNPCIntroductions();
    }
}


// 已废弃：旧的NPC自我介绍函数（现在使用 playIntrosInOrder）
async function playNPCIntroductions() {
    console.warn('playNPCIntroductions is deprecated. Use startIntroPhase instead.');
}

// 开始交互讨论模式
function startInteractiveDiscussion(mode = '第一轮讨论') {
    console.log(`开始交互讨论模式: ${mode}`);
    isInDiscussion = true;
    discussionMode = mode;

    // 启用输入框
    enableInput('输入你的发言…');

    const nextPhaseBtn = document.getElementById('next-phase-btn');

    // 显示"结束讨论"按钮
    nextPhaseBtn.textContent = '结束讨论，进入下一环节';
    nextPhaseBtn.style.display = 'inline-block';
    nextPhaseBtn.disabled = false;

    // 生成角色提及按钮
    setupMentionButtons();

    // 启用输入框（讨论环节可以发言）
    if (window.updateInputState) {
        window.updateInputState();
    }

    // 开始AI自动对话（1-15条）
    startAIAutoDiscussion();
}

// AI自动对话控制变量
let aiDiscussionActive = false;
let aiDiscussionInterrupted = false;

// 开始AI自动对话
async function startAIAutoDiscussion() {
    if (aiDiscussionActive) return; // 防止重复启动

    aiDiscussionActive = true;
    aiDiscussionInterrupted = false;

    // 生成1-15条AI对话
    const messageCount = Math.floor(Math.random() * 15) + 1; // 1-15条
    console.log(`[AI自动对话] 计划生成 ${messageCount} 条对话`);

    for (let i = 0; i < messageCount; i++) {
        if (aiDiscussionInterrupted) {
            console.log(`[AI自动对话] 被用户打断，停止生成`);
            break;
        }

        try {
            // 生成AI讨论内容
            const response = await gameState.generateDiscussionResponse(
                '', // 空消息表示AI自主对话
                null,
                discussionMode
            );

            if (response && response.messages && response.messages.length > 0) {
                // 播放AI生成的对话
                for (const msg of response.messages) {
                    if (aiDiscussionInterrupted) break;

                    ui.addMessage(msg);
                    await gameState.addMessage(msg);
                    await new Promise(resolve => setTimeout(resolve, 1500)); // 每条消息间隔1.5秒
                }
            }

            // 随机等待2-4秒再生成下一条
            if (!aiDiscussionInterrupted && i < messageCount - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
            }
        } catch (error) {
            console.error('[AI自动对话] 生成失败', error);
            break;
        }
    }

    aiDiscussionActive = false;
    console.log(`[AI自动对话] 结束`);
}

// 设置角色提及按钮
function setupMentionButtons() {
    const mentionContainer = document.getElementById('mention-buttons');
    if (!mentionContainer) return;

    mentionContainer.innerHTML = '';
    mentionContainer.classList.remove('hidden');

    // 获取除玩家外的所有角色
    const npcs = gameState.characters.filter(c => c.id !== gameState.playerCharacter);

    npcs.forEach(char => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-xs btn-outline';
        btn.textContent = `${char.name}`;
        btn.addEventListener('click', () => {
            // 在光标位置插入角色名
            const input = document.getElementById('player-input');
            const cursorPos = input.selectionStart;
            const currentValue = input.value;
            const newValue = currentValue.substring(0, cursorPos) + `「${char.name}」` + currentValue.substring(cursorPos);
            input.value = newValue;
            // 设置光标位置到插入文本之后
            input.focus();
            input.setSelectionRange(cursorPos + char.name.length + 2, cursorPos + char.name.length + 2);
        });
        mentionContainer.appendChild(btn);
    });
}

// 处理玩家在讨论中的发言
async function handleDiscussionInput(playerMessage) {
    if (!isInDiscussion) {
        return;
    }

    // 用户发言时打断AI自动对话
    if (aiDiscussionActive) {
        aiDiscussionInterrupted = true;
        console.log('[用户打断] 停止AI自动对话');
    }

    try {
        // 检测角色提及（使用「」书名号）
        const mentionMatch = playerMessage.match(/「([\u4e00-\u9fa5]+)」/);
        const mentionedCharacter = mentionMatch ? mentionMatch[1] : null;

        // 添加玩家消息（只添加到UI，不需要双重添加）
        const message = {
            speaker: gameState.getCharacter(gameState.playerCharacter).name,
            content: playerMessage,
            is_player: true,
            timestamp: Date.now()
        };
        ui.addMessage(message);

        // 清空输入框
        document.getElementById('player-input').value = '';

        // 不显示loading modal，让对话自然流动
        // 生成AI回复（基于当前所有对话+剧本+证据）
        const response = await gameState.generateDiscussionResponse(
            playerMessage,
            mentionedCharacter,
            discussionMode
        );

        // 播放AI回复
        if (response && response.messages && response.messages.length > 0) {
            for (const msg of response.messages) {
                ui.addMessage(msg);
                await gameState.addMessage(msg);
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        } else {
            // 如果生成失败，添加默认回复
            ui.addMessage({
                speaker: '系统',
                content: '其他人陷入了沉思…',
                is_player: false
            });
        }

        // 用户发言后，重新启动AI自动对话
        setTimeout(() => {
            startAIAutoDiscussion();
        }, 2000);

    } catch (error) {
        console.error('Discussion input error:', error);
        ui.showToast('发言失败，请重试', 'error');
    }
}

// 结束讨论
function endDiscussion() {
    isInDiscussion = false;
    discussionMode = null;

    // 禁用输入框
    if (window.updateInputState) {
        window.updateInputState();
    }

    const mentionContainer = document.getElementById('mention-buttons');
    if (mentionContainer) mentionContainer.classList.add('hidden');

    ui.addMessage({
        speaker: '系统',
        content: '圆桌讨论结束。',
        is_player: false
    });
}

// 完成搜证
async function finishSearch() {
    console.log('完成搜证，进入下一环节');

    // 隐藏搜证界面
    const searchPhase = document.getElementById('phase-search');
    if (searchPhase) {
        searchPhase.classList.add('hidden');
    }

    // 恢复消息容器和输入区域
    const messagesContainer = document.getElementById('messages-container');
    const inputArea = messagesContainer?.parentElement;
    if (messagesContainer) messagesContainer.classList.remove('hidden');
    if (inputArea) inputArea.classList.remove('hidden');

    ui.addMessage({
        speaker: '系统',
        content: '搜证环节结束。',
        is_player: false
    });

    await advanceToNextPhase();
}

// 玩家打断处理
async function handlePlayerInterruption(playerInput) {
    try {
        ui.showLoading(true, '即将开始搜证', '时间紧迫，线索散落在府邸各处，每个人都在思索该去何处寻找真相…');

        const remainingScript = scriptPlayer.getRemainingScript();
        const newScript = await gameState.regenerateScript(playerInput, remainingScript);

        ui.showLoading(false);

        // 继续播放新剧本
        scriptPlayer.resume(newScript);
    } catch (error) {
        ui.showLoading(false);
        console.error('Failed to regenerate script:', error);
    }
}

// 推进到下一环节
async function advanceToNextPhase() {
    try {
        ui.showLoading(true, '切换环节', '正在准备下一环节…');

        // 只有在当前阶段明确且不是intro时才获取过渡描写
        if (gameState.currentPhase && gameState.currentPhase !== 'intro') {
            try {
                const narrative = await gameState.getPhaseTransition(gameState.currentPhase);
                ui.showPhaseNarrative(narrative.narrative);
            } catch (err) {
                console.warn('Failed to get phase transition narrative:', err);
                // 继续执行，不影响阶段推进
            }
        }

        // 推进阶段
        const newPhase = await gameState.advancePhase();
        ui.updatePhaseIndicator(newPhase);

        ui.showLoading(false);

        // 恢复"进入下一环节"按钮文本并更新为具体阶段
        updateNextPhaseButtonText(newPhase);

        // 根据新阶段执行相应逻辑（修改顺序）
        if (newPhase === 'search_1' || newPhase === 'search_2') {
            startSearchPhase(newPhase);
        } else if (newPhase === 'discuss_1' || newPhase === 'discuss_2') {
            startDiscussPhase(newPhase);
        } else if (newPhase === 'vote') {
            startVotePhase();
        }
    } catch (error) {
        ui.showLoading(false);
        ui.showToast('Failed to advance phase: ' + error.message, 'error');
    }
}

// 更新下一环节按钮文案
function updateNextPhaseButtonText(currentPhase) {
    const nextPhaseBtn = document.getElementById('next-phase-btn');
    if (!nextPhaseBtn) return;

    const nextPhaseMap = {
        'intro': '开始搜证',          // 改：介绍后先搜证
        'search_1': '开始第一轮讨论', // 搜证后讨论
        'discuss_1': '开始第二轮搜证',
        'search_2': '开始第二轮讨论',
        'discuss_2': '开始投票',
        'vote': '揭晓真相'
    };

    nextPhaseBtn.textContent = nextPhaseMap[currentPhase] || '进入下一环节';
}

// 搜证环节
let currentActionPoints = 0;
let currentSearchRound = 1;

function startSearchPhase(phase) {
    console.log(`开始搜证环节: ${phase}, 轮次: ${currentSearchRound}`);

    // 不切换phase，而是在game-main内部显示搜证界面
    // 隐藏消息容器和输入区域
    const messagesContainer = document.getElementById('messages-container');
    const inputArea = document.getElementById('input-area-container');
    if (messagesContainer) messagesContainer.classList.add('hidden');
    if (inputArea) inputArea.classList.add('hidden');

    // 显示搜证界面 (now embedded in game-main)
    const searchUI = document.getElementById('search-ui-container');
    if (searchUI) {
        searchUI.classList.remove('hidden');
    } else {
        console.error('搜证界面容器未找到 (search-ui-container)');
        return;
    }


    // 禁用输入框（搜证环节不可发言）
    if (window.updateInputState) {
        window.updateInputState();
    }

    // 更新阶段指示器
    ui.updatePhaseIndicator(phase === 'search_1' ? 'search_1' : 'search_2');

    // 确定当前搜证轮次
    currentSearchRound = gameState.currentPhase === 'search_1' ? 1 : 2;

    // 设置行动点数
    currentActionPoints = currentSearchRound === 1 ? gameState.actionPoints.round1 : gameState.actionPoints.round2;

    // 显示当前轮次和行动点
    document.getElementById('search-round-info').textContent =
        currentSearchRound === 1 ? '第一轮搜证（不可深度调查）' : '第二轮搜证（可深度调查）';
    updateActionPointsDisplay();

    const collectedIds = (gameState.collectedEvidence || []).map(e => e.id);

    // 定义搜证处理函数（支持深度调查）
    const searchHandler = async (location, evidenceId = null, isDeep = false) => {
        // 深度调查需要额外成本
        const requiredPoints = isDeep ? 2 : 1;

        if (currentActionPoints < requiredPoints) {
            ui.showToast(`行动点数不足！深度调查需要${requiredPoints}点`, 'warning');
            return;
        }

        try {
            ui.showLoading(true, '搜证中', isDeep ? '重新审视这些证据，也许能发现之前忽略的细节…' : '仔细搜索着每一个角落...');

            let found;
            if (isDeep && evidenceId) {
                //深度调查特定证据
                found = await gameState.searchEvidence(location.id, evidenceId, requiredPoints);
            } else {
                // 普通搜证
                found = await gameState.searchEvidence(location.id);
            }

            ui.showLoading(false);

            if (found.length > 0) {
                // 扣除行动点
                currentActionPoints -= requiredPoints;
                updateActionPointsDisplay();

                // 显示所有找到的证据
                for (const evidence of found) {
                    await showEvidenceModal(evidence, location.name);
                }

                ui.updateSidebar();

                // 刷新地点列表以更新剩余数量
                const updatedIds = gameState.collectedEvidence.map(e => e.id);
                ui.renderLocations(gameState.locations, searchHandler, updatedIds, currentSearchRound === 2);

                // 检查玩家是否花完所有点数
                if (currentActionPoints === 0) {
                    ui.showToast('搜证点数已用完，等待其他角色搜证完成...', 'success');
                    setTimeout(async () => {
                        await triggerNPCSearch(); // NPC搜证
                        await advanceToNextPhase(); // 自动进入下一环节
                    }, 2000);
                }
            } else {
                // 即使没找到也扣点
                currentActionPoints -= requiredPoints;
                updateActionPointsDisplay();
                ui.showToast(isDeep ? '深度调查未发现新线索' : '在此地点没有发现新证据', 'info');
            }
        } catch (error) {
            ui.showLoading(false);
            ui.showToast('搜证失败: ' + error.message, 'error');
        }
    };

    // 初次渲染地点列表
    ui.renderLocations(gameState.locations, searchHandler, collectedIds, currentSearchRound === 2);
}

// NPC随机搜证（玩家搜证完成后触发）
async function triggerNPCSearch() {
    console.log('[NPC搜证] 开始NPC随机搜证');

    try {
        ui.addMessage({
            speaker: '系统',
            content: '其他角色开始搜证...',
            is_player: false
        });

        // 获取所有NPC角色（排除玩家）
        const allCharacters = gameState.characters.filter(c => c.id !== gameState.playerCharacter);

        // 获取所有地点和证据
        const locations = gameState.locations || [];
        const allEvidence = gameState.allEvidence || [];

        // 每个NPC的行动点数
        const pointsPerNPC = currentSearchRound === 1 ? gameState.actionPoints.round1 : gameState.actionPoints.round2;

        // 为每个NPC随机搜证
        for (const character of allCharacters) {
            let npcPoints = pointsPerNPC;
            const foundEvidence = [];

            // 用完该NPC的所有行动点
            while (npcPoints > 0 && locations.length > 0) {
                // 随机选择一个地点
                const randomLocation = locations[Math.floor(Math.random() * locations.length)];

                // 在该地点找可用证据（未被玩家或其他NPC收集）
                const availableEvidence = allEvidence.filter(e =>
                    e.location_id === randomLocation.id &&
                    !gameState.collectedEvidence.some(collected => collected.id === e.id) &&
                    !foundEvidence.some(found => found.id === e.id)
                );

                // 如果有可用证据，20%概率找到
                if (availableEvidence.length > 0 && Math.random() < 0.2) {
                    const evidence = availableEvidence[0];
                    foundEvidence.push({
                        ...evidence,
                        location: randomLocation.name,
                        character: character.name
                    });
                }

                npcPoints--;

                // 添加延迟以模拟真实搜证过程
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            // 显示该NPC找到的证据
            for (const evidence of foundEvidence) {
                ui.addMessage({
                    speaker: '系统',
                    content: `${evidence.character}在${evidence.location}发现了「${evidence.label}」`,
                    is_player: false,
                    timestamp: Date.now()
                });

                // 延迟显示，让消息逐个出现
                await new Promise(resolve => setTimeout(resolve, 800));
            }
        }

        ui.addMessage({
            speaker: '系统',
            content: '所有角色搜证完成，准备进入下一环节...',
            is_player: false
        });

    } catch (error) {
        console.error('[NPC搜证] 错误:', error);
        ui.showToast('NPC搜证出现错误', 'error');
    }
}

// AI自动搜证相关的全局变量
let aiSearchTimer = null;
let aiRemainingActions = 0;

// 启动AI自动搜证
function startAIAutoSearch() {
    // 如果已有定时器先清除
    if (aiSearchTimer) clearInterval(aiSearchTimer);

    // 计算AI总行动次数 (5个AI角色)
    const aiCharacterCount = 5;
    const pointsPerCharacter = currentSearchRound === 1 ? 4 : 5;
    aiRemainingActions = aiCharacterCount * pointsPerCharacter;

    // 搜索阶段持续时间(根据规则可以调整)，这里设为30秒内完成所有动作
    const totalDuration = 30000;
    const intervalTime = totalDuration / aiRemainingActions;

    console.log(`[AI搜证] 启动: ${aiRemainingActions}次行动, 间隔${Math.round(intervalTime)}ms`);

    aiSearchTimer = setInterval(async () => {
        if (aiRemainingActions > 0 && gameState.currentPhase.startsWith('search_')) {
            await performAISearchStep();
            aiRemainingActions--;
        } else {
            clearInterval(aiSearchTimer);
            aiSearchTimer = null;
        }
    }, intervalTime);
}

// 执行单次AI搜证步骤
async function performAISearchStep() {
    try {
        // 调用现有的 triggerAISearch 函数，但需要微调它以适应单步逻辑
        // 或者直接在这里实现
        await triggerAISearch();
    } catch (e) {
        console.error('[AI搜证] 步骤执行失败', e);
    }
}

// 更新行动点数显示
function updateActionPointsDisplay() {
    // 更新搜证页面的行动点显示
    const searchDisplay = document.getElementById('search-action-points');
    if (searchDisplay) {
        searchDisplay.textContent = currentActionPoints;
    }

    // 更新顶部导航栏的行动点显示
    const headerDisplay = document.getElementById('action-points-display');
    if (headerDisplay) {
        headerDisplay.textContent = `行动点: ${currentActionPoints}`;
    }
}

// 显示证据详情模态框
function showEvidenceModal(evidence, sourceName) {
    return new Promise((resolve) => {
        const modal = document.getElementById('evidence-modal');
        // DaisyUI modal handling: Toggle 'modal-open' class is not standard, use checkbox or just class if manually handled
        // Based on HTML, it's just a div with class modal.
        modal.classList.add('modal-open');

        const closeBtn = document.getElementById('close-evidence-btn');
        const publicBtn = document.getElementById('public-evidence-btn');
        const publicStatus = document.getElementById('evidence-public-status');

        // 填充证据信息
        document.getElementById('evidence-modal-title').textContent = evidence.label;
        document.getElementById('evidence-source').textContent = sourceName || evidence.location;
        document.getElementById('evidence-content').textContent = evidence.content;

        // 显示深度调查提示
        const deepInfo = document.getElementById('evidence-deep-info');
        if (evidence.requires_deep_search) {
            deepInfo.classList.remove('hidden');
        } else {
            deepInfo.classList.add('hidden');
        }

        // 检查是否已公开
        const isPublic = gameState.publicEvidence.includes(evidence.id);
        if (isPublic) {
            publicBtn.classList.add('hidden');
            publicStatus.classList.remove('hidden');
        } else {
            publicBtn.classList.remove('hidden');
            publicStatus.classList.add('hidden');
        }

        // 公开证据按钮
        publicBtn.onclick = async () => {
            try {
                await gameState.makeEvidencePublic(evidence.id);
                publicBtn.classList.add('hidden');
                publicStatus.classList.remove('hidden');
                ui.updateSidebar();
                ui.showToast(`证据"${evidence.label}"已公开`, 'success');
            } catch (error) {
                ui.showToast('公开证据失败: ' + error.message, 'error');
            }
        };

        // 关闭按钮
        const handleClose = () => {
            modal.classList.remove('modal-open');
            closeBtn.removeEventListener('click', handleClose);
            publicBtn.onclick = null; // Clean up public button listener
            resolve();
        };

        // Ensure old listeners are removed or just use fresh clone? 
        // For simplicity, just add and remove specific listener
        closeBtn.onclick = handleClose;
    });
}

// AI自动搜证（搜证环节开始时触发）
async function triggerAISearch() {
    console.log('[AI搜证] 开始执行AI自动搜证');

    try {
        // 获取已收集的证据ID
        const collectedIds = (gameState.collectedEvidence || []).map(e => e.id);

        // 调用AI搜证API
        const response = await fetch(`${gameState.apiBaseUrl}/phase/ai_search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                collected_evidence_ids: collectedIds,
                current_round: currentSearchRound
            })
        });

        if (!response.ok) {
            throw new Error(`AI搜证失败: ${response.status}`);
        }

        const data = await response.json();

        if (data.found && data.found.length > 0) {
            console.log(`[AI搜证] AI找到了${data.found.length}个证据`);

            // 显示AI找到的证据
            for (const evidence of data.found) {
                // 检查是否被公开
                const isPublic = data.public_evidence_ids?.includes(evidence.id);

                ui.addMessage({
                    speaker: '系统',
                    content: isPublic
                        ? `有人搜到了证据并公开：${evidence.label}`
                        : `有人搜到了证据（未公开）`,
                    is_player: false
                });

                // 如果公开，显示详情
                if (isPublic) {
                    await showEvidenceModal(evidence, '未知地点', true);
                }
            }

            // 更新侧边栏
            gameState.publicEvidence = data.public_evidence_ids || [];
            ui.updateSidebar();
        } else {
            console.log('[AI搜证] AI本次未找到新证据');
        }

    } catch (error) {
        console.error('[AI搜证] 错误:', error);
    }
}

// 完成搜证
async function finishSearch() {
    // 最后再触发一次AI搜证
    await triggerAISearch();

    goToPhase(GAME_PHASES.GAME_MAIN);
    ui.addMessage({
        speaker: '系统',
        content: '搜证环节结束。点击"进入下一环节"开始讨论。',
        is_player: false
    });
}

// 讨论环节
async function startDiscussPhase(phase) {
    // 确保隐藏搜证界面
    const searchUI = document.getElementById('search-ui-container');
    if (searchUI) {
        searchUI.classList.add('hidden');
    }

    // 确保显示消息容器和输入区域
    const messagesContainer = document.getElementById('messages-container');
    const inputArea = document.getElementById('input-area-container');
    if (messagesContainer) messagesContainer.classList.remove('hidden');
    if (inputArea) inputArea.classList.remove('hidden');

    // 确保在game-main phase
    goToPhase(GAME_PHASES.GAME_MAIN);

    // 启用输入框 - 讨论环节允许发言
    if (window.updateInputState) {
        window.updateInputState();
    }

    try {
        ui.showLoading(true, '即将投票', '经过激烈的讨论和搜证，每个人心中都有了自己的答案…');

        // 生成批量剧本
        const script = await gameState.generateScript(phase, 180);

        ui.showLoading(false);

        // 播放剧本
        await scriptPlayer.play(script);

        // 播放结束提示
        ui.addMessage({
            speaker: '系统',
            content: '讨论环节结束。点击"进入下一环节"继续游戏。',
            is_player: false
        });
    } catch (error) {
        ui.showLoading(false);
        ui.showToast('Failed to start discussion: ' + error.message, 'error');
    }
}

// 投票环节
async function startVotePhase() {
    console.log('Starting Vote Phase...');
    ui.updatePhaseIndicator('vote');

    // Switch to vote phase UI immediately
    goToPhase(GAME_PHASES.VOTE);

    try {
        ui.showLoading(true, '统计票数', '所有人的选择已做出，真相即将揭晓…');
        // 获取AI角色的投票决定
        const npcVotes = await gameState.getNPCVotes();
        console.log('NPC Votes:', npcVotes);
        ui.showLoading(false);
    } catch (error) {
        console.error('Failed to get NPC votes:', error);
        ui.showLoading(false);
    }

    ui.addMessage({
        speaker: '系统',
        content: '经过搜证与讨论，现在请指认你心目中的凶手。',
        is_player: false
    });

    // 渲染投票界面角色列表
    const grid = document.getElementById('suspect-grid');
    if (grid) {
        ui.renderCharacterGrid(
            [...gameState.characters, { id: 'suicide', name: '自杀', role: '', age: 0 }],
            'suspect-grid',
            (char) => {
                // 选中逻辑
                document.querySelectorAll('#suspect-grid .card').forEach(card => card.classList.remove('ring', 'ring-primary'));
                // 这里event可能访问不到，需要重构ui.renderCharacterGrid传递event或element
                // 暂时简单alert作为占位，实际需要选中样式
                // 简单实现：全局变量记录选中
                window.selectedSuspectId = char.id;
                document.getElementById('submit-vote-btn').disabled = false;
            }
        );
    }

}

// 提交投票
async function submitVote() {
    const suspectId = window.selectedSuspectId;
    if (!suspectId) return;

    try {
        ui.showLoading(true, '揭晓真相', '尘埃落定，是时候知道事件的全貌了…');

        // 玩家投票
        await gameState.vote(suspectId);

        // 获取NPC投票
        await gameState.getNPCVotes();

        // 获取投票结果
        const result = await gameState.getVoteResult();

        // 推进到揭晓阶段
        await gameState.advancePhase();

        ui.showLoading(false);

        // 显示结果
        showRevealScreen(result);
    } catch (error) {
        ui.showLoading(false);
        ui.showToast('投票失败: ' + error.message, 'error');
    }
}

// 真相揭晓
async function showRevealScreen(voteResult) {
    try {
        ui.showLoading(true, '公开证据', '将这份证据公之于众，也许能改变局势…');

        // 获取结局续写
        const epilogue = await gameState.getEndingEpilogue();

        ui.showLoading(false);

        // 渲染结果
        ui.renderVoteResult(voteResult);
        ui.renderEndingEpilogue(epilogue);
        ui.renderTruthReveal();

        goToPhase(GAME_PHASES.VOTE_RESULT); // Wait, VOTE_RESULT or TRUTH_REVEAL? defined in phase-control
        // Let's use VOTE_RESULT first then TRUTH
        renderPhase(GAME_PHASES.VOTE_RESULT);

        // 绑定揭晓按钮
        const revealBtn = document.getElementById('reveal-truth-btn');
        if (revealBtn) {
            revealBtn.onclick = () => {
                goToPhase(GAME_PHASES.TRUTH_REVEAL);
            };
        }

    } catch (error) {
        ui.showLoading(false);
        ui.showToast('Failed to show reveal: ' + error.message, 'error');
    }
}

// 揭晓真相
function revealTruth() {
    goToPhase(GAME_PHASES.TRUTH_REVEAL);
}
