# 🖋️ 不知境中人 (Echoes of Ink)

> *"Truth is painted, not spoken."*  
> (真相是被画出来的，而非说出来的。)

**不知境中人 (Echoes of Ink)** is an AI-native interactive murder mystery game that reimagines the classic Chinese folklore of **Ma Liang and the Magic Paintbrush (神笔马良)** with a dark, supernatural twist.

In the mysterious realm of "Unknowing" (不知境), renowned painter Ma Liang has been murdered. As a detective, you must interrogate suspects, uncover painted evidence, and deduce the truth in a world where reality blurs with ink and art comes alive.

---

## ✨ Project Highlights

- **🧠 AI-Driven Narrative**: Powered by **Google Gemini 2.5 Flash**, every suspect has dynamic responses. NPCs possess distinct personalities, hidden motives, and can "lie" or reveal secrets based on the unfolding plot.
- **🎨 Ancient Chinese Aesthetic**: Features a highly stylized "Detective Case File" UI using **DaisyUI (Luxury Theme)**, evoking the atmosphere of ancient scrolls and classical mysteries.
- **🔍 Phase-Based Gameplay**: Structured game flow: Character Selection → Introduction → Evidence Search → Discussions → Vote → Ending Reveal.
- **🛠️ Modern Tech Stack**: Clean separation of concerns—**FastAPI** backend for game logic and AI integration, **Vanilla JS + Tailwind CSS** frontend for a lightweight, responsive experience.
- **📜 Rich Storytelling**: AI-generated endings (500-2000 words) that adapt based on player choices and voting outcomes.

---

## 🛠️ Tech Stack

### Backend
- **Language**: Python 3.12+
- **Framework**: FastAPI
- **AI Model**: Google Gemini 2.5 Flash (via `google-generativeai` SDK)
- **Environment**: `python-dotenv` for configuration

### Frontend
- **HTML5** with semantic markup
- **Tailwind CSS** + **DaisyUI** (Luxury theme)
- **Vanilla JavaScript** (ES6+)
- **Animate.css** for smooth transitions

### Deployment
- Backend: Render / Railway / Fly.io
- Frontend: Vercel / Netlify / Static hosting
- Development: Uvicorn (ASGI server)

---

## 🚀 How to Run Locally

### Prerequisites
- Python 3.12 or higher
- [uv](https://github.com/astral-sh/uv) (recommended) or pip
- Google Gemini API key ([Get one here](https://aistudio.google.com/apikey))

### Installation Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/echoes-of-ink.git
   cd echoes-of-ink
   ```

2. **Install Python dependencies**:
   ```bash
   # Using uv (recommended)
   uv pip install -r requirements.txt
   
   # Or using pip
   pip install -r requirements.txt
   ```

3. **Configure API Key**:
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Edit `.env` and add your Google Gemini API key:
     ```env
     GEMINI_API_KEY=AIzaSyDxxxxxxxxxxxxxxx
     DEBUG_MODE=true
     ```

4. **Start the Backend Server**:
   ```bash
   # Using uv
   uv run uvicorn backend.main:app --reload
   
   # Or using standard Python
   uvicorn backend.main:app --reload
   ```
   Backend will run on `http://localhost:8000`

5. **Start the Frontend Server** (in a new terminal):
   ```bash
   cd frontend
   python3 -m http.server 8080
   ```
   Frontend will run on `http://localhost:8080`

6. **Open your browser** and visit: `http://localhost:8080`

---

## 📂 Project Structure

```
echoes-of-ink/
├── backend/                    # Backend game logic & AI integration
│   ├── ai_director.py         # AI Director for NPC dialogue generation
│   ├── game_logic.py          # Game state and phase management
│   ├── models.py              # Pydantic data models
│   ├── config.py              # Configuration loader
│   ├── main.py                # FastAPI application entry point
│   └── data/                  # Game content (characters, evidence, story)
│       ├── characters.json    # Character definitions and scripts
│       ├── evidence.json      # Evidence database
│       └── story_truth.json   # Story restoration content
├── frontend/                   # Frontend assets
│   ├── index.html             # Main game interface
│   ├── css/
│   │   └── style.css          # Custom styles
│   └── js/
│       ├── app.js             # Main application logic
│       ├── ui.js              # UI manager and ScriptPlayer
│       ├── game-state.js      # Game state management
│       ├── input-control.js   # Input handling
│       └── phase-control.js   # Phase transition logic
├── .env.example               # Environment variables template
├── requirements.txt           # Python dependencies
└── README.md                  # This file
```

---

## 🎮 Game Features

### 🎭 Character System
- **6 Unique Characters**: Each with distinct personalities, motives, and secrets
- **Player Choice**: Select your character and uncover the truth from their perspective
- **Dynamic Dialogues**: AI-generated conversations adapt to game context

### 🔍 Evidence Collection
- **Two Search Rounds**: Collect evidence with limited action points
- **Deep Investigation**: Use action points to unlock hidden details
- **Public vs Private**: Strategically choose which evidence to reveal

### 💬 Discussion Phases
- **AI-Powered NPCs**: Engage in meaningful discussions with suspects
- **Context-Aware Responses**: NPCs respond based on public evidence and previous statements
- **Phase History**: Review past discussions and key events

### 🗳️ Voting & Endings
- **Vote for the Culprit**: Make your final deduction
- **Multiple Endings**: AI generates different endings based on voting outcome
- **Story Restoration**: Discover the complete truth behind the mystery

---

## 🧪 Testing

To verify your setup:

1. **Test Gemini API Connection**:
   ```bash
   python test_gemini.py
   ```

2. **Access API Documentation**:
   Visit `http://localhost:8000/docs` for interactive API documentation

3. **Check Game Data**:
   ```bash
   curl http://localhost:8000/api/characters
   ```

---

## 🚢 Deployment

### Backend Deployment (Render/Railway)

1. Push your code to GitHub
2. Connect your repository to Render/Railway
3. Set environment variables:
   - `GEMINI_API_KEY=your_api_key`
   - `DEBUG_MODE=false`
4. Deploy command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`

### Frontend Deployment (Vercel/Netlify)

1. Update API base URL in `frontend/js/game-state.js`:
   ```javascript
   const API_BASE = 'https://your-backend-url.com/api';
   ```
2. Deploy the `frontend/` directory
3. Set build command: (none needed for static site)
4. Set publish directory: `frontend/`

---

## 🐛 Known Issues & Roadmap

- [ ] Add sound effects and background music
- [ ] Implement save/load game functionality
- [ ] Add multiplayer support
- [ ] Optimize AI response time
- [ ] Add more character portraits and animations

---

## 👩‍💻 Author

**Suna (Catborn)**  
Product Manager & AI Explorer

Created as an exploration project to push the boundaries of Generative AI in interactive storytelling and gaming experiences.

---

## 📝 License

This project is created for educational and experimental purposes.

---

## 🙏 Acknowledgments

- **Google Gemini** for powering the AI narrative engine
- **DaisyUI** for the beautiful component library
- Classic Chinese folklore of **Ma Liang and the Magic Paintbrush** for inspiration

---

<div align="center">

**Enjoy the mystery! 🕵️**

[Report Bug](https://github.com/yourusername/echoes-of-ink/issues) · [Request Feature](https://github.com/yourusername/echoes-of-ink/issues)

</div>
