const socket = io();

// Store self ID and active path
let selfId = null;
const markers = {};
let activePath = null;

// Initialize map with default center
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

    // Only add click handlers to other users' markers
    if (!isSelf) {
      markers[id].bindPopup(`Click to show path to this user`);
      markers[id].on("click", () => togglePathToUser(id));
    } else {
      markers[id].bindPopup("You are here");
    }
  }

  // Update active path if it exists
  updateActivePath();
}

// Function to toggle path to selected user
function togglePathToUser(selectedUserId) {
  // Remove existing path if any
  if (activePath) {
    map.removeLayer(activePath);
    activePath = null;

    // If clicking the same user's marker, just remove the path
    if (activePath && activePath.selectedUserId === selectedUserId) {
      return;
    }
  }

  // Get coordinates for self and selected user
  const selfMarker = markers[selfId];
  const selectedMarker = markers[selectedUserId];

  if (selfMarker && selectedMarker) {
    const selfLatLng = selfMarker.getLatLng();
    const selectedLatLng = selectedMarker.getLatLng();

    // Create path
    activePath = L.polyline(
      [
        [selfLatLng.lat, selfLatLng.lng],
        [selectedLatLng.lat, selectedLatLng.lng],
      ],
      {
        color: "#0066cc",
        weight: 3,
        opacity: 0.7,
        dashArray: "10, 10", // Creates a dashed line
      }
    ).addTo(map);

    // Store selected user ID with the path
    activePath.selectedUserId = selectedUserId;

    // Calculate distance
    const distance = (selfLatLng.distanceTo(selectedLatLng) / 1000).toFixed(2);
    activePath.bindPopup(`Distance: ${distance} km`).openPopup();

    // Fit map bounds to show both markers
    const bounds = L.latLngBounds([selfLatLng, selectedLatLng]);
    map.fitBounds(bounds, { padding: [50, 50] });
  }
}

// Function to update active path when markers move
function updateActivePath() {
  if (activePath && activePath.selectedUserId) {
    const selfMarker = markers[selfId];
    const selectedMarker = markers[activePath.selectedUserId];

    if (selfMarker && selectedMarker) {
      const selfLatLng = selfMarker.getLatLng();
      const selectedLatLng = selectedMarker.getLatLng();

      activePath.setLatLngs([
        [selfLatLng.lat, selfLatLng.lng],
        [selectedLatLng.lat, selectedLatLng.lng],
      ]);

      // Update distance
      const distance = (selfLatLng.distanceTo(selectedLatLng) / 1000).toFixed(
        2
      );
      activePath.setPopupContent(`Distance: ${distance} km`);
    }
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
        timestamp: Date.now(),
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
  // Remove path if disconnected user was selected
  if (activePath && activePath.selectedUserId === id) {
    map.removeLayer(activePath);
    activePath = null;
  }

  // Remove marker
  if (markers[id]) {
    map.removeLayer(markers[id]);
    delete markers[id];
  }
});
