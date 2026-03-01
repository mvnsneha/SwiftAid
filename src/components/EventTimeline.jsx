import { useEffect, useState } from "react";

function EventTimeline() {
  const [events, setEvents] = useState([]);

  // Fetch recent earthquakes (India region)
  const fetchEarthquakes = async () => {
    try {
      const res = await fetch(
        "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&limit=10&minlatitude=6&maxlatitude=38&minlongitude=68&maxlongitude=98"
      );
      const data = await res.json();

      const quakeEvents = data.features.map((q) => ({
        type: "earthquake",
        title: `M${q.properties.mag} earthquake — ${q.properties.place}`,
        time: new Date(q.properties.time),
      }));

      return quakeEvents;
    } catch {
      return [];
    }
  };

  // Fake weather update event (you can connect real weather later)
  const getWeatherEvent = () => {
    return {
      type: "weather",
      title: "Weather update — Hyderabad",
      time: new Date(),
    };
  };

  const loadEvents = async () => {
    const quakes = await fetchEarthquakes();
    const weather = getWeatherEvent();

    const combined = [...quakes, weather].sort(
      (a, b) => b.time - a.time
    );

    setEvents(combined.slice(0, 8)); // show latest 8
  };

  useEffect(() => {
    loadEvents();
    const interval = setInterval(loadEvents, 60000); // update every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <section style={{...styles.container, backgroundColor: "#060933"}}>
      <h2 style={{...styles.title, color: "rgb(221, 221, 230)"}}>🕒 Event Timeline</h2>

      <div style={styles.timeline}>
        {events.map((event, index) => (
          <div key={index} style={styles.item}>
            <div style={styles.time}>
              {event.time.toLocaleTimeString()}
            </div>
            <div style={styles.dot}></div>
            <div style={styles.text}>{event.title}</div>
          </div>
        ))}

        {events.length === 0 && <p>Loading events…</p>}
      </div>
    </section>
  );
}

const styles = {
  container: {
    padding: "40px",
    background: "#0f172a",
    color: "white",
    borderRadius: "12px"
  },
  title: {
    marginBottom: "20px",
  },
  timeline: {
    borderLeft: "2px solid #38bdf8",
    paddingLeft: "20px",
  },
  item: {
    display: "flex",
    alignItems: "center",
    marginBottom: "16px",
  },
  time: {
    width: "80px",
    fontSize: "12px",
    opacity: 0.7,
  },
  dot: {
    width: "10px",
    height: "10px",
    background: "#38bdf8",
    borderRadius: "50%",
    margin: "0 12px",
  },
  text: {
    fontSize: "14px",
  },
};

export default EventTimeline;