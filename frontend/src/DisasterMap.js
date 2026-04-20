import "leaflet/dist/leaflet.css";
import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from "react-leaflet";
import L from "leaflet"; // ✅ ADDED
import "leaflet/dist/leaflet.css";
import "./App.css";

const HYDERABAD_CENTER = [17.385, 78.4867];

function getColor(severity) {
  if (severity >= 4) return "red";
  if (severity >= 2) return "orange";
  return "green";
}

export default function DisasterMap() {

  const [geoData, setGeoData] = useState(null);
  const [decisions, setDecisions] = useState([]);
  const [teams, setTeams] = useState({});
  const [stats, setStats] = useState({});
  const [hubs, setHubs] = useState([]); // ✅ ADDED

  // -----------------------------
  // FETCH STATISTICS
  // -----------------------------
  const fetchStats = async () => {
    try {
      const res = await fetch("http://127.0.0.1:5000/api/stats");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Stats fetch error:", err);
    }
  };

  // -----------------------------
  // FETCH RESCUE TEAMS
  // -----------------------------
  const fetchTeams = async () => {
    try {
      const res = await fetch("http://127.0.0.1:5000/api/teams");
      const data = await res.json();
      setTeams(data);
    } catch (err) {
      console.error("Team fetch error:", err);
    }
  };

  // -----------------------------
  // FETCH ENVIRONMENT
  // -----------------------------
  const fetchEnvironment = async () => {
    try {

      const res = await fetch("http://127.0.0.1:5000/api/environment");
      const wards = await res.json();

      const featureCollection = {
        type: "FeatureCollection",
        features: wards
          .filter(w => w.geometry)
          .map(w => ({
            type: "Feature",
            properties: {
              name: w.name,
              severity: w.severity,
              urgency: w.urgency,
              phase: w.phase
            },
            geometry: w.geometry
          }))
      };

      setGeoData(featureCollection);

    } catch (err) {
      console.error("Environment fetch error:", err);
    }
  };

  // -----------------------------
  // FETCH RL DECISIONS
  // -----------------------------
  const fetchDecisions = async () => {
    try {
      const res = await fetch("http://127.0.0.1:5000/api/decisions");
      const data = await res.json();
      setDecisions(data);
    } catch (err) {
      console.error("Decision fetch error:", err);
    }
  };

  // -----------------------------
  // FETCH HUBS
  // -----------------------------
  const fetchHubs = async () => {
    try {
      const res = await fetch("http://127.0.0.1:5000/api/hubs");
      const data = await res.json();
      setHubs(data);
    } catch (err) {
      console.error("Hub fetch error:", err);
    }
  };

  // -----------------------------
  // AUTO REFRESH
  // -----------------------------
  useEffect(() => {

    fetchEnvironment();
    fetchDecisions();
    fetchTeams();
    fetchStats();
    fetchHubs(); // ✅ ADDED

    const interval = setInterval(() => {
      fetchEnvironment();
      fetchDecisions();
      fetchTeams();
      fetchStats();
      fetchHubs(); // ✅ ADDED
    }, 3000);

    return () => clearInterval(interval);

  }, []);

  // -----------------------------
  // FILTER DECISIONS
  // -----------------------------
  const rescueDecisions = decisions.filter(d => d.action === "dispatch");
  const waitDecisions = decisions.filter(d => d.action === "wait");

  const style = (feature) => ({
    fillColor: getColor(feature.properties.severity),
    weight: 1,
    opacity: 1,
    color: "black",
    fillOpacity: 0.6
  });

  const onEachFeature = (feature, layer) => {

    const { name, severity, urgency, phase } = feature.properties;

    layer.bindPopup(`
      <b>${name}</b><br/>
      Severity: ${severity}<br/>
      Urgency: ${urgency}<br/>
      Phase: ${phase}
    `);
  };

  // ✅ EMOJI ICON FUNCTION
  const getEmojiIcon = (type) => {
    let emoji = "📍";

    if (type === "DRF") emoji = "🚑";
    if (type === "FIRE") emoji = "🔥";
    if (type === "NDRF") emoji = "🚨";

    return L.divIcon({
      html: `<div style="font-size: 26px;">${emoji}</div>`,
      className: "",
      iconSize: [20, 20]
    });
  };

  return (

    <div>

      {/* ---------------- STATISTICS PANEL ---------------- */}

      <div className="stats-bar">

        <div className="stat-box red">
          🔴 Red Zones
          <span>{stats.red_zones || 0}</span>
        </div>

        <div className="stat-box yellow">
          🟡 Yellow Zones
          <span>{stats.yellow_zones || 0}</span>
        </div>

        <div className="stat-box green">
          🟢 Safe Zones
          <span>{stats.green_zones || 0}</span>
        </div>

        <div className="stat-box disaster">
          🌪 Disaster
          <span>{stats.disaster || "None"}</span>
        </div>

      </div>

      {/* ---------------- RESCUE TEAM PANEL ---------------- */}

      <div className="team-header">

        <div className="team-box">
          🚨 NDRF
          <span>{teams.NDRF || 0}</span>
        </div>

        <div className="team-box">
          🚓 SDRF
          <span>{teams.SDRF || 0}</span>
        </div>

        <div className="team-box">
          🚑 DRF
          <span>{teams.DRF || 0}</span>
        </div>

        <div className="team-box">
          🔥 FIRE
          <span>{teams.FIRE || 0}</span>
        </div>

      </div>

      {/* ---------------- MAP ---------------- */}

      <MapContainer
        center={HYDERABAD_CENTER}
        zoom={11}
        style={{ height: "70vh" }}
      >

        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {geoData && (
          <GeoJSON
            data={geoData}
            style={style}
            onEachFeature={onEachFeature}
          />
        )}

        {/* 🚑 EMOJI HUBS */}
        {hubs.map((hub, i) => (
          <Marker
            key={i}
            position={[hub.lat, hub.lon]}
            icon={getEmojiIcon(hub.type)}
          >
            <Popup>
              <b>{hub.name}</b><br/>
              {hub.type === "DRF" && "🚑 DRF Hub"}
              {hub.type === "FIRE" && "🔥 Fire Station"}
              {hub.type === "NDRF" && "🚨 NDRF Base"}
            </Popup>
          </Marker>
        ))}

      </MapContainer>

      {/* ---------------- RL DECISIONS ---------------- */}

      <div className="decision-container">

        <div className="decision-column rescue">

          <h2>🚑 Rescue Dispatched</h2>

          {rescueDecisions.length === 0 && (
            <p>No rescue actions yet</p>
          )}

          {rescueDecisions.slice().reverse().map((d, i) => (

            <div key={i} className="decision-card rescue-card">

              <b>{d.ward}</b>
              <div>Severity: {d.severity}</div>

              <div>
                🚑 {d.team || "Team"} from {d.from || "Unknown"} → {d.ward}
                {d.partial && (
                  <span style={{ color: "orange", marginLeft: "8px" }}>
                    ⚡ Partial Support
                  </span>
                )}
              </div>
              

            </div>

          ))}

        </div>

        <div className="decision-column wait">

          <h2>⏳ RL Waiting</h2>

          {waitDecisions.length === 0 && (
            <p>No waiting decisions</p>
          )}

          {waitDecisions.slice().reverse().map((d, i) => (

            <div key={i} className="decision-card wait-card">

              <b>{d.ward}</b>
              <div>Severity: {d.severity}</div>

              <div>
                🤖 RL decided to wait → {d.ward}
              </div>

            </div>

          ))}

        </div>

      </div>

    </div>
  );
}