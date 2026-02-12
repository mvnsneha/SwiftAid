import { useEffect, useState } from "react";
import "./WeatherSection.css";

function WeatherSection() {
  const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;

  const [city, setCity] = useState("Hyderabad");
  const [input, setInput] = useState("");
  const [current, setCurrent] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [error, setError] = useState("");

  const fetchWeather = async (cityName) => {
    try {
      setError("");

      // Current weather
      const currentRes = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&units=metric&appid=${API_KEY}`
      );

      if (!currentRes.ok) throw new Error("City not found");

      const currentData = await currentRes.json();
      setCurrent(currentData);

      // 5-day forecast
      const forecastRes = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?q=${cityName}&units=metric&appid=${API_KEY}`
      );

      const forecastData = await forecastRes.json();

      // Filter one forecast per day (every 8th item)
      const dailyData = forecastData.list.filter(
        (item, index) => index % 8 === 0
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

  return (
    <section id="weather" className="weather-container">

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
          <div className="weather-top">
            <div className="weather-left">
              <div className="temp">
                {Math.round(current.main.temp)}°
              </div>
              <div className="details">
                <p>{current.weather[0].main}</p>
                <p>Humidity: {current.main.humidity}%</p>
                <p>Wind: {current.wind.speed} km/h</p>
              </div>
            </div>

            <div className="weather-right">
              <h2>Weather</h2>
              <p>{city}</p>
              <p>{new Date().toDateString()}</p>
            </div>
          </div>

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
