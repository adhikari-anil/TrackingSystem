const socket = io();

// check if the browser supports geolocation..

if(navigator.geolocation){
    navigator.geolocation.watchPosition((position)=>{
        const {latitude,longitude} = position.coords;
        console.log(latitude,longitude);
        socket.emit("send-location", {latitude,longitude});
    },(error)=>{
        console.error(error);
    },{
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,    //take new data not from cache 
    });
}

//Init a map centered at coordinate (0,0) with zoom level 15 using leaflet & add OpenStreetMap titles to map
const map = L.map("map").setView([0,0],16);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
    attribution: "MeroMap"
}).addTo(map);

// empty object marker
const marker = {};

socket.on("receive-location",(data)=>{
    const {id, latitude, longitude} = data;
    console.log(latitude, longitude);
    map.setView([latitude,longitude]);
    if(marker[id]){
        marker[id].setLatLng([latitude, longitude]);
    }else{
        marker[id] = L.marker([latitude,longitude]).addTo(map);
    }
});

socket.on("user-disconnected",(id)=>{
    if(marker[id]){
        map.removeLayer(marker[id]);
        delete marker[id];
    }
})