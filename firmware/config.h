#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

// ==============================================================================
// 1. WI-FI CREDENTIALS
// ==============================================================================
#define WIFI_SSID       "vivo X200 FE"
#define WIFI_PASS       "123456789"

// ==============================================================================
// 2. BACKEND & SUPABASE REALTIME CONFIGURATION
// ==============================================================================
// Next.js API deployed on Vercel or local network
#define BACKEND_BASE_URL    "https://home-auto-eta.vercel.app"
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

#define SINRIC_DIMMABLE_ID  "6ab17aa796dc1ddeb0618d9e" // DimSwitch -> "Lights"  (Relay 0+1: Light A & B)
#define SINRIC_FAN_ID       "69514c529a866ec12b3fbb6c" // Switch    -> "Fan"     (Relay 2: PCF8574 P2)
#define SINRIC_PLUG_ID      "6aa6095196dc1ddeb0568b58" // Switch    -> "Plug"    (Relay 3: GPIO12)

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

// Relay 4 direct GPIO (active-low)
#define PIN_RELAY4_GPIO     12  // D6 (GPIO12) - Relay 4: Main Plug (active-low)

// Doorway HC-SR04 Ultrasonic Sensors
// Note: GPIO1 (TX) and GPIO3 (RX) are utilized; Hardware Serial is DISABLED!
#define PIN_US_A_TRIG       13  // D7 (GPIO13) - Sensor A (Outer trigger)
#define PIN_US_A_ECHO       3   // RX (GPIO3)  - Sensor A (Outer echo, level-shifted to 3.3V)
#define PIN_US_B_TRIG       1   // TX (GPIO1)  - Sensor B (Inner trigger)
#define PIN_US_B_ECHO       16  // D0 (GPIO16) - Sensor B (Inner echo, level-shifted to 3.3V)

// PCF8574 I/O Expander Port Mapping
// P0 - P2: Relay outputs (active-low: 0=ON, 1=OFF)
// P4 - P7: Momentary Wall Switch inputs (active-low pull-up: 0=pressed, 1=released)
#define PCF_RELAY1_BIT      0   // P0: Relay 1 -> Light A
#define PCF_RELAY2_BIT      1   // P1: Relay 2 -> Light B
#define PCF_RELAY3_BIT      2   // P2: Relay 3 -> Fan
#define PCF_SWITCH1_BIT     4   // P4: Switch 1 -> toggles Relay 1 (Light A)
#define PCF_SWITCH2_BIT     5   // P5: Switch 2 -> toggles Relay 2 (Light B)
#define PCF_SWITCH3_BIT     6   // P6: Switch 3 -> toggles Relay 3 (Fan)
#define PCF_SWITCH4_BIT     7   // P7: Switch 4 -> toggles Relay 4 (Plug)

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

// Relay Index Reference (used throughout firmware):
// Index 0: Light A   (PCF8574 P0, active-low)
// Index 1: Light B   (PCF8574 P1, active-low)
// Index 2: Fan       (PCF8574 P2, active-low)
// Index 3: Main Plug (GPIO12, active-low)

#endif // CONFIG_H
