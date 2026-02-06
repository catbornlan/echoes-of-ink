// 游戏状态管理 - Game State Management

const API_BASE = 'http://localhost:8000/api';

class GameState {
    constructor() {
        this.playerCharacter = null;
        this.currentPhase = null;
        this.actionPoints = { round1: 4, round2: 5 };
        this.collectedEvidence = [];
        this.publicEvidence = [];
        this.dialogueHistory = [];
        this.characters = [];
        this.locations = [];
        this.allEvidence = [];
        this.votes = {};
        this.phaseNarratives = {};
        this.phaseHistory = []; // 存储每个环节的AI总结
        this.apiBaseUrl = 'http://localhost:8000/api';
    }

    // 初始化游戏数据
    async initialize() {
        try {
            // 加载角色数据
            const charsResponse = await fetch(`${API_BASE}/characters`);
            this.characters = await charsResponse.json();

            // 加载地点数据
            const locsResponse = await fetch(`${API_BASE}/locations`);
            this.locations = await locsResponse.json();

            // 加载证据数据（用于调试）
            const evidenceResponse = await fetch(`${API_BASE}/evidence`);
            this.allEvidence = await evidenceResponse.json();

            return true;
        } catch (error) {
            console.error('Failed to initialize game:', error);
            return false;
        }
    }

    // 开始游戏
    async startGame(characterId) {
        try {
            const response = await fetch(`${API_BASE}/game/start?player_character=${characterId}`, {
                method: 'POST'
            });
            const gameState = await response.json();

            this.playerCharacter = gameState.player_character;
            this.currentPhase = gameState.current_phase;
            this.actionPoints.round1 = gameState.round_1_action_points;
            this.actionPoints.round2 = gameState.round_2_action_points;

            return gameState;
        } catch (error) {
            console.error('Failed to start game:', error);
            throw error;
        }
    }

    // 获取角色剧本
    async getCharacterScript(characterId) {
        try {
            const response = await fetch(`${API_BASE}/script/${characterId}`);
            const scriptData = await response.json();

            // 将剧本保存到本地状态，供UI侧边栏使用
            const char = this.characters.find(c => c.id === characterId);
            if (char) {
                char.full_script = scriptData.full_script;
                // 如果API返回其他有用信息(如秘密)，也一并保存
                if (scriptData.secrets) char.secrets = scriptData.secrets;
                if (scriptData.motivation) char.motivation = scriptData.motivation;
            }

            return scriptData;
        } catch (error) {
            console.error('Failed to get character script:', error);
            throw error;
        }
    }

    // 推进游戏阶段
    async advancePhase() {
        try {
            const response = await fetch(`${API_BASE}/game/advance_phase`, {
                method: 'POST'
            });
            const result = await response.json();
            this.currentPhase = result.current_phase;
            return result.current_phase;
        } catch (error) {
            console.error('Failed to advance phase:', error);
            throw error;
        }
    }

    // 生成批量剧本
    async generateScript(phase, duration = 180) {
        try {
            const context = await this.getContext();
            const response = await fetch(`${API_BASE}/director/generate_script`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phase: phase,
                    context: context,
                    duration: duration
                })
            });
            return await response.json();
        } catch (error) {
            console.error('Failed to generate script:', error);
            throw error;
        }
    }

    // 重新生成剧本（玩家打断）
    async regenerateScript(playerInput, remainingScript) {
        try {
            const context = await this.getContext();
            const response = await fetch(`${API_BASE}/director/regenerate_script`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    context: context,
                    player_input: playerInput,
                    remaining_script: remainingScript
                })
            });
            return await response.json();
        } catch (error) {
            console.error('Failed to regenerate script:', error);
            throw error;
        }
    }

    // 生成讨论回复（支持@提及）
    async generateDiscussionResponse(playerMessage, mentionedCharacter, phase) {
        try {
            const context = await this.getContext();
            const response = await fetch(`${API_BASE}/director/discussion_response`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    player_message: playerMessage,
                    mentioned_character: mentionedCharacter,
                    phase: phase || this.currentPhase,
                    context: {
                        ...context,
                        player_character: this.playerCharacter
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to generate discussion response: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to generate discussion response:', error);
            throw error;
        }
    }


    // 搜证
    async searchEvidence(locationId, evidenceId = null, actionPoints = 1) {
        try {
            const response = await fetch(`${API_BASE}/phase/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    character_id: this.playerCharacter,
                    location_id: locationId,
                    evidence_id: evidenceId,
                    action_points: actionPoints
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || '搜证失败');
            }

            const found = await response.json();

            // 更新本地状态
            found.forEach(ev => {
                if (!this.collectedEvidence.find(e => e.id === ev.id)) {
                    this.collectedEvidence.push(ev);
                }
            });

            return found;
        } catch (error) {
            console.error('Failed to search evidence:', error);
            throw error;
        }
    }

    // 公开证据
    async makeEvidencePublic(evidenceId) {
        try {
            const response = await fetch(`${API_BASE}/evidence/make_public?evidence_id=${evidenceId}`, {
                method: 'POST'
            });
            const result = await response.json();

            if (result.success && !this.publicEvidence.includes(evidenceId)) {
                this.publicEvidence.push(evidenceId);
            }

            return result;
        } catch (error) {
            console.error('Failed to make evidence public:', error);
            throw error;
        }
    }

    // 投票
    async vote(suspectId) {
        try {
            const response = await fetch(`${API_BASE}/phase/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    voter_id: this.playerCharacter,
                    suspect_id: suspectId
                })
            });
            return await response.json();
        } catch (error) {
            console.error('Failed to vote:', error);
            throw error;
        }
    }

    // 获取NPC投票
    async getNPCVotes() {
        try {
            const response = await fetch(`${API_BASE}/director/vote_decisions`, {
                method: 'POST'
            });
            return await response.json();
        } catch (error) {
            console.error('Failed to get NPC votes:', error);
            throw error;
        }
    }

    // 获取投票结果
    async getVoteResult() {
        try {
            const response = await fetch(`${API_BASE}/vote/result`);
            return await response.json();
        } catch (error) {
            console.error('Failed to get vote result:', error);
            throw error;
        }
    }

    // 获取环节过渡描写
    async getPhaseTransition(phase) {
        try {
            const response = await fetch(`${API_BASE}/director/phase_transition?phase=${phase}`, {
                method: 'POST'
            });
            const narrative = await response.json();
            this.phaseNarratives[phase] = narrative.narrative;
            return narrative;
        } catch (error) {
            console.error('Failed to get phase transition:', error);
            throw error;
        }
    }

    // 获取结局续写
    async getEndingEpilogue() {
        try {
            const response = await fetch(`${API_BASE}/director/ending_epilogue`, {
                method: 'POST'
            });
            return await response.json();
        } catch (error) {
            console.error('Failed to get ending epilogue:', error);
            throw error;
        }
    }

    // 添加消息到历史
    async addMessage(message) {
        try {
            await fetch(`${API_BASE}/message/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(message)
            });
            this.dialogueHistory.push(message);
        } catch (error) {
            console.error('Failed to add message:', error);
        }
    }

    // 获取AI上下文
    async getContext() {
        try {
            const response = await fetch(`${API_BASE}/context`);
            return await response.json();
        } catch (error) {
            console.error('Failed to get context:', error);
            return {};
        }
    }

    // 保存到localStorage
    save() {
        const state = {
            playerCharacter: this.playerCharacter,
            currentPhase: this.currentPhase,
            actionPoints: this.actionPoints,
            collectedEvidence: this.collectedEvidence,
            publicEvidence: this.publicEvidence,
            dialogueHistory: this.dialogueHistory,
            votes: this.votes,
            phaseNarratives: this.phaseNarratives,
            phaseHistory: this.phaseHistory
        };
        localStorage.setItem('murderMysteryGameState', JSON.stringify(state));
    }

    // 从localStorage加载
    load() {
        const saved = localStorage.getItem('murderMysteryGameState');
        if (saved) {
            const state = JSON.parse(saved);
            Object.assign(this, state);
            return true;
        }
        return false;
    }

    // 清除保存的游戏
    clear() {
        localStorage.removeItem('murderMysteryGameState');
    }

    // 获取角色信息
    getCharacter(characterId) {
        return this.characters.find(c => c.id === characterId);
    }

    // 获取地点信息
    getLocation(locationId) {
        return this.locations.find(l => l.id === locationId);
    }

    // 获取证据信息
    getEvidence(evidenceId) {
        return this.allEvidence.find(e => e.id === evidenceId);
    }
}

// 全局游戏状态实例
const gameState = new GameState();
