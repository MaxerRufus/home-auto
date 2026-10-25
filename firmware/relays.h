#ifndef RELAYS_H
#define RELAYS_H

#include <Arduino.h>
#include <Wire.h>
#include "config.h"

typedef void (*RelayChangeCallback)(uint8_t index, bool state, const char* source);
typedef void (*SwitchPressCallback)(uint8_t index);

class RelayManager {
public:
    RelayManager();
    void begin();
    void update(); // Call frequently in loop() for switch debouncing & override countdown

    // Relay control (0: Light A, 1: Light B, 2: Plug, 3: Single light)
    void setRelay(uint8_t index, bool state, bool triggerOverride = true, const char* source = "local");
    bool getRelay(uint8_t index) const;
    uint8_t getRelaysMask() const;

    // Intensity mode (0 - 100%)
    void setIntensity(uint8_t level, bool triggerOverride = true, const char* source = "local");
    uint8_t getIntensity() const;

    // Switch states
    uint8_t getSwitchesMask() const;

    // Manual override (30 minutes pause on automations)
    bool isOverrideActive() const;
    uint32_t getOverrideRemainingSec() const;
    void triggerOverride();
    void clearOverride();

    // Event callbacks
    void onRelayChange(RelayChangeCallback cb);
    void onSwitchPress(SwitchPressCallback cb);

private:
    bool _relayStates[4];
    uint8_t _intensity;
    uint8_t _pcfOutputByte;

    // Switch debouncing
    uint8_t _lastRawSwitches;
    uint8_t _stableSwitches;
    unsigned long _lastDebounceTime[4];
    static const unsigned long DEBOUNCE_DELAY_MS = 50;

    // Override timer
    unsigned long _overrideEndTime;

    // Callbacks
    RelayChangeCallback _relayCb;
    SwitchPressCallback _switchCb;

    void updateHardware();
    uint8_t readPcf8574();
    void writePcf8574(uint8_t data);
};

extern RelayManager relays;

#endif // RELAYS_H
