#include "relays.h"

RelayManager relays;

RelayManager::RelayManager()
    : _intensity(0),
      _pcfOutputByte(0xF7), // P0..P2 HIGH (relays OFF, active-low), P4..P7 HIGH (pull-up switches)
      _lastRawSwitches(0x0F),
      _stableSwitches(0x0F),
      _overrideEndTime(0),
      _relayCb(nullptr),
      _switchCb(nullptr) {
    for (int i = 0; i < 4; i++) {
        _relayStates[i] = false;
        _lastDebounceTime[i] = 0;
    }
}

void RelayManager::begin() {
    // Configure Relay 4 on ESP8266 GPIO12 (active-low)
    pinMode(PIN_RELAY4_GPIO, OUTPUT);
    digitalWrite(PIN_RELAY4_GPIO, HIGH); // OFF

    // Initialize PCF8574
    // High bits for active-low outputs turn relays OFF.
    // High bits for inputs activate weak pull-up.
    _pcfOutputByte = 0xFF; // All HIGH
    writePcf8574(_pcfOutputByte);

    // Initial switch reading
    uint8_t raw = readPcf8574();
    _lastRawSwitches = (raw >> 4) & 0x0F;
    _stableSwitches = _lastRawSwitches;
}

uint8_t RelayManager::readPcf8574() {
    Wire.requestFrom((uint8_t)PCF8574_I2C_ADDR, (uint8_t)1);
    if (Wire.available()) {
        return Wire.read();
    }
    return 0xFF;
}

void RelayManager::writePcf8574(uint8_t data) {
    Wire.beginTransmission((uint8_t)PCF8574_I2C_ADDR);
    Wire.write(data);
    Wire.endTransmission();
}

void RelayManager::updateHardware() {
    // Relays 1, 2, 3 are on PCF8574 P0, P1, P2 (Active-Low: 0 = ON, 1 = OFF)
    // P4 - P7 must remain 1 (HIGH) to function as pull-up inputs
    uint8_t out = 0xF0; // P4..P7 HIGH
    if (!_relayStates[0]) out |= (1 << PCF_RELAY1_BIT); // Relay 1 OFF -> HIGH
    if (!_relayStates[1]) out |= (1 << PCF_RELAY2_BIT); // Relay 2 OFF -> HIGH
    if (!_relayStates[2]) out |= (1 << PCF_RELAY3_BIT); // Relay 3 OFF -> HIGH

    _pcfOutputByte = out;
    writePcf8574(_pcfOutputByte);

    // Relay 4 on GPIO12 (Active-Low)
    digitalWrite(PIN_RELAY4_GPIO, _relayStates[3] ? LOW : HIGH);
}

void RelayManager::setRelay(uint8_t index, bool state, bool triggerOverrideTimer, const char* source) {
    if (index >= 4) return;

    if (_relayStates[index] != state) {
        _relayStates[index] = state;
        updateHardware();

        // Update intensity value if Light A or Light B changed
        if (index == 0 || index == 1) {
            if (!_relayStates[0] && !_relayStates[1]) _intensity = 0;
            else if (_relayStates[0] && !_relayStates[1]) _intensity = 25;
            else if (!_relayStates[0] && _relayStates[1]) _intensity = 55;
            else _intensity = 85;
        }

        if (triggerOverrideTimer) {
            triggerOverride();
        }

        if (_relayCb) {
            _relayCb(index, state, source);
        }
    }
}

bool RelayManager::getRelay(uint8_t index) const {
    if (index >= 4) return false;
    return _relayStates[index];
}

uint8_t RelayManager::getRelaysMask() const {
    uint8_t mask = 0;
    for (int i = 0; i < 4; i++) {
        if (_relayStates[i]) mask |= (1 << i);
    }
    return mask;
}

void RelayManager::setIntensity(uint8_t level, bool triggerOverrideTimer, const char* source) {
    _intensity = constrain(level, 0, 100);

    bool targetR1 = false;
    bool targetR2 = false;

    // Intensity mapping per specification:
    // Level 0: Both lights off
    // Level 1–40: Light A only
    // Level 41–70: Light B only
    // Level 71–100: Both lights on
    if (_intensity == 0) {
        targetR1 = false;
        targetR2 = false;
    } else if (_intensity <= 40) {
        targetR1 = true;
        targetR2 = false;
    } else if (_intensity <= 70) {
        targetR1 = false;
        targetR2 = true;
    } else {
        targetR1 = true;
        targetR2 = true;
    }

    bool changed = false;
    if (_relayStates[0] != targetR1) {
        _relayStates[0] = targetR1;
        changed = true;
        if (_relayCb) _relayCb(0, targetR1, source);
    }
    if (_relayStates[1] != targetR2) {
        _relayStates[1] = targetR2;
        changed = true;
        if (_relayCb) _relayCb(1, targetR2, source);
    }

    if (changed) {
        updateHardware();
    }

    if (triggerOverrideTimer) {
        triggerOverride();
    }
}

uint8_t RelayManager::getIntensity() const {
    return _intensity;
}

uint8_t RelayManager::getSwitchesMask() const {
    // 1 = pressed/closed (low input), 0 = open
    return (~_stableSwitches) & 0x0F;
}

void RelayManager::update() {
    // Read PCF8574 input state for switches P4 - P7
    // Remember to keep output bits driven properly
    Wire.requestFrom((uint8_t)PCF8574_I2C_ADDR, (uint8_t)1);
    if (!Wire.available()) return;
    uint8_t rawByte = Wire.read();
    uint8_t currentSwitches = (rawByte >> 4) & 0x0F; // P4..P7

    unsigned long now = millis();

    for (int i = 0; i < 4; i++) {
        uint8_t currentBit = (currentSwitches >> i) & 0x01;
        uint8_t lastBit = (_lastRawSwitches >> i) & 0x01;

        if (currentBit != lastBit) {
            _lastDebounceTime[i] = now;
        }

        if ((now - _lastDebounceTime[i]) > DEBOUNCE_DELAY_MS) {
            uint8_t stableBit = (_stableSwitches >> i) & 0x01;
            if (currentBit != stableBit) {
                // Falling edge: input transitions from 1 (HIGH/released) to 0 (LOW/pressed)
                if (stableBit == 1 && currentBit == 0) {
                    // Momentary switch pressed -> toggle matching relay
                    setRelay(i, !_relayStates[i], true, "wall_switch");

                    if (_switchCb) {
                        _switchCb(i);
                    }
                }

                // Update stable bit
                if (currentBit) {
                    _stableSwitches |= (1 << i);
                } else {
                    _stableSwitches &= ~(1 << i);
                }
            }
        }
    }

    _lastRawSwitches = currentSwitches;
}

bool RelayManager::isOverrideActive() const {
    if (_overrideEndTime == 0) return false;
    return (long)(_overrideEndTime - millis()) > 0;
}

uint32_t RelayManager::getOverrideRemainingSec() const {
    if (!isOverrideActive()) return 0;
    return (uint32_t)((_overrideEndTime - millis()) / 1000UL);
}

void RelayManager::triggerOverride() {
    _overrideEndTime = millis() + OVERRIDE_DURATION_MS;
}

void RelayManager::clearOverride() {
    _overrideEndTime = 0;
}

void RelayManager::onRelayChange(RelayChangeCallback cb) {
    _relayCb = cb;
}

void RelayManager::onSwitchPress(SwitchPressCallback cb) {
    _switchCb = cb;
}
