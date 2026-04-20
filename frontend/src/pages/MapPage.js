import DisasterMap from "../DisasterMap";

function MapPage() {
  return (
    <div>
      <h2 style={{ textAlign: "center", margin: "20px" }}>
        Disaster Simulation Map
      </h2>
      <DisasterMap />
    </div>
  );
}

export default MapPage;