#include "calibration.h"
#include "sensors.h"
#include "relays.h"
#include "doorway.h"

CalibrationManager calibration;

CalibrationManager::CalibrationManager()
    : _currentStep(CALIB_IDLE),
      _stepStartTime(0),
      _stepDurationMs(0),
      _paramValue(0.0f),
      _accumInt(0),
      _accumFloatA(0.0f),
      _accumFloatB(0.0f),
      _sampleCount(0),
      _knockCount(0),
      _progressCb(nullptr),
      _completeCb(nullptr) {
    // Sensible factory defaults
    _data.magic = EEPROM_MAGIC;
    _data.darkBaseline = 50;
    _data.daylightBaseline = 850;
    _data.lightAContrib = 120;
    _data.lightBContrib = 150;
    _data.bothContrib = 280;
    _data.accelRestBaseline = 9.8f;
    _data.knockThreshold = 6.0f;
    _data.floorDistA = 220.0f;
    _data.floorDistB = 220.0f;
    _data.heightOffset = 0.0f;
    _data.directionFlipped = false;
}

void CalibrationManager::begin() {
    EEPROM.begin(EEPROM_SIZE);
    if (!loadFromEeprom()) {
        saveToEeprom();
    }
    applyToSubsystems();
}

void CalibrationManager::applyToSubsystems() {
    sensors.setLdrCalibration(_data.darkBaseline, _data.daylightBaseline);
    sensors.setKnockCalibration(_data.accelRestBaseline, _data.knockThreshold);
    doorway.setFloorDistances(_data.floorDistA, _data.floorDistB);
    doorway.setHeightOffset(_data.heightOffset);
    doorway.setDirectionFlipped(_data.directionFlipped);
}

bool CalibrationManager::loadFromEeprom() {
    CalibrationData temp;
    EEPROM.get(0, temp);
    if (temp.magic == EEPROM_MAGIC) {
        _data = temp;
        return true;
    }
    return false;
}

void CalibrationManager::saveToEeprom() {
    _data.magic = EEPROM_MAGIC;
    EEPROM.put(0, _data);
    EEPROM.commit();
}

void CalibrationManager::startStep(CalibrationStep step, float param) {
    _currentStep = step;
    _stepStartTime = millis();
    _paramValue = param;
    _accumInt = 0;
    _accumFloatA = 0.0f;
    _accumFloatB = 0.0f;
    _sampleCount = 0;
    _knockCount = 0;

    switch (step) {
        case CALIB_DARK_BASELINE:
            _stepDurationMs = 15000; // 15 seconds
            relays.setIntensity(0, false, "calib");
            break;

        case CALIB_DAYLIGHT_BASELINE:
            _stepDurationMs = 15000; // 15 seconds
            relays.setIntensity(0, false, "calib");
            break;

        case CALIB_LIGHT_CONTRIB_A:
            _stepDurationMs = 10000; // 10 seconds
            relays.setRelay(0, true, false, "calib");
            relays.setRelay(1, false, false, "calib");
            break;

        case CALIB_LIGHT_CONTRIB_B:
            _stepDurationMs = 10000; // 10 seconds
            relays.setRelay(0, false, false, "calib");
            relays.setRelay(1, true, false, "calib");
            break;

        case CALIB_LIGHT_CONTRIB_BOTH:
            _stepDurationMs = 10000; // 10 seconds
            relays.setRelay(0, true, false, "calib");
            relays.setRelay(1, true, false, "calib");
            break;

        case CALIB_MPU_REST:
            _stepDurationMs = 3000;  // 3 seconds
            break;

        case CALIB_MPU_KNOCK:
            _stepDurationMs = 30000; // Up to 30s waiting for 2 deliberate knocks
            break;

        case CALIB_FLOOR_DISTANCE:
            _stepDurationMs = 3000;  // 3 seconds
            break;

        case CALIB_WALKTHROUGH_TEST:
            _stepDurationMs = 45000; // Walk-through window
            break;

        case CALIB_HEIGHT_OFFSET:
            _stepDurationMs = 5000;  // 5 seconds
            break;

        default:
            _stepDurationMs = 0;
            break;
    }

    if (_progressCb) {
        _progressCb(_currentStep, 0, "Started calibration step");
    }
}

void CalibrationManager::cancel() {
    _currentStep = CALIB_IDLE;
    relays.setIntensity(0, false, "calib_cancel");
    if (_progressCb) {
        _progressCb(CALIB_IDLE, 0, "Calibration cancelled");
    }
}

void CalibrationManager::finishCurrentStep() {
    switch (_currentStep) {
        case CALIB_DARK_BASELINE:
            if (_sampleCount > 0) {
                _data.darkBaseline = (uint16_t)(_accumInt / _sampleCount);
            }
            break;

        case CALIB_DAYLIGHT_BASELINE:
            if (_sampleCount > 0) {
                _data.daylightBaseline = (uint16_t)(_accumInt / _sampleCount);
            }
            break;

        case CALIB_LIGHT_CONTRIB_A:
            if (_sampleCount > 0) {
                uint16_t raw = (uint16_t)(_accumInt / _sampleCount);
                _data.lightAContrib = (raw > _data.darkBaseline) ? (raw - _data.darkBaseline) : 100;
            }
            relays.setRelay(0, false, false, "calib_done");
            break;

        case CALIB_LIGHT_CONTRIB_B:
            if (_sampleCount > 0) {
                uint16_t raw = (uint16_t)(_accumInt / _sampleCount);
                _data.lightBContrib = (raw > _data.darkBaseline) ? (raw - _data.darkBaseline) : 120;
            }
            relays.setRelay(1, false, false, "calib_done");
            break;

        case CALIB_LIGHT_CONTRIB_BOTH:
            if (_sampleCount > 0) {
                uint16_t raw = (uint16_t)(_accumInt / _sampleCount);
                _data.bothContrib = (raw > _data.darkBaseline) ? (raw - _data.darkBaseline) : 220;
            }
            relays.setIntensity(0, false, "calib_done");
            break;

        case CALIB_MPU_REST:
            if (_sampleCount > 0) {
                _data.accelRestBaseline = _accumFloatA / _sampleCount;
            }
            break;

        case CALIB_MPU_KNOCK:
            if (_knockCount > 0) {
                // Set threshold to 70% of average deliberate knock spike
                _data.knockThreshold = (_accumFloatA / _knockCount) * 0.70f;
                if (_data.knockThreshold < 3.0f) _data.knockThreshold = 3.0f;
            }
            break;

        case CALIB_FLOOR_DISTANCE:
            if (_sampleCount > 0) {
                _data.floorDistA = _accumFloatA / _sampleCount;
                _data.floorDistB = _accumFloatB / _sampleCount;
            }
            break;

        case CALIB_HEIGHT_OFFSET:
            // _paramValue is the user's actual known height in cm (e.g. 175.0)
            if (_paramValue >= 80.0f && _sampleCount > 0) {
                float avgFloor = (_data.floorDistA + _data.floorDistB) / 2.0f;
                float measuredHeadDist = _accumFloatA / _sampleCount;
                float measuredHeight = avgFloor - measuredHeadDist;
                _data.heightOffset = _paramValue - measuredHeight;
            }
            break;

        default:
            break;
    }

    saveToEeprom();
    applyToSubsystems();

    if (_progressCb) {
        _progressCb(_currentStep, 100, "Step completed");
    }

    if (_completeCb) {
        _completeCb(_data);
    }

    _currentStep = CALIB_IDLE;
}

void CalibrationManager::update() {
    if (_currentStep == CALIB_IDLE) return;

    unsigned long elapsed = millis() - _stepStartTime;
    int progress = constrain((int)((elapsed * 100UL) / _stepDurationMs), 0, 100);

    // Collect step-specific sensor samples
    switch (_currentStep) {
        case CALIB_DARK_BASELINE:
        case CALIB_DAYLIGHT_BASELINE:
        case CALIB_LIGHT_CONTRIB_A:
        case CALIB_LIGHT_CONTRIB_B:
        case CALIB_LIGHT_CONTRIB_BOTH:
            _accumInt += sensors.getRawLdr();
            _sampleCount++;
            break;

        case CALIB_MPU_REST:
            _accumFloatA += sensors.getInstantaneousVibration();
            _sampleCount++;
            break;

        case CALIB_MPU_KNOCK:
            // Count deliberate knocks
            if (sensors.getInstantaneousVibration() > 4.0f) {
                _accumFloatA += sensors.getInstantaneousVibration();
                _knockCount++;
                if (_knockCount >= 2) {
                    finishCurrentStep();
                    return;
                }
            }
            break;

        case CALIB_FLOOR_DISTANCE: {
            float da = doorway.pingSensorA();
            float db = doorway.pingSensorB();
            if (da < 300.0f && da > 50.0f) {
                _accumFloatA += da;
                _accumFloatB += db;
                _sampleCount++;
            }
            break;
        }

        case CALIB_HEIGHT_OFFSET: {
            float d = doorway.pingSensorA();
            if (d < 300.0f && d > 20.0f) {
                _accumFloatA += d;
                _sampleCount++;
            }
            break;
        }

        default:
            break;
    }

    if (_progressCb && (millis() % 500 == 0)) {
        _progressCb(_currentStep, progress, "In progress");
    }

    if (elapsed >= _stepDurationMs) {
        finishCurrentStep();
    }
}

void CalibrationManager::setCalibration(const CalibrationData& data) {
    _data = data;
    saveToEeprom();
    applyToSubsystems();
}

void CalibrationManager::onProgress(CalibrationProgressCallback cb) {
    _progressCb = cb;
}

void CalibrationManager::onComplete(CalibrationCompleteCallback cb) {
    _completeCb = cb;
}
