// UI 管理 - UI Management and Rendering

class UIManager {
    constructor() {
        this.currentScreen = 'opening-screen';
        this.scriptPlayer = null;
    }

    // 切换屏幕
    switchScreen(screenId) {
        // 隐藏当前屏幕
        const currentScreen = document.getElementById(this.currentScreen);
        if (currentScreen) {
            currentScreen.classList.remove('active');
        }

        // 显示新屏幕
        const newScreen = document.getElementById(screenId);
        if (newScreen) {
            newScreen.classList.add('active', 'transitioning');
            setTimeout(() => {
                newScreen.classList.remove('transitioning');
            }, 1000);
        }

        this.currentScreen = screenId;
    }

    // 显示Toast提示
    showToast(message, type = 'info') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast toast-top toast-center z-50'; // Top center
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `alert alert-${type} shadow-lg animate__animated animate__fadeInDown`;
        toast.innerHTML = `<span>${message}</span>`;

        container.appendChild(toast);

        // 3秒后自动消失
        setTimeout(() => {
            toast.classList.remove('animate__fadeInDown');
            toast.classList.add('animate__fadeOutUp');
            setTimeout(() => {
                toast.remove();
                if (container.children.length === 0) {
                    container.remove();
                }
            }, 500);
        }, 3000);
    }

    // 显示加载提示（场景化）
    showLoading(show = true, title = '游戏进行中', description = '请稍候…') {
        const overlay = document.getElementById('loading-overlay');
        const titleEl = document.getElementById('loading-title');
        const descEl = document.getElementById('loading-description');

        if (show) {
            titleEl.textContent = title;
            descEl.textContent = description;
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }

    // 渲染角色网格
    renderCharacterGrid(characters, containerId, onSelect) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        characters.forEach((char, index) => {
            const portraitUrl = `https://api.dicebear.com/9.x/notionists/svg?seed=${char.id}`;

            const card = document.createElement('div');
            card.className = 'card bg-base-100 shadow-xl cursor-pointer hover:shadow-2xl transition-all animate__animated animate__fadeInUp';
            card.style.animationDelay = `${index * 0.1}s`;

            card.innerHTML = `
                <figure class="px-10 pt-10">
                    <img src="${portraitUrl}" alt="${char.name}" class="rounded-xl h-32 w-32 object-cover" />
                </figure>
                <div class="card-body items-center text-center">
                    <h2 class="card-title">${char.name}</h2>
                    <p class="text-sm opacity-70">${char.role}，${char.age}岁</p>
                </div>
            `;

            card.addEventListener('click', () => onSelect(char));
            container.appendChild(card);
        });
    }

    // 渲染剧本内容
    renderScript(script) {
        const container = document.getElementById('script-content');
        container.innerHTML = `
            <h3>${script.name} - ${script.role}</h3>
            <p><strong>动机：</strong>${script.motivation}</p>
            <p><strong>剧本摘要：</strong></p>
            <p style="white-space: pre-wrap; line-height: 1.8;">${script.full_script}</p>
            <p><strong>秘密：</strong></p>
            <ul>
                ${script.secrets.map(s => `<li>${s}</li>`).join('')}
            </ul>
        `;
    }

    // 添加消息到对话区
    addMessage(message) {
        const container = document.getElementById('messages-container');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.is_player ? 'player' : 'npc'}`;

        messageDiv.innerHTML = `
            <div class="message-speaker">${message.speaker}</div>
            <div class="message-bubble">
                <div class="message-content">${message.content}</div>
                ${message.action ? `<div class="message-action">${message.action}</div>` : ''}
            </div>
        `;

        container.appendChild(messageDiv);

        // 平滑滚动到底部，始终显示最新消息
        setTimeout(() => {
            container.scrollTo({
                top: container.scrollHeight,
                behavior: 'smooth'
            });
        }, 100);
    }

    // 显示环节过渡描写
    showPhaseNarrative(narrative) {
        const container = document.getElementById('phase-narrative');
        container.innerHTML = narrative;
        container.classList.remove('hidden');

        setTimeout(() => {
            container.classList.add('hidden');
        }, 5000);
    }

    // 更新阶段指示器
    updatePhaseIndicator(phase) {
        const phaseNames = {
            'intro': '自我介绍',
            'search_1': '第一轮搜证',
            'discuss_1': '第一轮讨论',
            'search_2': '第二轮搜证',
            'discuss_2': '第二轮讨论',
            'vote': '投票',
            'reveal': '真相揭晓'
        };

        const phaseEl = document.getElementById('current-phase');
        if (phaseEl) {
            phaseEl.textContent = phaseNames[phase] || phase;
        } else {
            console.warn(`Element #current-phase not found for phase: ${phase}`);
        }
    }

    // 更新行动点显示
    updateActionPoints(points) {
        document.getElementById('action-points-display').textContent = `行动点: ${points}`;
    }

    // 渲染搜证地点（带剩余证据数和深度调查选项）
    renderLocations(locations, onSelect, collectedEvidenceIds = [], isRound2 = false) {
        console.log('[renderLocations] START', { locationsCount: locations?.length, isRound2 });
        try {
            const container = document.getElementById('location-grid');
            if (!container) {
                console.error('[renderLocations] Container #location-grid not found!');
                return;
            }
            container.innerHTML = '';

            if (!locations || !Array.isArray(locations)) {
                console.error('[renderLocations] Invalid locations data:', locations);
                container.innerHTML = '<div class="alert alert-error">地点数据加载错误</div>';
                return;
            }

            locations.forEach(loc => {
                // 计算该地点的剩余证据数
                const availableEvidence = gameState.allEvidence.filter(ev => {
                    if (ev.location !== loc.id) return false;
                    if (collectedEvidenceIds.includes(ev.id)) return false;
                    if (ev.is_deep) return false; // 深度调查证据不计入
                    return true;
                });

                const remainingCount = availableEvidence.length;

                // 获取该地点已收集的证据（用于深度调查）
                const collectedAtLocation = gameState.collectedEvidence.filter(ev =>
                    ev.location === loc.id && !ev.is_deep
                );

                const isDisabled = remainingCount === 0 && (!isRound2 || collectedAtLocation.length === 0);

                const card = document.createElement('div');
                card.className = 'location-card';
                if (isDisabled) {
                    card.classList.add('disabled');
                }

                card.innerHTML = `
                    <div class="location-name">${loc.name}</div>
                    <div class="location-description">${loc.description}</div>
                    <div class="evidence-count ${isDisabled ? 'empty' : ''}">
                        剩余证据: ${remainingCount}
                    </div>
                    ${isRound2 && collectedAtLocation.length > 0 ? `
                        <div class="deep-search-hint" style="margin-top: 8px; font-size: 0.9em; color: var(--subtle-red);">
                            可深度调查(${collectedAtLocation.length}个证据)
                        </div>
                    ` : ''}
                    ${isRound2 && collectedAtLocation.length > 0 ? `
                        <div class="collected-evidence-section" style="display: none; margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.1);">
                            <div style="font-weight: bold; margin-bottom: 8px;">已收集证据：</div>
                            ${collectedAtLocation.map(ev => `
                                <div class="evidence-deep-item" style="margin-bottom: 8px; padding: 8px; background: rgba(200,150,100,0.1); border-radius: 4px;">
                                    <div style="font-weight: bold;">${ev.label}</div>
                                    <button class="deep-search-btn" data-location="${loc.id}" data-evidence="${ev.id}" style="margin-top: 4px; padding: 4px 12px; background: var(--accent-red); color: white; border: none; border-radius: 4px; cursor: pointer;">
                                        🔍 深度调查 (2点)
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                `;

                // 普通搜证点击 - 绑定到整个卡片
                if (remainingCount > 0 && !isDisabled) {
                    card.style.cursor = 'pointer';
                    card.addEventListener('click', (e) => {
                        // 如果点击的是深度调查相关元素，不触发普通搜证
                        if (e.target.closest('.deep-search-hint') || e.target.closest('.deep-search-btn') || e.target.closest('.collected-evidence-section')) {
                            return;
                        }
                        onSelect(loc);
                    });
                }

                // 第二轮：可以展开查看深度调查选项
                if (isRound2 && collectedAtLocation.length > 0) {
                    const hint = card.querySelector('.deep-search-hint');
                    const section = card.querySelector('.collected-evidence-section');

                    if (hint && section) {
                        hint.style.cursor = 'pointer';
                        hint.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const isExpanded = section.style.display !== 'none';
                            section.style.display = isExpanded ? 'none' : 'block';
                            hint.textContent = isExpanded ? `可深度调查(${collectedAtLocation.length}个证据)` : '收起';
                        });
                    }

                    // 深度调查按钮点击
                    card.querySelectorAll('.deep-search-btn').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const locationId = btn.dataset.location;
                            const evidenceId = btn.dataset.evidence;
                            const location = gameState.locations.find(l => l.id === locationId);
                            onSelect(location, evidenceId, true); // 第三个参数 true 表示深度调查
                        });
                    });
                }

                container.appendChild(card);
            });
        } catch (e) {
            console.error('[renderLocations] Error rendering locations:', e);
            const container = document.getElementById('location-grid');
            if (container) container.innerHTML = '<div class="alert alert-error">渲染地点卡片时出错</div>';
        }
    }

    // 渲染证据列表
    renderEvidence(evidenceList, containerOrId, showPublicButton = false) {
        let container = containerOrId;
        if (typeof containerOrId === 'string') {
            container = document.getElementById(containerOrId);
        }

        if (!container) {
            console.error(`Container not found for evidence rendering`);
            return;
        }

        container.innerHTML = '<h4>收集的证据</h4>';

        console.log(`[renderEvidence] Rendering ${evidenceList.length} evidence items to ${containerId} `);

        // 如果没有证据，显示提示
        if (!evidenceList || evidenceList.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'empty-state';
            emptyDiv.innerHTML = '<p style="opacity: 0.6; padding: 16px;">暂无收集的证据</p>';
            container.appendChild(emptyDiv);
            return;
        }

        evidenceList.forEach(ev => {
            const evDiv = document.createElement('div');
            evDiv.className = 'evidence-item';

            const isPublic = gameState.publicEvidence.includes(ev.id);
            if (isPublic) {
                evDiv.classList.add('public');
            }

            evDiv.innerHTML = `
                < strong > ${ev.label}</strong >
                    ${isPublic ? '<span style="color: var(--subtle-red); margin-left: 8px;">✓ 已公开</span>' : ''}
            `;

            evDiv.classList.add('clickable');
            evDiv.addEventListener('click', async () => {
                const location = gameState.locations.find(l => l.id === ev.location);
                await window.showEvidenceModal(ev, location ? location.name : '未知');
            });

            // 如果是玩家证据且未公开，添加公开按钮
            if (showPublicButton && !isPublic) {
                const publicBtn = document.createElement('button');
                publicBtn.className = 'make-public-btn';
                publicBtn.textContent = '公开';
                publicBtn.addEventListener('click', async () => {
                    try {
                        await gameState.makeEvidencePublic(ev.id);
                        this.updateSidebar();
                        this.showToast(`证据"${ev.label}"已公开`, 'success');
                    } catch (error) {
                        this.showToast('公开证据失败: ' + error.message, 'error');
                    }
                });
                evDiv.appendChild(publicBtn);
            }

            container.appendChild(evDiv);
        });
    }

    // 更新侧边栏
    updateSidebar() {
        console.log('[updateSidebar] START --------------------------------');
        console.log('[updateSidebar] gameState state:', {
            playerCharacter: gameState.playerCharacter,
            collectedEvidenceCount: gameState.collectedEvidence?.length,
            publicEvidenceCount: gameState.publicEvidence?.length,
            phaseHistoryCount: gameState.phaseHistory?.length
        });

        // ========== 1. 剧本标签 ==========
        try {
            const scriptContainer = document.getElementById('sidebar-script');
            console.log('[updateSidebar] Script container found:', !!scriptContainer);

            if (scriptContainer) {
                const playerChar = gameState.getCharacter(gameState.playerCharacter);
                console.log('[updateSidebar] Player character found:', playerChar ? playerChar.name : 'null');

                if (playerChar && playerChar.full_script) {
                    console.log('[updateSidebar] Script length:', playerChar.full_script.length);
                    // 将剧本文本转换为 HTML
                    const scriptHtml = playerChar.full_script
                        .split('\n') // 尝试 standard newline first, usually JSON uses \n
                        .map(line => {
                            if (line.includes('\\n')) return line.split('\\n'); // Handle escaped newlines if any
                            return line;
                        })
                        .flat()
                        .map(line => {
                            const trimmed = line.trim();
                            // 识别标题（不含中文冒号的行）
                            if (trimmed && !trimmed.includes('：') && !trimmed.includes(':')) {
                                return `<h3 style="color: var(--accent-red); margin-top: 20px; margin-bottom: 10px;">${trimmed}</h3>`;
                            } else if (trimmed) {
                                return `<p style="margin: 8px 0; text-indent: 2em;">${trimmed}</p>`;
                            } else {
                                return '<br/>';
                            }
                        })
                        .join('');

                    scriptContainer.innerHTML = `
                    <div style="padding: 12px;">
                            <h2 style="color: var(--accent-red); border-bottom: 2px solid var(--accent-red); padding-bottom: 8px; margin-bottom: 16px;">
                                ${playerChar.name} 的剧本
                            </h2>
                            <div style="line-height: 1.8; font-size: 0.95em;">
                                ${scriptHtml}
                            </div>
                        </div>
                    `;
                } else {
                    scriptContainer.innerHTML = `
                    <div style="padding: 20px; text-align: center; color: #999;">
                        <p>请先选择角色</p>
                        </div>
                    `;
                }
            }
        } catch (e) {
            console.error('[updateSidebar] Error updating script:', e);
        }

        // ========== 2. 证据标签 ==========
        try {
            const collectedContainer = document.getElementById('collected-evidence-list');
            if (collectedContainer) {
                if (gameState.collectedEvidence && gameState.collectedEvidence.length > 0) {
                    collectedContainer.innerHTML = '<h3 style="margin-bottom: 12px;">我的证据</h3>';
                    this.renderEvidence(gameState.collectedEvidence, collectedContainer, true);
                } else {
                    collectedContainer.innerHTML = `
                    <div style="padding: 20px; text-align: center; color: #999;">
                            <p>暂无收集的证据</p>
                            <p style="font-size: 0.9em; margin-top: 8px;">在搜证环节收集证据</p>
                        </div>
                    `;
                }
            }

            const publicContainer = document.getElementById('public-evidence-list');
            if (publicContainer) {
                if (gameState.publicEvidence && gameState.publicEvidence.length > 0) {
                    publicContainer.innerHTML = '<h3 style="margin-bottom: 12px;">公开证据</h3>';
                    this.renderEvidence(gameState.publicEvidence, publicContainer, false);
                } else {
                    publicContainer.innerHTML = `
                    <div style="padding: 20px; text-align: center; color: #999;">
                            <p>暂无公开证据</p>
                            <p style="font-size: 0.9em; margin-top: 8px;">点击"公开"按钮分享证据</p>
                        </div>
                    `;
                }
            }
        } catch (e) {
            console.error('[updateSidebar] Error updating evidence:', e);
        }

        // ========== 3. 历史标签 ==========
        try {
            const historyContainer = document.getElementById('sidebar-history');
            if (historyContainer) {
                this.renderPhaseHistory(historyContainer);
            }

            // 自动滚动
            setTimeout(() => {
                const publicEl = document.getElementById('public-evidence-list');
                if (publicEl && publicEl.parentElement) {
                    publicEl.parentElement.scrollTop = publicEl.parentElement.scrollHeight;
                }
                const historyEl = document.getElementById('sidebar-history');
                if (historyEl && historyEl.parentElement) {
                    historyEl.parentElement.scrollTop = historyEl.parentElement.scrollHeight;
                }
            }, 100);

        } catch (e) {
            console.error('[updateSidebar] Error updating history:', e);
        }
    }

    // 渲染投票结果
    renderVoteResult(result) {
        const container = document.getElementById('vote-result');
        container.innerHTML = `
            <h3>投票结果</h3>
            <p>被投票者: <strong>${result.voted_character_name}</strong></p>
            <p>投票统计:</p>
            <ul>
                ${Object.entries(result.vote_counts).map(([char, count]) =>
            `<li>${gameState.getCharacter(char)?.name || char}: ${count}票</li>`
        ).join('')}
            </ul>
            <p class="${result.is_correct ? 'correct' : 'incorrect'}">
                ${result.is_correct ? '✓ 投对了！真凶就是小马！' : '✗ 投错了，真凶是小马'}
            </p>
            `;
    }

    // 渲染结局和续写
    async renderEndingEpilogue(epilogueText, voteResult) {
        const container = document.getElementById('ending-epilogue');

        // 获取故事还原
        const storyTruth = await this.getStoryTruth();

        container.innerHTML = `
            <div style="padding: 20px; max-width: 900px; margin: 0 auto;">
                <h2 style="color: var(--accent-red); text-align: center; font-size: 2.5em; margin-bottom: 40px; text-shadow: 2px 2px 4px rgba(0,0,0,0.1);">
                    📜 游戏结局
                </h2>
                
                <!-- 结局续写 -->
                <div class="epilogue-section" style="background: linear-gradient(135deg, rgba(200,150,100,0.08) 0%, rgba(150,100,50,0.08) 100%); padding: 30px; border-radius: 12px; margin-bottom: 40px; box-shadow: 0 6px 12px rgba(0,0,0,0.1); border: 2px solid var(--accent-red);">
                    <h3 style="color: var(--accent-red); font-size: 1.8em; margin-bottom: 20px; text-align: center;">
                        ${voteResult?.is_correct ? '✓ 真相大白' : '✗ 误判悲剧'}
                    </h3>
                    <div style="line-height: 2; white-space: pre-wrap; font-size: 1.05em; color: #333;">
                        ${epilogueText}
                    </div>
                </div>
                
                <!-- 故事还原 -->
                <div class="truth-section" style="background: rgba(255,255,255,0.95); padding: 30px; border-radius: 12px; margin-bottom: 40px; box-shadow: 0 6px 12px rgba(0,0,0,0.15); border-left: 5px solid var(--accent-red);">
                    <h3 style="color: var(--accent-red); font-size: 1.8em; margin-bottom: 20px; border-bottom: 3px solid var(--accent-red); padding-bottom: 12px;">
                        🔍 ${storyTruth.title} · 真相还原
                    </h3>
                    <div style="line-height: 2; white-space: pre-wrap; font-size: 1.02em; color: #444;">
                        ${this.formatStoryTruth(storyTruth.truth_story)}
                    </div>
                </div>
                
                <!-- 重新开始按钮 -->
                <div style="text-align: center; margin-top: 50px; padding: 30px 0; border-top: 3px double var(--accent-red);">
                    <button onclick="location.reload()" class="btn btn-primary" style="padding: 15px 50px; font-size: 1.2em; background: var(--accent-red); border: none; box-shadow: 0 4px 8px rgba(0,0,0,0.2); transition: all 0.3s;">
                        🔄 重新开始游戏
                    </button>
                </div>
            </div>
        `;
    }

    // 获取故事真相
    async getStoryTruth() {
        try {
            const response = await fetch('http://localhost:8000/api/story_truth');
            return await response.json();
        } catch (error) {
            console.error('加载故事真相失败:', error);
            return {
                title: '不知境中人',
                truth_story: '故事还原加载失败...'
            };
        }
    }

    // 格式化故事真相文本
    formatStoryTruth(text) {
        if (!text) return '';

        return text
            .split('\n')
            .map(line => {
                line = line.trim();
                // 识别章节标题（## 或 ###）
                if (line.startsWith('###')) {
                    return `<h4 style="color: var(--accent-red); margin-top: 24px; margin-bottom: 12px; font-size: 1.3em;">${line.replace(/^###\s*/, '')}</h4>`;
                } else if (line.startsWith('##')) {
                    return `<h3 style="color: var(--accent-red); margin-top: 32px; margin-bottom: 16px; font-size: 1.5em; border-bottom: 2px solid var(--accent-red); padding-bottom: 8px;">${line.replace(/^##\s*/, '')}</h3>`;
                } else if (line) {
                    return `<p style="margin: 10px 0; text-indent: 2em;">${line}</p>`;
                } else {
                    return '<br/>';
                }
            })
            .join('');
    }

    // 获取所有角色的完整剧本（已弃用）
    async getAllCharacterScripts() {
        return gameState.characters || [];
    }

    // 格式化剧本文本
    formatScript(script) {
        if (!script) return '';

        return script
            .split('\\n')
            .map(line => {
                line = line.trim();
                // 识别章节标题
                if (line && !line.includes('：') && !line.includes(':') && line.length < 20) {
                    return `<h5 style="color: var(--accent-red); margin-top: 16px; margin-bottom: 8px;">${line}</h5>`;
                } else if (line) {
                    return `<p style="margin: 6px 0; text-indent: 2em;">${line}</p>`;
                } else {
                    return '<br/>';
                }
            })
            .join('');
    }

    // 渲染历史记录
    renderPhaseHistory(container) {
        if (!gameState.phaseHistory || gameState.phaseHistory.length === 0) {
            container.innerHTML = `
                <div style="padding: 20px; text-align: center; opacity: 0.6;">
                    <p>暂无历史记录</p>
                    <p style="font-size: 0.9em; margin-top: 8px;">游戏进行中会自动记录各环节总结</p>
                </div>
            `;
            return;
        }

        const phaseNames = {
            'intro': '自我介绍',
            'discuss_1': '第一轮讨论',
            'search_1': '第一轮搜证',
            'discuss_2': '第二轮讨论',
            'search_2': '第二轮搜证',
            'vote': '投票环节'
        };

        const historyHtml = gameState.phaseHistory.map((entry, index) => {
            return `
                <div class="history-entry" style="margin-bottom: 16px; padding: 12px; background: rgba(200,150,100,0.05); border-left: 3px solid var(--accent-red); border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <h4 style="color: var(--accent-red); margin: 0;">
                            ${phaseNames[entry.phase] || entry.phase}
                        </h4>
                        <span style="font-size: 0.85em; color: #999;">
                            ${new Date(entry.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                    <p style="margin: 0; line-height: 1.6; white-space: pre-wrap;">
                        ${entry.summary}
                    </p>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div style="padding: 12px;">
                <h2 style="color: var(--accent-red); border-bottom: 2px solid var(--accent-red); padding-bottom: 8px; margin-bottom: 16px;">
                    游戏历史
                </h2>
                ${historyHtml}
            </div>
        `;
    }

    // 渲染完整真相
    renderTruthReveal() {
        const container = document.getElementById('truth-reveal');
        container.innerHTML = `
                < h3 > 完整真相</h3 >
            <p><strong>真凶：</strong>小马</p>
            <p><strong>杀人动机：</strong>发现自己是被马良用神笔画出来的，愤怒之下杀死了马良</p>
            <p><strong>作案手法：</strong>用烛台砸头、切下手指、刺瞎双眼、刺穿心脏</p>
            <p><strong>核心秘密：</strong>马良拥有神笔，可以画物成真。小马、夏仙姑、杏儿花都是被画出来的。</p>
            <h4>所有角色的隐藏信息：</h4>
            <ul>
                <li><strong>小马：</strong>真凶，被画出来的，发现真相后杀死马良</li>
                <li><strong>李四：</strong>深爱夏仙姑，调查张三失踪</li>
                <li><strong>夏仙姑：</strong>被画出来的，偷走神笔，利用吴行阙</li>
                <li><strong>杏儿花：</strong>被画出来的，偷了金条</li>
                <li><strong>薛名医：</strong>想让马良画活妻子</li>
                <li><strong>吴行阙：</strong>被夏仙姑利用，因重感冒记忆模糊</li>
            </ul>
            `;
    }
}

// 剧本播放引擎
class ScriptPlayer {
    constructor() {
        this.isPlaying = false;
        this.isPaused = false;
        this.currentScript = [];
        this.currentIndex = 0;
        this.playInterval = null;
    }

    // 播放剧本
    async play(script) {
        // 防御性检查
        if (!script || !script.messages || !Array.isArray(script.messages)) {
            console.error('Invalid script format:', script);
            return;
        }

        this.currentScript = script.messages;
        this.currentIndex = 0;
        this.isPlaying = true;
        this.isPaused = false;

        for (let i = 0; i < this.currentScript.length; i++) {
            if (!this.isPlaying || this.isPaused) {
                break;
            }

            const message = this.currentScript[i];
            this.currentIndex = i;

            // 添加消息到UI
            ui.addMessage(message);
            await gameState.addMessage(message);

            // 等待到下一条消息的时间
            if (i < this.currentScript.length - 1) {
                const nextMessage = this.currentScript[i + 1];
                const waitTime = (nextMessage.timestamp - message.timestamp) * 1000;
                await this.sleep(waitTime);
            }
        }

        this.isPlaying = false;
    }

    // 暂停播放
    pause() {
        this.isPaused = true;
    }

    // 继续播放
    resume(newScript = null) {
        if (newScript) {
            this.currentScript = newScript.messages;
            this.currentIndex = 0;
        }
        this.isPaused = false;
        this.play({ messages: this.currentScript.slice(this.currentIndex) });
    }

    // 停止播放
    stop() {
        this.isPlaying = false;
        this.isPaused = false;
        this.currentScript = [];
        this.currentIndex = 0;
    }

    // 获取剩余剧本
    getRemainingScript() {
        return this.currentScript.slice(this.currentIndex);
    }

    // 辅助函数：延迟
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 全局UI管理器实例
window.ui = new UIManager();
window.scriptPlayer = new ScriptPlayer();
