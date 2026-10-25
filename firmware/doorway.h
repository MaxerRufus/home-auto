#ifndef DOORWAY_H
#define DOORWAY_H

#include <Arduino.h>
#include "config.h"

enum PassageEvent {
    PASSAGE_NONE = 0,
    PASSAGE_ENTRY = 1,
    PASSAGE_EXIT = 2
};

typedef void (*PassageCallback)(PassageEvent event, float heightCm, const char* band);

class DoorwayTracker {
public:
    DoorwayTracker();
    void begin();
    void update(); // Called frequently in loop() to ping sensors and track passage

    // Occupancy
    int getOccupancy() const;
    void setOccupancy(int count);

    // Calibration settings
    void setFloorDistances(float floorDistA, float floorDistB);
    void setHeightOffset(float offset);
    void setDirectionFlipped(bool flipped);

    float getFloorDistA() const { return _floorDistA; }
    float getFloorDistB() const { return _floorDistB; }
    bool isDirectionFlipped() const { return _directionFlipped; }

    // Instant readings (for calibration)
    float pingSensorA();
    float pingSensorB();

    // Callback
    void onPassage(PassageCallback cb);

    static const char* getHeightBand(float heightCm);

private:
    float _floorDistA; // in cm (calibrated)
    float _floorDistB; // in cm (calibrated)
    float _heightOffset;
    bool _directionFlipped;
    int _occupancy;

    // Passage State Machine
    enum State {
        IDLE,
        TRIGGERED_A,
        TRIGGERED_B,
        IN_BETWEEN
    };
    State _state;
    unsigned long _triggerTime;
    float _minDistance;

    unsigned long _lastPingTime;
    static const unsigned long PING_INTERVAL_MS = 40; // 25 Hz ping rate
    static const unsigned long PASSAGE_TIMEOUT_MS = 2500; // max passage duration

    PassageCallback _passageCb;

    float readDistance(uint8_t trigPin, uint8_t echoPin);
};

extern DoorwayTracker doorway;

#endif // DOORWAY_H
