// 动态启用输入框和更新提示文字
function enableInput(placeholder) {
    const input = document.getElementById('player-input');
    const sendBtn = document.getElementById('send-btn');
    const mentionButtons = document.getElementById('mention-buttons');

    input.disabled = false;
    input.placeholder = placeholder;
    sendBtn.disabled = false;
    sendBtn.style.display = 'inline-block';

    // 如果在讨论中，显示@按钮
    if (isInDiscussion) {
        mentionButtons.classList.remove('hidden');
    } else {
        mentionButtons.classList.add('hidden');
    }
}

// 禁用输入框
function disableInput() {
    const input = document.getElementById('player-input');
    const sendBtn = document.getElementById('send-btn');
    const mentionButtons = document.getElementById('mention-buttons');

    input.disabled = true;
    input.placeholder = '等待系统提示…';
    sendBtn.disabled = true;
    mentionButtons.classList.add('hidden');
}
