# CivicMind AI 🧠📍

CivicMind AI is an AI-powered municipal infrastructure triage platform that converts citizen reports (photo uploads, GPS coordinates, and descriptions) into verified, categorized, and prioritized municipal action items.

The platform automatically:
1. **Triages reports** using Gemini 2.5 Flash Vision Agent to identify categories, severity (1-10), urgency, handling department, and estimated resolution days.
2. **Scans for duplicate reports** in the neighborhood (within 100 meters, same category, >80% description similarity) and merges duplicates into an audit verification timeline rather than creating duplicate work tickets.
3. **Formulates dynamic crew action plans** using an AI Resolution Planner for dispatch staff.
4. **Maps local incidents** using an interactive Leaflet Map layout.

---

## Technical Stack
- **Frontend**: React (Vite), TailwindCSS, React Router, Axios, Leaflet Maps
- **Backend**: Node.js, Express, MongoDB, Mongoose, Multer
- **AI Agent**: Google Gemini API (`@google/genai`)
- **Containerization**: Docker, Docker Compose
- **Cloud Hosting**: Google Cloud Run

---

## Directory Layout

```text
civicmind-ai/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Route logic handlers (issues, dashboard stats)
│   │   ├── routes/           # API router schemas (/api/issues, /api/dashboard)
│   │   ├── models/           # Mongoose schemas (User, Issue, Verification)
│   │   ├── services/         # Business logic agents (Gemini SDK, Duplicate Checks)
│   │   ├── middleware/       # Multer uploads, CORS, Helmet, limits, error handlers
│   │   └── app.js            # Express config setups
│   ├── server.js             # Mongoose connection & server entry
│   ├── Dockerfile            # Backend Docker instructions
│   └── .env.example          # Sample environment variables
│
├── frontend/
│   ├── src/
│   │   ├── pages/            # React Pages (CitizenPortal, MunicipalDashboard, Details)
│   │   ├── components/       # Leaflet Map, stats widgets, planner checklists
│   │   ├── services/         # Axios API connection client mapping
│   │   ├── hooks/            # HTML Geolocation browser permissions hook
│   │   ├── layouts/          # Main header/footer shell
│   │   └── App.jsx           # Client router configuration
│   ├── index.html            # Main markup with CDN Leaflet CSS linked
│   ├── Dockerfile            # Production Nginx reverse-proxy image
│   └── vite.config.js        # Vite compilation configuration
│
├── docker-compose.yml        # Orchestration definitions
└── README.md                 # Project user manuals
```

---

## Environment Variables

Create a `.env` file in the `backend/` directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/civicmind
GEMINI_API_KEY=your_google_gemini_api_key
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

---

## Running Locally

### Prerequisites
- Node.js (v18+)
- MongoDB running locally on default port `27017`

### Step 1: Start the Backend Server
```bash
# Navigate to the backend directory
cd backend

# Install dependencies
npm install

# Copy configuration template and configure variables
cp .env.example .env

# Run server in development mode
npm run dev
```

### Step 2: Start the Frontend Application
```bash
# Open a new terminal and navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Run the Vite server
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## Running with Docker (Recommended)

To run the entire stack (MongoDB, Express API, React + Nginx) containerized without configuring local services:

```bash
# Build and start the container stack in the root directory
# (Provide the Gemini API Key as an environment variable)
GEMINI_API_KEY="your_api_key_here" docker-compose up --build
```
Once initialized:
- **Frontend Portal**: Navigate to `http://localhost:5173`
- **Backend API**: Navigate to `http://localhost:5000/health`

---

## Backend REST APIs

| Method | Endpoint | Description |
|:---|:---|:---|
| **POST** | `/api/issues` | Submit report (Form Data: `image` file, `description`, `latitude`, `longitude`, `citizenEmail`) |
| **GET** | `/api/issues` | Retrieve paginated issues (Query Filters: `status`, `category`, `department`, `search`, `page`, `limit`) |
| **GET** | `/api/issues/:id` | Retrieve detailed issue, resolution plans, and verification timeline |
| **PATCH** | `/api/issues/:id/status` | Update issue status (`Open`, `In Progress`, `Resolved`) |
| **GET** | `/api/dashboard/stats` | Retrieve aggregated dashboard counts, category charts, and department stats |

---

## Google Cloud Run Deployment

To deploy both frontend and backend to Google Cloud Run, follow this guide using the Google Cloud SDK CLI.

### Step 1: Deploy the Backend
Compile the backend container and push it to Google Artifact Registry:

```bash
# Set your GCP project ID
export PROJECT_ID="your-gcp-project-id"
export REGION="us-central1"

# Build backend image
gcloud builds submit --tag gcr.io/$PROJECT_ID/civicmind-backend ./backend

# Deploy backend to Cloud Run
# (Ensure GEMINI_API_KEY and MONGODB_URI are configured appropriately)
gcloud run deploy civicmind-backend \
    --image gcr.io/$PROJECT_ID/civicmind-backend \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --set-env-vars="GEMINI_API_KEY=your_gemini_api_key,MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname,NODE_ENV=production"
```

Save the generated **Service URL** of the backend service (e.g., `https://civicmind-backend-xxxxxx.run.app`).

### Step 2: Deploy the Frontend
Compile the frontend container using the backend's Service URL as the environment variable target:

```bash
# Build frontend image, baking the backend URL in
gcloud builds submit --tag gcr.io/$PROJECT_ID/civicmind-frontend ./frontend

# Deploy frontend to Cloud Run
gcloud run deploy civicmind-frontend \
    --image gcr.io/$PROJECT_ID/civicmind-frontend \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated
```

The CLI will return the public URL for your **CivicMind AI** citizen application.
