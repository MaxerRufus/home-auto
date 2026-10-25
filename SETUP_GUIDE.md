# Smart Home Hub: Comprehensive Setup & Operating Guide

A complete guide for assembling, configuring, deploying, and operating the ESP8266 and Next.js/Supabase Home Automation System.

---

## Architecture Overview

```text
               +-----------------------------+
               |   Sinric Pro Voice Server   |
               | (Alexa / Google Assistant)  |
               +--------------+--------------+
                              | TLS
                              v
+------------------+     +----+------------------------+     +-------------------+
| Wall Switches    |---->|                             |---->| 4-Channel Relays  |
| PCF8574 (0x27)   |     |    ESP8266 NodeMCU          |     | (Active-Low)      |
+------------------+     |    (Local Automations)      +-----+-------------------+
| DHT11 + LDR +    |---->|                             |
| MPU6050 + HC-SR04|     +----+--------------------+---+
+------------------+          |                    |
                              | Realtime WS        | HTTP Ingest (360B/hr)
                              v                    v
                 +------------+--------------------+-----------+
                 |             Next.js on Vercel               |
                 |      + Supabase PostgreSQL & Realtime       |
                 +---------------------+-----------------------+
                                       | WebSocket / HTTPS
                                       v
                         +-------------+-------------+
                         |   Next.js Web Application |
                         |   (Desktop & Mobile UI)   |
                         +---------------------------+
```

---

## 1. Supabase Database & Auth Setup

### Step 1.1: Create Project
1. Log in to [Supabase](https://supabase.com) and create a new project.
2. Under **Project Settings -> API**, copy:
   - `Project URL`
   - `anon public` key
   - `service_role` secret key

### Step 1.2: Run Database Migrations
1. Navigate to the **SQL Editor** in Supabase.
2. Open [supabase/schema.sql](file:///c:/Users/rufus/Downloads/Home%20Auto/supabase/schema.sql) and paste the complete content.
3. Click **Run**.
4. *(Optional for testing)*: Run [supabase/seed.sql](file:///c:/Users/rufus/Downloads/Home%20Auto/supabase/seed.sql) to populate sample test events and telemetry.

### Step 1.3: Enable Realtime
Ensure replication is active for tables:
- `devices`
- `relays`
- `events`

In Supabase Dashboard: **Database -> Replication** -> verify that `supabase_realtime` publication includes these tables.

### Step 1.4: Configure Google OAuth (Optional / Recommended)
1. In [Google Cloud Console](https://console.cloud.google.com), create OAuth 2.0 Credentials:
   - Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
2. In Supabase: **Authentication -> Providers -> Google**:
   - Enable Google provider and paste your **Client ID** and **Client Secret**.

---

## 2. Vercel Deployment & Environment Variables

Deploy the `web/` application to Vercel:

```bash
cd web
npm install
vercel
```

Configure the following **Environment Variables** in Vercel project settings:

| Variable | Description |
| :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL (`https://xyz.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend service-role key (used exclusively in API routes) |

---

## 3. Sinric Pro Voice Assistant Setup (Free Tier: 3 Devices)

Sinric Pro free tier allows up to 3 devices. Configure them in [Sinric Pro Portal](https://portal.sinric.pro):

1. **Device 1: Dimmable Light**
   - Name: `Living Room Intensity`
   - Device Type: **Dimmable Light**
   - Controls: The dual-light intensity group (0%: Off, 1-40%: Light A, 41-70%: Light B, 71-100%: Both).
2. **Device 2: Single Light**
   - Name: `Single Light`
   - Device Type: **Light**
   - Controls: Relay 4 on GPIO12.
3. **Device 3: Smart Plug**
   - Name: `Room Fan / Plug`
   - Device Type: **Switch / Smart Plug**
   - Controls: Relay 3 on PCF8574 P2.

Copy your **App Key**, **App Secret**, and each **Device ID** into `firmware/config.h`.

---

## 4. Hardware Wiring & Safety Instructions

> [!CAUTION]
> **Mains Voltage Safety Warning**: High-voltage AC wiring (110V–240V) carries lethal hazard.
> All mains connections must be fully enclosed in a sealed, fire-retardant junction box with proper strain relief.
> Use opto-isolated relay modules rated at 10A / 250VAC minimum.
> Fixed mains wiring should only be performed or inspected by a licensed electrician.

### NodeMCU (ESP-12E) Pin Connections

| NodeMCU Pin | GPIO | Connected To | Notes / Level Shifting |
| :--- | :---: | :--- | :--- |
| **A0** | ADC0 | LDR Voltage Divider | 1 kΩ pull-down resistor to GND |
| **D1** | GPIO5 | I2C SCL | Shared: PCF8574 (0x27) & MPU6050 (0x68) |
| **D2** | GPIO4 | I2C SDA | Shared: PCF8574 (0x27) & MPU6050 (0x68) |
| **D4** | GPIO2 | Onboard LED | Wi-Fi status indicator (Active-low) |
| **D5** | GPIO14 | DHT11 Data | 4.7 kΩ pull-up to 3.3V |
| **D6** | GPIO12 | Relay 4 (Single Light) | Active-low logic |
| **D7** | GPIO13 | HC-SR04 A Trigger (Outer) | Direct 3.3V trigger pulse |
| **RX** | GPIO3 | HC-SR04 A Echo (Outer) | **Level shift 5V to 3.3V** (1kΩ / 2kΩ divider) |
| **TX** | GPIO1 | HC-SR04 B Trigger (Inner) | Direct 3.3V trigger pulse (**Serial disabled**) |
| **D0** | GPIO16 | HC-SR04 B Echo (Inner) | **Level shift 5V to 3.3V** (1kΩ / 2kΩ divider) |

### HW-61 (PCF8574 at 0x27) Port Mapping

| Port | Function | Logic |
| :--- | :--- | :--- |
| **P0** | Relay 1: Light A | Active-Low Output |
| **P1** | Relay 2: Light B | Active-Low Output |
| **P2** | Relay 3: Plug (Fan / AC) | Active-Low Output |
| **P3** | Reserved | — |
| **P4** | Wall Switch 1 | Momentary input, internal pull-up, falling-edge toggle |
| **P5** | Wall Switch 2 | Momentary input, internal pull-up, falling-edge toggle |
| **P6** | Wall Switch 3 | Momentary input, internal pull-up, falling-edge toggle |
| **P7** | Wall Switch 4 | Momentary input, internal pull-up, falling-edge toggle |

### HC-SR04 Echo Level Shifter Diagram
Each ultrasonic sensor outputs a 5V echo pulse. ESP8266 GPIOs are 3.3V. Use two resistors per echo pin:
```text
HC-SR04 Echo Pin (5V) --- [ 1 kΩ ] ---+--- ESP8266 Input Pin (3.3V)
                                       |
                                    [ 2 kΩ ]
                                       |
                                      GND
```

---

## 5. Arduino IDE & Firmware Flashing

### Step 5.1: Install ESP8266 Board Core
In Arduino IDE -> **Settings** -> **Additional Board Manager URLs**:
```text
https://arduino.esp8266.com/stable/package_esp8266com_index.json
```
Install **esp8266** by ESP8266 Community (Select **NodeMCU 1.0 (ESP-12E Module)**).

### Step 5.2: Install Required Libraries via Library Manager
1. `SinricPro` (by Boris Becker)
2. `ArduinoJson` (v6 or v7 by Benoît Blanchon)
3. `WebSockets` (by Markus Sattler)
4. `DHT sensor library` (by Adafruit)
5. `Adafruit MPU6050` & `Adafruit Unified Sensor`
6. `PCF8574` (or standard Wire)

### Step 5.3: Update `firmware/config.h`
1. Open [firmware/config.h](file:///c:/Users/rufus/Downloads/Home%20Auto/firmware/config.h).
2. Enter your Wi-Fi credentials (`WIFI_SSID`, `WIFI_PASS`).
3. Enter your Vercel URL (`BACKEND_BASE_URL`).
4. In the Web App, click **Add New Device** -> copy the generated `DEVICE_ID` and one-time `DEVICE_SECRET_TOKEN`.
5. Enter Sinric Pro App Key, Secret, and Device IDs.

### Step 5.4: Compile & Upload
1. Connect NodeMCU via USB.
2. Select Flash Size: **4MB (FS:2MB OTA:~1019KB)**.
3. Click **Upload**.
4. Notice: Do not attempt to open Serial Monitor — GPIO1 and GPIO3 are in use by ultrasonic sensors. Status is communicated via the onboard LED on D4 (Blinking = Connecting, Solid ON = Connected).

---

## 6. Guided Calibration & Operational Verification

Once the hub is installed in the room, open the web app device page:

1. **Step 1: Dark Baseline (15s)**: Close curtains and turn off lights.
2. **Step 2: Daylight Baseline (15s)**: Open curtains during daylight with artificial lights off.
3. **Step 3: Light Contributions (10s each)**: Automatically measures lux contribution of Light A, Light B, and both.
4. **Step 4: Vibration & Knocks**: Device sits still for 3s to capture rest vector, then you give 2 deliberate knocks to set threshold.
5. **Step 5: Doorway Floor Distance (3s)**: Measures empty doorway floor distance for sensors A and B.
6. **Step 6: Walk-Through Direction**: Walk in and out 3 times. If direction is inverted, click **Invert Direction**.
7. **Step 7: Height Calibration**: Stand under doorway sensor, input your known height in cm (e.g., 175cm), and save the offset.

---

## 7. Operational Validation Checklist

- [x] **Local Fallback**: Disconnect Wi-Fi router. Verify that momentary wall switches and local automation rules continue toggling relays instantaneously.
- [x] **Manual Override**: Press any physical wall switch. Verify that local automations pause for 30 minutes.
- [x] **Realtime Latency**: Click relay toggle in browser. Verify physical relay clicks within 100–200 ms.
- [x] **Hourly Ingest**: Unpacked 360-byte blobs populate hourly history charts.
