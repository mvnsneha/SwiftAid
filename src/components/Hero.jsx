import { useNavigate } from "react-router-dom";
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

export default Hero;
