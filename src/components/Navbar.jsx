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
      </div>
    </nav>
  );
}

export default Navbar;
