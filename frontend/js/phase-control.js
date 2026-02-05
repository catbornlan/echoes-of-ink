// 游戏阶段控制系统
const GAME_PHASES = {
    WELCOME: 'welcome',
    SELECT_CHAR: 'select-char',
    READ_SCRIPT: 'read-script',
    GAME_MAIN: 'game-main',
    SEARCH: 'search',
    VOTE: 'vote',
    VOTE_RESULT: 'vote-result',
    TRUTH_REVEAL: 'truth-reveal'
};

let currentPhase = GAME_PHASES.WELCOME;

// 阶段配置（用于进度条）
const phaseConfig = [
    { id: GAME_PHASES.WELCOME, label: '开始', showInProgress: false },
    { id: GAME_PHASES.SELECT_CHAR, label: '选择角色', showInProgress: true },
    { id: GAME_PHASES.READ_SCRIPT, label: '阅读剧本', showInProgress: true },
    { id: GAME_PHASES.GAME_MAIN, label: '游戏进行', showInProgress: true },
    { id: GAME_PHASES.SEARCH, label: '搜证', showInProgress: true },
    { id: GAME_PHASES.VOTE, label: '投票', showInProgress: true },
    { id: GAME_PHASES.TRUTH_REVEAL, label: '真相', showInProgress: true }
];

// 渲染当前阶段
function renderPhase(newPhase, skipAnimation = false) {
    const oldPhase = currentPhase;
    currentPhase = newPhase;

    console.log(`阶段切换: ${oldPhase} → ${newPhase}`);

    // 获取所有phase容器
    const allPhases = document.querySelectorAll('[id^="phase-"]');
    const newContainer = document.getElementById(`phase-${newPhase}`);

    if (!newContainer) {
        console.error(`Phase container not found: phase-${newPhase}`);
        return;
    }

    if (skipAnimation) {
        // 直接切换，无动画
        allPhases.forEach(phase => phase.classList.add('hidden'));
        newContainer.classList.remove('hidden');
        allPhases.forEach(phase => phase.classList.add('hidden'));
        newContainer.classList.remove('hidden');
        // updateProgressBar(); // Removed
        return;
    }

    // 淡出旧内容
    allPhases.forEach(phase => {
        if (!phase.classList.contains('hidden')) {
            phase.classList.add('animate__animated', 'animate__fadeOut');
            setTimeout(() => {
                phase.classList.add('hidden');
                phase.classList.remove('animate__animated', 'animate__fadeOut');
            }, 500);
        }
    });

    // 淡入新内容
    setTimeout(() => {
        newContainer.classList.remove('hidden');
        newContainer.classList.add('animate__animated', 'animate__fadeIn');
        setTimeout(() => {
            newContainer.classList.remove('animate__animated', 'animate__fadeIn');
        }, 1000);

        updateProgressBar();
    }, 500);
}

// 更新进度条
function updateProgressBar() {
    const progressBar = document.getElementById('progress-bar');
    if (!progressBar) return;

    const visiblePhases = phaseConfig.filter(p => p.showInProgress);
    const currentIndex = visiblePhases.findIndex(p => p.id === currentPhase);

    if (currentIndex === -1) {
        progressBar.classList.add('hidden');
        return;
    }

    progressBar.classList.remove('hidden');
    progressBar.innerHTML = visiblePhases.map((phase, index) => {
        const isActive = index === currentIndex;
        const isComplete = index < currentIndex;

        return `
            <div class="step ${isActive ? 'step-primary' : isComplete ? 'step-accent' : ''}">
                ${phase.label}
            </div>
        `;
    }).join('');
}

// 阶段导航函数
function goToPhase(phaseName) {
    renderPhase(phaseName);
}
