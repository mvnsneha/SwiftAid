import math

# 📍 All team locations
RESOURCE_POINTS = [

    # 🟡 NDRF (few but strong)
    {"type": "NDRF", "name": "Amberpet Base", "lat": 17.385, "lon": 78.518, "available": 3},
    {"type": "NDRF", "name": "Shaikpet RRC", "lat": 17.412, "lon": 78.392, "available": 2},

    # 🔵 DRF (spread across city)
    {"type": "DRF", "name": "Jeedimetla", "lat": 17.516, "lon": 78.450, "available": 2},
    {"type": "DRF", "name": "Bharat Nagar", "lat": 17.455, "lon": 78.450, "available": 2},
    {"type": "DRF", "name": "Yousufguda", "lat": 17.430, "lon": 78.420, "available": 2},
    {"type": "DRF", "name": "Jiyaguda", "lat": 17.370, "lon": 78.450, "available": 2},
    {"type": "DRF", "name": "Begum Bazar", "lat": 17.375, "lon": 78.470, "available": 2},
    {"type": "DRF", "name": "Kothapet", "lat": 17.373, "lon": 78.540, "available": 2},
    {"type": "DRF", "name": "Balapur", "lat": 17.310, "lon": 78.480, "available": 2},
    {"type": "DRF", "name": "Jubilee Hills", "lat": 17.430, "lon": 78.410, "available": 2},
    {"type": "DRF", "name": "Miyapur", "lat": 17.495, "lon": 78.360, "available": 2},
    {"type": "DRF", "name": "Kondapur", "lat": 17.460, "lon": 78.360, "available": 2},
    {"type": "DRF", "name": "KPHB Colony", "lat": 17.490, "lon": 78.390, "available": 2},
    {"type": "DRF", "name": "Nallakunta", "lat": 17.400, "lon": 78.500, "available": 2},
    {"type": "DRF", "name": "Nagole", "lat": 17.370, "lon": 78.570, "available": 2},
    {"type": "DRF", "name": "Upperpally", "lat": 17.350, "lon": 78.430, "available": 2},
    {"type": "DRF", "name": "Manikonda", "lat": 17.410, "lon": 78.370, "available": 2},
    {"type": "DRF", "name": "Sanathnagar", "lat": 17.450, "lon": 78.450, "available": 2},
    {"type": "DRF", "name": "Kushaiguda", "lat": 17.480, "lon": 78.570, "available": 2},
    {"type": "DRF", "name": "Punjagutta", "lat": 17.430, "lon": 78.450, "available": 2},
    {"type": "DRF", "name": "Rajendra Nagar", "lat": 17.320, "lon": 78.400, "available": 2},
    {"type": "DRF", "name": "Chilkalguda", "lat": 17.430, "lon": 78.500, "available": 2},
    {"type": "DRF", "name": "Gachibowli", "lat": 17.440, "lon": 78.350, "available": 3},

    # 🔴 FIRE (stations)
    {"type": "FIRE", "name": "Jeedimetla Fire", "lat": 17.516, "lon": 78.450, "available": 2},
    {"type": "FIRE", "name": "Secunderabad Fire", "lat": 17.439, "lon": 78.498, "available": 2},
    {"type": "FIRE", "name": "Moghalpura Fire", "lat": 17.360, "lon": 78.480, "available": 2},
    {"type": "FIRE", "name": "Malakpet Fire", "lat": 17.370, "lon": 78.500, "available": 2},
    {"type": "FIRE", "name": "Kukatpally Fire", "lat": 17.494, "lon": 78.399, "available": 2},
    {"type": "FIRE", "name": "Gachibowli Fire", "lat": 17.440, "lon": 78.350, "available": 2},
    {"type": "FIRE", "name": "LB Nagar Fire", "lat": 17.345, "lon": 78.552, "available": 2},
    {"type": "FIRE", "name": "Madhapur Fire", "lat": 17.448, "lon": 78.391, "available": 2},
]


# 📏 Distance formula
def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return 2 * R * math.asin(math.sqrt(a))


# 🔍 Find nearest suitable team
def find_nearest_team(ward, disaster_type):

    lat = ward.get("lat")
    lon = ward.get("lon")

    # ✅ FIX: skip invalid wards
    if lat is None or lon is None:
        return None

    best_team = None
    min_dist = float("inf")

    for team in RESOURCE_POINTS:

        if team["available"] <= 0:
            continue

        # 🎯 Match disaster → team
        if disaster_type == "flood" and team["type"] not in ["DRF", "NDRF"]:
            continue

        if disaster_type == "fire" and team["type"] != "FIRE":
            continue

        if disaster_type == "earthquake" and team["type"] != "NDRF":
            continue

        if disaster_type == "crowd" and team["type"] != "SDRF":
            continue

        if disaster_type == "cyclone_effect" and team["type"] not in ["DRF", "NDRF"]:
            continue

        dist = haversine(lat, lon, team["lat"], team["lon"])

        if dist < min_dist:
            min_dist = dist
            best_team = team

    return best_team


# 🚑 Allocate nearest team
def allocate_nearest(env, ward):

    if ward.get("teams_assigned_count", 0) >= 5:
        return

    disaster = ward.get("active_disaster")

    team = find_nearest_team(ward, disaster)

    # ✅ FIX: avoid crash
    if team is None:
        print(f"⚠️ Skipping {ward['name']} (no valid location)")
        return

    team["available"] -= 1
    env.available_teams[team["type"]] -= 1
    ward["team_assigned"] = True
    ward["team_type"] = team["type"]
    ward["team_from"] = team["name"]

    print(f"🚑 {team['type']} from {team['name']} → {ward['name']}")
