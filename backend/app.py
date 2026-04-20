"""
Minimal Flask backend for the real-time disaster environment.

- Runs HyderabadDisasterEnvironment in a background thread (simulation loop).
- Exposes GET /api/environment returning the latest ward state as JSON.
- Flask serves requests without blocking the simulation.
"""

'''import threading

from flask import Flask, jsonify

from environment import HyderabadDisasterEnvironment

# ---------------------------------------------------------------------------
# Single shared environment instance
# ---------------------------------------------------------------------------

# Create one environment instance (loads wards from data/hyderabad_wards.geojson)
environment = HyderabadDisasterEnvironment(seed=42)

# ---------------------------------------------------------------------------
# Run simulation in a background thread (so it does not block Flask)
# ---------------------------------------------------------------------------

def run_simulation_in_background() -> None:
    """Entry point for the background thread: runs the simulation loop forever."""
    environment.run_simulation()


# Start the simulation thread. daemon=True means it will stop when the main process exits.
simulation_thread = threading.Thread(target=run_simulation_in_background, daemon=True)
simulation_thread.start()

# ---------------------------------------------------------------------------
# Flask app
# ---------------------------------------------------------------------------

app = Flask(__name__)


@app.get("/api/environment")
def get_environment() -> tuple:
    """
    GET /api/environment
    Returns the current state of all wards as JSON (latest live state from the simulation).
    The simulation runs in another thread, so this always reads the up-to-date state.
    """
    state = environment.get_current_state()
    return jsonify(state), 200


# ---------------------------------------------------------------------------
# Run the app (for local development)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)'''
"""
Minimal Flask backend for the real-time disaster environment.

- Runs HyderabadDisasterEnvironment in a background thread (simulation loop).
- Exposes GET /api/environment returning the latest ward state as JSON.
- Flask serves requests without blocking the simulation.
"""

import threading
from flask import Flask, jsonify
from flask_cors import CORS   # ✅ NEW — allows React to call the API

from environment import HyderabadDisasterEnvironment

# ---------------------------------------------------------------------------
# Single shared environment instance
# ---------------------------------------------------------------------------

environment = HyderabadDisasterEnvironment(seed=42)

# ---------------------------------------------------------------------------
# Run simulation in a background thread
# ---------------------------------------------------------------------------

def run_simulation_in_background():
    """Runs the environment simulation loop forever."""
    environment.run_simulation()

simulation_thread = threading.Thread(
    target=run_simulation_in_background,
    daemon=True
)
simulation_thread.start()

# ---------------------------------------------------------------------------
# Flask app
# ---------------------------------------------------------------------------

app = Flask(__name__)
CORS(app)   # ✅ NEW — enable cross-origin requests
@app.get("/api/environment")
def get_environment():
    """
    Returns live ward state as JSON.
    """
    state = environment.get_current_state()
    return jsonify(state), 200
@app.get("/api/decisions")
def get_decisions():
    return jsonify(environment.decisions),200
@app.route("/api/teams")
def get_teams():
    return jsonify(environment.available_teams),200
@app.route("/api/stats")
def get_stats():

    wards = environment.get_current_state()

    red = 0
    yellow = 0
    green = 0

    for w in wards:

        if w["severity"] >= 4:
            red += 1

        elif w["severity"] >= 2:
            yellow += 1

        else:
            green += 1

    return {
        "red_zones": red,
        "yellow_zones": yellow,
        "green_zones": green,
        "disaster": environment.current_disaster
    }
# ---------------------------------------------------------------------------
# Run the app
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
