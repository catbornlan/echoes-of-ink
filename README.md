Markdown
# 🖋️ Echoes of Ink (墨之回响)

> *"Truth is painted, not spoken."*
> (真相是被画出来的，而非说出来的。)

**Echoes of Ink** is an AI-native interactive murder mystery game that reimagines the classic Chinese folklore of **Ma Liang and the Magic Paintbrush (神笔马良)** with a dark, supernatural twist.

In the mysterious realm of "Unknowing" (不知境), a murder has occurred where reality blurs with ink. As the detective, you must interrogate suspects, uncover painted evidence, and deduce the truth behind the "living art."

## ✨ Project Highlights

- **🧠 AI-Driven Narrative**: Powered by **Google Gemini 1.5 Flash**, every suspect interrogation is dynamic. NPCs have distinct personalities, hidden motives, and can "lie" based on the plot.
- **🎨 Vintage Detective Aesthetic**: Features a highly stylized "Case File" UI using **DaisyUI (Luxury Theme)**, simulating the feel of reading through old evidence archives under a dim lamp.
- **🔍 Phase-Based Gameplay**: A structured game flow from Character Selection -> Script Reading -> Evidence Search -> Final Vote.
- **🛠️ Modern Tech Stack**: Built with a separation of concerns—**FastAPI** backend for logic and **Vanilla JS + Tailwind** for a lightweight, responsive frontend.

## 🛠️ Tech Stack

- **Core Logic**: Python 3.12+
- **Backend Framework**: FastAPI
- **Frontend**: HTML5, Tailwind CSS, DaisyUI, Animate.css
- **AI Model**: Google Gemini 1.5 Flash (via Google Generative AI SDK)
- **Deployment**: Render / Vercel

## 🚀 How to Run Locally

1. **Clone the repository** (or download source code):
   ```bash
   git clone [https://github.com/catbornlan/echoes-of-ink.git](https://github.com/catbornlan/echoes-of-ink.git)
   cd echoes-of-ink
Install dependencies:

Bash
pip install -r requirements.txt
Configure API Key: Create a .env file in the root directory and add your Google Gemini API key:

代码段
GEMINI_API_KEY=AIzaSyDxxxxxxxxxxxxxxx
Start the Game:

Bash
uvicorn main:app --reload
Open your browser and visit: http://localhost:8000

📂 Project Structure
echoes-of-ink/
├── backend/            # Game logic & AI service integration
├── frontend/           # HTML, CSS, JS assets
├── main.py             # FastAPI entry point
├── test_gemini.py      # Connection test script
├── requirements.txt    # Python dependencies
└── README.md           # You are here
👩‍💻 Author
Suna (Catborn) Product Manager & AI Explorer

Created as a "Hello World" project to explore the boundaries of Generative AI in gaming.
