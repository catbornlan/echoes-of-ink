"""
AI God Director - 批量生成剧本的上帝导演
Generates batch scripts for NPC dialogues with motivation priority system.
"""
import json
import requests
from typing import List, Dict, Any
from backend.config import config
from backend.models import (
    Message, ScriptBatch, GamePhase, Character, 
    PhaseTransitionNarrative, EndingEpilogue
)


class GodDirector:
    """AI God Director for generating batch NPC scripts."""
    
    def __init__(self):
        """Initialize God Director with Gemini REST API."""
        self.api_key = config.get_gemini_api_key()
        self.model_name = 'gemini-2.5-flash'
        self.api_base = 'https://generativelanguage.googleapis.com/v1'
        
        # Load character data
        with open('backend/data/characters.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
            self.characters = {c['id']: Character(**c) for c in data['characters']}
            self.game_info = data['game_info']
    
    def _call_gemini_api(self, prompt: str, system_instruction: str = "") -> str:
        """Call Gemini REST API v1 and return text response."""
        url = f"{self.api_base}/models/{self.model_name}:generateContent"
        headers = {'Content-Type': 'application/json'}
        
        # Build contents array
        contents = []
        if system_instruction:
            contents.append({"role": "user", "parts": [{"text": system_instruction + "\n\n" + prompt}]})
        else:
            contents.append({"role": "user", "parts": [{"text": prompt}]})
        
        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": 1.0,
                "maxOutputTokens": 8192
            }
        }
        
        response = requests.post(
            f"{url}?key={self.api_key}",
            headers=headers,
            json=payload,
            timeout=60
        )
        response.raise_for_status()
        
        result = response.json()
        return result['candidates'][0]['content']['parts'][0]['text']
    
    def _build_system_prompt(self) -> str:
        """Build system prompt with all character scripts and motivation rules."""
        prompt = f"""你是《{self.game_info.get('title', '不知境中人')}》剧本杀游戏的"上帝导演"。你需要批量生成NPC的群聊剧本。

## 游戏背景
{self.game_info.get('description', '山中豪宅，画师马良惨死于寝室。神笔点石成金，却也画出了谎言与真相。')}

## 角色信息
"""
        for char_id, char in self.characters.items():
            prompt += f"""
### {char.name}（{char.role}，{char.age}岁）
- **动机**: {char.motivation}
- **秘密**: {', '.join(char.secrets)}
- **性格**: {char.personality}
- **策略**: {char.strategy}
- **剧本**: {char.full_script}
"""
        
        prompt += """
## 动机优先级堆栈（Persona Priority）
你必须严格遵守以下优先级规则：

**Priority 0 (生存) - 最高优先级**：
- 如果角色被指控杀人且证据确凿 → 极力否认、找替罪羊、转移话题
- 真凶（小马）必须隐藏自己被画出的身份和杀人动机
- 例如：小马被质疑时，会反问"我为什么要杀父亲？"，并暗示其他人有动机

**Priority 1 (次要秘密)**：
- 如果被指控次要罪行（偷窃、隐瞒等）→ 权衡利弊
- 如果承认次要罪行能洗清杀人嫌疑 → 弃车保帅，承认次要罪行
- 例如：杏儿花被指控杀人时，会承认偷金条，但强调"我只是偷钱，不是杀人"

**Priority 2 (日常伪装)**：
- 无证据压力时 → 保持人设
- 例如：李四粗鲁直率，薛名医清高，夏仙姑柔弱

## 输出格式
你必须返回一个JSON数组，每个元素包含：
- speaker: 发言者名字
- content: 发言内容（50-150字，符合古风剧本杀风格）
- action: 形态描写（20-40字，描述动作、表情、语气）
- timestamp: 相对时间戳（秒），从0开始，每句话间隔2-5秒

## 注意事项
1. NPC之间会互相质疑、辩论、打圆场
2. 真凶（小马）会积极转移怀疑
3. 每个角色的发言必须符合其动机和策略
4. 形态描写要生动，增强沉浸感
5. 不要让角色无脑公开所有秘密
6. 根据已公开证据调整发言策略
"""
        return prompt
    
    def generate_batch_script(
        self, 
        phase: GamePhase, 
        context: Dict[str, Any], 
        duration: int = 180
    ) -> ScriptBatch:
        """
        批量生成3分钟群聊剧本.
        
        Args:
            phase: 当前游戏阶段
            context: 当前局势（已公开证据、对话历史、怀疑度等）
            duration: 生成时长（秒），默认180秒
        
        Returns:
            ScriptBatch: 批量生成的剧本
        """
        system_prompt = self._build_system_prompt()
        
        # 构建上下文提示
        context_prompt = f"""
## 当前阶段
{phase.value}

## 已公开证据
{json.dumps(context.get('public_evidence', []), ensure_ascii=False, indent=2)}

## 对话历史（最近10条）
{json.dumps(context.get('recent_messages', []), ensure_ascii=False, indent=2)}

## 当前怀疑度
{json.dumps(context.get('suspicion_levels', {}), ensure_ascii=False, indent=2)}

## 任务
请生成接下来{duration}秒（约{duration // 2}句话）的群聊剧本。
要求：
1. NPC之间互相质疑、辩论
2. 真凶（小马）积极转移怀疑
3. 根据已公开证据调整策略
4. 符合动机优先级堆栈

请直接返回JSON数组，不要有任何其他文字：
[
  {{"speaker": "李四", "content": "...", "action": "...", "timestamp": 0}},
  {{"speaker": "薛名医", "content": "...", "action": "...", "timestamp": 3}},
  ...
]
"""
        
        try:
            print(f"\n[AI Director] Starting generate_content...")
            print(f"[AI Director] Prompt length: {len(system_prompt + context_prompt)}")
            
            response = self.model.generate_content(
                system_prompt + context_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.8,
                    max_output_tokens=4096,
                )
            )
            
            print(f"[AI Director] ✅ Response received!")
            
            # 解析JSON响应
            response_text = response.text.strip()
            print(f"[AI Director] Response text length: {len(response_text)}")
            
            # 移除可能的markdown代码块标记
            if response_text.startswith('```'):
                response_text = response_text.split('\n', 1)[1]
                response_text = response_text.rsplit('```', 1)[0]
            
            messages_data = json.loads(response_text)
            print(f"[AI Director] Parsed {len(messages_data)} messages")
            
            messages = [
                Message(
                    speaker=msg['speaker'],
                    content=msg['content'],
                    action=msg.get('action'),
                    timestamp=msg['timestamp'],
                    is_player=False
                )
                for msg in messages_data
            ]
            
            return ScriptBatch(
                messages=messages,
                duration=duration,
                phase=phase
            )
        
        except Exception as e:
            print(f"Error generating batch script: {e}")
            # 返回默认剧本
            return ScriptBatch(
                messages=[
                    Message(
                        speaker="李四",
                        content="这事儿太蹊跷了，老爷平日待人和善，怎会遭此横祸？",
                        action="皱眉，摆弄着镣铐",
                        timestamp=0,
                        is_player=False
                    )
                ],
                duration=duration,
                phase=phase
            )
    
    def regenerate_script(
        self,
        context: Dict[str, Any],
        player_input: str,
        remaining_script: List[Message]
    ) -> ScriptBatch:
        """
        玩家打断后重写剧本.
        
        Args:
            context: 当前局势
            player_input: 玩家的发言
            remaining_script: 剩余未播放的剧本
        
        Returns:
            ScriptBatch: 重写后的剧本
        """
        system_prompt = self._build_system_prompt()
        
        context_prompt = f"""
## 玩家打断
玩家（{context.get('player_character')}）突然发言："{player_input}"

## 当前局势
已公开证据: {json.dumps(context.get('public_evidence', []), ensure_ascii=False)}
对话历史: {json.dumps(context.get('recent_messages', []), ensure_ascii=False)}

## 任务
玩家打断了对话，请根据玩家的发言重新生成后续剧本（约30秒，15句话）。
要求：
1. NPC必须对玩家的发言做出反应
2. 如果玩家指控某人，该角色必须根据动机优先级堆栈回应
3. 其他NPC也会参与讨论
4. 符合各角色的人设和策略
5. **重要**：不要生成玩家角色（{context.get('player_character')}）的对话，玩家自己会发言

请直接返回JSON数组（不要包含玩家角色的对话）：
[
  {{"speaker": "...", "content": "...", "action": "...", "timestamp": 0}},
  ...
]
"""
        
        try:
            print(f"\n[regenerate_script] Starting...")
            print(f"[regenerate_script] Player input: {player_input}")
            print(f"[regenerate_script] Context keys: {list(context.keys())}")
            
            # Retry logic for API quota limits
            max_retries = 3
            import time
            
            for attempt in range(max_retries):
                try:
                    response_text = self._call_gemini_api(context_prompt, system_prompt)
                    break # Success
                except Exception as e:
                    if "429" in str(e) or "Quota exceeded" in str(e) or "Resource exhausted" in str(e):
                        if attempt < max_retries - 1:
                            wait_time = [5, 15, 30][attempt]
                            print(f"[regenerate_script] Quota error, retrying in {wait_time}s...")
                            time.sleep(wait_time)
                            continue
                    raise e # Re-raise if not quota error or max retries reached
            
            print(f"[regenerate_script] ✅ AI response received")
            
            response_text = response_text.strip()
            print(f"[regenerate_script] Response length: {len(response_text)}")
            print(f"[regenerate_script] Raw response:\n{response_text}\n")
            
            if response_text.startswith('```'):
                response_text = response_text.split('\n', 1)[1]
                response_text = response_text.rsplit('```', 1)[0]
                print(f"[regenerate_script] After removing markdown: {response_text}")
            
            messages_data = json.loads(response_text)
            print(f"[regenerate_script] Parsed {len(messages_data)} messages")
            
            # 过滤掉玩家角色的对话（防止 AI 扮演玩家）
            player_char_id = context.get('player_character')
            if player_char_id and player_char_id in self.characters:
                # 获取玩家角色名称
                player_char_name = self.characters[player_char_id].name
                
                original_count = len(messages_data)
                messages_data = [msg for msg in messages_data if msg.get('speaker') != player_char_name]
                if len(messages_data) < original_count:
                    print(f"[regenerate_script] ⚠️ Filtered out {original_count - len(messages_data)} player messages from {player_char_name}")
            
            messages = [
                Message(
                    speaker=msg['speaker'],
                    content=msg['content'],
                    action=msg.get('action'),
                    timestamp=msg['timestamp'],
                    is_player=False
                )
                for msg in messages_data
            ]
            
            return ScriptBatch(
                messages=messages,
                duration=30,
                phase=context.get('current_phase', GamePhase.DISCUSS_1)
            )
        
        except Exception as e:
            print(f"\n❌ [regenerate_script] ERROR: {type(e).__name__}: {str(e)}")
            import traceback
            traceback.print_exc()
            
            # Fallback response to ensure frontend doesn't break
            fallback_messages = [
                Message(
                    speaker="系统",
                    content="（AI 导演正在思考中，请稍候再试...）",
                    action="提示",
                    timestamp=0,
                    is_player=False
                )
            ]
            return ScriptBatch(
                messages=fallback_messages,
                duration=5,
                phase=context.get('current_phase', GamePhase.DISCUSS_1)
            )
    
    def make_vote_decisions(self, context: Dict[str, Any]) -> Dict[str, str]:
        """
        生成所有NPC的投票决策.
        
        Args:
            context: 当前局势（已公开证据、对话历史等）
        
        Returns:
            Dict[str, str]: {voter_id: suspect_id}
        """
        system_prompt = self._build_system_prompt()
        
        context_prompt = f"""
## 投票环节
经过两轮搜证和讨论，现在进入投票环节。

## 当前局势
已公开证据: {json.dumps(context.get('public_evidence', []), ensure_ascii=False)}
对话历史: {json.dumps(context.get('dialogue_history', []), ensure_ascii=False)}
怀疑度: {json.dumps(context.get('suspicion_levels', {}), ensure_ascii=False)}

## 任务
请为每个NPC生成投票决策。
要求：
1. 真凶（小马）会投给最有嫌疑的其他人
2. 其他NPC根据证据和讨论投票
3. 如果某人被大量证据指向，会被集中投票
4. 符合各角色的智商和策略

请返回JSON对象：
{{
  "lisi": "xiaoma",
  "xiaxiangu": "wuxingque",
  ...
}}
"""
        
        try:
            response = self.model.generate_content(
                system_prompt + context_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.7,
                    max_output_tokens=512,
                )
            )
            
            response_text = response.text.strip()
            if response_text.startswith('```'):
                response_text = response_text.split('\n', 1)[1]
                response_text = response_text.rsplit('```', 1)[0]
            
            votes = json.loads(response_text)
            return votes
        
        except Exception as e:
            print(f"Error generating votes: {e}")
            # 默认投票：都投给小马（真凶）
            return {
                char_id: "xiaoma" 
                for char_id in self.characters.keys() 
                if char_id != context.get('player_character')
            }
    
    def generate_phase_transition(
        self, 
        phase: GamePhase, 
        context: Dict[str, Any]
    ) -> PhaseTransitionNarrative:
        """
        生成环节过渡描写.
        
        Args:
            phase: 刚结束的阶段
            context: 当前局势
        
        Returns:
            PhaseTransitionNarrative: 过渡描写
        """
        system_prompt = self._build_system_prompt()
        
        context_prompt = f"""
## 环节过渡
{phase.value} 环节刚刚结束。

## 当前局势
对话历史: {json.dumps(context.get('recent_messages', []), ensure_ascii=False)}
怀疑度: {json.dumps(context.get('suspicion_levels', {}), ensure_ascii=False)}

## 任务
请生成一段环节过渡描写（80-150字），描述刚才环节的氛围和重点角色的状态。
例如："经过刚才剑拔弩张的对峙，小马成为了众矢之的，神色格外慌张。李四紧握拳头，似乎在压抑着什么情绪。夏仙姑低头不语，眼神闪烁不定。"

要求：
1. 描写氛围（紧张、激烈、诡异等）
2. 重点描写怀疑度最高的1-2个角色
3. 符合古风剧本杀风格
4. 不要剧透真凶

请直接返回描写文字，不要JSON格式。
"""
        
        try:
            response = self.model.generate_content(
                system_prompt + context_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.9,
                    max_output_tokens=256,
                )
            )
            
            narrative = response.text.strip()
            
            # 找出怀疑度最高的角色
            suspicion = context.get('suspicion_levels', {})
            key_characters = sorted(
                suspicion.items(), 
                key=lambda x: x[1], 
                reverse=True
            )[:2]
            key_character_ids = [char[0] for char in key_characters]
            
            return PhaseTransitionNarrative(
                phase=phase,
                narrative=narrative,
                key_characters=key_character_ids
            )
        
        except Exception as e:
            print(f"Error generating phase transition: {e}")
            return PhaseTransitionNarrative(
                phase=phase,
                narrative="众人沉默不语，气氛凝重。",
                key_characters=[]
            )
    
    def generate_ending_epilogue(
        self,
        voted_character_id: str,
        context: Dict[str, Any]
    ) -> EndingEpilogue:
        """
        生成结局描写，根据投票结果展示不同结局.
        
        Args:
            voted_character_id: 被投票的角色ID
            context: 游戏全程数据（对话历史、证据等）
        
        Returns:
            EndingEpilogue: 结局对象
        """
        voted_char = self.characters.get(voted_character_id)
        is_correct = (voted_character_id == 'xiaoma')
        
        # 准备上下文信息
        dialogue_summary = self._summarize_context(context.get('dialogue_history', []))
        evidence_summary = self._summarize_evidence(context.get('public_evidence', []))
        
        system_prompt = """你是一位擅长古风剧本杀的编剧，现在要为《不知境中人》这个剧本撰写结局。

剧本背景：
- 画师马良被杀，真凶是小马（马良之子）
- 小马发现自己是被马良用神笔画出来的，愤怒之下杀死马良
- 小马毁掉了马良的手和眼，刺穿了他的心脏

你的任务是根据玩家的推理结果和游戏过程，撰写一个500-2000字的结局。"""

        if is_correct:
            prompt = f"""## 投票结果
众人正确指认小马为真凶。

## 游戏过程回顾
{dialogue_summary}

{evidence_summary}

## 任务
请撰写一个500-2000字的结局，要求：

1. **开场**（100-200字）
   - 描写投票结果宣布的场景
   - 众人的反应

2. **真相揭露**（200-400字）
   - 小马如何承认罪行
   - 小马讲述自己发现被画出来的过程
   - 他的愤怒、绝望、痛苦

3. **案发经过还原**（200-400字）
   - 小马如何得知真相
   - 为什么要毁坏手眼、刺穿心脏
   - 作案过程的细节

4. **各角色反应**（100-200字）
   - 杏儿花的反应（她早已知道小马是画的）
   - 薛名医的反应（他也知道秘密）
   - 其他人的震惊

5. **结局**（100-200字）
   - 小马被带走
   - 神笔的命运
   - 对这个悲剧的感悟

风格要求：
- 古风叙事，有画面感
- 情感充沛，引人共鸣
- 揭示核心主题：被创造的生命也有尊严
- 悲剧色彩，发人深省

直接返回结局文本，不要JSON格式。"""
        else:
            char_name = voted_char.name if voted_char else "某人"
            prompt = f"""## 投票结果
众人错误地指认{char_name}为凶手，真凶小马逃脱。

## 游戏过程回顾
{dialogue_summary}

{evidence_summary}

## 任务
请撰写一个500-2000字的悲剧结局，要求：

1. **误判场景**（100-200字）
   - {char_name}被指认时的绝望
   - 小马暗自庆幸

2. **{char_name}的冤屈**（200-300字）
   - {char_name}如何为自己辩解
   - 但证据似乎都指向他/她
   - 被带走时的悲愤

3. **真相永远埋葬**（200-400字）
   - 小马成功脱身
   - 数月后，小马在远方自杀
   - 遗书揭露真相（自己是画出来的）

4. **悲剧后果**（100-200字）
   - {char_name}在狱中的绝望
   - 真相大白但为时已晚
   - {char_name}至死冤屈

5. **深刻反思**（100-200字）
   - 推理需要证据，不能凭猜测
   - 错误判断的代价
   - 对正义和真相的思考

风格要求：
- 古风叙事，悲剧色彩浓厚
- 强调误判的可怕后果
- 留下深刻的遗憾和反思

直接返回结局文本，不要JSON格式。"""
        
        try:
            response = self.model.generate_content(
                system_prompt + "\n\n" + prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.9,
                    max_output_tokens=2048,
                )
            )
            
            epilogue = response.text.strip()
            
        except Exception as e:
            print(f"生成结局失败: {e}")
            # 使用备用结局
            if is_correct:
                epilogue = self._get_default_correct_ending()
            else:
                epilogue = self._get_default_wrong_ending(voted_char.name if voted_char else "某人")
        
        return EndingEpilogue(
            voted_character=voted_character_id,
            is_correct=is_correct,
            epilogue=epilogue
        )
    
    def _summarize_context(self, dialogue_history: list) -> str:
        """总结对话历史"""
        if not dialogue_history or len(dialogue_history) == 0:
            return "游戏过程中，众人讨论较少，线索有限。"
        
        # 提取关键对话
        summary = f"在推理过程中，共进行了{len(dialogue_history)}轮对话。\n关键讨论：\n"
        
        # 随机选取5-10条关键对话
        import random
        sample_size = min(10, len(dialogue_history))
        samples = random.sample(dialogue_history, sample_size) if len(dialogue_history) > sample_size else dialogue_history
        
        for msg in samples[:5]:  # 只取前5条
            if isinstance(msg, dict) and msg.get('speaker') != '系统':
                speaker = msg.get('speaker', '某人')
                content = msg.get('content', '')[:80]  # 截断到80字
                summary += f"- {speaker}：{content}\n"
        
        return summary
    
    def _summarize_evidence(self, public_evidence: list) -> str:
        """总结公开证据"""
        if not public_evidence or len(public_evidence) == 0:
            return "公开证据：无人公开证据。"
        
        summary = f"公开证据（共{len(public_evidence)}个）：\n"
        for evi in public_evidence[:5]:  # 只取前5个
            if isinstance(evi, dict):
                label = evi.get('label', '未知证据')
                summary += f"- {label}\n"
        
        return summary
    
    def _get_default_correct_ending(self) -> str:
        """默认正确结局"""
        return """## 真相大白

众人的推理准确无误，小马就是杀害马良的真凶。

投票结果宣布的那一刻，大厅陷入了死寂。所有人的目光都集中在小马身上，期待他的反应。

小马缓缓抬起头，脸上不再有恐惧，只剩下深深的悲哀。他苦笑了一声："你们赢了。是的，我杀了他。"

杏儿花颤抖着捂住嘴，泪水夺眶而出。薛名医叹了口气，似乎早已料到这个结果。

"但你们知道为什么吗？"小马的声音平静得可怕，他环视四周，一字一句地说："因为我不是人，我是一幅画。马良用神笔把我画了出来，给了我生命，却也给了我谎言。"

众人震惊。

小马继续道："我以为自己有父母，有过去，有未来...但那天晚上，当我问他真相时，他承认了。他说他只是想要个儿子，就用神笔画出了我。"他的声音开始颤抖，"可我不是真正的儿子，我是个被创造的赝品！一个没有灵魂的假象！"

那一刻，愤怒、绝望、痛苦涌上心头。小马毁掉了马良的手指——那双创造他的手；刺瞎了他的双眼——那双赋予他形体的眼；最后，刺穿了他的心脏——让这个秘密永远埋葬。

最终，小马被官府带走。马良的豪宅空荡荡的，神笔也随着主人的离世失去了魔力。

这个案子告诉我们：即使是被创造的生命，也有自己的尊严和选择。但杀人终究是杀人，无论理由多么充分，都无法逃脱惩罚。

**游戏结束 - 真相已揭晓**"""
    
    def _get_default_wrong_ending(self, char_name: str) -> str:
        """默认错误结局"""
        return f"""## 误判的悲剧

众人将矛头指向了{char_name}，然而这是一个致命的错误。

当投票结果宣布时，{char_name}瘫坐在地，绝望地辩解："不是我！我没有杀人！"但证据似乎都指向他/她，众人已经做出了判断。

小马站在人群中，低着头，内心却暗自庆幸。神笔的秘密，自己被画出来的真相，终于可以永远埋葬了。

官府将{char_name}带走了。在押往牢狱的路上，{char_name}一直在喊冤，但没有人相信。

三个月后，在遥远的南方，人们发现了一具尸体。经辨认，正是失踪的小马。他身旁放着一封遗书：

"我杀了父亲，是因为我发现自己只是一幅画。我不是真正的人，我是马良用神笔创造出来的假象。我无法原谅他赋予我虚假的生命，让我活在谎言之中。但我更无法原谅自己，让无辜的{char_name}承受了不该承受的罪责..."

真相大白，但为时已晚。{char_name}已在牢中度过了数月，身心俱疲，至死都在喊冤。

这个悲剧告诉我们：推理需要证据，猜测终究只是猜测。一个错误的判断，可能会毁掉无辜者的一生，也会让真相永远沉入黑暗。

**游戏结束 - 真凶逍遥法外**"""



# 全局实例
god_director = GodDirector()
