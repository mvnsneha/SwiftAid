import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import LandingPage from "./pages/LandingPage";
import SimulationPage from "./pages/SimulationPage";

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/simulation" element={<SimulationPage />} />
      </Routes>
    </>
  );
}

export default App;
