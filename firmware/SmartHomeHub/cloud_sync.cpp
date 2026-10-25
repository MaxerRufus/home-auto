#include "cloud_sync.h"
#include "relays.h"
#include "sensors.h"
#include "doorway.h"
#include "automation.h"
#include "calibration.h"

CloudSyncManager cloudSync;

CloudSyncManager::CloudSyncManager()
    : _realtimeConnected(false),
      _jwtExpiryTime(0),
      _lastSnapshotTime(0),
      _lastMinuteFrameTime(0),
      _lastSessionRefreshTime(0),
      _currentMinuteIndex(0),
      _currentHourStartEpoch(0),
      _queueCount(0) {
    memset(_currentHourBuffer, 0, sizeof(_currentHourBuffer));
    for (int i = 0; i < MAX_QUEUED_HOURS; i++) {
        _blobQueue[i].readyToSend = false;
    }
}

void CloudSyncManager::begin() {
    refreshDeviceSession();
    connectSupabaseRealtime();
    _lastMinuteFrameTime = millis();
}

void CloudSyncManager::refreshDeviceSession() {
    if (WiFi.status() != WL_CONNECTED) return;

    WiFiClientSecure client;
    client.setInsecure(); // Per specification: certificate verification bypassed for simplicity

    HTTPClient http;
    String url = String(BACKEND_BASE_URL) + "/api/device/session";

    if (http.begin(client, url)) {
        http.addHeader("Content-Type", "application/json");

        StaticJsonDocument<256> doc;
        doc["device_id"] = DEVICE_ID;
        doc["token"] = DEVICE_SECRET_TOKEN;

        String requestBody;
        serializeJson(doc, requestBody);

        int httpCode = http.POST(requestBody);
        if (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_CREATED) {
            String response = http.getString();
            StaticJsonDocument<1024> respDoc;
            DeserializationError err = deserializeJson(respDoc, response);

            if (!err) {
                if (respDoc.containsKey("token")) {
                    _deviceJwt = respDoc["token"].as<String>();
                    _jwtExpiryTime = millis() + (3600UL * 1000UL); // 1 hr session
                }

                // Sync server config if present
                if (respDoc.containsKey("config")) {
                    JsonObject cfg = respDoc["config"];
                    AutomationConfig ac = automation.getConfig();
                    if (cfg.containsKey("light_threshold")) ac.lightThreshold = cfg["light_threshold"];
                    if (cfg.containsKey("temp_threshold")) ac.tempThreshold = cfg["temp_threshold"];
                    if (cfg.containsKey("auto_lights")) ac.autoLightsEnabled = cfg["auto_lights"];
                    if (cfg.containsKey("auto_plug")) ac.autoPlugEnabled = cfg["auto_plug"];
                    automation.setConfig(ac);
                }

                // Sync server calibration if present
                if (respDoc.containsKey("calibration")) {
                    JsonObject cal = respDoc["calibration"];
                    CalibrationData cd = calibration.getCalibration();
                    if (cal.containsKey("dark_baseline")) cd.darkBaseline = cal["dark_baseline"];
                    if (cal.containsKey("daylight_baseline")) cd.daylightBaseline = cal["daylight_baseline"];
                    if (cal.containsKey("floor_dist_a")) cd.floorDistA = cal["floor_dist_a"];
                    if (cal.containsKey("floor_dist_b")) cd.floorDistB = cal["floor_dist_b"];
                    if (cal.containsKey("height_offset")) cd.heightOffset = cal["height_offset"];
                    if (cal.containsKey("direction_flipped")) cd.directionFlipped = cal["direction_flipped"];
                    calibration.setCalibration(cd);
                }
            }
        }
        http.end();
    }
    _lastSessionRefreshTime = millis();
}

void CloudSyncManager::connectSupabaseRealtime() {
    if (WiFi.status() != WL_CONNECTED) return;

    String url = "/realtime/v1/websocket?apikey=" + String(SUPABASE_ANON_KEY) + "&vsn=1.0.0";
    if (_deviceJwt.length() > 0) {
        url += "&token=" + _deviceJwt;
    }

    _webSocket.beginSSL(SUPABASE_HOST, SUPABASE_PORT, url.c_str());
    _webSocket.onEvent(webSocketEvent);
    _webSocket.setReconnectInterval(5000);
}

void CloudSyncManager::webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
    switch (type) {
        case WStype_DISCONNECTED:
            cloudSync._realtimeConnected = false;
            break;

        case WStype_CONNECTED: {
            cloudSync._realtimeConnected = true;
            // Phoenix channel join message
            StaticJsonDocument<256> joinDoc;
            joinDoc["topic"] = "realtime:device:" + String(DEVICE_ID);
            joinDoc["event"] = "phx_join";
            joinDoc["payload"] = JsonObject();
            joinDoc["ref"] = "1";

            String joinMsg;
            serializeJson(joinDoc, joinMsg);
            cloudSync._webSocket.sendTXT(joinMsg);
            break;
        }

        case WStype_TEXT: {
            // Incoming message from Supabase Realtime channel
            cloudSync.processIncomingCommand((const char*)payload);
            break;
        }

        default:
            break;
    }
}

void CloudSyncManager::processIncomingCommand(const char* payload) {
    StaticJsonDocument<1024> doc;
    DeserializationError err = deserializeJson(doc, payload);
    if (err) return;

    const char* event = doc["event"] | "";

    // Phoenix broadcast event from browser
    if (strcmp(event, "broadcast") == 0) {
        JsonObject pl = doc["payload"];
        const char* subEvent = pl["event"] | "";

        if (strcmp(subEvent, "command") == 0) {
            JsonObject cmd = pl["payload"];
            const char* action = cmd["action"] | "";

            if (strcmp(action, "SET_RELAY") == 0) {
                uint8_t idx = cmd["index"] | 0;
                bool state = cmd["state"] | false;
                relays.setRelay(idx, state, true, "web_command");
                broadcastStateSnapshot();
            } else if (strcmp(action, "SET_INTENSITY") == 0) {
                uint8_t level = cmd["level"] | 0;
                relays.setIntensity(level, true, "web_command");
                broadcastStateSnapshot();
            } else if (strcmp(action, "STOP_OVERRIDE") == 0) {
                relays.clearOverride();
                broadcastStateSnapshot();
            } else if (strcmp(action, "SET_CONFIG") == 0) {
                AutomationConfig cfg = automation.getConfig();
                if (cmd.containsKey("light_threshold")) cfg.lightThreshold = cmd["light_threshold"];
                if (cmd.containsKey("temp_threshold")) cfg.tempThreshold = cmd["temp_threshold"];
                if (cmd.containsKey("auto_lights")) cfg.autoLightsEnabled = cmd["auto_lights"];
                if (cmd.containsKey("auto_plug")) cfg.autoPlugEnabled = cmd["auto_plug"];
                automation.setConfig(cfg);
                broadcastStateSnapshot();
            } else if (strcmp(action, "START_CALIBRATION") == 0) {
                int step = cmd["step"] | 0;
                float param = cmd["param"] | 0.0f;
                calibration.startStep((CalibrationStep)step, param);
            } else if (strcmp(action, "CANCEL_CALIBRATION") == 0) {
                calibration.cancel();
            }
        }
    }
}

void CloudSyncManager::broadcastStateSnapshot() {
    if (!_realtimeConnected) return;

    StaticJsonDocument<768> doc;
    doc["topic"] = "realtime:device:" + String(DEVICE_ID);
    doc["event"] = "broadcast";
    doc["ref"] = "state";

    JsonObject pl = doc.createNestedObject("payload");
    pl["type"] = "broadcast";
    pl["event"] = "state";

    JsonObject data = pl.createNestedObject("payload");
    data["device_id"] = DEVICE_ID;
    data["occupancy"] = doorway.getOccupancy();
    data["temperature"] = round(sensors.getTemperature() * 10.0f) / 10.0f;
    data["humidity"] = round(sensors.getHumidity() * 10.0f) / 10.0f;
    data["ambient_light"] = sensors.getAmbientPercent();
    data["raw_ldr"] = sensors.getRawLdr();
    data["intensity"] = relays.getIntensity();

    JsonArray relArr = data.createNestedArray("relays");
    for (int i = 0; i < 4; i++) {
        relArr.add(relays.getRelay(i));
    }

    data["manual_override"] = relays.isOverrideActive();
    data["override_remaining_sec"] = relays.getOverrideRemainingSec();
    data["free_heap"] = ESP.getFreeHeap();

    String msg;
    serializeJson(doc, msg);
    _webSocket.sendTXT(msg);
}

void CloudSyncManager::sendEvent(uint8_t typeCode, float value, const char* metaJson) {
    // 1. Instant broadcast over WebSocket channel for browser
    if (_realtimeConnected) {
        StaticJsonDocument<512> doc;
        doc["topic"] = "realtime:device:" + String(DEVICE_ID);
        doc["event"] = "broadcast";
        doc["ref"] = "event";

        JsonObject pl = doc.createNestedObject("payload");
        pl["type"] = "broadcast";
        pl["event"] = "device_event";

        JsonObject ev = pl.createNestedObject("payload");
        ev["type_code"] = typeCode;
        ev["value"] = value;
        ev["metadata"] = serialized(metaJson);

        String msg;
        serializeJson(doc, msg);
        _webSocket.sendTXT(msg);
    }

    // 2. Persist to Supabase events table via Vercel endpoint
    if (WiFi.status() == WL_CONNECTED) {
        WiFiClientSecure client;
        client.setInsecure();
        HTTPClient http;
        String url = String(BACKEND_BASE_URL) + "/api/device/event";

        if (http.begin(client, url)) {
            http.addHeader("Content-Type", "application/json");
            http.addHeader("X-Device-Token", DEVICE_SECRET_TOKEN);

            StaticJsonDocument<256> doc;
            doc["device_id"] = DEVICE_ID;
            doc["type_code"] = typeCode;
            doc["value"] = value;
            doc["metadata"] = serialized(metaJson);

            String body;
            serializeJson(doc, body);
            http.POST(body);
            http.end();
        }
    }
}

void CloudSyncManager::recordMinuteFrame() {
    SensorFrame frame;
    frame.temperature = (uint8_t)constrain((int)round(sensors.getTemperature()), 0, 63);
    frame.humidity = (uint8_t)constrain((int)round(sensors.getHumidity()), 0, 127);
    frame.ldr = sensors.getRawLdr();
    frame.vibration = sensors.getPeakVibrationMinute();
    frame.relays = relays.getRelaysMask();
    frame.switches = relays.getSwitchesMask();
    frame.occupancy = (uint8_t)constrain(doorway.getOccupancy(), 0, 63);

    frame.flags = 0;
    if (relays.isOverrideActive()) frame.flags |= 0x01;
    if (automation.isAutoLightsActive()) frame.flags |= 0x02;
    if (automation.isAutoPlugActive()) frame.flags |= 0x04;

    // Reset minute peak vibration
    sensors.resetMinuteVibration();

    // Pack into hourly buffer (6 bytes per minute)
    pack_sensor_frame(&frame, _currentHourBuffer + (_currentMinuteIndex * FRAME_SIZE_BYTES));
    _currentMinuteIndex++;

    // When 60 minutes are accumulated, queue the full 360-byte hourly blob
    if (_currentMinuteIndex >= FRAMES_PER_HOUR) {
        if (_queueCount < MAX_QUEUED_HOURS) {
            memcpy(_blobQueue[_queueCount].buffer, _currentHourBuffer, HOURLY_BLOB_SIZE_BYTES);
            _blobQueue[_queueCount].hourTimestamp = (uint32_t)(millis() / 1000UL); // Epoch approx
            _blobQueue[_queueCount].readyToSend = true;
            _queueCount++;
        }
        // Reset current hour buffer
        memset(_currentHourBuffer, 0, sizeof(_currentHourBuffer));
        _currentMinuteIndex = 0;

        flushBlobQueue();
    }
}

bool CloudSyncManager::uploadHourlyBlob(uint32_t hourEpoch, const uint8_t* blobData) {
    if (WiFi.status() != WL_CONNECTED) return false;

    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;
    String url = String(BACKEND_BASE_URL) + "/api/device/ingest";

    if (http.begin(client, url)) {
        http.addHeader("Content-Type", "application/octet-stream");
        http.addHeader("X-Device-Id", DEVICE_ID);
        http.addHeader("X-Device-Token", DEVICE_SECRET_TOKEN);
        http.addHeader("X-Hour-Epoch", String(hourEpoch));

        int code = http.POST((uint8_t*)blobData, HOURLY_BLOB_SIZE_BYTES);
        http.end();
        return (code == HTTP_CODE_OK || code == HTTP_CODE_CREATED);
    }
    return false;
}

void CloudSyncManager::flushBlobQueue() {
    for (int i = 0; i < _queueCount; i++) {
        if (_blobQueue[i].readyToSend) {
            if (uploadHourlyBlob(_blobQueue[i].hourTimestamp, _blobQueue[i].buffer)) {
                // Shift remaining queue
                for (int j = i; j < _queueCount - 1; j++) {
                    _blobQueue[j] = _blobQueue[j + 1];
                }
                _queueCount--;
                i--;
            } else {
                break; // Stop and retry later if network fails
            }
        }
    }
}

void CloudSyncManager::update() {
    _webSocket.loop();

    unsigned long now = millis();

    // 1. Broadcast state snapshot every 2 seconds (per specification)
    if (now - _lastSnapshotTime >= SNAPSHOT_INTERVAL_MS) {
        _lastSnapshotTime = now;
        broadcastStateSnapshot();
    }

    // 2. Record 1 frame per minute
    if (now - _lastMinuteFrameTime >= MINUTE_FRAME_INTERVAL_MS) {
        _lastMinuteFrameTime = now;
        recordMinuteFrame();
    }

    // 3. Periodic Phoenix heartbeat (every 25 seconds)
    static unsigned long lastHeartbeat = 0;
    if (_realtimeConnected && (now - lastHeartbeat >= 25000)) {
        lastHeartbeat = now;
        _webSocket.sendTXT("{\"topic\":\"phoenix\",\"event\":\"heartbeat\",\"payload\":{},\"ref\":\"hb\"}");
    }

    // 4. Session JWT refresh every 45 minutes
    if (now - _lastSessionRefreshTime >= (45UL * 60UL * 1000UL)) {
        refreshDeviceSession();
    }

    // 5. Retry unsent queued hourly blobs
    static unsigned long lastQueueRetry = 0;
    if (_queueCount > 0 && (now - lastQueueRetry >= 60000)) {
        lastQueueRetry = now;
        flushBlobQueue();
    }
}
