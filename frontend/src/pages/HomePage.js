/*import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import AboutSection from "../components/AboutSection";
import WeatherSection from "../components/WeatherSection";
import ContactSection from "../components/ContactSection";

function HomePage() {
  return (
    <>
      <Navbar />
      <Hero />
      <AboutSection />
      <WeatherSection />
      <ContactSection />
    </>
  );
}

export default HomePage;*/
import Hero from "../components/Hero";
import AboutSection from "../components/AboutSection";
import WeatherSection from "../components/WeatherSection";
import ContactSection from "../components/ContactSection";
import Tsunami from "../components/Tsunami";  
import Earthquake from "../components/Earthquakesection"; 
import Eventtimeline from "../components/EventTimeline";  
function HomePage() {
  return (
    <>

      <Hero />
      <AboutSection />
      <WeatherSection />
      <Tsunami />
      <Earthquake />
      <Eventtimeline />
      <ContactSection />
    </>
  );
}

export default HomePage;