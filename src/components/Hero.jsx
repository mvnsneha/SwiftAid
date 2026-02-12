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
          SwiftAid is an AI-driven disaster response system that autonomously
          generates and adapts rescue plans in real time using reinforcement learning.
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
