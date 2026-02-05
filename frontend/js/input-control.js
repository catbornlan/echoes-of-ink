// 控制输入框的启用/禁用状态
function updateInputState() {
    const playerInput = document.getElementById('player-input');
    const sendBtn = document.getElementById('send-btn');

    if (!playerInput || !sendBtn) return;

    // 允许输入的场景：
    // 1. 讨论环节（isInDiscussion = true 或 discuss_1/discuss_2）
    // 2. 自我介绍环节会单独控制，这里不处理
    const canInput = isInDiscussion ||
        gameState.currentPhase === 'discuss_1' ||
        gameState.currentPhase === 'discuss_2';

    if (canInput) {
        playerInput.disabled = false;
        playerInput.placeholder = '输入您的发言…（可指定角色回复）';
        sendBtn.disabled = false;
    } else {
        playerInput.disabled = true;
        playerInput.value = '';

        // 根据当前阶段显示提示
        if (gameState.currentPhase === 'search_1' || gameState.currentPhase === 'search_2') {
            playerInput.placeholder = '搜证环节暂不可发言';
        } else if (gameState.currentPhase === 'vote') {
            playerInput.placeholder = '投票环节暂不可发言';
        } else {
            playerInput.placeholder = '当前环节暂不可发言';
        }

        sendBtn.disabled = true;
    }
}

// 导出函数
window.updateInputState = updateInputState;
