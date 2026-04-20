import json
import random
from pathlib import Path

base = Path(__file__).resolve().parent

geojson_path = base / "data" / "hyderabad_wards.geojson"
output_path = base / "data" / "population.json"

with open(geojson_path, encoding="utf-8") as f:
    data = json.load(f)

population = {}

for i, feature in enumerate(data["features"]):

    props = feature.get("properties", {})

    name = props.get("name")

    if not name:
        name = f"Ward_{i}"

    pop = random.randint(40000, 120000)

    population[name] = pop

with open(output_path, "w") as f:
    json.dump(population, f, indent=2)

print(f"✅ population.json generated with {len(population)} wards")
print(f"📁 File location: {output_path}")