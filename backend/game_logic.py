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
    
    def perform_ai_search(self, collected_ids: List[str], current_round: int) -> List[Evidence]:
        """
        Perform randomized search for AI characters.
        
        Args:
            collected_ids: List of already collected evidence IDs
            current_round: Current search round (1 or 2)
        
        Returns:
            List[Evidence]: Evidence found by AI this turn
        """
        if not self.game_state:
            return []
            
        import random
        
        found_evidence = []
        
        # 根据轮次计算AI可用的总行动点（所有NPC共享）
        # 假设有5个NPC，每个NPC应该尽量用完点数
        max_actions = 3 if current_round == 1 else 2  # 每个AI尝试搜索的次数
        
        for _ in range(max_actions):
            # Filter available evidence
            available_evidence = []
            for ev in self.evidence.values():
                if ev.id in collected_ids:
                    continue
                if ev.id in self.game_state.collected_evidence:
                    continue
                    
                # Round 1: No deep evidence
                if current_round == 1 and ev.is_deep:
                    continue
                    
                # Round 2: Can find deep evidence if parent is collected
                if current_round == 2 and ev.is_deep:
                    if ev.parent_id not in self.game_state.collected_evidence:
                         continue
                
                available_evidence.append(ev)
            
            if not available_evidence:
                break
                
            # Pick one random evidence (70% success rate)
            if random.random() < 0.7:
                target = random.choice(available_evidence)
                self.game_state.collected_evidence.append(target.id)
                found_evidence.append(target)
                
                # 30% chance to make evidence public immediately
                # 真凶小马会更谨慎，只有10%概率公开
                # 其他角色30%概率公开
                is_murderer_evidence = 'xiaoma' in target.content.lower() or target.location == 'xiaoma'
                public_chance = 0.1 if is_murderer_evidence else 0.35
                
                if random.random() < public_chance:
                    if target.id not in self.game_state.public_evidence:
                        self.game_state.public_evidence.append(target.id)
        
        return found_evidence

    
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
            'public_evidence_count': len(self.game_state.public_evidence)
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
