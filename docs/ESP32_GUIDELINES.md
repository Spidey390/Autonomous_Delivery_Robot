# ESP32 Integration Guidelines

## Overview
This document outlines how to connect the ESP32-based Autonomous Delivery Robot to the web control system.

## Connectivity
- **Broker**: The Node.js backend runs an embedded MQTT broker (`Aedes`) on port **1883**.
- **Protocol**: MQTT (TCP)
- **Host**: The IP address of the computer running the Node.js backend.

## MQTT Topics

### 1. Telemetry (`robot/telemetry`)
**Direction:** ESP32 -> Server (Publish)
**Frequency:** Every 2-5 seconds
**Payload (JSON):**
```json
{
  "lat": 12.9716,
  "lng": 77.5946,
  "battery": 85.5,
  "status": "Moving", // "Moving", "Stopped", "Arrived", "Delivering"
  "wifi": 92 // signal strength percentage
}
```

### 2. Status Updates (`robot/status`)
**Direction:** ESP32 -> Server (Publish)
**Frequency:** On state change (e.g., reached destination, obstacle detected).
**Payload (JSON):**
```json
{
  "status": "Arrived",
  "message": "Waiting for OTP"
}
```

### 3. Command Reception (`robot/command`)
**Direction:** Server -> ESP32 (Subscribe)
**Payload (JSON):**
- **Start/Stop:**
  ```json
  {"command": "start"}
  {"command": "stop"}
  ```
- **Set Destination:**
  ```json
  {"command": "destination", "lat": 12.9720, "lng": 77.5950}
  ```
- **Manual Control:**
  ```json
  {"command": "manual", "direction": "forward"} // forward, backward, left, right, stop
  ```

### 4. Unlock Signal (`robot/unlock`)
**Direction:** Server -> ESP32 (Subscribe)
**Description:** Triggered when the user enters the correct OTP on the dashboard.
**Payload (JSON):**
```json
{
  "deliveryId": "DEL-123456",
  "unlock": true
}
```
**Action:** The ESP32 should rotate the servo motor to unlock the delivery box.

## Sample ESP32 C++ Code (Arduino IDE)

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "192.168.1.100"; // IP of Node.js backend

WiFiClient espClient;
PubSubClient client(espClient);

void setup_wifi() {
  delay(10);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
}

void callback(char* topic, byte* payload, unsigned int length) {
  String msg = "";
  for (int i = 0; i < length; i++) {
    msg += (char)payload[i];
  }
  
  StaticJsonDocument<200> doc;
  deserializeJson(doc, msg);
  
  if (String(topic) == "robot/unlock") {
    if (doc["unlock"] == true) {
      // Actuate Servo here
      Serial.println("Unlocking box!");
    }
  }
  
  if (String(topic) == "robot/command") {
    String cmd = doc["command"];
    if (cmd == "start") {
      // Start motors towards destination
    } else if (cmd == "stop") {
      // Stop motors
    }
  }
}

void reconnect() {
  while (!client.connected()) {
    if (client.connect("ESP32Client")) {
      client.subscribe("robot/command");
      client.subscribe("robot/unlock");
    } else {
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  setup_wifi();
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();
  
  // Publish telemetry every 5 seconds
  // ...
}
```
