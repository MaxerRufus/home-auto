#ifndef BITPACK_H
#define BITPACK_H

#include <stdint.h>
#include <string.h>

#ifdef __cplusplus
extern "C" {
#endif

// 48-bit sensor frame structure (6 bytes per minute)
typedef struct {
    uint8_t temperature; // 6 bits: 0 - 63 °C
    uint8_t humidity;    // 7 bits: 0 - 127 %
    uint16_t ldr;        // 10 bits: 0 - 1023
    uint8_t vibration;   // 8 bits: 0 - 255 peak
    uint8_t relays;      // 4 bits: bit 0=R1, bit 1=R2, bit 2=R3, bit 3=R4
    uint8_t switches;    // 4 bits: bit 0=S1, bit 1=S2, bit 2=S3, bit 3=S4
    uint8_t occupancy;   // 6 bits: 0 - 63 count
    uint8_t flags;       // 3 bits: bit 0=override, bit 1=auto_lights, bit 2=auto_plug
} SensorFrame;

#define FRAME_SIZE_BYTES 6
#define FRAMES_PER_HOUR 60
#define HOURLY_BLOB_SIZE_BYTES (FRAME_SIZE_BYTES * FRAMES_PER_HOUR) // 360 bytes

/**
 * Packs a SensorFrame into a 6-byte buffer (network byte order / big-endian).
 */
static inline void pack_sensor_frame(const SensorFrame* frame, uint8_t* out) {
    uint64_t temp = (uint64_t)(frame->temperature & 0x3F);
    uint64_t hum  = (uint64_t)(frame->humidity & 0x7F);
    uint64_t ldr  = (uint64_t)(frame->ldr & 0x3FF);
    uint64_t vib  = (uint64_t)(frame->vibration & 0xFF);
    uint64_t rel  = (uint64_t)(frame->relays & 0x0F);
    uint64_t sw   = (uint64_t)(frame->switches & 0x0F);
    uint64_t occ  = (uint64_t)(frame->occupancy & 0x3F);
    uint64_t flg  = (uint64_t)(frame->flags & 0x07);

    uint64_t word = (temp << 42) |
                    (hum  << 35) |
                    (ldr  << 25) |
                    (vib  << 17) |
                    (rel  << 13) |
                    (sw   << 9)  |
                    (occ  << 3)  |
                    flg;

    out[0] = (uint8_t)((word >> 40) & 0xFF);
    out[1] = (uint8_t)((word >> 32) & 0xFF);
    out[2] = (uint8_t)((word >> 24) & 0xFF);
    out[3] = (uint8_t)((word >> 16) & 0xFF);
    out[4] = (uint8_t)((word >> 8)  & 0xFF);
    out[5] = (uint8_t)(word & 0xFF);
}

/**
 * Unpacks a 6-byte buffer into a SensorFrame.
 */
static inline void unpack_sensor_frame(const uint8_t* in, SensorFrame* frame) {
    uint64_t word = ((uint64_t)in[0] << 40) |
                    ((uint64_t)in[1] << 32) |
                    ((uint64_t)in[2] << 24) |
                    ((uint64_t)in[3] << 16) |
                    ((uint64_t)in[4] << 8)  |
                    ((uint64_t)in[5]);

    frame->temperature = (uint8_t)((word >> 42) & 0x3F);
    frame->humidity    = (uint8_t)((word >> 35) & 0x7F);
    frame->ldr         = (uint16_t)((word >> 25) & 0x3FF);
    frame->vibration   = (uint8_t)((word >> 17) & 0xFF);
    frame->relays      = (uint8_t)((word >> 13) & 0x0F);
    frame->switches    = (uint8_t)((word >> 9)  & 0x0F);
    frame->occupancy   = (uint8_t)((word >> 3)  & 0x3F);
    frame->flags       = (uint8_t)(word & 0x07);
}

#ifdef __cplusplus
}
#endif

#endif // BITPACK_H
