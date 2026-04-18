const mqtt = require('mqtt');

// Connect to the MQTT broker running in our backend
const client = mqtt.connect('mqtt://localhost:1883');

let robotState = {
    lat: 12.9716, // Bangalore default
    lng: 77.5946,
    battery: 100,
    status: 'Stopped',
    wifi: 100
};

let destination = null;
let interval = null;

client.on('connect', () => {
    console.log('Simulator Connected to MQTT broker');
    client.subscribe('robot/command');
    client.subscribe('robot/unlock');

    // Telemetry loop
    setInterval(() => {
        // slight battery drain
        if (robotState.status === 'Moving') {
            robotState.battery = Math.max(0, robotState.battery - 0.1);
        }
        client.publish('robot/telemetry', JSON.stringify(robotState));
    }, 2000);
});

client.on('message', (topic, message) => {
    const data = JSON.parse(message.toString());
    console.log(`Received on ${topic}:`, data);

    if (topic === 'robot/command') {
        const { command, lat, lng, direction } = data;
        
        if (command === 'destination') {
            destination = { lat, lng };
            console.log(`Destination set to ${lat}, ${lng}`);
        } else if (command === 'start' && destination) {
            robotState.status = 'Moving';
            client.publish('robot/status', JSON.stringify({ status: 'Moving' }));
            startMoving();
        } else if (command === 'stop') {
            robotState.status = 'Stopped';
            client.publish('robot/status', JSON.stringify({ status: 'Stopped' }));
            stopMoving();
        } else if (command === 'manual') {
            // Adjust lat/lng slightly based on direction
            const step = 0.0001;
            if (direction === 'forward') robotState.lat += step;
            if (direction === 'backward') robotState.lat -= step;
            if (direction === 'left') robotState.lng -= step;
            if (direction === 'right') robotState.lng += step;
            if (direction === 'stop') robotState.status = 'Stopped';
            else robotState.status = 'Moving';
        }
    } else if (topic === 'robot/unlock') {
        console.log('✅ UNLOCK SIGNAL RECEIVED: Activating Servo Motor...');
        robotState.status = 'Delivered';
        client.publish('robot/status', JSON.stringify({ status: 'Delivered', message: 'Package Unlocked' }));
    }
});

function startMoving() {
    if (interval) clearInterval(interval);
    
    interval = setInterval(() => {
        if (!destination) return;

        // Simple linear interpolation towards destination
        const step = 0.00005;
        const dLat = destination.lat - robotState.lat;
        const dLng = destination.lng - robotState.lng;
        
        const dist = Math.sqrt(dLat*dLat + dLng*dLng);
        
        if (dist < step) {
            // Arrived
            robotState.lat = destination.lat;
            robotState.lng = destination.lng;
            robotState.status = 'Arrived';
            client.publish('robot/status', JSON.stringify({ status: 'Arrived' }));
            stopMoving();
            console.log('Arrived at destination!');
        } else {
            // Move
            robotState.lat += (dLat / dist) * step;
            robotState.lng += (dLng / dist) * step;
        }
    }, 1000); // update every second
}

function stopMoving() {
    if (interval) clearInterval(interval);
    interval = null;
}
