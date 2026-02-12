import "./AboutSection.css";

function AboutSection() {
  return (
    <section id="about" className="about-section">
      <div className="about-container">

        <h2 className="about-title">About SwiftAid</h2>
        <p className="about-subtitle">
          SwiftAid leverages advanced AI to optimize rescue planning during disasters.
        </p>

        <div className="about-grid">

          <div className="about-card">
            <h3>AI-Driven Response</h3>
            <p>
              Real-time adaptive rescue planning using reinforcement learning.
            </p>
          </div>

          <div className="about-card">
            <h3>Dynamic Zone Modeling</h3>
            <p>
              Smart resource allocation across disaster-affected zones.
            </p>
          </div>

          <div className="about-card">
            <h3>Reinforcement Learning</h3>
            <p>
              Continuously improves decision-making over time.
            </p>
          </div>

          <div className="about-card">
            <h3>Real-Time Adaptation</h3>
            <p>
              Responds instantly to changing environmental conditions.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}

export default AboutSection;
