#ifndef CALIBRATION_H
#define CALIBRATION_H

#include <Arduino.h>
#include <EEPROM.h>
#include "config.h"

// Calibration data structure stored in EEPROM
struct CalibrationData {
    uint32_t magic;              // EEPROM_MAGIC
    uint16_t darkBaseline;       // raw LDR ADC (e.g. 50)
    uint16_t daylightBaseline;   // raw LDR ADC (e.g. 850)
    uint16_t lightAContrib;      // LDR ADC delta with Light A
    uint16_t lightBContrib;      // LDR ADC delta with Light B
    uint16_t bothContrib;        // LDR ADC delta with both lights
    float accelRestBaseline;     // MPU6050 rest vector magnitude (m/s^2)
    float knockThreshold;        // Spike threshold above rest (m/s^2)
    float floorDistA;            // Sensor A floor distance in cm
    float floorDistB;            // Sensor B floor distance in cm
    float heightOffset;          // User standing offset in cm
    bool directionFlipped;       // True if entry/exit inverted
};

enum CalibrationStep {
    CALIB_IDLE = 0,
    CALIB_DARK_BASELINE,         // Step 1: 15s
    CALIB_DAYLIGHT_BASELINE,     // Step 2: 15s
    CALIB_LIGHT_CONTRIB_A,       // Step 3a: 10s
    CALIB_LIGHT_CONTRIB_B,       // Step 3b: 10s
    CALIB_LIGHT_CONTRIB_BOTH,    // Step 3c: 10s
    CALIB_MPU_REST,              // Step 4a: 3s
    CALIB_MPU_KNOCK,             // Step 4b: 2 knocks
    CALIB_FLOOR_DISTANCE,        // Step 5: 3s
    CALIB_WALKTHROUGH_TEST,      // Step 6: 3 passes each way
    CALIB_HEIGHT_OFFSET          // Step 7: user standing
};

typedef void (*CalibrationProgressCallback)(CalibrationStep step, int progressPercent, const char* statusMsg);
typedef void (*CalibrationCompleteCallback)(const CalibrationData& data);

class CalibrationManager {
public:
    CalibrationManager();
    void begin();
    void update();

    // Start a specific guided step
    void startStep(CalibrationStep step, float param = 0.0f);
    void cancel();

    // Direct configuration
    void setCalibration(const CalibrationData& data);
    CalibrationData getCalibration() const { return _data; }

    bool isCalibrating() const { return _currentStep != CALIB_IDLE; }
    CalibrationStep getCurrentStep() const { return _currentStep; }

    void onProgress(CalibrationProgressCallback cb);
    void onComplete(CalibrationCompleteCallback cb);

    void saveToEeprom();
    bool loadFromEeprom();

private:
    CalibrationData _data;
    CalibrationStep _currentStep;
    unsigned long _stepStartTime;
    unsigned long _stepDurationMs;
    float _paramValue;

    // Accumulators for averaging
    uint32_t _accumInt;
    float _accumFloatA;
    float _accumFloatB;
    int _sampleCount;
    int _knockCount;

    CalibrationProgressCallback _progressCb;
    CalibrationCompleteCallback _completeCb;

    void finishCurrentStep();
    void applyToSubsystems();
};

extern CalibrationManager calibration;

#endif // CALIBRATION_H
