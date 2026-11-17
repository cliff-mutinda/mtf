# Contact Management & M-Pesa STK Push Web Application

A complete, production-ready full-stack application for managing contacts (with Google Contacts CSV import, phone normalization, and duplicate detection) and triggering Safaricom M-Pesa STK Push prompts directly to customer phones with real-time status tracking.

- **Frontend**: React (Vite), React Router, Bootstrap 5, Lucide Icons, Axios.
- **Backend**: Python Flask, Gunicorn, SQLAlchemy, Marshmallow, Safaricom Daraja API.
- **Database**: MySQL / MariaDB compatible.
- **Deployment**: Render (Static Site for React frontend + Web Service with Gunicorn for Flask backend).

---

## 1. Project Architecture

```text
project-root/
│
├── frontend/                     # React (Vite) client application
│   ├── public/                   # Public static assets
│   ├── src/
│   │   ├── components/           # Navbar, modals, badges, pagination, empty states
│   │   ├── pages/                # DashboardPage, ContactsPage, ContactDetailPage, TransactionsPage
│   │   ├── services/             # contactService.js, mpesaService.js
│   │   ├── config/               # Centralized api.js (reads VITE_API_BASE_URL)
│   │   ├── hooks/                # useDebounce.js
│   │   ├── App.jsx               # Client-side routes
│   │   ├── main.jsx              # React DOM entry
│   │   └── index.css             # Modern business styling
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   ├── package-lock.json
│   ├── render.yaml               # Render Static Site Blueprint
│   ├── .env                      # Local frontend variables (gitignored)
│   ├── .env.example              # Frontend template committed to GitHub
│   └── .gitignore
│
├── backend/                      # Python Flask API server
│   ├── routes/                   # contacts.py, mpesa.py
│   ├── services/                 # mpesa_service.py (Daraja integration)
│   ├── utils/                    # phone.py (Kenyan phone normalization)
│   ├── database.py               # SQLAlchemy engine, scoped sessions, init_db
│   ├── model.py                  # Contact & MpesaTransaction models
│   ├── schema.py                 # Marshmallow validation & serialization
│   ├── app.py                    # Flask application factory, error handlers, CORS
│   ├── requirements.txt          # Python dependencies including gunicorn
│   ├── .python-version           # Pinned Python version (3.11.5)
│   ├── render.yaml               # Render Web Service Blueprint
│   ├── .env                      # Local backend variables (gitignored)
│   ├── .env.example              # Backend template committed to GitHub
│   └── .gitignore
│
├── README.md
└── .gitignore
```

---

## 2. Local Development Setup

### 2.1 Backend Setup

1. Open a terminal in the project root:
   ```bash
   cd backend
   python -m venv venv
   ```
2. Activate the virtual environment:
   - **Windows PowerShell**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **Linux / macOS**:
     ```bash
     source venv/bin/activate
     ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure local environment variables:
   Copy `.env.example` to `.env` and fill in your database credentials:
   ```bash
   cp .env.example .env
   ```
5. Start the backend development server:
   ```bash
   python app.py
   ```
   *The backend will run on `http://localhost:5000`.*

### 2.2 Frontend Setup

1. Open a second terminal in the project root:
   ```bash
   cd frontend
   npm install
   ```
2. Configure local environment variables:
   ```bash
   cp .env.example .env
   ```
   *Contains `VITE_API_BASE_URL=http://localhost:5000`.*
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend will run on `http://localhost:5173`.*

---

## 3. Render Production Deployment Architecture

```text
                           GitHub Repository
                                  │
                 ┌────────────────┴────────────────┐
                 │                                 │
                 ▼                                 ▼
        Render Static Site                Render Web Service
        (contactpay-frontend)             (contactpay-backend)
                 │                                 │
            React / Vite                    Flask / Gunicorn
           (Public CDN)                     (0.0.0.0:$PORT)
                 │                                 │
                 └───────────────┬─────────────────┘
                                 │ REST API
                                 ▼
                     External MySQL / MariaDB
                                 │
                     Safaricom Daraja Gateway
```

---

## 4. Render Service Specifications

### 4.1 Backend (Web Service)

- **Service Type**: `Web Service`
- **Root Directory**: `backend`
- **Runtime**: `Python 3`
- **Build Command**:
  ```bash
  pip install -r requirements.txt
  ```
- **Start Command**:
  ```bash
  gunicorn --bind 0.0.0.0:$PORT app:app
  ```
- **Health Check Path**: `/health`

### 4.2 Frontend (Static Site)

- **Service Type**: `Static Site`
- **Root Directory**: `frontend`
- **Build Command**:
  ```bash
  npm install && npm run build
  ```
- **Publish Directory**: `dist`
- **SPA Routing (Rewrite Rule)**:
  - Source: `/*`
  - Destination: `/index.html`
  - Action: `Rewrite` (ensures page refreshes on `/contacts`, `/transactions`, etc. serve `/index.html` without 404s).

---

## 5. Required Environment Variables

> **IMPORTANT**: Secrets (`.env`) are ignored by Git. Enter these values directly in the **Render Dashboard &rarr; Service &rarr; Environment**.

### 5.1 Backend Environment Variables

| Variable | Description | Example / Recommended Value |
|---|---|---|
| `FLASK_ENV` | Flask environment | `production` |
| `FLASK_DEBUG` | Debug mode | `false` |
| `DATABASE_HOST` | MySQL hostname | `db-xxxx.yourcloud.com` |
| `DATABASE_PORT` | MySQL port | `3306` (or custom port) |
| `DATABASE_NAME` | Database name | `mtf` |
| `DATABASE_USERNAME` | Database username | `your_db_user` |
| `DATABASE_PASSWORD` | Database password | `your_db_password` |
| `FRONTEND_URL` | Render Frontend URL for CORS | `https://contactpay-frontend.onrender.com` |
| `MPESA_ENVIRONMENT` | Daraja environment | `sandbox` (or `production`) |
| `MPESA_CONSUMER_KEY` | Daraja Consumer Key | Obtained from developer portal |
| `MPESA_CONSUMER_SECRET`| Daraja Consumer Secret | Obtained from developer portal |
| `MPESA_PASSKEY` | STK Push Passkey | Sandbox passkey or live passkey |
| `MPESA_BUSINESS_SHORT_CODE` | Paybill / Till Number | `174379` (sandbox) |
| `MPESA_CALLBACK_URL` | Public HTTPS Webhook | `https://contactpay-backend.onrender.com/api/mpesa/callback` |
| `AUTO_INIT_DB` | Safe idempotent table check | `true` |

### 5.2 Frontend Environment Variables

| Variable | Description | Example / Recommended Value |
|---|---|---|
| `VITE_API_BASE_URL` | Render Backend API URL | `https://contactpay-backend.onrender.com` |

---

## 6. Step-by-Step Render Deployment Guide

Follow this exact order to link the frontend, backend, and M-Pesa callbacks:

### Step 1: Push Code to GitHub
Initialize git and push to your GitHub repository:
```bash
git init
git add .
git commit -m "Prepare application for production deployment"
git branch -M main
git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO-NAME>.git
git push -u origin main
```

### Step 2: Deploy Backend Web Service on Render
1. Log in to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** &rarr; **Web Service**.
3. Connect your GitHub repository.
4. Configure service settings:
   - **Name**: `contactpay-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn --bind 0.0.0.0:$PORT app:app`
5. Expand **Advanced** and set:
   - **Health Check Path**: `/health`
6. Under **Environment Variables**, add:
   - `FLASK_ENV` = `production`
   - `FLASK_DEBUG` = `false`
   - `DATABASE_HOST` = `<your-mysql-host>`
   - `DATABASE_PORT` = `<your-mysql-port>`
   - `DATABASE_NAME` = `<your-db-name>`
   - `DATABASE_USERNAME` = `<your-db-user>`
   - `DATABASE_PASSWORD` = `<your-db-password>`
   - `MPESA_ENVIRONMENT` = `sandbox`
   - `MPESA_CONSUMER_KEY` = `<your-consumer-key>`
   - `MPESA_CONSUMER_SECRET` = `<your-consumer-secret>`
   - `MPESA_PASSKEY` = `<your-passkey>`
   - `MPESA_BUSINESS_SHORT_CODE` = `174379`
   - `AUTO_INIT_DB` = `true`
7. Click **Create Web Service**.
8. Once deployed, copy your backend URL (e.g. `https://contactpay-backend.onrender.com`).

### Step 3: Deploy Frontend Static Site on Render
1. In Render Dashboard, click **New +** &rarr; **Static Site**.
2. Connect the same GitHub repository.
3. Configure settings:
   - **Name**: `contactpay-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Under **Redirects / Rewrites**, add an SPA rewrite rule:
   - **Source**: `/*`
   - **Destination**: `/index.html`
   - **Action**: `Rewrite`
5. Under **Environment Variables**, add:
   - `VITE_API_BASE_URL` = `https://contactpay-backend.onrender.com` (using your backend URL from Step 2).
6. Click **Create Static Site**.
7. Once deployed, copy your frontend URL (e.g. `https://contactpay-frontend.onrender.com`).

### Step 4: Finalize Backend Cross-Origin & Callback Settings
1. Go back to your `contactpay-backend` service in the Render Dashboard.
2. Under **Environment Variables**, add/update:
   - `FRONTEND_URL` = `https://contactpay-frontend.onrender.com` (your frontend URL from Step 3).
   - `MPESA_CALLBACK_URL` = `https://contactpay-backend.onrender.com/api/mpesa/callback` (your backend URL from Step 2).
3. Click **Save Changes**. Render will automatically redeploy the backend with the updated environment variables.

---

## 7. Using Render Blueprints (`render.yaml`)

Each service has its own dedicated Render Blueprint:
- [backend/render.yaml](file:///c:/Users/Cliff/Desktop/mtf/backend/render.yaml): Deploys the Flask + Gunicorn Web Service.
- [frontend/render.yaml](file:///c:/Users/Cliff/Desktop/mtf/frontend/render.yaml): Deploys the React Static Site with SPA rewrites.

---

## 8. Continuous Deployment

Once connected, every `git push` to your `main` branch will trigger Render to automatically build and deploy the updated frontend and backend.
#   m t f  
 