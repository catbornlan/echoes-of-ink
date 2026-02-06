"""
FastAPI main application for Murder Mystery Game.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from typing import List, Dict, Any
import json

from backend.models import (
    Character, Evidence, Location, GameState, Message,
    DirectorRequest, RegenerateRequest, SearchRequest, VoteRequest,
    GamePhase
)
from backend.game_logic import game_manager
from backend.ai_director import god_director

app = FastAPI(title="Murder Mystery Game API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 挂载静态文件
app.mount("/static", StaticFiles(directory="frontend"), name="static")


@app.get("/")
async def root():
    """Serve the frontend page."""
    return FileResponse('frontend/index.html')


@app.get("/api/characters", response_model=List[Character])
async def get_characters():
    """Get all characters with preset introductions."""
    return list(game_manager.characters.values())


@app.get("/api/locations", response_model=List[Location])
async def get_locations():
    """Get all search locations."""
    return list(game_manager.locations.values())


@app.get("/api/evidence", response_model=List[Evidence])
async def get_all_evidence():
    """Get all evidence (for debugging)."""
    return list(game_manager.evidence.values())


@app.get("/api/story_truth")
async def get_story_truth():
    """Get story truth for ending reveal."""
    try:
        with open('backend/data/story_truth.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return {
            "title": "不知境中人",
            "truth_story": "故事还原文件未找到..."
        }


@app.post("/api/game/start")
async def start_game(player_character: str):
    """
    Start a new game.
    
    Args:
        player_character: Player's chosen character ID
    
    Returns:
        GameState: Initial game state
    """
    try:
        game_state = game_manager.start_game(player_character)
        return game_state
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/game/state", response_model=GameState)
async def get_game_state():
    """Get current game state."""
    if not game_manager.game_state:
        raise HTTPException(status_code=400, detail="Game not started")
    return game_manager.game_state


@app.post("/api/game/advance_phase")
async def advance_phase():
    """Advance to next game phase."""
    try:
        if not game_manager.game_state:
            print("[advance_phase] Error: Game state is None")
            raise HTTPException(status_code=400, detail="Game not started. Please start a new game first.")
        
        current = game_manager.game_state.current_phase
        print(f"[advance_phase] Current phase: {current}")
        
        new_phase = game_manager.advance_phase()
        print(f"[advance_phase] Advanced to: {new_phase}")
        
        return {"current_phase": new_phase}
    except ValueError as e:
        print(f"[advance_phase] ValueError: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"[advance_phase] Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/script/{character}")
async def get_character_script(character: str):
    """
    Get character's full script.
    
    Args:
        character: Character ID
    
    Returns:
        Character script details
    """
    char = game_manager.characters.get(character)
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")
    
    return {
        "name": char.name,
        "role": char.role,
        "full_script": char.full_script,
        "secrets": char.secrets,
        "motivation": char.motivation
    }


@app.post("/api/director/generate_script")
async def generate_script(request: DirectorRequest):
    """
    Generate batch script from God Director.
    
    Args:
        request: Director request with phase, context, duration
    
    Returns:
        ScriptBatch: Generated script
    """
    try:
        script = god_director.generate_batch_script(
            phase=request.phase,
            context=request.context,
            duration=request.duration
        )
        return script
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/director/regenerate_script")
async def regenerate_script(request: RegenerateRequest):
    """
    Regenerate script after player interruption.
    
    Args:
        request: Regenerate request with context and player input
    
    Returns:
        ScriptBatch: Regenerated script
    """
    try:
        script = god_director.regenerate_script(
            context=request.context,
            player_input=request.player_input,
            remaining_script=request.remaining_script
        )
        return script
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/director/discussion_response")
async def generate_discussion_response(request: Dict[str, Any]):
    """
    Generate AI response for player's discussion input.
    Supports @ mentions to target specific characters.
    
    Args:
        request: Contains player_message, mentioned_character, phase, context
    
    Returns:
        ScriptBatch: AI-generated response
    """
    try:
        print(f"\n[API /discussion_response] Request received")
        player_message = request.get('player_message', '')
        mentioned_character = request.get('mentioned_character')
        phase = request.get('phase', 'intro')
        context = request.get('context', {})
        
        print(f"[API] Player message: {player_message}")
        print(f"[API] Mentioned character: {mentioned_character}")
        print(f"[API] Phase: {phase}")
        
        # Generate shorter discussion response (15-30 seconds)
        script = god_director.regenerate_script(
            context=context,
            player_input=player_message,
            remaining_script=[]
        )
        
        print(f"[API] Returning {len(script.messages)} messages")
        return script
    except Exception as e:
        logger.error(f"Error generating discussion response: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/phase/search")
async def search_evidence(request: SearchRequest):
    """
    Search for evidence.
    
    Args:
        request: Search request
    
    Returns:
        List[Evidence]: Found evidence
    """
    try:
        found = game_manager.search_evidence(
            character_id=request.character_id,
            location_id=request.location_id,
            evidence_id=request.evidence_id,
            action_points=request.action_points
        )
        return found
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/phase/ai_search")
async def ai_search(request: Dict[str, Any]):
    """
    Perform AI automated search.
    
    Args:
        request: {collected_ids: [], current_round: int}
    
    Returns:
        {evidence: [found_evidence]}
    """
    try:
        collected_ids = request.get('collected_ids', [])
        current_round = request.get('current_round', 1)
        
        found = game_manager.perform_ai_search(collected_ids, current_round)
        return {"evidence": found}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/evidence/make_public")
async def make_evidence_public(evidence_id: str):
    """
    Make evidence public.
    
    Args:
        evidence_id: Evidence ID
    
    Returns:
        Success message
    """
    try:
        game_manager.make_evidence_public(evidence_id)
        return {"success": True, "evidence_id": evidence_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/phase/vote")
async def cast_vote(request: VoteRequest):
    """
    Cast a vote.
    
    Args:
        request: Vote request
    
    Returns:
        Vote counts
    """
    try:
        vote_counts = game_manager.vote(
            voter_id=request.voter_id,
            suspect_id=request.suspect_id
        )
        return {"vote_counts": vote_counts}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/director/vote_decisions")
async def get_npc_votes():
    """
    Get NPC vote decisions from God Director.
    
    Returns:
        Dict[str, str]: NPC votes
    """
    try:
        context = game_manager.get_context_for_ai()
        votes = god_director.make_vote_decisions(context)
        
        # Cast NPC votes
        for voter_id, suspect_id in votes.items():
            if voter_id != game_manager.game_state.player_character:
                game_manager.vote(voter_id, suspect_id)
        
        return {"npc_votes": votes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/vote/result")
async def get_vote_result():
    """
    Get vote result.
    
    Returns:
        Vote result with character details
    """
    try:
        result_id = game_manager.get_vote_result()
        result_char = game_manager.characters.get(result_id)
        
        is_correct = (result_id == "xiaoma")
        
        return {
            "voted_character_id": result_id,
            "voted_character_name": result_char.name if result_char else "无人",
            "is_correct": is_correct,
            "true_murderer": "小马",
            "vote_counts": {
                suspect: sum(1 for v in game_manager.game_state.votes.values() if v == suspect)
                for suspect in set(game_manager.game_state.votes.values())
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/director/phase_transition")
async def get_phase_transition(phase: str):
    """
    Get phase transition narrative.
    
    Args:
        phase: Phase that just ended (as string)
    
    Returns:
        PhaseTransitionNarrative
    """
    try:
        # Convert string to GamePhase enum
        phase_enum = GamePhase(phase)
        context = game_manager.get_context_for_ai()
        narrative = god_director.generate_phase_transition(phase_enum, context)
        
        # Store in game state
        if game_manager.game_state:
            game_manager.game_state.phase_narratives[phase] = narrative.narrative
        
        return narrative
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid phase: {phase}")
    except Exception as e:
        # Log the full error for debugging
        print(f"Error in phase_transition: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/director/ending_epilogue")
async def get_ending_epilogue():
    """
    Get ending epilogue based on vote result.
    
    Returns:
        EndingEpilogue
    """
    try:
        voted_character = game_manager.get_vote_result()
        context = game_manager.get_context_for_ai()
        epilogue = god_director.generate_ending_epilogue(voted_character, context)
        return epilogue
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/message/add")
async def add_message(message: Message):
    """
    Add a message to dialogue history.
    
    Args:
        message: Message to add
    
    Returns:
        Success message
    """
    if not game_manager.game_state:
        raise HTTPException(status_code=400, detail="Game not started")
    
    game_manager.game_state.dialogue_history.append(message)
    return {"success": True}


@app.get("/api/context")
async def get_ai_context():
    """
    Get current context for AI Director.
    
    Returns:
        Context dict
    """
    try:
        context = game_manager.get_context_for_ai()
        return context
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000)
