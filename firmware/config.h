#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

// ==============================================================================
// 1. WI-FI CREDENTIALS
// ==============================================================================
#define WIFI_SSID       "YOUR_WIFI_SSID"
#define WIFI_PASS       "YOUR_WIFI_PASSWORD"

// ==============================================================================
// 2. BACKEND & SUPABASE REALTIME CONFIGURATION
// ==============================================================================
// Next.js API deployed on Vercel or local network
#define BACKEND_BASE_URL    "https://your-app.vercel.app"
// Or local development: "http://192.168.1.100:3000"

#define DEVICE_ID           "YOUR_DEVICE_UUID_HERE"
#define DEVICE_SECRET_TOKEN "YOUR_DEVICE_TOKEN_HEX_HERE"

// Supabase Realtime WebSocket host (e.g. xyzcompany.supabase.co)
#define SUPABASE_HOST       "lwdxnlwqotukcylcilgr.supabase.co"
#define SUPABASE_PORT       443
#define SUPABASE_ANON_KEY   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3ZHhubHdxb3R1a2N5bGNpbGdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5NDIzNDMsImV4cCI6MjEwODUxODM0M30.fN0PZAdeCcpuiZi_3GqhrDWexj2cVaT0VsG5pRIftRI"

// ==============================================================================
// 3. SINRIC PRO CONFIGURATION (3 DEVICES FREE TIER)
// ==============================================================================
#define SINRIC_APP_KEY      "c8d24abf-ad25-444b-922d-13f1d586d40d"
#define SINRIC_APP_SECRET   "86a9680b-2176-4772-a43e-ccdd5a9e2b9c"

#define SINRIC_DIMMABLE_ID  "6ab17aa796dc1ddeb0618d9e" // Intensity Group (Light A & B)
#define SINRIC_FAN_ID       "69514c529a866ec12b3fbb6c" // Room Fan (Relay 3 on PCF8574 P2)
#define SINRIC_PLUG_ID      "6aa6095196dc1ddeb0568b58" // Smart Plug (Relay 4 on GPIO12)
#define SINRIC_LIGHT_ID     SINRIC_FAN_ID               // Alias for compatibility

// ==============================================================================
// 4. HARDWARE PIN DEFINITIONS (ESP8266 NodeMCU ESP-12E)
// ==============================================================================
// I2C Bus (Shared by HW-61 PCF8574 at 0x27 and MPU6050 at 0x68)
#define PIN_I2C_SCL         5   // D1 (GPIO5)
#define PIN_I2C_SDA         4   // D2 (GPIO4)
#define PCF8574_I2C_ADDR    0x27
#define MPU6050_I2C_ADDR    0x68

// Onboard LED (Wi-Fi status, active-low)
#define PIN_LED_WIFI        2   // D4 (GPIO2)

// Sensors
#define PIN_DHT11_DATA      14  // D5 (GPIO14)
#define PIN_LDR_ANALOG      A0  // A0 (ADC0)

// Relays
#define PIN_RELAY4_GPIO     12  // D6 (GPIO12) - Relay 4 (Single light, active-low)

// Doorway HC-SR04 Ultrasonic Sensors
// Note: GPIO1 (TX) and GPIO3 (RX) are utilized; Hardware Serial is DISABLED!
#define PIN_US_A_TRIG       13  // D7 (GPIO13) - Sensor A (Outer trigger)
#define PIN_US_A_ECHO       3   // RX (GPIO3)  - Sensor A (Outer echo, level-shifted to 3.3V)
#define PIN_US_B_TRIG       1   // TX (GPIO1)  - Sensor B (Inner trigger)
#define PIN_US_B_ECHO       16  // D0 (GPIO16) - Sensor B (Inner echo, level-shifted to 3.3V)

// PCF8574 I/O Expander Port Mapping
// P0 - P2: Relays (outputs, active-low)
// P4 - P7: Momentary Wall Switches (inputs, pull-up, active-low)
#define PCF_RELAY1_BIT      0   // P0: Light A
#define PCF_RELAY2_BIT      1   // P1: Light B
#define PCF_RELAY3_BIT      2   // P2: Plug
#define PCF_SWITCH1_BIT     4   // P4: Toggles Relay 1
#define PCF_SWITCH2_BIT     5   // P5: Toggles Relay 2
#define PCF_SWITCH3_BIT     6   // P6: Toggles Relay 3
#define PCF_SWITCH4_BIT     7   // P7: Toggles Relay 4

// ==============================================================================
// 5. CONSTANTS & SYSTEM PARAMETERS
// ==============================================================================
#define EEPROM_SIZE                 512
#define EEPROM_MAGIC                0x53484831 // "SHH1" (Smart Home Hub v1)
#define OVERRIDE_DURATION_MS        (30UL * 60UL * 1000UL) // 30 minutes
#define LIGHT_AUTO_OFF_DELAY_MS     (3UL * 60UL * 1000UL)  // 3 minutes
#define TEMP_HYSTERESIS_DEG         2.0f                   // 2 °C
#define SNAPSHOT_INTERVAL_MS        2000UL                 // 2 seconds
#define SENSOR_SAMPLE_INTERVAL_MS   2000UL                 // 2 seconds
#define MINUTE_FRAME_INTERVAL_MS    60000UL                // 1 minute

#endif // CONFIG_H
