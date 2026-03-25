# 🚀 Interview AI Platform Component Documentation

This document outlines the current state and capabilities of the completed **Interview AI** full-stack platform, engineered with a hybrid microservice architecture integrating a React frontend, Node.js API backend, and a specialized Django Python AI service.

---

## 🏛️ System Architecture

Our platform leverages a highly separated microservice stack running concurrently to divide standard transactional workflows from intense AI/LLM tasks.

### 1. Frontend: React + Vite (Port 5174)
- **Role:** The primary client-facing application providing Recruiter and Candidate dashboards, Voice/Text Interview Rooms, and Landing Pages.
- **Key Dependencies:** `lucide-react` (icons), `zustand` (state management), `react-router-dom` (routing), `react-hot-toast` (notifications), Web Speech API.

### 2. Primary Backend: Node.js + Express + MongoDB (Port 8000)
- **Role:** Handles identity/authentication (via JWT), system-wide roles (Candidate/Recruiter), CRUD operations for generic interviews, generic results, and email generation flows.
- **Key Dependencies:** `mongoose`, `jsonwebtoken`, `multer` (file handling), `xlsx` (excel grid parsing), `nodemailer` (SMTP).

### 3. AI Service: Django + Python + SQLite (Port 8001)
- **Role:** A separate AI sub-system operating as a RESTful AI engine endpoint for computationally heavy tasks, completely isolating LLM streaming paths to preserve Node.js concurrency. 
- **Key Dependencies:** `PyPDF2` (Resume Parsing), `groq` (Llama-3 LLM Integrations), Django Rest Framework, `corsheaders`.

---

## 👥 Dual-Role System

The user authentication mechanism utilizes a universal login, where users are categorized as either **Recruiters** or **Candidates**, securely dictating their visible navigation and API rights dynamically.

### Recruiter Capabilities (Node.js Flow)
* **Interview Setup:** Ability to securely generate new Interview Links connected inherently to the recruiter's ID.
* **Bulk Candidate Excel Invites:** Through the `multer` array buffers, recruiters can upload an active `.xlsx` or `.csv` contact spreadsheet. The backend automatically parses the file using `sheetJS`, queries the [Email](file:///c:/Desktop/INTERVIEW%20AI%20MAIN/backend/src/controllers/auth.controller.js#71-86) column, and rapidly triggers `nodemailer` to dispatch massive batches of dynamic invite links to all respective candidates.
* **Interview Registry Syncing:** Recruiter-created interviews automatically push to a global `Active Interview Registry`.

### Candidate Capabilities
* **Adaptive Mock Interview Sandbox:** Candidates have access to the brand new Mock Engine (hosted securely via the Django backend).
* **Explore Directory:** Candidates can freely browse public Recruiter interviews seamlessly loaded from the backend active registry.

---

## 🧠 AI Mock Interview Flow (End-to-End breakdown)

The most advanced implementation component is the **Resume-Driven Mock Interview** feature bridging the frontend with the `ai_service` microservice over standard REST endpoints.

#### 1. Form Aggregation (`React`)
The Candidate enters a target Job Role, Experience Tier, and uploads a `.pdf` file of their Resume.

#### 2. Parsing Extraction (`Django` -> `PyPDF2`)
The raw binary is sent directly securely to `http://localhost:8001/api/mock/start/` bypassing Node.js. Django buffers the file and maps it strictly into raw text utilizing PyPDF2. 

#### 3. LLM Injection Prompting ([Groq](file:///c:/Desktop/INTERVIEW%20AI%20MAIN/backend/src/services/ai.service.js#46-84) -> `Llama`)
Django queries the [Groq](file:///c:/Desktop/INTERVIEW%20AI%20MAIN/backend/src/services/ai.service.js#46-84) LLM endpoint parsing the extracted resume logic alongside strict system directives to formulate a hyper-specific, challenging initial technical question.

#### 4. The Interview Room (`React` + Web APIs)
The user enters [MockRoom.jsx](file:///c:/Desktop/INTERVIEW%20AI%20MAIN/frontend/src/pages/candidate/MockRoom.jsx) and is greeted via computer-generated vocal interaction (`window.speechSynthesis`).
* **Timer Enforcement:** A strict 60-second visual countdown engages immediately.
* **Vocal Transcription:** The candidate clicks "Listen" initiating the Browser `SpeechRecognition` module which buffers audio frequency and translates it locally into readable string text. 
* **Dynamic Evaluation:** The vocal transcript is submitted back to Django. Django saves the dialogue natively in its SQLite database, scores the user out of 100 via LLM review, attaches a detailed written review block, and immediately spawns an adaptive follow-up question.

---

## 🎨 Design System

The application was uniquely stylized using heavily curated internal CSS frameworks to mimic a highly-professional, dark-navy LinkedIn/Corporate structure.
* **Colors:** Night Sky Black (`#0f172a`), Indigo Blueprint (`#4f46e5`), Glowing Teal accents (`#10b981`).
* **Iconography:** Fully-featured unified outlined syntax via `Lucide React`. 
* **Custom Branding System:** A custom internal SVG/Image handling parser ensures the custom [.png](file:///C:/Users/sessi/.gemini/antigravity/brain/b4565414-4af8-40f2-a596-75e6ecb96707/landing_page_hero_1774381229712.png) logo scales beautifully via responsive object padding natively across navigation components and isolated icon circles securely. 

---

## 📜 How to Launch the Full Tech Stack locally

Since everything operates synchronously, three instances are required per session:
```bash
# Terminal 1: Core Database Logic
cd backend && npm run dev

# Terminal 2: Native AI Generation Matrix
cd ai_service && venv\Scripts\activate && python manage.py runserver 8001

# Terminal 3: UI Output
cd frontend && npm run dev
```
