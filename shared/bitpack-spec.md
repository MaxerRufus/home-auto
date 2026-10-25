# Smart Home Hub: 48-Bit Hourly Sensor Blob Layout Specification

This specification defines the exact binary bit-packing format used by the ESP8266 firmware and the Next.js web application to store and transmit sensor data within the Supabase Free Tier constraints.

## Constraints & Objectives
- **Storage Target**: Minimal row and byte consumption on PostgreSQL/Supabase.
- **Cadence**: 1 frame sampled and recorded every minute.
- **Hourly Block**: 60 frames per hour = $60 \times 6 \text{ bytes} = 360 \text{ bytes}$ per hour.
- Stored in Supabase table `sensor_blobs` in a single `bytea` column alongside `hour_start` and `device_id`.

---

## 48-Bit (6-Byte) Frame Bit Allocation

Each 1-minute frame is exactly 48 bits (6 bytes, big-endian / network byte order):

| Field | Bit Length | Range | Resolution / Description |
| :--- | :---: | :---: | :--- |
| **`temperature`** | 6 bits | 0 – 63 | Temperature in °C ($0^\circ\text{C}$ to $63^\circ\text{C}$, DHT11 typical range $0-50^\circ\text{C}$). |
| **`humidity`** | 7 bits | 0 – 127 | Relative humidity % ($0-100\%$, DHT11 range $20-90\%$). |
| **`ldr`** | 10 bits | 0 – 1023 | Raw 10-bit ADC reading from ESP8266 A0 pin ($0-1023$). |
| **`vibration`** | 8 bits | 0 – 255 | Peak acceleration magnitude spike above baseline recorded in the minute. |
| **`relays`** | 4 bits | 0 – 15 | Bitmask of the 4 relay states: <br>• Bit 0: Relay 1 (Light A)<br>• Bit 1: Relay 2 (Light B)<br>• Bit 2: Relay 3 (Plug)<br>• Bit 3: Relay 4 (Single Light) |
| **`switches`** | 4 bits | 0 – 15 | Bitmask of the 4 wall switch states (1 = pressed/closed, 0 = released). |
| **`occupancy`** | 6 bits | 0 – 63 | Estimated room occupancy count (clamped to 63 max). |
| **`flags`** | 3 bits | 0 – 7 | Automation status flags: <br>• Bit 0: Manual override active (30 min pause)<br>• Bit 1: Auto lights rule currently active<br>• Bit 2: Auto plug rule currently active |
| **Total** | **48 bits** | — | **Exactly 6.0 Bytes** |

---

## Bit Packing Map

```text
Byte 0:  [ T5  T4  T3  T2  T1  T0  H6  H5 ]  -> Temp (6 bits), Hum[6..5] (2 bits)
Byte 1:  [ H4  H3  H2  H1  H0  L9  L8  L7 ]  -> Hum[4..0] (5 bits), LDR[9..7] (3 bits)
Byte 2:  [ L6  L5  L4  L3  L2  L1  L0  V7 ]  -> LDR[6..0] (7 bits), Vib[7] (1 bit)
Byte 3:  [ V6  V5  V4  V3  V2  V1  V0  R3 ]  -> Vib[6..0] (7 bits), Relay[3] (1 bit)
Byte 4:  [ R2  R1  R0  S3  S2  S1  S0  O5 ]  -> Relay[2..0] (3 bits), Switch[3..0] (4 bits), Occ[5] (1 bit)
Byte 5:  [ O4  O3  O2  O1  O0  F2  F1  F0 ]  -> Occ[4..0] (5 bits), Flags[2..0] (3 bits)
```

---

## Decoding Mathematical Formulae

Given 6 bytes $B_0, B_1, B_2, B_3, B_4, B_5$:

1. $W = (B_0 \ll 40) \mid (B_1 \ll 32) \mid (B_2 \ll 24) \mid (B_3 \ll 16) \mid (B_4 \ll 8) \mid B_5$
2. $\text{temperature} = (W \gg 42) \ \& \ \text{0x3F}$
3. $\text{humidity} = (W \gg 35) \ \& \ \text{0x7F}$
4. $\text{ldr} = (W \gg 25) \ \& \ \text{0x3FF}$
5. $\text{vibration} = (W \gg 17) \ \& \ \text{0xFF}$
6. $\text{relays} = (W \gg 13) \ \& \ \text{0x0F}$
7. $\text{switches} = (W \gg 9) \ \& \ \text{0x0F}$
8. $\text{occupancy} = (W \gg 3) \ \& \ \text{0x3F}$
9. $\text{flags} = W \ \& \ \text{0x07}$
