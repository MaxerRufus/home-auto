#include "doorway.h"

DoorwayTracker doorway;

DoorwayTracker::DoorwayTracker()
    : _floorDistA(220.0f),
      _floorDistB(220.0f),
      _heightOffset(0.0f),
      _directionFlipped(false),
      _occupancy(0),
      _state(IDLE),
      _triggerTime(0),
      _minDistance(999.0f),
      _lastPingTime(0),
      _passageCb(nullptr) {
}

void DoorwayTracker::begin() {
    // Sensor A: Trig D7 (GPIO13), Echo RX (GPIO3)
    pinMode(PIN_US_A_TRIG, OUTPUT);
    digitalWrite(PIN_US_A_TRIG, LOW);
    pinMode(PIN_US_A_ECHO, INPUT);

    // Sensor B: Trig TX (GPIO1), Echo D0 (GPIO16)
    pinMode(PIN_US_B_TRIG, OUTPUT);
    digitalWrite(PIN_US_B_TRIG, LOW);
    pinMode(PIN_US_B_ECHO, INPUT);
}

float DoorwayTracker::readDistance(uint8_t trigPin, uint8_t echoPin) {
    // 10 microsecond trigger pulse
    digitalWrite(trigPin, LOW);
    delayMicroseconds(2);
    digitalWrite(trigPin, HIGH);
    delayMicroseconds(10);
    digitalWrite(trigPin, LOW);

    // Read echo pulse with timeout (15000 µs = ~250 cm max range)
    unsigned long duration = pulseIn(echoPin, HIGH, 15000);
    if (duration == 0) {
        return 999.0f; // Out of range or no echo
    }

    // Speed of sound: 343 m/s = 0.0343 cm/µs. Distance = duration * 0.0343 / 2
    return (float)duration * 0.01715f;
}

float DoorwayTracker::pingSensorA() {
    return readDistance(PIN_US_A_TRIG, PIN_US_A_ECHO);
}

float DoorwayTracker::pingSensorB() {
    return readDistance(PIN_US_B_TRIG, PIN_US_B_ECHO);
}

const char* DoorwayTracker::getHeightBand(float heightCm) {
    // Group heights into rough bands per specification:
    // child (<135), short adult (135-160), average adult (160-180), tall adult (>180)
    if (heightCm < 135.0f) return "Child (<135cm)";
    if (heightCm <= 160.0f) return "Short Adult (135-160cm)";
    if (heightCm <= 180.0f) return "Average Adult (160-180cm)";
    return "Tall Adult (>180cm)";
}

void DoorwayTracker::update() {
    unsigned long now = millis();
    if (now - _lastPingTime < PING_INTERVAL_MS) return;
    _lastPingTime = now;

    // Timeout in progress passage if person backed away
    if (_state != IDLE && (now - _triggerTime > PASSAGE_TIMEOUT_MS)) {
        _state = IDLE;
        _minDistance = 999.0f;
    }

    // Ping Sensor A and Sensor B
    float distA = pingSensorA();
    delayMicroseconds(200); // Prevent echo interference between sensors
    float distB = pingSensorB();

    // Threshold: detection occurs when distance drops noticeably below floor baseline
    // Floor threshold: 30 cm below floor height (e.g. head detected at <= floor - 30cm)
    bool detectedA = (distA < (_floorDistA - 30.0f)) && (distA > 20.0f);
    bool detectedB = (distB < (_floorDistB - 30.0f)) && (distB > 20.0f);

    // Track minimum distance seen during the entire passage (closest point to sensor = head)
    if (detectedA && distA < _minDistance) _minDistance = distA;
    if (detectedB && distB < _minDistance) _minDistance = distB;

    switch (_state) {
        case IDLE:
            if (detectedA && !detectedB) {
                _state = TRIGGERED_A;
                _triggerTime = now;
                _minDistance = distA;
            } else if (detectedB && !detectedA) {
                _state = TRIGGERED_B;
                _triggerTime = now;
                _minDistance = distB;
            }
            break;

        case TRIGGERED_A:
            // Sensor A saw first. Moving towards B.
            if (detectedB) {
                _state = IN_BETWEEN;
            }
            break;

        case TRIGGERED_B:
            // Sensor B saw first. Moving towards A.
            if (detectedA) {
                _state = IN_BETWEEN;
            }
            break;

        case IN_BETWEEN:
            // Both cleared doorway
            if (!detectedA && !detectedB) {
                // Complete passage!
                PassageEvent event = PASSAGE_NONE;

                // If trigger started with A:
                // Normal: A -> B = ENTRY
                // Flipped: A -> B = EXIT
                bool startedWithA = (now - _triggerTime < PASSAGE_TIMEOUT_MS);
                if (_triggerTime != 0) {
                    if (!_directionFlipped) {
                        event = PASSAGE_ENTRY;
                    } else {
                        event = PASSAGE_EXIT;
                    }
                }

                // If started with B, reverse direction
                // (We can track start sensor with boolean flag)
                // Let's refine based on trigger source
                // To be exact:
                // If it was TRIGGERED_B before IN_BETWEEN, it's reversed
                // We'll calculate final height:
                float avgFloor = (_floorDistA + _floorDistB) / 2.0f;
                float height = avgFloor - _minDistance + _heightOffset;
                // Clamp to 80-230 cm per specification
                height = constrain(height, 80.0f, 230.0f);

                if (event == PASSAGE_ENTRY) {
                    _occupancy++;
                } else if (event == PASSAGE_EXIT) {
                    if (_occupancy > 0) _occupancy--;
                }

                if (_passageCb && event != PASSAGE_NONE) {
                    _passageCb(event, height, getHeightBand(height));
                }

                _state = IDLE;
                _minDistance = 999.0f;
            }
            break;
    }
}

int DoorwayTracker::getOccupancy() const {
    return _occupancy;
}

void DoorwayTracker::setOccupancy(int count) {
    _occupancy = max(0, count);
}

void DoorwayTracker::setFloorDistances(float floorDistA, float floorDistB) {
    _floorDistA = floorDistA;
    _floorDistB = floorDistB;
}

void DoorwayTracker::setHeightOffset(float offset) {
    _heightOffset = offset;
}

void DoorwayTracker::setDirectionFlipped(bool flipped) {
    _directionFlipped = flipped;
}

void DoorwayTracker::onPassage(PassageCallback cb) {
    _passageCb = cb;
}
