.PHONY: dev-backend dev-frontend

dev-backend:
	cd backend && python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt && uvicorn main:app --reload --port 8000

dev-frontend:
	cd frontend && npm install && npm run dev
