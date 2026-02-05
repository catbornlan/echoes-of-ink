"""
Data models for the Murder Mystery Game.
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from enum import Enum


class GamePhase(str, Enum):
    """Game phases."""
    INTRO = "intro"  # 自我介绍
    SEARCH_1 = "search_1"  # 第一轮搜证
    DISCUSS_1 = "discuss_1"  # 第一轮讨论
    SEARCH_2 = "search_2"  # 第二轮搜证
    DISCUSS_2 = "discuss_2"  # 第二轮讨论
    VOTE = "vote"  # 投票
    REVEAL = "reveal"  # 真相揭晓


class Character(BaseModel):
    """Character model."""
    id: str
    name: str
    age: int
    role: str
    is_murderer: bool
    avatar: str
    preset_intro: str
    motivation: str
    secrets: List[str]
    personality: str
    strategy: str
    full_script: str


class Evidence(BaseModel):
    """Evidence model."""
    id: str
    location: str
    sequence: int
    label: str
    is_deep: bool
    parent_id: Optional[str]
    action_cost: int
    content: str
    deep_investigation_cost: Optional[int] = None


class Location(BaseModel):
    """Search location model."""
    id: str
    name: str
    description: str


class Message(BaseModel):
    """Chat message model."""
    speaker: str  # 发言者名字
    content: str  # 发言内容
    action: Optional[str] = None  # 形态描写
    timestamp: int  # 时间戳（秒）
    is_player: bool = False  # 是否是玩家


class ScriptBatch(BaseModel):
    """Batch generated script from God Director."""
    messages: List[Message]
    duration: int  # 预计播放时长（秒）
    phase: GamePhase


class GameState(BaseModel):
    """Game state model."""
    player_character: str  # 玩家选择的角色ID
    current_phase: GamePhase
    round_1_action_points: int = 4
    round_2_action_points: int = 5
    collected_evidence: List[str] = []  # 已收集证据ID列表
    public_evidence: List[str] = []  # 已公开证据ID列表
    dialogue_history: List[Message] = []  # 对话历史
    votes: Dict[str, str] = {}  # 投票记录 {voter_id: suspect_id}
    phase_narratives: Dict[str, str] = {}  # 环节过渡描写 {phase: narrative}


class VoteRequest(BaseModel):
    """Vote request model."""
    voter_id: str
    suspect_id: str  # 被投票者ID，"suicide"表示自杀


class SearchRequest(BaseModel):
    """Evidence search request."""
    character_id: str
    location_id: str
    evidence_id: Optional[str] = None  # 深度调查时指定
    action_points: int


class DirectorRequest(BaseModel):
    """God Director script generation request."""
    phase: GamePhase
    context: Dict[str, Any]  # 当前局势（已公开证据、对话历史等）
    duration: int = 180  # 生成时长（秒），默认3分钟


class RegenerateRequest(BaseModel):
    """Regenerate script after player interruption."""
    context: Dict[str, Any]
    player_input: str
    remaining_script: List[Message]


class PhaseTransitionNarrative(BaseModel):
    """环节过渡描写."""
    phase: GamePhase
    narrative: str  # AI生成的氛围描写
    key_characters: List[str]  # 重点描写的角色


class EndingEpilogue(BaseModel):
    """结局续写."""
    voted_character: str  # 被投票的角色
    is_correct: bool  # 是否投对了真凶
    epilogue: str  # AI生成的结局续写
