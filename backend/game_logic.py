"""
Game logic manager for the Murder Mystery Game.
"""
import json
from typing import List, Dict, Optional
from backend.models import (
    GameState, GamePhase, Evidence, Location, Character,
    SearchRequest, VoteRequest
)


class GameManager:
    """Manages game state and logic."""
    
    def __init__(self):
        """Initialize game manager with data."""
        # Load evidence data
        with open('backend/data/evidence.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
            self.locations = {loc['id']: Location(**loc) for loc in data['locations']}
            self.evidence = {ev['id']: Evidence(**ev) for ev in data['evidence']}
            self.search_rules = data['search_rules']
        
        # Load character data
        with open('backend/data/characters.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
            self.characters = {c['id']: Character(**c) for c in data['characters']}
            # Reload triggered

        
        # Game state (will be initialized when game starts)
        self.game_state: Optional[GameState] = None
    
    def start_game(self, player_character: str) -> GameState:
        """
        Start a new game.
        
        Args:
            player_character: Player's chosen character ID
        
        Returns:
            GameState: Initial game state
        """
        self.game_state = GameState(
            player_character=player_character,
            current_phase=GamePhase.INTRO,
            round_1_action_points=self.search_rules['round_1_action_points'],
            round_2_action_points=self.search_rules['round_2_action_points'],
            collected_evidence=[],
            public_evidence=[],
            dialogue_history=[],
            votes={},
            phase_narratives={}
        )
        return self.game_state
    
    def advance_phase(self) -> GamePhase:
        """
        Advance to next game phase.
        
        Returns:
            GamePhase: New current phase
        """
        if not self.game_state:
            raise ValueError("Game not started")
        
        phase_order = [
            GamePhase.INTRO,
            GamePhase.SEARCH_1,    # 改：先搜证
            GamePhase.DISCUSS_1,   # 再讨论
            GamePhase.SEARCH_2,
            GamePhase.DISCUSS_2,
            GamePhase.VOTE,
            GamePhase.REVEAL
        ]
        
        current_index = phase_order.index(self.game_state.current_phase)
        if current_index < len(phase_order) - 1:
            self.game_state.current_phase = phase_order[current_index + 1]
        
        return self.game_state.current_phase
    
    def search_evidence(
        self, 
        character_id: str, 
        location_id: str, 
        evidence_id: Optional[str] = None,
        action_points: int = 1
    ) -> List[Evidence]:
        """
        Search for evidence at a location.
        
        Args:
            character_id: Character performing the search
            location_id: Location to search
            evidence_id: Specific evidence ID for deep investigation
            action_points: Action points to spend
        
        Returns:
            List[Evidence]: Found evidence
        """
        if not self.game_state:
            raise ValueError("Game not started")
        
        # Check if it's a search phase
        if self.game_state.current_phase not in [GamePhase.SEARCH_1, GamePhase.SEARCH_2]:
            raise ValueError("Not in search phase")
        
        # Check action points
        if self.game_state.current_phase == GamePhase.SEARCH_1:
            if action_points > self.game_state.round_1_action_points:
                raise ValueError("Not enough action points")
            self.game_state.round_1_action_points -= action_points
        else:
            if action_points > self.game_state.round_2_action_points:
                raise ValueError("Not enough action points")
            self.game_state.round_2_action_points -= action_points
        
        found_evidence = []
        
        # Deep investigation
        if evidence_id:
            if self.game_state.current_phase == GamePhase.SEARCH_1:
                raise ValueError("Deep investigation only available in round 2")
            
            parent_evidence = self.evidence.get(evidence_id)
            if not parent_evidence or parent_evidence.deep_investigation_cost is None:
                raise ValueError("Invalid deep investigation target")
            
            # Check if parent evidence was collected
            if evidence_id not in self.game_state.collected_evidence:
                raise ValueError("Must collect parent evidence first")
            
            # Find all deep evidence for this parent
            for ev_id, ev in self.evidence.items():
                if ev.is_deep and ev.parent_id == evidence_id:
                    if ev_id not in self.game_state.collected_evidence:
                        found_evidence.append(ev)
                        self.game_state.collected_evidence.append(ev_id)
        
        # Normal search
        else:
            for ev_id, ev in self.evidence.items():
                if ev.location == location_id and not ev.is_deep:
                    if ev_id not in self.game_state.collected_evidence:
                        found_evidence.append(ev)
                        self.game_state.collected_evidence.append(ev_id)
                        break  # Only find one evidence per search
        
        return found_evidence
    
    def perform_ai_search(self, collected_ids: List[str], current_round: int) -> tuple[List[Evidence], List[str]]:
        """
        Perform randomized search for AI characters.
        
        Args:
            collected_ids: List of already collected evidence IDs
            current_round: Current search round (1 or 2)
        
        Returns:
            tuple: (List[Evidence], List[str]) - Found evidence and newly public evidence IDs
        """
        if not self.game_state:
            return [], []
            
        import random
        from backend.ai_director import god_director  # Delayed import to avoid circular dependency
        
        found_evidence = []
        newly_public_ids = []
        char_findings = {} # {char_id: [Evidence]}
        
        # 1. 确定玩家角色，排除之
        player_id = self.game_state.player_character
        
        # 2. 遍历所有NPC
        for char_id_key, char in self.characters.items():
            if char_id_key == player_id:
                continue
                
            # 每个NPC有2点行动点（默认策略）
            action_points = 2
            char_findings[char_id_key] = []
            
            for _ in range(action_points):
                # Max retries to find valid evidence
                for _ in range(5): 
                    # 筛选可用证据
                    available_evidence = []
                    for ev in self.evidence.values():
                        # 已经被任何人搜到过（在 collected_evidence 中）则不能再搜
                        # 改进：如果已被搜出，就不再搜，避免浪费AP
                        if ev.id in self.game_state.collected_evidence:
                            continue
                            
                        # Round 1: No deep evidence
                        if current_round == 1 and ev.is_deep:
                            continue
                            
                        # Round 2: Can find deep evidence if parent is known TO THE GROUP (public) or TO THE SEEKER (private)
                        # 简化：如果前置证据已被搜出（collected），则可以搜深入证据
                        if current_round == 2 and ev.is_deep:
                             if ev.parent_id not in self.game_state.collected_evidence:
                                 continue
                        
                        available_evidence.append(ev)
                    
                    if not available_evidence:
                        break
                        
                    # 随机选择一个搜证
                    target = random.choice(available_evidence)
                    
                    # 更新全局状态
                    if target.id not in self.game_state.collected_evidence:
                        self.game_state.collected_evidence.append(target.id)
                        # 记录发现
                        found_evidence.append(target)
                        char_findings[char_id_key].append(target)
                        break # Found valid target, use 1 AP
                    else:
                        # Should not happen with check above, but purely safe guard
                        continue
                
        # 3. 调用 AI Director 决定是否公开
        # 构建当前上下文
        context = {
            'public_evidence': self.game_state.public_evidence,
            'suspicion_levels': self._calculate_suspicion_levels()
        }
        
        # 获取公开决策
        ids_to_publish = god_director.decide_evidence_reveal(context, char_findings)
        
        for evid in ids_to_publish:
            if evid not in self.game_state.public_evidence:
                self.game_state.public_evidence.append(evid)
                newly_public_ids.append(evid)
                
        return found_evidence, newly_public_ids

    
    def make_evidence_public(self, evidence_id: str) -> bool:
        """
        Make evidence public.
        
        Args:
            evidence_id: Evidence ID to make public
        
        Returns:
            bool: Success
        """
        if not self.game_state:
            raise ValueError("Game not started")
        
        if evidence_id not in self.game_state.collected_evidence:
            raise ValueError("Evidence not collected")
        
        if evidence_id not in self.game_state.public_evidence:
            self.game_state.public_evidence.append(evidence_id)
        
        return True
    
    def vote(self, voter_id: str, suspect_id: str) -> Dict[str, int]:
        """
        Cast a vote.
        
        Args:
            voter_id: Voter's character ID
            suspect_id: Suspect's character ID (or "suicide")
        
        Returns:
            Dict[str, int]: Vote counts
        """
        if not self.game_state:
            raise ValueError("Game not started")
        
        if self.game_state.current_phase != GamePhase.VOTE:
            raise ValueError("Not in vote phase")
        
        self.game_state.votes[voter_id] = suspect_id
        
        # Count votes
        vote_counts = {}
        for suspect in self.game_state.votes.values():
            vote_counts[suspect] = vote_counts.get(suspect, 0) + 1
        
        return vote_counts
    
    def get_vote_result(self) -> str:
        """
        Get the character with most votes.
        
        Returns:
            str: Character ID with most votes
        """
        if not self.game_state:
            raise ValueError("Game not started")
        
        vote_counts = {}
        for suspect in self.game_state.votes.values():
            vote_counts[suspect] = vote_counts.get(suspect, 0) + 1
        
        if not vote_counts:
            return ""
        
        return max(vote_counts.items(), key=lambda x: x[1])[0]
    
    def get_context_for_ai(self) -> Dict:
        """
        Build context for AI Director.
        
        Returns:
            Dict: Context including public evidence, dialogue history, etc.
        """
        if not self.game_state:
            return {}
        
        # Get public evidence details
        public_evidence_details = [
            {
                'id': ev_id,
                'label': self.evidence[ev_id].label,
                'content': self.evidence[ev_id].content,
                'location': self.evidence[ev_id].location
            }
            for ev_id in self.game_state.public_evidence
            if ev_id in self.evidence
        ]
        
        # Get recent messages (last 10)
        recent_messages = [
            {
                'speaker': msg.speaker,
                'content': msg.content,
                'action': msg.action
            }
            for msg in self.game_state.dialogue_history[-10:]
        ]
        
        # Calculate suspicion levels based on public evidence and dialogue
        suspicion_levels = self._calculate_suspicion_levels()
        
        return {
            'player_character': self.game_state.player_character,
            'current_phase': self.game_state.current_phase.value,
            'public_evidence': public_evidence_details,
            'recent_messages': recent_messages,
            'dialogue_history': [
                {'speaker': msg.speaker, 'content': msg.content}
                for msg in self.game_state.dialogue_history
            ],
            'suspicion_levels': suspicion_levels,
            'collected_evidence_count': len(self.game_state.collected_evidence),
            'public_evidence_count': len(self.game_state.public_evidence),
            'private_evidence': [
                {
                    'id': ev_id,
                    'label': self.evidence[ev_id].label,
                    'content': self.evidence[ev_id].content,
                    'location': self.evidence[ev_id].location
                }
                for ev_id in self.game_state.collected_evidence
                if ev_id not in self.game_state.public_evidence and ev_id in self.evidence
            ]
        }
    
    def _calculate_suspicion_levels(self) -> Dict[str, int]:
        """
        Calculate suspicion levels for each character based on evidence and dialogue.
        
        Returns:
            Dict[str, int]: {character_id: suspicion_level (0-100)}
        """
        suspicion = {char_id: 0 for char_id in self.characters.keys()}
        
        # Increase suspicion based on public evidence
        for ev_id in self.game_state.public_evidence:
            ev = self.evidence.get(ev_id)
            if not ev:
                continue
            
            # Evidence found on character increases their suspicion
            if ev.location in self.characters:
                suspicion[ev.location] += 10
            
            # Specific evidence increases suspicion
            if '血迹' in ev.content or '匕首' in ev.content:
                if ev.location in self.characters:
                    suspicion[ev.location] += 15
            
            if '烛台' in ev.content and '血迹' in ev.content:
                # Candlestick with blood - key evidence
                suspicion['xiaoma'] += 20  # 小马是真凶
        
        # Normalize to 0-100
        if max(suspicion.values()) > 0:
            max_suspicion = max(suspicion.values())
            suspicion = {
                char_id: int((level / max_suspicion) * 100)
                for char_id, level in suspicion.items()
            }
        
        return suspicion


# Global instance
game_manager = GameManager()
