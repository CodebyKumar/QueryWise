#!/bin/bash
# Exit immediately if a command exits with a non-zero status
set -e

# Define directories
API_DIR="api"
FRONTEND_DIR="frontend"

# Move to the frontend directory
echo ">>> Starting frontend (Bun dev server) in '$FRONTEND_DIR'..."
cd "$FRONTEND_DIR"

# Start frontend in a new terminal or background
bun run dev &
FRONTEND_PID=$!

# Move into the API directory
echo ">>> Setting up backend environment in '$API_DIR'..."
cd "../$API_DIR"

# Sync dependencies from pyproject.toml
if [ -f "pyproject.toml" ]; then
    echo ">>> Syncing dependencies with uv..."
    uv sync
else
    echo "!!! pyproject.toml not found in $API_DIR"
fi

# Activate the virtual environment
echo ">>> Activating virtual environment..."
source .venv/bin/activate

# Start the backend using uvicorn in background
echo ">>> Starting backend server (Uvicorn)..."
uvicorn main:app --reload &
BACKEND_PID=$!


# Wait for both processes
echo ">>> Backend PID: $BACKEND_PID | Frontend PID: $FRONTEND_PID"
echo ">>> Both servers are running. Press Ctrl+C to stop."

# Wait for background jobs to finish
wait
