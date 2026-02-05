// AI自动搜证系统
function startAIAutoSearch() {
    // 计算AI总行动次数 (5个AI角色)
    const aiCharacterCount = 5;
    const pointsPerCharacter = currentSearchRound === 1 ? 4 : 5;
    aiRemainingActions = aiCharacterCount * pointsPerCharacter;

    // 30秒内均匀分配
    const totalDuration = 30000; // 30秒
    const intervalTime = totalDuration / aiRemainingActions;

    console.log(`AI搜证启动: ${aiRemainingActions}次行动, 间隔${intervalTime}ms`);

    aiSearchTimer = setInterval(async () => {
        if (aiRemainingActions > 0) {
            await performAISearch();
        } else {
            clearInterval(aiSearchTimer);
        }
    }, intervalTime);
}

// 执行一次AI搜证
async function performAISearch() {
    try {
        const collectedIds = gameState.collectedEvidence.map(e => e.id);
        const response = await fetch('http://localhost:8000/api/phase/ai_search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                collected_ids: collectedIds,
                current_round: currentSearchRound
            })
        });

        const data = await response.json();

        if (data.evidence && data.evidence.length > 0) {
            // AI收集到证据
            data.evidence.forEach(ev => {
                if (!gameState.collectedEvidence.find(e => e.id === ev.id)) {
                    gameState.collectedEvidence.push(ev);

                    // AI 有30%概率公开证据
                    if (Math.random() < 0.3) {
                        setTimeout(() => {
                            gameState.makeEvidencePublic(ev.id).then(() => {
                                console.log(`AI 公开证据: ${ev.label}`);
                                ui.updateSidebar();
                            });
                        }, 500);
                    }
                }
            });

            // 刷新地点列表（更新剩余数量）
            const updatedIds = gameState.collectedEvidence.map(e => e.id);
            const searchHandler = document.querySelector('.location-card')?.__searchHandler;
            if (searchHandler) {
                ui.renderLocations(gameState.locations, searchHandler, updatedIds, currentSearchRound === 2);
            }

            // 更新侧边栏证据列表
            ui.updateSidebar();
        }

        aiRemainingActions--;
        console.log(`AI搜证完成，剩余${aiRemainingActions}次`);

    } catch (error) {
        console.error('AI搜证失败:', error);
    }
}

// 玩家提前完成触发AI立即完成
function triggerAIInstantComplete() {
    if (aiSearchTimer) {
        clearInterval(aiSearchTimer);
    }

    // 立即完成所有剩余AI搜证
    const remainingSearches = aiRemainingActions;
    console.log(`玩家提前完成，AI立即完成剩余${remainingSearches}次搜证`);

    for (let i = 0; i < remainingSearches; i++) {
        performAISearch();
    }
    aiRemainingActions = 0;
}

// 导出到全局
window.startAIAutoSearch = startAIAutoSearch;
window.performAISearch = performAISearch;
window.triggerAIInstantComplete = triggerAIInstantComplete;
