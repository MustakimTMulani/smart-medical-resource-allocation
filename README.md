# Smart Medical Resource Allocation System

A beginner-friendly starter for comparing Divide and Conquer, Greedy, and Dynamic Programming approaches to the 0/1 Knapsack healthcare resource allocation problem. This setup contains only the app scaffolding; no algorithms or dashboard are implemented yet.

## Requirements

- Node.js and npm
- Python 3.10 or newer

## Frontend setup and run

Open PowerShell in the project folder and run:

```powershell
cd frontend
npm install
npm run dev
```

Vite prints the local URL (typically `http://localhost:5173`). Tailwind CSS is included in the frontend dependencies and configured through PostCSS.

## Backend setup and run

In a second PowerShell window, from the project folder:

```powershell
cd backend
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

If PowerShell blocks activation, use this for the current terminal only, then activate again:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
```

The API runs at `http://127.0.0.1:8000`; interactive API documentation is at `http://127.0.0.1:8000/docs`.

## Project structure

```text
.
├── backend/
│   ├── app/
│   │   ├── algorithms/
│   │   ├── database/
│   │   ├── routes/
│   │   ├── services/
│   │   └── main.py
│   └── requirements.txt
├── frontend/
│   ├── index.html
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── package.json
│   └── src/
│       ├── App.jsx
│       ├── index.css
│       └── main.jsx
├── .gitignore
└── README.md
```

The SQLite database can be added under `backend/app/database/` when database setup is implemented. The frontend and backend dependencies are declared but are not installed by this starter.
