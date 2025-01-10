const socket = io();

// Store self ID
let selfId = null;
const markers = {};

// Initialize map with default center (will be updated when we get location)
const map = L.map("map").setView([0, 0], 16);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "MeroMap",
}).addTo(map);

// Function to create or update marker
function updateMarker(id, latitude, longitude, isSelf = false) {
  if (markers[id]) {
    markers[id].setLatLng([latitude, longitude]);
  } else {
    // Different icons for self vs others
    const markerIcon = isSelf
      ? L.icon({
          iconUrl:
            "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
        })
      : L.icon({
          iconUrl:
            "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
        });

    markers[id] = L.marker([latitude, longitude], { icon: markerIcon }).addTo(
      map
    );
    markers[id].bindPopup(isSelf ? "You are here" : "Other user");
  }
}

// Handle geolocation
if (navigator.geolocation) {
  navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude } = position.coords;

      // Emit location to server
      socket.emit("send-location", {
        latitude,
        longitude,
        timestamp: Date.now(), // Add timestamp for tracking
      });

      // Update self marker and center map only for self
      if (selfId) {
        updateMarker(selfId, latitude, longitude, true);
        map.setView([latitude, longitude]);
      }
    },
    (error) => {
      console.error("Geolocation error:", error);
    },
    {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    }
  );
}

// Socket event handlers
socket.on("connect", () => {
  selfId = socket.id;
});

socket.on("receive-location", (data) => {
  const { id, latitude, longitude } = data;

  // Only update other users' markers if it's not our own location
  if (id !== selfId) {
    updateMarker(id, latitude, longitude, false);
  }
});

socket.on("user-disconnected", (id) => {
  if (markers[id]) {
    map.removeLayer(markers[id]);
    delete markers[id];
  }
});
