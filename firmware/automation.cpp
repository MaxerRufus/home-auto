#include "automation.h"
#include "relays.h"
#include "sensors.h"
#include "doorway.h"

AutomationEngine automation;

AutomationEngine::AutomationEngine()
    : _lastEmptyTime(0),
      _wasOccupied(false),
      _autoLightsActive(false),
      _autoPlugActive(false) {
    _config.lightThreshold = 35;
    _config.tempThreshold = 28.0f;
    _config.autoLightsEnabled = true;
    _config.autoPlugEnabled = true;
    _config.lightOffDelayMs = LIGHT_AUTO_OFF_DELAY_MS; // 3 minutes
    _config.tempHysteresisDeg = TEMP_HYSTERESIS_DEG;   // 2.0 °C
}

void AutomationEngine::begin() {
    _lastEmptyTime = millis();
    _wasOccupied = (doorway.getOccupancy() > 0);
}

void AutomationEngine::setConfig(const AutomationConfig& config) {
    _config = config;
}

void AutomationEngine::evaluateLights() {
    if (!_config.autoLightsEnabled) {
        _autoLightsActive = false;
        return;
    }

    // Manual override pauses local automation for 30 minutes
    if (relays.isOverrideActive()) {
        _autoLightsActive = false;
        return;
    }

    int occupancy = doorway.getOccupancy();
    uint8_t ambient = sensors.getAmbientPercent();
    unsigned long now = millis();

    if (occupancy > 0) {
        _wasOccupied = true;

        // Turn on when occupied and ambient is below threshold
        if (ambient < _config.lightThreshold) {
            _autoLightsActive = true;
            // Choose intensity level by how far below threshold the room is
            int delta = _config.lightThreshold - ambient;
            uint8_t targetIntensity = 25; // Light A only
            if (delta > 20) {
                targetIntensity = 85;     // Both lights
            } else if (delta > 8) {
                targetIntensity = 55;     // Light B only
            }

            // Set intensity without triggering manual override timer
            relays.setIntensity(targetIntensity, false, "automation_light");
        } else if (ambient >= (_config.lightThreshold + 15)) {
            // Ambient rises well above threshold with hysteresis -> turn lights off
            if (_autoLightsActive) {
                relays.setIntensity(0, false, "automation_light_ambient");
                _autoLightsActive = false;
            }
        }
    } else {
        // Room is empty (occupancy == 0)
        if (_wasOccupied) {
            _wasOccupied = false;
            _lastEmptyTime = now;
        }

        // Auto turn off after 3 minutes with no occupancy
        if (_autoLightsActive && (now - _lastEmptyTime >= _config.lightOffDelayMs)) {
            relays.setIntensity(0, false, "automation_light_empty");
            _autoLightsActive = false;
        }
    }
}

void AutomationEngine::evaluatePlug() {
    if (!_config.autoPlugEnabled) {
        _autoPlugActive = false;
        return;
    }

    if (relays.isOverrideActive()) {
        _autoPlugActive = false;
        return;
    }

    int occupancy = doorway.getOccupancy();
    float temp = sensors.getTemperature();

    // Relay 2 is the Plug (index 2 in 0-indexed: 0=A, 1=B, 2=Plug, 3=Single)
    if (occupancy > 0) {
        // Turn on when occupied and temperature is at or above threshold
        if (temp >= _config.tempThreshold) {
            if (!relays.getRelay(2)) {
                relays.setRelay(2, true, false, "automation_plug_temp");
            }
            _autoPlugActive = true;
        } else if (temp <= (_config.tempThreshold - _config.tempHysteresisDeg)) {
            // Temperature drops 2 °C below threshold -> turn off
            if (relays.getRelay(2) && _autoPlugActive) {
                relays.setRelay(2, false, false, "automation_plug_cool");
                _autoPlugActive = false;
            }
        }
    } else {
        // Turn off when room is empty
        if (relays.getRelay(2) && _autoPlugActive) {
            relays.setRelay(2, false, false, "automation_plug_empty");
            _autoPlugActive = false;
        }
    }
}

void AutomationEngine::update() {
    evaluateLights();
    evaluatePlug();
}
