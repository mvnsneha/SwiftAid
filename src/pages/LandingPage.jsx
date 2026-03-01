import Hero from "../components/Hero";
import EarthquakeSection from "../components/Earthquakesection";
import TsunamiSection from "../components/Tsunami";
import AboutSection from "../components/AboutSection";
import WeatherSection from "../components/WeatherSection";
import ContactSection from "../components/ContactSection";
import EventTimeline from "../components/EventTimeline";
function LandingPage() {
  return (
    <>
      <Hero />
      <AboutSection />
      <WeatherSection />
      <TsunamiSection />
      <EarthquakeSection />
      <EventTimeline /> 
      <ContactSection />
    </>
  );
}

export default LandingPage;
