import "./Navbar.css";

function Navbar() {
  return (
    <nav className="navbar">
      <h2 className="logo">SwiftAid</h2>

      <div className="nav-links">
        <a href="#home">Home</a>
        <a href="#about">About</a>
        <a href="#weather">Weather</a>   {/* FIXED */}
        <a href="#contact">Contact</a>
        <a
  href="https://mausam.imd.gov.in/index_en.php"
  target="_blank"
  rel="noopener noreferrer"
  className="alert-btn"
>
  🚨 LIVE ALERTS
</a>
      </div>
    </nav>
  );
}

export default Navbar;