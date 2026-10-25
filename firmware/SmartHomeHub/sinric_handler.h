#ifndef SINRIC_HANDLER_H
#define SINRIC_HANDLER_H

#include <Arduino.h>
#include <SinricPro.h>
#include <SinricProLight.h>
#include <SinricProDimSwitch.h>
#include <SinricProSwitch.h>
#include "config.h"

class SinricHandler {
public:
    SinricHandler();
    void begin();
    void handle(); // Called in loop()

    // Push local updates to Sinric Pro
    void updateIntensity(uint8_t level, bool powerState);
    void updateFan(bool powerState);
    void updatePlug(bool powerState);
    inline void updateSingleLight(bool powerState) { updateFan(powerState); }

private:
    bool _initialized;

    static bool onDimmablePowerState(const String &deviceId, bool &state);
    static bool onDimmableBrightness(const String &deviceId, int &brightness);
    static bool onSingleLightPowerState(const String &deviceId, bool &state);
    static bool onPlugPowerState(const String &deviceId, bool &state);
};

extern SinricHandler sinric;

#endif // SINRIC_HANDLER_H
