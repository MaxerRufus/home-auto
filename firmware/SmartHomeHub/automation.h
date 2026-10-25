#ifndef AUTOMATION_H
#define AUTOMATION_H

#include <Arduino.h>

struct AutomationConfig {
    uint8_t lightThreshold;      // ambient light % threshold (default 35)
    float tempThreshold;         // temperature threshold in °C (default 28.0)
    bool autoLightsEnabled;      // default true
    bool autoPlugEnabled;        // default true
    uint32_t lightOffDelayMs;    // default 3 mins (180,000 ms)
    float tempHysteresisDeg;     // default 2.0 °C
};

class AutomationEngine {
public:
    AutomationEngine();
    void begin();
    void update(); // Called in loop() to evaluate local automation rules

    void setConfig(const AutomationConfig& config);
    AutomationConfig getConfig() const { return _config; }

    bool isAutoLightsActive() const { return _autoLightsActive; }
    bool isAutoPlugActive() const { return _autoPlugActive; }

private:
    AutomationConfig _config;

    unsigned long _lastEmptyTime;
    bool _wasOccupied;
    bool _autoLightsActive;
    bool _autoPlugActive;

    void evaluateLights();
    void evaluatePlug();
};

extern AutomationEngine automation;

#endif // AUTOMATION_H
