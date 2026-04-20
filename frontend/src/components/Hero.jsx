/*import { useNavigate } from "react-router-dom";
import "./Hero.css";

function Hero() {
  const navigate = useNavigate();

  return (
    <section
      id="home"
      className="hero"
      style={{ backgroundImage: "url('/lightning.jpg')" }}
    >
      <div className="hero-content">
        <p className="hero-tag">AI-DRIVEN DISASTER RESPONSE</p>

        <h1>Responding Faster. Saving Lives.</h1>

        <p className="hero-subtext">
          REAL-TIME STRATEGIC BRAIN FOR EMERGENCY COMMANDERS.
        </p>

        <button
          className="hero-btn"
          onClick={() => navigate("/simulation")}
        >
          SIMULATION
        </button>
      </div>
    </section>
  );
}

export default Hero;*/
/*import { useNavigate } from "react-router-dom";

function Hero() {
  const navigate = useNavigate();

  return (
    <button onClick={() => navigate("/map")}>
      Simulate
    </button>
  );
}

export default Hero;*/
import bg from "./lightening.png";
import { useNavigate } from "react-router-dom";
import "./Hero.css";   // ✅ VERY IMPORTANT

function Hero() {
  const navigate = useNavigate();

  return (
    <section
  className="hero"
  style={{ backgroundImage: `url(${bg})` }}
>
      <div className="hero-content">
        <p className="hero-tag">AI-DRIVEN DISASTER RESPONSE</p>

        <h1>Responding Faster. Saving Lives.</h1>

        <p className="hero-subtext">
          REAL-TIME STRATEGIC BRAIN FOR EMERGENCY COMMANDERS.
        </p>

        <button
          className="hero-btn"
          onClick={() => navigate("/map")}
        >
          SIMULATION
        </button>
      </div>
    </section>
  );
}

export default Hero;  