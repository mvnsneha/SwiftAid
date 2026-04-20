import { useEffect, useState } from "react";
import "./WeatherSection.css";

function WeatherSection() {
  const API_KEY = process.env.REACT_APP_WEATHER_API_KEY;

  const [city, setCity] = useState("Hyderabad");
  const [input, setInput] = useState("");
  const [current, setCurrent] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [hourly, setHourly] = useState([]);
  const [error, setError] = useState("");

  const fetchWeather = async (cityName) => {
    try {
      setError("");

      // 🌡 Current weather
      const currentRes = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&units=metric&appid=${API_KEY}`
      );

      if (!currentRes.ok) throw new Error("City not found");

      const currentData = await currentRes.json();
      setCurrent(currentData);

      // 📅 Forecast
      const forecastRes = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?q=${cityName}&units=metric&appid=${API_KEY}`
      );

      const forecastData = await forecastRes.json();

      // hourly (next 24h)
      setHourly(forecastData.list.slice(0, 8));

      // daily (every 8th item)
      const dailyData = forecastData.list.filter(
        (_, index) => index % 8 === 0
      );

      setForecast(dailyData);
      setCity(cityName);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchWeather(city);
  }, []);

  const handleSearch = () => {
    if (input.trim() !== "") {
      fetchWeather(input);
      setInput("");
    }
  };

  const getStatus = () => {
    if (!current) return "";
    const temp = current.main.temp;
    if (temp >= 38) return "🔥 Heat Alert";
    if (current.weather[0].main.includes("Rain")) return "🌧 Rain Expected";
    return "🟢 Normal Conditions";
  };

  return (
    <section id="weather" className="weather-container">
      {/* 🔎 Search */}
      <div className="weather-search">
        <input
          type="text"
          placeholder="Search city..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button onClick={handleSearch}>Search</button>
      </div>

      {error && <h2 className="error">{error}</h2>}

      {current && (
        <>
          {/* 🌡 Top Section */}
          <div className="weather-top">
            <div className="weather-left">
              <img
                className="weather-icon"
                src={`https://openweathermap.org/img/wn/${current.weather[0].icon}@2x.png`}
                alt=""
              />

              <div className="temp">
                {Math.round(current.main.temp)}°
              </div>

              <div className="details">
                <p>{current.weather[0].main}</p>
                <p>Feels like: {Math.round(current.main.feels_like)}°</p>
                <p>Humidity: {current.main.humidity}%</p>
                <p>Wind: {current.wind.speed} km/h</p>
              </div>
            </div>

            <div className="weather-right">
              <h2>Weather</h2>
              <p>{city}</p>
              <p>{new Date().toDateString()}</p>
              <span className="status-badge">{getStatus()}</span>
            </div>
          </div>

          {/* 📊 Metrics Row */}
          <div className="metrics-row">
            <div className="metric">
              <p>Pressure</p>
              <h3>{current.main.pressure} hPa</h3>
            </div>
            <div className="metric">
              <p>Visibility</p>
              <h3>{current.visibility / 1000} km</h3>
            </div>
            <div className="metric">
              <p>Wind</p>
              <h3>{current.wind.speed} km/h</h3>
            </div>
            <div className="metric">
              <p>Humidity</p>
              <h3>{current.main.humidity}%</h3>
            </div>
          </div>

          {/* 🕒 Hourly Forecast */}
          <br></br>
          <center><h3 className="section-title">Next 24 Hours</h3></center>
          <div className="hourly-row">
            {hourly.map((item, index) => (
              <div key={index} className="hour-card">
                <p>{new Date(item.dt_txt).getHours()}:00</p>
                <img
                  src={`https://openweathermap.org/img/wn/${item.weather[0].icon}.png`}
                  alt=""
                />
                <p>{Math.round(item.main.temp)}°</p>
              </div>
            ))}
          </div>

          {/* 📅 Daily Forecast */}
          <div className="forecast-row">
            {forecast.map((item, index) => (
              <div key={index} className="forecast-card">
                <p>
                  {new Date(item.dt_txt).toLocaleDateString("en-US", {
                    weekday: "short",
                  })}
                </p>
                <img
                  src={`https://openweathermap.org/img/wn/${item.weather[0].icon}.png`}
                  alt=""
                />
                <p>
                  {Math.round(item.main.temp_max)}° /{" "}
                  {Math.round(item.main.temp_min)}°
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export default WeatherSection;