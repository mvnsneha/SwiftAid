"""
Hyderabad Disaster Environment - Real-time disaster response system backend.

Loads ward-level GeoJSON, models hazards (flood, fire, earthquake, cyclone_effect, crowd),
combines physical + historical risk, and provides update_environment() and get_current_state().

No frontend, no RL agent, no Flask. Run as: python environment.py
"""

from __future__ import annotations
from resource_manager import allocate_nearest

import json
import math
import random
import time
from pathlib import Path
from typing import Any

#from matplotlib.pyplot import hist
from rl_agent import QLearningAgent

# Optional: use geopandas for GeoJSON; fallback for missing dependency
try:
    import geopandas as gpd
    from shapely.geometry import shape
    HAS_GEOPANDAS = True
except ImportError:
    HAS_GEOPANDAS = False

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
DISASTER_TEAM_MAP = {
    "flood": "DRF",
    "fire": "FIRE",
    "earthquake": "NDRF",
    "crowd": "SDRF",
    "cyclone_effect": "DRF"
}
# Hazard types used across wards
HAZARDS = ("flood", "fire", "earthquake", "cyclone_effect", "crowd")

# Disaster phases in order of escalation
PHASES = ("warning", "moderate", "severe", "evacuation")

# Hyderabad approximate water bodies / drainage (lon, lat) for flood risk
# Hussain Sagar, Musi River corridor, Osman Sagar overflow zone
WATER_POINTS_HYDERABAD = [
    (78.4730, 17.4232),   # Hussain Sagar
    (78.4850, 17.3650),   # Musi - old city
    (78.5100, 17.3900),   # Musi - downstream
    (78.3950, 17.4550),   # North drainage
    (78.5500, 17.3200),   # South-east drainage
]

# Critical infrastructure types
CRITICAL_INFRA_TYPES = ("hospital", "metro", "power_station")
# Total rescue teams available in Hyderabad (approximate realistic values)

RESCUE_TEAMS_AVAILABLE = {
    "NDRF": 3,      # National Disaster Response Force
    "SDRF": 5,     # State Disaster Response Force
    "DRF": 10,      # GHMC Disaster Response Force
    "FIRE": 1      # Fire & Emergency teams
}


def _haversine_km(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    """Approximate distance in km between two (lon, lat) points."""
    R = 6371  # Earth radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def _centroid_from_geometry(geom: Any) -> tuple[float, float] | None:
    """Get (lon, lat) centroid from a GeoJSON-like geometry or shapely shape."""
    if not HAS_GEOPANDAS or geom is None:
        return None
    try:
        if hasattr(geom, "centroid"):
            c = geom.centroid
            return (float(c.x), float(c.y))
        if isinstance(geom, dict):
            shp = shape(geom)
            c = shp.centroid
            return (float(c.x), float(c.y))
    except Exception:
        pass
    return None


def _geometry_to_geo_interface(geom: Any) -> dict[str, Any] | None:
    """Convert geometry to JSON-serializable form (GeoJSON geometry dict, lists not tuples)."""
    if geom is None:
        return None
    try:
        if hasattr(geom, "__geo_interface__"):
            raw = geom.__geo_interface__
        elif isinstance(geom, dict) and geom.get("type") in ("Polygon", "MultiPolygon", "Point", "LineString"):
            raw = geom
        else:
            return None
        return _to_json_safe(raw)
    except Exception:
        pass
    return None


def _to_json_safe(obj: Any) -> Any:
    """Recursively convert tuples to lists so geometry is JSON-serializable."""
    if isinstance(obj, tuple):
        return [_to_json_safe(x) for x in obj]
    if isinstance(obj, list):
        return [_to_json_safe(x) for x in obj]
    if isinstance(obj, dict):
        return {k: _to_json_safe(v) for k, v in obj.items()}
    return obj


# ---------------------------------------------------------------------------
# Ward state: one environment unit per ward
# ---------------------------------------------------------------------------


class WardState:
    """
    Single ward as one environment unit.
    Holds name, geometry, hazards, historical risk, active disaster, severity,
    urgency, phase, accessibility, and critical infrastructure.
    """

    def __init__(
        self,
        name: str,
        geometry: Any,
        centroid: tuple[float, float] | None = None,
    ):
        self.name = str(name)
        self.geometry = geometry
        self.centroid = centroid

        # Hazard levels (current physical risk 0.0–1.0)
        self.hazards: dict[str, float] = {h: 0.0 for h in HAZARDS}

        # Historical risk per hazard (0.0–1.0), used to combine with current risk
        self.historical_risk: dict[str, float] = {h: 0.0 for h in HAZARDS}

        # Active disaster type (e.g. "flood", "fire") or None
        self.active_disaster: str | None = None

        # Severity and urgency 1–5
        self.severity: int = 1
        self.urgency: int = 1

        # Phase: warning | moderate | severe | evacuation
        self.phase: str = "warning"

        # Whether the ward is currently accessible for response
        self.accessible: bool = True

        # Critical infrastructure present in this ward (subset of hospital, metro, power_station)
        self.critical_infra: list[str] = []

    def _set_historical_risk_hyderabad(self) -> None:
        """
        Set historical risk per hazard using Hyderabad-specific logic:
        - Flood: high for wards near water bodies or drainage.
        - Earthquake: low probability, high impact (we store as risk level).
        - Cyclone: indirect effects only (heavy rain, power) — moderate baseline.
        - Fire/crowd: varied by area.
        """
        if self.centroid is None:
            return
        lon, lat = self.centroid

        # Flood: high historical risk if near water
        min_dist_km = min(
            _haversine_km(lon, lat, wx, wy) for wx, wy in WATER_POINTS_HYDERABAD
        )
        if min_dist_km < 2.0:
            self.historical_risk["flood"] = 0.85
        elif min_dist_km < 4.0:
            self.historical_risk["flood"] = 0.6
        elif min_dist_km < 6.0:
            self.historical_risk["flood"] = 0.35
        else:
            self.historical_risk["flood"] = 0.15

        # Earthquake: low probability, high impact — historical risk as "impact if occurs"
        self.historical_risk["earthquake"] = 0.25  # low probability
        # We use a separate high-impact flag in severity when earthquake is active.

        # Cyclone: indirect effects only (heavy rain, power failure)
        self.historical_risk["cyclone_effect"] = 0.5  # moderate baseline

        # Fire and crowd: slight variation by "area" (using lat as proxy for density)
        self.historical_risk["fire"] = 0.2 + 0.15 * (lat % 0.1)  # 0.2–0.35
        self.historical_risk["crowd"] = 0.25 + 0.2 * (lon % 0.1)  # 0.25–0.45

    def _assign_critical_infra(self, rng: random.Random) -> None:
        """Assign a random subset of critical infrastructure to this ward."""
        pool = list(CRITICAL_INFRA_TYPES)
        rng.shuffle(pool)
        n = rng.randint(0, min(3, len(pool)))
        self.critical_infra = pool[:n]

    def _combined_risk(self, hazard: str) -> float:
        """Combine current hazard level with historical risk (weighted). Used for severity/urgency mapping."""
        current = self.hazards.get(hazard, 0.0)
        hist = self.historical_risk.get(hazard, 0.0)
        return min(1.0, 0.6 * current + 0.4 * hist)

    def combined_risk_score(self, hazard: str) -> float:
        """
        Combined risk score for a hazard = current_hazard_risk + historical_risk.
        Used to select which hazard becomes active_disaster (can exceed 1.0).
        """
        current = self.hazards.get(hazard, 0.0)
        historical = self.historical_risk.get(hazard, 0.0)
        return current + historical

    def _apply_critical_infra_to_severity_urgency(self) -> None:
        """Increase severity and urgency when critical infrastructure is affected."""
        if not self.critical_infra:
            return
        # More critical infra => disaster impact is higher
        boost = len(self.critical_infra)
        self.severity = min(5, self.severity + boost)
        self.urgency = min(5, self.urgency + (boost if "hospital" in self.critical_infra else 0))


# ---------------------------------------------------------------------------
# Main environment: Hyderabad disaster environment
# ---------------------------------------------------------------------------


class HyderabadDisasterEnvironment:
    """
    Real-time disaster environment for Hyderabad at ward level.
    Loads wards from GeoJSON, maintains state per ward, and provides
    update_environment() and get_current_state().
    """

    def __init__(self, geojson_path: str | Path | None = None, seed: int | None = None):

        self._rng = random.Random(seed)

        self.wards: list[dict[str, Any]] = []

        pop_path = Path(__file__).resolve().parent / "data" / "population.json"

        with open(pop_path) as f:
            self.population_data = json.load(f)

        self.agent = QLearningAgent()

        self.current_disaster = "flood"

        self.available_teams = RESCUE_TEAMS_AVAILABLE.copy()
        self.decisions = []

        if geojson_path:
            path = Path(geojson_path).resolve()
        else:
            base = Path(__file__).resolve().parent
            path = base / "data" / "hyderabad_wards.geojson"

        if not path.exists():
            raise FileNotFoundError(f"GeoJSON not found: {path}")

        self._load_wards(path)
    def set_disaster(self, disaster):

        print(f"\n⚠️ Selected Disaster: {disaster.upper()}\n")

        self.current_disaster = disaster

        for ward in self.wards:
            ward["active_disaster"] = disaster
    def _load_wards(self, path: Path) -> None:
        """Load wards from GeoJSON; treat each Polygon/MultiPolygon as one unit. Skips invalid geometries."""
        if not HAS_GEOPANDAS:
            raise ImportError(
                "geopandas is required. Install with: pip install geopandas"
            )

        # Load raw JSON to handle invalid geometries (e.g. unclosed rings) without failing
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        features = data.get("features") or []

        for idx, feat in enumerate(features):
            geom_dict = feat.get("geometry")
            if not geom_dict or geom_dict.get("type") not in ("Polygon", "MultiPolygon"):
                continue
            try:
                geom = shape(geom_dict)
                if geom is None or geom.is_empty:
                    continue
            except Exception:
                continue
            props = feat.get("properties") or {}
            name = (props.get("name") or feat.get("id") or f"Ward_{idx}")
            if isinstance(name, (dict, list)):
                name = f"Ward_{idx}"
            name = str(name).strip() or f"Ward_{idx}"
            # Nested name in @relations/reltags
            population = self.population_data.get(name, 60000)
            if name.startswith("Ward_") and not props.get("name"):
                for rel in (props.get("@relations") or []):
                    if isinstance(rel, dict):
                        tags = rel.get("reltags") or {}
                        if isinstance(tags, dict) and tags.get("name"):
                            name = str(tags["name"])
                            break
            centroid = _centroid_from_geometry(geom)
            ward_obj = WardState(name=name, geometry=geom, centroid=centroid)
            ward_obj._set_historical_risk_hyderabad()
            ward_obj._assign_critical_infra(self._rng)
            # One-time init: combined risk -> initial severity, urgency, phase, accessible, active_disaster
            combined_risk_scores = {h: ward_obj.combined_risk_score(h) for h in HAZARDS}
            hazard_with_max_risk = max(HAZARDS, key=lambda h: combined_risk_scores[h])
            max_combined_risk = combined_risk_scores[hazard_with_max_risk]
            ACTIVE_DISASTER_THRESHOLD = 0.2
            if max_combined_risk < ACTIVE_DISASTER_THRESHOLD:
                severity = 0
                urgency = 0
                phase = "normal"
                accessible = True
                active_disaster = None
            else:
                effective_risk = min(1.0, max_combined_risk)
                severity = max(0, min(5, self._risk_to_severity(effective_risk)))
                urgency = max(0, min(5, self._risk_to_urgency(effective_risk, ward_obj)))
                active_disaster = hazard_with_max_risk
                if severity >= 4:
                    phase = "evacuation"
                    accessible = False
                elif severity >= 2:
                    phase = "response"
                    accessible = True
                else:
                    phase = "normal"
                    active_disaster = None
                    accessible = True
            # Store as mutable dict; geometry pre-serialized so get_current_state() does not compute
            self.wards.append({
            "name": name,
            "geometry": _geometry_to_geo_interface(geom),
            "severity": severity,
            "urgency": urgency,
            "phase": phase,
            "population": population,
            "accessible": accessible,
            "active_disaster": active_disaster,
            "historical_risk": ward_obj.historical_risk,
            "team_assigned": False,
            "prev_severity": severity,
            "partial": False,
            "split_count": 0
        })
    def show_available_teams(self):

        print("\n🚑 Available Rescue Teams")

        for team, count in self.available_teams.items():
            print(f"{team} : {count}")

        print()
    def allocate_rescue_team(self, ward):

        if ward["team_assigned"]:
            return

        disaster = ward.get("active_disaster")

        if disaster is None:
            return

        if disaster == "flood":

            if self.available_teams["DRF"] > 0:
                self.available_teams["DRF"] -= 1
                ward["team_assigned"] = True

                print(f"🚑 DRF team sent to {ward['name']} (Flood Rescue)")

                self.show_available_teams()

        elif disaster == "fire":

            if self.available_teams["FIRE"] > 0:
                self.available_teams["FIRE"] -= 1
                ward["team_assigned"] = True
                print(f"🔥 Fire Rescue team sent to {ward['name']}")

        elif disaster == "earthquake":

            if self.available_teams["NDRF"] > 0:
                self.available_teams["NDRF"] -= 1
                ward["team_assigned"] = True
                print(f"🚨 NDRF team sent to {ward['name']}")

        elif disaster == "crowd":

            if self.available_teams["SDRF"] > 0:
                self.available_teams["SDRF"] -= 1
                ward["team_assigned"] = True
                print(f"🚓 SDRF team sent to {ward['name']} (Crowd Control)")
        elif disaster == "cyclone_effect":

            if self.available_teams["DRF"] > 0:
                self.available_teams["DRF"] -= 1
                ward["team_assigned"] = True
                print(f"🚑 DRF team sent to {ward['name']} (Cyclone Effect Response)")
    def required_teams(ward):

        population = ward.get("population", 50000)
        severity = ward.get("severity", 1)

        # population factor (per 50k people)
        pop_factor = population // 50000

        # severity weight
        if severity >= 5:
            sev_factor = 3
        elif severity >= 4:
            sev_factor = 2
        elif severity >= 2:
            sev_factor = 1
        else:
            sev_factor = 0

        # total teams needed
        teams = pop_factor + sev_factor

        # limit (important!)
        return min(5, teams)
    def check_rescue_completion(self):

        for ward in self.wards:

            if ward["team_assigned"] and ward["severity"] <= 1:

                disaster = ward.get("active_disaster")

                ward["team_assigned"] = False
                ward["partial"] = False
                ward["split_count"] = 0
                if disaster == "flood":
                    self.available_teams["DRF"] += 1

                elif disaster == "fire":
                    self.available_teams["FIRE"] += 1

                elif disaster == "earthquake":
                    self.available_teams["NDRF"] += 1

                elif disaster == "crowd":
                    self.available_teams["SDRF"] += 1

                print(f"✅ Area stabilized → {ward['name']}")

    def get_wards(self) -> list[dict[str, Any]]:
            """Return list of ward dicts (read-only usage)."""
            return self.wards
    def run_simulation(self):

        while True:

            self.check_rescue_completion()

            for ward in self.wards:

                prev_sev = ward["severity"]

                state = self.agent.get_state(ward)
                action = self.agent.choose_action(state)

                ward_before = ward.copy()

                self.update_ward(ward)

                curr_sev = ward["severity"]

                if prev_sev < 4 and curr_sev >= 4:

                    if action == 1:

                        if not ward.get("team_assigned"):

                            disaster = ward.get("active_disaster")

                            # -------------------------
                            # 🚑 NORMAL DISPATCH
                            # -------------------------
                            team_type = DISASTER_TEAM_MAP.get(disaster)
                            if self.available_teams.get(team_type, 0) > 0:

                                print(f"🤖 RL dispatching rescue → {ward['name']}")

                                allocate_nearest(self, ward)

                            # -------------------------
                            # ⚡ SPLIT (ONLY WHEN 0)
                            # -------------------------
                            else:

                                split_done = False

                                for w in self.wards:

                                    if w.get("team_assigned"):

                                        splits = w.get("split_count", 0)

                                        # ✅ LIMIT SPLITS
                                        if splits < 2:

                                            print(f"⚡ Splitting team: {w['name']} → {ward['name']}")

                                            # mark partial
                                            w["partial"] = True
                                            ward["partial"] = True

                                            # update split count
                                            w["split_count"] = splits + 1
                                            ward["split_count"] = 1

                                            # assign team (no count reduction)
                                            ward["team_assigned"] = True
                                            ward["team_type"] = w.get("team_type")
                                            ward["team_from"] = w.get("team_from")

                                            split_done = True
                                            break

                                if not split_done:
                                    print(f"❌ No teams & no split possible → {ward['name']}")

                        else:
                            print(f"⚠️ Team already assigned → {ward['name']}")

                    else:
                        print(f"🤖 RL decided to wait → {ward['name']}")

                    # -------------------------
                    # 📊 STORE DECISIONS
                    # -------------------------
                    self.decisions.append({
                        "ward": ward["name"],
                        "severity": curr_sev,
                        "action": "dispatch" if action == 1 else "wait",
                        "team": ward.get("team_type"),
                        "from": ward.get("team_from"),
                        "partial": ward.get("partial", False)
                    })

                    self.decisions = self.decisions[-20:]

                # -------------------------
                # 🎯 RL LEARNING
                # -------------------------
                reward = self.agent.calculate_reward(ward_before, ward)
                next_state = self.agent.get_state(ward)

                self.agent.update_q(state, action, reward, next_state)

                ward["prev_severity"] = curr_sev

            time.sleep(10)

    def update_ward(self, ward):

        hist = ward.get("historical_risk", {})

        disaster = self.current_disaster

        # base risk
        risk = hist.get(disaster, 0)

        # cyclone causes heavy rain → increases flood probability
        if disaster == "cyclone_effect":
            flood_risk = hist.get("flood", 0)
            cyclone_risk = hist.get("cyclone_effect", 0)

            # combine both effects
            risk = (cyclone_risk * 1.2) + (flood_risk * 0.8)

        crowd = hist.get("crowd", 0)

        # -------------------------
        # BASELINE RISK
        # -------------------------

        baseline_score = risk * 4

        if baseline_score < 1.2:
            baseline_severity = 0
        elif baseline_score < 2.2:
            baseline_severity = 1
        elif baseline_score < 3.2:
            baseline_severity = 2
        else:
            baseline_severity = 3

        # -------------------------
        # CITY IMPORTANCE BOOST
        # -------------------------

        name = ward.get("name", "").lower()

        important_areas = [
            "ameerpet","begumpet","kukatpally",
            "secunderabad","charminar",
            "gachibowli","hitech","dilsukhnagar"
        ]

        if any(k in name for k in important_areas):
            baseline_severity = min(4, baseline_severity + 1)

        # -------------------------
        # LIVE FLUCTUATION
        # -------------------------

        if disaster == "cyclone_effect":
            fluctuation = random.choice([-1, 0, 1, 1])  # cyclone spreads faster
        else:
            fluctuation = random.choice([-1, 0, 0, 1])

        new_severity = max(0, min(5, baseline_severity + fluctuation))

        ward["severity"] = new_severity

        # -------------------------
        # URGENCY
        # -------------------------

        if new_severity >= 4:
            ward["urgency"] = 5 if crowd > 0.35 else 4

        elif new_severity >= 2:
            ward["urgency"] = 3 if crowd > 0.3 else 2

        else:
            ward["urgency"] = 1

        # -------------------------
        # PHASE
        # -------------------------

        if new_severity >= 4:
            ward["phase"] = "evacuation"
            ward["accessible"] = False

        elif new_severity >= 2:
            ward["phase"] = "response"
            ward["accessible"] = True

        else:
            ward["phase"] = "normal"
            ward["accessible"] = True

        # -------------------------
        # 9️⃣ END DISASTER IF STABLE
        # -------------------------
        if new_severity <= 1:
            ward["active_disaster"] = None
        if ward.get("partial"):

            # slower improvement
            if ward["severity"] > 0:
                ward["severity"] = max(0, ward["severity"] - 0.5)

    def get_current_state(self) -> list[dict[str, Any]]:
            """
            Return current wards (live state). No computation: just returns self.wards
            so the environment evolves continuously via the background simulation loop.
            """
            return self.wards

    def get_current_state_json(self) -> str:
        """Return get_current_state() as a JSON string."""
        return json.dumps(self.get_current_state(), indent=2, default=str)

    def _risk_to_severity(self, risk: float) -> int:
        """Map combined risk 0–1 to severity 1–5. Used only for one-time init in _load_wards."""
        return min(5, max(1, int(risk * 5) + 1))

    def _risk_to_urgency(self, risk: float, ward_obj: WardState) -> int:
        """Map risk and critical infra to urgency 1–5. Used only for one-time init in _load_wards."""
        u = min(5, max(1, int(risk * 5) + 1))
        if "hospital" in ward_obj.critical_infra:
            u = min(5, u + 1)
        return u


# ---------------------------------------------------------------------------
# Ward name from GeoDataFrame row (pandas Series)
# ---------------------------------------------------------------------------


def _ward_name_from_series(row: Any, idx: int) -> str:
    """Extract ward name from a GeoDataFrame row (Series)."""
    try:
        if hasattr(row, "get") and callable(row.get):
            n = row.get("name")
            if n is not None and str(n).strip():
                return str(n).strip()
        if hasattr(row, "index") and "name" in row.index:
            n = row["name"]
            if n is not None and str(n).strip():
                return str(n).strip()
    except Exception:
        pass
    return f"Ward_{idx}"


# ---------------------------------------------------------------------------
# Run independently
# ---------------------------------------------------------------------------

if __name__ == "__main__":

    env = HyderabadDisasterEnvironment(seed=42)

    disaster = input("Enter disaster (flood/fire/earthquake/cyclone_effect/crowd): ")

    env.set_disaster(disaster)

    print(f"Loaded {len(env.wards)} wards")

    env.run_simulation()