import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  GeoJSON,
  useMap
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

/* 🇮🇳 AUTO ZOOM TO INDIA */
function ZoomToIndia() {
  const map = useMap();

  useEffect(() => {
    map.setView([22.9734, 78.6569], 5, { animate: true });
  }, [map]);

  return null;
}

/* 🔥 INDIA FREQUENCY HEATMAP */
function IndiaFrequencyHeatLayer() {
  const map = useMap();

  useEffect(() => {
    let heatLayer;

    fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson")
      .then(res => res.json())
      .then(data => {
        const heatPoints = data.features
          .filter(q => {
            const lat = q.geometry.coordinates[1];
            const lng = q.geometry.coordinates[0];
            return lat >= 6 && lat <= 38 && lng >= 68 && lng <= 98;
          })
          .map(q => {
            const lat = q.geometry.coordinates[1];
            const lng = q.geometry.coordinates[0];
            const mag = q.properties.mag || 1;
            return [lat, lng, mag * 1.5];
          });

        heatLayer = L.heatLayer(heatPoints, {
          radius: 25,
          blur: 20,
          maxZoom: 7
        }).addTo(map);
      });

    return () => {
      if (heatLayer) map.removeLayer(heatLayer);
    };
  }, [map]);

  return null;
}

function EarthquakeSection() {
  const [earthquakes, setEarthquakes] = useState([]);
  const [lastUpdated, setLastUpdated] = useState("");
  const [plates, setPlates] = useState(null);

  const fetchEarthquakes = async () => {
    const minutes = 10;
    const now = new Date();
    const past = new Date(now.getTime() - minutes * 60000);

    const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${past.toISOString()}&minlatitude=6&maxlatitude=38&minlongitude=68&maxlongitude=98`;

    try {
      const res = await fetch(url);
      const data = await res.json();

      const sorted = data.features.sort(
        (a, b) => b.properties.time - a.properties.time
      );

      setEarthquakes(sorted);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetch("/data/plates.json")
      .then(res => res.json())
      .then(data => setPlates(data));

    fetchEarthquakes();
    const interval = setInterval(fetchEarthquakes, 30000);
    return () => clearInterval(interval);
  }, []);

  const getColor = (mag) => {
    if (mag >= 6) return "red";
    if (mag >= 4) return "orange";
    return "green";
  };

  return (
    <section style={{ padding: "40px", backgroundColor: "#060933" }}>
      <h2 style={{ color: "rgb(221, 221, 230)" }}>🇮🇳 India Seismic Activity Dashboard</h2>
      <p style={{ color: "rgb(221, 221, 230)" }}>Last Updated: {lastUpdated}</p>

      <MapContainer
        center={[20, 0]}   // initial (will auto zoom to India)
        zoom={2}
        style={{ height: "500px", width: "100%", borderRadius: "12px" }}
      >
        <TileLayer
          attribution="© OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* 🇮🇳 Auto Zoom */}
        <ZoomToIndia />

        {/* 🔥 Frequency Heatmap */}
        <IndiaFrequencyHeatLayer />

        {/* 🌋 Plate Boundaries */}
        {plates && (
          <GeoJSON
            data={plates}
            style={{ color: "red", weight: 2, opacity: 0.8 }}
          />
        )}

        {/* 🔴 Live Earthquake Markers */}
        {earthquakes.map((eq, index) => {
          const coords = eq.geometry.coordinates;
          const mag = eq.properties.mag || 0;

          return (
            <CircleMarker
              key={index}
              center={[coords[1], coords[0]]}
              radius={mag * 4}
              pathOptions={{
                color: getColor(mag),
                fillOpacity: 0.8
              }}
            >
              <Popup>
                <strong>{eq.properties.place}</strong>
                <br />
                Magnitude: {mag}
                <br />
                Time: {new Date(eq.properties.time).toLocaleString()}
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* 📰 TEXT FEED */}
      <div style={{ marginTop: "25px", color: "rgb(221, 221, 230)" }}>
        <h2>📡 Live India Earthquake Feed</h2>

        {earthquakes.length === 0 ? (
          <p style={{ color: "green", fontSize: "18px" }}>
            🟢 No earthquakes detected. Monitoring active.
          </p>
        ) : (
          <ul style={{ lineHeight: "2" }}>
            {earthquakes.map((eq, i) => (
              <li key={i}>
                <strong style={{ color: getColor(eq.properties.mag) }}>
                  M {eq.properties.mag}
                </strong>{" "}
                — {eq.properties.place} (
                {new Date(eq.properties.time).toLocaleTimeString()})
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default EarthquakeSection;