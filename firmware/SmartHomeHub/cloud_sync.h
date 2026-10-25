#ifndef CLOUD_SYNC_H
#define CLOUD_SYNC_H

#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include "config.h"
#include "bitpack.h"

#define MAX_QUEUED_HOURS 4

struct QueuedBlob {
    uint32_t hourTimestamp;
    uint8_t buffer[HOURLY_BLOB_SIZE_BYTES]; // 360 bytes
    bool readyToSend;
};

class CloudSyncManager {
public:
    CloudSyncManager();
    void begin();
    void update(); // Called frequently in loop()

    // Realtime broadcasting
    void broadcastStateSnapshot();
    void sendEvent(uint8_t typeCode, float value, const char* metaJson = "{}");

    // Hourly frame accumulation
    void recordMinuteFrame();

    bool isConnectedToRealtime() const { return _realtimeConnected; }
    uint32_t getFreeHeap() const { return ESP.getFreeHeap(); }

private:
    WebSocketsClient _webSocket;
    bool _realtimeConnected;
    String _deviceJwt;
    unsigned long _jwtExpiryTime;

    // Snapshot timer
    unsigned long _lastSnapshotTime;
    unsigned long _lastMinuteFrameTime;
    unsigned long _lastSessionRefreshTime;

    // Hourly bitpack accumulation
    uint8_t _currentHourBuffer[HOURLY_BLOB_SIZE_BYTES];
    int _currentMinuteIndex; // 0 to 59
    uint32_t _currentHourStartEpoch;

    // Queue for unsent hourly blobs (up to 4 in RAM)
    QueuedBlob _blobQueue[MAX_QUEUED_HOURS];
    int _queueCount;

    void refreshDeviceSession();
    void connectSupabaseRealtime();
    void processIncomingCommand(const char* payload);
    void flushBlobQueue();
    bool uploadHourlyBlob(uint32_t hourEpoch, const uint8_t* blobData);

    static void webSocketEvent(WStype_t type, uint8_t * payload, size_t length);
};

extern CloudSyncManager cloudSync;

#endif // CLOUD_SYNC_H
