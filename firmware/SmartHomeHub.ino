/*
 * ==============================================================================
 * SMART HOME HUB - ESP8266 FIRMWARE
 * Target: ESP8266 NodeMCU (ESP-12E)
 * 
 * Hardware Connections:
 * - A0: LDR divider (1kΩ pull-down)
 * - D1 (GPIO5): I2C SCL (Shared: PCF8574 at 0x27 & MPU6050 at 0x68)
 * - D2 (GPIO4): I2C SDA (Shared: PCF8574 at 0x27 & MPU6050 at 0x68)
 * - D4 (GPIO2): Onboard LED (Wi-Fi status, active-low)
 * - D5 (GPIO14): DHT11 data
 * - D6 (GPIO12): Relay 4 (Single light, active-low)
 * - D7 (GPIO13): HC-SR04 A trigger (outer)
 * - RX (GPIO3):  HC-SR04 A echo (level shifted 5V -> 3.3V)
 * - TX (GPIO1):  HC-SR04 B trigger (inner) - Serial is disabled!
 * - D0 (GPIO16): HC-SR04 B echo (level shifted 5V -> 3.3V)
 * 
 * PCF8574 (0x27):
 * - P0: Relay 1: Light A (active-low)
 * - P1: Relay 2: Light B (active-low)
 * - P2: Relay 3: Plug (active-low)
 * - P4: Wall switch 1 (falling-edge, toggles Relay 1)
 * - P5: Wall switch 2 (falling-edge, toggles Relay 2)
 * - P6: Wall switch 3 (falling-edge, toggles Relay 3)
 * - P7: Wall switch 4 (falling-edge, toggles Relay 4)
 * ==============================================================================
 */

#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <Wire.h>

#include "config.h"
#include "relays.h"
#include "sensors.h"
#include "doorway.h"
#include "automation.h"
#include "calibration.h"
#include "sinric_handler.h"
#include "cloud_sync.h"

// Task interval timers
unsigned long lastSensorSampleTime = 0;
unsigned long lastLedBlinkTime = 0;
bool ledBlinkState = false;

// Event Callback Handlers
void handleRelayChange(uint8_t index, bool state, const char* source) {
    // Mirror to Sinric Pro if triggered from wall switch, local automation, or web
    if (strcmp(source, "sinric_voice") != 0) {
        if (index == 0 || index == 1) {
            sinric.updateIntensity(relays.getIntensity(), (relays.getIntensity() > 0));
        } else if (index == 2) {
            sinric.updateFan(state);
        } else if (index == 3) {
            sinric.updatePlug(state);
        }
    }

    // Broadcast immediate state update to browser
    cloudSync.broadcastStateSnapshot();

    // Persist relay change event (type 5)
    char meta[64];
    snprintf(meta, sizeof(meta), "{\"relay_index\":%d,\"state\":%s,\"source\":\"%s\"}",
             index, state ? "true" : "false", source);
    cloudSync.sendEvent(5, (float)index, meta);
}

void handleSwitchPress(uint8_t index) {
    // Persist wall switch event (type 4)
    char meta[64];
    snprintf(meta, sizeof(meta), "{\"switch_index\":%d}", index);
    cloudSync.sendEvent(4, (float)index, meta);
}

void handleDoorwayPassage(PassageEvent event, float heightCm, const char* band) {
    // Broadcast immediate state update (occupancy changed)
    cloudSync.broadcastStateSnapshot();

    // Persist entry (type 1) or exit (type 2) event with height
    char meta[96];
    snprintf(meta, sizeof(meta), "{\"band\":\"%s\",\"occupancy\":%d}",
             band, doorway.getOccupancy());
    cloudSync.sendEvent((uint8_t)event, heightCm, meta);
}

void handleKnockEvent(float peakDeviation) {
    // Persist knock event (type 3)
    char meta[64];
    snprintf(meta, sizeof(meta), "{\"accel_spike\":%.2f}", peakDeviation);
    cloudSync.sendEvent(3, peakDeviation, meta);
}

void setup() {
    // IMPORTANT: Do NOT call Serial.begin()!
    // GPIO1 (TX) and GPIO3 (RX) are dedicated to the HC-SR04 ultrasonic sensors.

    // 1. Configure Onboard LED (D4 / GPIO2, active-low)
    pinMode(PIN_LED_WIFI, OUTPUT);
    digitalWrite(PIN_LED_WIFI, HIGH); // LED off

    // 2. Initialize I2C Bus (D1 = SCL / GPIO5, D2 = SDA / GPIO4)
    Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
    Wire.setClock(100000); // 100 kHz standard mode

    // 3. Initialize Subsystems
    relays.begin();
    sensors.begin();
    doorway.begin();
    calibration.begin();
    automation.begin();

    // 4. Attach Callbacks
    relays.onRelayChange(handleRelayChange);
    relays.onSwitchPress(handleSwitchPress);
    doorway.onPassage(handleDoorwayPassage);
    sensors.onKnock(handleKnockEvent);

    // 5. Connect to Wi-Fi
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASS);

    // 6. Non-blocking Wi-Fi connect loop with fast LED pulse
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 40) {
        delay(200);
        digitalWrite(PIN_LED_WIFI, (attempts % 2 == 0) ? LOW : HIGH);
        attempts++;
        // Keep checking wall switches even while Wi-Fi connects
        relays.update();
    }

    if (WiFi.status() == WL_CONNECTED) {
        digitalWrite(PIN_LED_WIFI, LOW); // Solid ON: Connected
        // Initialize cloud & voice services
        sinric.begin();
        cloudSync.begin();
    } else {
        digitalWrite(PIN_LED_WIFI, HIGH); // OFF: Offline mode
    }
}

void loop() {
    // 1. Fast updates: wall switch debouncing, MPU6050 knock detection, doorway ultrasonic
    relays.update();
    sensors.updateFast();
    doorway.update();

    // 2. Calibration engine (if user triggered a guided calibration step)
    calibration.update();

    // 3. Periodic sensor sampling (every 2 seconds: DHT11 reading & filter)
    unsigned long now = millis();
    if (now - lastSensorSampleTime >= SENSOR_SAMPLE_INTERVAL_MS) {
        lastSensorSampleTime = now;
        sensors.updatePeriodic();

        // 4. Evaluate local automation rules (runs on ESP8266 without internet!)
        automation.update();
    }

    // 5. Wi-Fi status LED indicator
    if (now - lastLedBlinkTime >= 1000) {
        lastLedBlinkTime = now;
        if (WiFi.status() == WL_CONNECTED) {
            digitalWrite(PIN_LED_WIFI, LOW); // Solid ON when connected
        } else {
            // Blink when disconnected
            ledBlinkState = !ledBlinkState;
            digitalWrite(PIN_LED_WIFI, ledBlinkState ? LOW : HIGH);
        }
    }

    // 6. Handle Sinric Pro voice commands & Supabase Realtime synchronization
    if (WiFi.status() == WL_CONNECTED) {
        sinric.handle();
        cloudSync.update();
    }
}
