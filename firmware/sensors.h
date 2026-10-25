#ifndef SENSORS_H
#define SENSORS_H

#include <Arduino.h>
#include <DHT.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include "config.h"

typedef void (*KnockEventCallback)(float peakValue);

class SensorManager {
public:
    SensorManager();
    void begin();
    void updateFast(); // Called every loop iteration (e.g. for MPU6050 spike & LDR smoothing)
    void updatePeriodic(); // Called every 2 seconds for DHT11 sampling

    // DHT11 Filtered Values
    float getTemperature() const;
    float getHumidity() const;

    // Ambient Light (LDR)
    uint16_t getRawLdr() const;
    uint8_t getAmbientPercent() const;

    // MPU6050 Vibration & Knock
    uint8_t getPeakVibrationMinute() const;
    void resetMinuteVibration();
    float getInstantaneousVibration() const;

    // Calibration setters
    void setLdrCalibration(uint16_t darkBaseline, uint16_t daylightBaseline);
    void setKnockCalibration(float restBaseline, float knockThreshold);

    // Callbacks
    void onKnock(KnockEventCallback cb);

private:
    DHT _dht;
    Adafruit_MPU6050 _mpu;
    bool _mpuAvailable;

    // DHT11 Filtering: Median of 5, rolling average of 30
    static const int MEDIAN_WINDOW = 5;
    static const int AVG_WINDOW = 30;
    float _tempSamples[AVG_WINDOW];
    float _humSamples[AVG_WINDOW];
    int _sampleCount;
    int _sampleHead;

    float _filteredTemp;
    float _filteredHum;

    // LDR Smoothing & Calibration
    float _smoothedLdr;
    uint16_t _darkBaseline;
    uint16_t _daylightBaseline;

    // MPU6050 Vibration & Knock Tracking
    float _restBaseline;
    float _knockThreshold;
    float _peakVibrationAcc;
    unsigned long _lastKnockTime;
    KnockEventCallback _knockCb;

    float computeMedian(float* window, int size);
};

extern SensorManager sensors;

#endif // SENSORS_H
