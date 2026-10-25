#include "sensors.h"
#include <math.h>

SensorManager sensors;

SensorManager::SensorManager()
    : _dht(PIN_DHT11_DATA, DHT11),
      _mpuAvailable(false),
      _sampleCount(0),
      _sampleHead(0),
      _filteredTemp(25.0f),
      _filteredHum(50.0f),
      _smoothedLdr(500.0f),
      _darkBaseline(50),
      _daylightBaseline(850),
      _restBaseline(9.8f),      // ~1G standard gravity in m/s^2
      _knockThreshold(6.0f),     // 6 m/s^2 spike above baseline
      _peakVibrationAcc(0.0f),
      _lastKnockTime(0),
      _knockCb(nullptr) {
    for (int i = 0; i < AVG_WINDOW; i++) {
        _tempSamples[i] = 25.0f;
        _humSamples[i] = 50.0f;
    }
}

void SensorManager::begin() {
    _dht.begin();

    // Initialize MPU6050
    if (_mpu.begin(MPU6050_I2C_ADDR, &Wire)) {
        _mpuAvailable = true;
        _mpu.setAccelerometerRange(MPU6050_RANGE_4_G);
        _mpu.setGyroRange(MPU6050_RANGE_500_DEG);
        _mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
    }

    // Initial LDR reading
    _smoothedLdr = analogRead(PIN_LDR_ANALOG);
}

float SensorManager::computeMedian(float* arr, int size) {
    if (size <= 0) return 0.0f;
    float temp[size];
    memcpy(temp, arr, size * sizeof(float));

    // Simple insertion sort for small size (5)
    for (int i = 1; i < size; i++) {
        float key = temp[i];
        int j = i - 1;
        while (j >= 0 && temp[j] > key) {
            temp[j + 1] = temp[j];
            j = j - 1;
        }
        temp[j + 1] = key;
    }
    return temp[size / 2];
}

void SensorManager::updatePeriodic() {
    // 1. Sample DHT11
    float t = _dht.readTemperature();
    float h = _dht.readHumidity();

    // Discard invalid / failed readings
    if (!isnan(t) && !isnan(h) && t >= 0.0f && t <= 60.0f && h >= 0.0f && h <= 100.0f) {
        _tempSamples[_sampleHead] = t;
        _humSamples[_sampleHead] = h;
        _sampleHead = (_sampleHead + 1) % AVG_WINDOW;
        if (_sampleCount < AVG_WINDOW) _sampleCount++;

        // Filter: median of last 5 samples, then average across all accumulated samples (up to 30)
        int recentCount = min(_sampleCount, MEDIAN_WINDOW);
        float recentTemp[recentCount];
        float recentHum[recentCount];

        for (int i = 0; i < recentCount; i++) {
            int idx = (_sampleHead - 1 - i + AVG_WINDOW) % AVG_WINDOW;
            recentTemp[i] = _tempSamples[idx];
            recentHum[i] = _humSamples[idx];
        }

        float medianT = computeMedian(recentTemp, recentCount);
        float medianH = computeMedian(recentHum, recentCount);

        // Rolling average across the accumulated buffer with median weighting
        float sumT = 0.0f;
        float sumH = 0.0f;
        for (int i = 0; i < _sampleCount; i++) {
            sumT += _tempSamples[i];
            sumH += _humSamples[i];
        }

        // 70% rolling buffer average, 30% recent median
        _filteredTemp = (sumT / _sampleCount) * 0.7f + medianT * 0.3f;
        _filteredHum = (sumH / _sampleCount) * 0.7f + medianH * 0.3f;
    }
}

void SensorManager::updateFast() {
    // 1. Smooth LDR ADC reading with Exponential Moving Average (EMA)
    int rawAdc = analogRead(PIN_LDR_ANALOG);
    _smoothedLdr = _smoothedLdr * 0.90f + rawAdc * 0.10f;

    // 2. Sample MPU6050 for sudden knock/vibration spikes
    if (_mpuAvailable) {
        sensors_event_t a, g, temp;
        _mpu.getEvent(&a, &g, &temp);

        // Vector magnitude in m/s^2
        float mag = sqrt(a.acceleration.x * a.acceleration.x +
                         a.acceleration.y * a.acceleration.y +
                         a.acceleration.z * a.acceleration.z);

        // Deviation from calibrated rest baseline
        float delta = fabs(mag - _restBaseline);

        // Track peak vibration in current minute
        if (delta > _peakVibrationAcc) {
            _peakVibrationAcc = delta;
        }

        // Knock detection: spike exceeds threshold with 300ms debounce
        if (delta >= _knockThreshold && (millis() - _lastKnockTime > 300)) {
            _lastKnockTime = millis();
            if (_knockCb) {
                _knockCb(delta);
            }
        }
    }
}

float SensorManager::getTemperature() const {
    return _filteredTemp;
}

float SensorManager::getHumidity() const {
    return _filteredHum;
}

uint16_t SensorManager::getRawLdr() const {
    return (uint16_t)constrain((int)round(_smoothedLdr), 0, 1023);
}

uint8_t SensorManager::getAmbientPercent() const {
    if (_daylightBaseline <= _darkBaseline) return 50;

    int current = (int)_smoothedLdr;
    // Map between dark baseline and daylight baseline to 0..100%
    long val = map(current, _darkBaseline, _daylightBaseline, 0, 100);
    return (uint8_t)constrain(val, 0, 100);
}

uint8_t SensorManager::getPeakVibrationMinute() const {
    // Convert peak deviation (0 to ~30 m/s^2) into an 8-bit scale (0 - 255)
    // Scale: 1 m/s^2 = ~8.5 counts
    int scaled = (int)(_peakVibrationAcc * 8.5f);
    return (uint8_t)constrain(scaled, 0, 255);
}

void SensorManager::resetMinuteVibration() {
    _peakVibrationAcc = 0.0f;
}

float SensorManager::getInstantaneousVibration() const {
    return _peakVibrationAcc;
}

void SensorManager::setLdrCalibration(uint16_t darkBaseline, uint16_t daylightBaseline) {
    _darkBaseline = darkBaseline;
    _daylightBaseline = daylightBaseline;
}

void SensorManager::setKnockCalibration(float restBaseline, float knockThreshold) {
    _restBaseline = restBaseline;
    _knockThreshold = knockThreshold;
}

void SensorManager::onKnock(KnockEventCallback cb) {
    _knockCb = cb;
}
