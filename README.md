# Smart Home Hub

> Small, reliable, low-cost home automation system powered by an **ESP8266 NodeMCU**, **Next.js on Vercel**, **Supabase PostgreSQL & Realtime**, and **Sinric Pro** voice control.

---

## Deliverables Summary

| Component | Path | Description |
| :--- | :--- | :--- |
| **Supabase Schema & RLS** | [`supabase/schema.sql`](file:///c:/Users/rufus/Downloads/Home%20Auto/supabase/schema.sql) | PostgreSQL schema, Row-Level Security policies, auto-relay triggers, and Realtime publications. |
| **Shared Bitpack Definition** | [`shared/bitpack.h`](file:///c:/Users/rufus/Downloads/Home%20Auto/shared/bitpack.h)<br>[`shared/bitpack.ts`](file:///c:/Users/rufus/Downloads/Home%20Auto/shared/bitpack.ts) | 48-bit sensor frame bit-packing (6 bytes/minute, 360 bytes/hour) shared by firmware and web app. |
| **ESP8266 Firmware** | [`firmware/`](file:///c:/Users/rufus/Downloads/Home%20Auto/firmware/) | Modular C++ firmware for relays, PCF8574 switches, DHT11, LDR, MPU6050, doorway tracking, and Sinric Pro. |
| **Next.js Web App** | [`web/`](file:///c:/Users/rufus/Downloads/Home%20Auto/web/) | Modern web app (Google Auth, Device command center, live tiles, intensity slider, calibration, charts). |
| **Vercel API Routes** | [`web/app/api/device/`](file:///c:/Users/rufus/Downloads/Home%20Auto/web/app/api/device/) | Device session authentication, 360-byte hourly blob ingest, event logging, and token generation. |
| **Setup & Wiring Guide** | [`SETUP_GUIDE.md`](file:///c:/Users/rufus/Downloads/Home%20Auto/SETUP_GUIDE.md) | Wiring schematics, level-shifters, library installation, calibration walkthrough, and testing checklist. |

---

## Key Technical Specifications

### 1. Hardware Pinout
- **ESP8266 NodeMCU**: I2C on D1 (SCL) & D2 (SDA), Onboard LED on D4 (active-low), DHT11 on D5, LDR on A0.
- **Relay 4 (Single Light)**: D6 (GPIO12, active-low).
- **Doorway Ultrasonics**: Sensor A (Trig D7, Echo RX), Sensor B (Trig TX, Echo D0). *Note: Hardware Serial is disabled to dedicate TX/RX pins to the sensors.*
- **PCF8574 Expander (0x27)**: Relays 1–3 (P0–P2, active-low), Wall Switches 1–4 (P4–P7, momentary, falling-edge debounced).

### 2. Dual-Light Intensity Mode
- **0%**: Both lights OFF
- **1–40%**: Light A only
- **41–70%**: Light B only
- **71–100%**: Both lights ON

### 3. Supabase Free Tier Storage
- **48-Bit Hourly Sensor Blob**: Temperature (6b), Humidity (7b), LDR (10b), Vibration (8b), Relays (4b), Switches (4b), Occupancy (6b), Flags (3b) = 6 bytes/min.
- **60 frames/hour** = 360 bytes stored as `bytea` in table `sensor_blobs`.
- Unsent blobs queued in RAM (up to 4 hours) during network interruptions.

### 4. Local Autonomous Operation
- Operates locally without active internet.
- **Auto Lights**: Turns on when occupied and ambient light is below threshold; turns off after 3 minutes without occupancy or on daylight hysteresis.
- **Auto Plug**: Turns on when occupied and temperature meets threshold; turns off when empty or temperature drops 2.0 °C below threshold.
- **30-Minute Manual Override**: Any physical switch press, browser click, or voice command pauses automations for 30 minutes.

---

## Quick Start (Running Locally)

```bash
# 1. Install and run Next.js web application
cd web
npm install
npm run dev
# Web app is accessible at http://localhost:3000

# 2. Flash ESP8266 Firmware
# Open firmware/SmartHomeHub.ino in Arduino IDE
# Configure firmware/config.h with Wi-Fi, Backend URL, and Token
# Upload to NodeMCU 1.0 (ESP-12E)
```

Refer to [`SETUP_GUIDE.md`](file:///c:/Users/rufus/Downloads/Home%20Auto/SETUP_GUIDE.md) for full configuration instructions.
