#include "sinric_handler.h"
#include "relays.h"

SinricHandler sinric;

SinricHandler::SinricHandler() : _initialized(false) {}

bool SinricHandler::onDimmablePowerState(const String &deviceId, bool &state) {
    if (state) {
        // If turned ON with power button, default to 50% (Light B) or prior intensity
        uint8_t cur = relays.getIntensity();
        if (cur == 0) cur = 50;
        relays.setIntensity(cur, true, "sinric_voice");
    } else {
        relays.setIntensity(0, true, "sinric_voice");
    }
    return true;
}

bool SinricHandler::onDimmableBrightness(const String &deviceId, int &brightness) {
    uint8_t level = constrain(brightness, 0, 100);
    relays.setIntensity(level, true, "sinric_voice");
    return true;
}

bool SinricHandler::onSingleLightPowerState(const String &deviceId, bool &state) {
    // Relay index 2: Room Fan (PCF8574 P2)
    relays.setRelay(2, state, true, "sinric_voice");
    return true;
}

bool SinricHandler::onPlugPowerState(const String &deviceId, bool &state) {
    // Relay index 3: Main Plug (GPIO12)
    relays.setRelay(3, state, true, "sinric_voice");
    return true;
}

void SinricHandler::begin() {
    // Configure Dimmable Light (Intensity Group for Light A & Light B)
    SinricProLight &dimmable = SinricPro[SINRIC_DIMMABLE_ID];
    dimmable.onPowerState(onDimmablePowerState);
    dimmable.onBrightness(onDimmableBrightness);

    // Configure Room Fan (Relay index 2 on PCF8574 P2)
    SinricProLight &fan = SinricPro[SINRIC_FAN_ID];
    fan.onPowerState(onSingleLightPowerState);

    // Configure Smart Plug (Relay index 3 on GPIO12)
    SinricProSwitch &smartPlug = SinricPro[SINRIC_PLUG_ID];
    smartPlug.onPowerState(onPlugPowerState);

    // Start Sinric Pro
    SinricPro.begin(SINRIC_APP_KEY, SINRIC_APP_SECRET);
    _initialized = true;
}

void SinricHandler::handle() {
    if (_initialized) {
        SinricPro.handle();
    }
}

void SinricHandler::updateIntensity(uint8_t level, bool powerState) {
    if (!_initialized) return;
    SinricProLight &dimmable = SinricPro[SINRIC_DIMMABLE_ID];
    dimmable.sendPowerStateEvent(powerState);
    dimmable.sendBrightnessEvent(level);
}

void SinricHandler::updateFan(bool powerState) {
    if (!_initialized) return;
    SinricProLight &fan = SinricPro[SINRIC_FAN_ID];
    fan.sendPowerStateEvent(powerState);
}

void SinricHandler::updatePlug(bool powerState) {
    if (!_initialized) return;
    SinricProSwitch &smartPlug = SinricPro[SINRIC_PLUG_ID];
    smartPlug.sendPowerStateEvent(powerState);
}
