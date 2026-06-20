# Frontend

React 19 + Vite + Tailwind CSS client for SecLabs. Single page app: no client-side router, `App.jsx` swaps panels based on `activeItemId` state.

## Structure

```
src/
  data/journey.js        # Single source of truth for scenario stories, lab guide steps, quizzes
  hooks/useLabRuntime.js  # Lab container lifecycle: start, poll status/logs
  components/
    workspace/            # WorkspacePanel routes to the right view per item type
    scenarios/            # Scenario investigation flow
    labs/                 # Lab guide, runtime, intro
  services/apiClient.js   # Backend HTTP client
```

All journey state (active item, step progress, quiz answers, completion flags) lives in `App.jsx`'s `items` array; there is no server-side session state.

## Commands

```bash
npm install
npm run dev        # Dev server -> http://localhost:5173
npm run build      # Production build -> dist/
npm run lint       # ESLint
npm run preview    # Preview production build
```

`VITE_API_BASE_URL` in `.env` sets the backend URL (defaults to `http://localhost:8000`).
