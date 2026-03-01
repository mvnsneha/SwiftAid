import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Polygon
} from "react-leaflet";

/* 🌊 Coastal tsunami risk zones */
const tsunamiZones = [
  { name: "West Coast Risk", coords: [[22,68],[22,74],[8,74],[8,68]], color: "orange" },
  { name: "East Coast Risk", coords: [[20,80],[20,88],[8,88],[8,80]], color: "orange" },
  { name: "Andaman & Nicobar High Risk", coords: [[14,92],[14,95],[6,95],[6,92]], color: "red" }
];

/* 🧠 Tsunami risk logic */
function detectTsunami(quakes) {
  return quakes.find(q => {
    const mag = q.properties.mag || 0;
    const [lng, lat] = q.geometry.coordinates;

    const nearOcean =
      (lat >= 6 && lat <= 22 && lng >= 68 && lng <= 75) ||
      (lat >= 6 && lat <= 22 && lng >= 80 && lng <= 92);

    return mag >= 6.5 && nearOcean;
  });
}

function TsunamiDashboard() {
  const [earthquakes, setEarthquakes] = useState([]);
  const [alert, setAlert] = useState(null);
  const [bulletin, setBulletin] = useState("Fetching latest advisory...");

  const fetchEarthquakes = async () => {
    const now = new Date();
    const past = new Date(now.getTime() - 10 * 60000);

    const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${past.toISOString()}&minlatitude=6&maxlatitude=38&minlongitude=68&maxlongitude=98`;

    const res = await fetch(url);
    const data = await res.json();

    setEarthquakes(data.features);

    const riskEvent = detectTsunami(data.features);
    setAlert(riskEvent || null);
  };

  /* 📢 Bulletin placeholder (simulate official advisory) */
  const fetchBulletin = async () => {
    // Replace later if official feed available
    setBulletin("No tsunami warning for India. Monitoring continues.");
  };

  useEffect(() => {
    fetchEarthquakes();
    fetchBulletin();

    const interval = setInterval(() => {
      fetchEarthquakes();
      fetchBulletin();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ 
  padding: "20px", 
  backgroundColor: "#060933 "   // dark navy blue
}}>
      <h2 style={{ color: "rgb(221, 221, 230)" }}>India Tsunami Monitoring Dashboard</h2>

      {/* 🚨 Alert Banner */}
      {alert && (
        <div style={{
          background: "red",
          color: "white",
          padding: "10px",
          textAlign: "center",
          fontWeight: "bold",
          marginBottom: "10px"
        }}>
          🚨 Potential Tsunami Risk — Magnitude {alert.properties.mag}
        </div>
      )}

      {/* 📢 Bulletin Panel */}
      <div style={{
        background: "#060933", // slightly lighter navy
        padding: "10px",
        marginBottom: "15px",
        borderRadius: "8px",
        fontSize: "18px",
        color: "rgb(221, 221, 230)",
      }}>
        <strong>Official Advisory:</strong> {bulletin}
      </div>

      <MapContainer center={[22,80]} zoom={5} style={{ height: "500px" }}>
        <TileLayer
          attribution="© OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* 🌊 Risk Zones */}
        {tsunamiZones.map((zone, i) => (
          <Polygon key={i} positions={zone.coords} pathOptions={{ color: zone.color, fillOpacity: 0.2 }}>
            <Popup>{zone.name}</Popup>
          </Polygon>
        ))}

        {/* 🌋 Earthquake markers */}
        {earthquakes.map((eq, i) => {
          const [lng, lat] = eq.geometry.coordinates;
          const mag = eq.properties.mag || 0;

          return (
            <CircleMarker
              key={i}
              center={[lat, lng]}
              radius={mag * 4}
              pathOptions={{ color: mag >= 6.5 ? "red" : "yellow" }}
            >
              <Popup>
                {eq.properties.place}
                <br />
                Magnitude: {mag}
                <br />
                Time: {new Date(eq.properties.time).toLocaleString()}
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}

export default TsunamiDashboard;