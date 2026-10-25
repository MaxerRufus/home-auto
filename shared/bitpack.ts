/**
 * Shared TypeScript bit-packing and unpacking utilities
 * for Smart Home Hub 48-bit sensor frames.
 */

export interface SensorFrame {
  minuteOffset: number; // 0 to 59
  temperature: number;  // 0 - 63 °C
  humidity: number;     // 0 - 127 %
  ldr: number;          // 0 - 1023 (raw 10-bit ADC)
  vibration: number;    // 0 - 255 peak
  relays: {
    relay1: boolean;    // Light A
    relay2: boolean;    // Light B
    relay3: boolean;    // Plug
    relay4: boolean;    // Single light
  };
  switches: {
    sw1: boolean;
    sw2: boolean;
    sw3: boolean;
    sw4: boolean;
  };
  occupancy: number;    // 0 - 63 count
  flags: {
    manualOverride: boolean;
    autoLights: boolean;
    autoPlug: boolean;
  };
}

export const FRAME_SIZE_BYTES = 6;
export const FRAMES_PER_HOUR = 60;
export const HOURLY_BLOB_SIZE_BYTES = FRAME_SIZE_BYTES * FRAMES_PER_HOUR; // 360 bytes

/**
 * Decodes a 6-byte frame into a SensorFrame object
 */
export function decodeFrame(bytes: Uint8Array | number[], minuteOffset = 0): SensorFrame {
  if (bytes.length < 6) {
    throw new Error(`Invalid frame buffer size. Expected 6 bytes, got ${bytes.length}`);
  }

  // Combine 6 bytes into a 48-bit BigInt for safe bitwise shift
  let word = 0n;
  for (let i = 0; i < 6; i++) {
    word = (word << 8n) | BigInt(bytes[i]);
  }

  const temperature = Number((word >> 42n) & 0x3fn);
  const humidity = Number((word >> 35n) & 0x7fn);
  const ldr = Number((word >> 25n) & 0x3ffn);
  const vibration = Number((word >> 17n) & 0xffn);
  const relaysRaw = Number((word >> 13n) & 0x0fn);
  const switchesRaw = Number((word >> 9n) & 0x0fn);
  const occupancy = Number((word >> 3n) & 0x3fn);
  const flagsRaw = Number(word & 0x07n);

  return {
    minuteOffset,
    temperature,
    humidity,
    ldr,
    vibration,
    relays: {
      relay1: (relaysRaw & 0x01) !== 0,
      relay2: (relaysRaw & 0x02) !== 0,
      relay3: (relaysRaw & 0x04) !== 0,
      relay4: (relaysRaw & 0x08) !== 0,
    },
    switches: {
      sw1: (switchesRaw & 0x01) !== 0,
      sw2: (switchesRaw & 0x02) !== 0,
      sw3: (switchesRaw & 0x04) !== 0,
      sw4: (switchesRaw & 0x08) !== 0,
    },
    occupancy,
    flags: {
      manualOverride: (flagsRaw & 0x01) !== 0,
      autoLights: (flagsRaw & 0x02) !== 0,
      autoPlug: (flagsRaw & 0x04) !== 0,
    },
  };
}

/**
 * Encodes a SensorFrame into a 6-byte Uint8Array
 */
export function encodeFrame(frame: SensorFrame): Uint8Array {
  const temp = BigInt(Math.max(0, Math.min(63, Math.round(frame.temperature)))) & 0x3fn;
  const hum = BigInt(Math.max(0, Math.min(127, Math.round(frame.humidity)))) & 0x7fn;
  const ldr = BigInt(Math.max(0, Math.min(1023, Math.round(frame.ldr)))) & 0x3ffn;
  const vib = BigInt(Math.max(0, Math.min(255, Math.round(frame.vibration)))) & 0xffn;

  let rel = 0;
  if (frame.relays.relay1) rel |= 0x01;
  if (frame.relays.relay2) rel |= 0x02;
  if (frame.relays.relay3) rel |= 0x04;
  if (frame.relays.relay4) rel |= 0x08;

  let sw = 0;
  if (frame.switches.sw1) sw |= 0x01;
  if (frame.switches.sw2) sw |= 0x02;
  if (frame.switches.sw3) sw |= 0x04;
  if (frame.switches.sw4) sw |= 0x08;

  const occ = BigInt(Math.max(0, Math.min(63, frame.occupancy))) & 0x3fn;

  let flg = 0;
  if (frame.flags.manualOverride) flg |= 0x01;
  if (frame.flags.autoLights) flg |= 0x02;
  if (frame.flags.autoPlug) flg |= 0x04;

  const word =
    (temp << 42n) |
    (hum << 35n) |
    (ldr << 25n) |
    (vib << 17n) |
    (BigInt(rel & 0x0f) << 13n) |
    (BigInt(sw & 0x0f) << 9n) |
    (occ << 3n) |
    BigInt(flg & 0x07);

  const out = new Uint8Array(6);
  out[0] = Number((word >> 40n) & 0xffn);
  out[1] = Number((word >> 32n) & 0xffn);
  out[2] = Number((word >> 24n) & 0xffn);
  out[3] = Number((word >> 16n) & 0xffn);
  out[4] = Number((word >> 8n) & 0xffn);
  out[5] = Number(word & 0xffn);

  return out;
}

/**
 * Decodes a 360-byte hourly blob into an array of up to 60 SensorFrame objects
 */
export function decodeHourlyBlob(blob: Uint8Array): SensorFrame[] {
  const frames: SensorFrame[] = [];
  const totalFrames = Math.min(FRAMES_PER_HOUR, Math.floor(blob.length / FRAME_SIZE_BYTES));

  for (let i = 0; i < totalFrames; i++) {
    const chunk = blob.subarray(i * FRAME_SIZE_BYTES, (i + 1) * FRAME_SIZE_BYTES);
    frames.push(decodeFrame(chunk, i));
  }

  return frames;
}

/**
 * Computes hourly summary metrics (average temp, hum, ldr, max vibration, avg occupancy)
 */
export function computeHourlyAverages(frames: SensorFrame[]) {
  if (frames.length === 0) {
    return {
      avgTemperature: 0,
      avgHumidity: 0,
      avgLdr: 0,
      peakVibration: 0,
      avgOccupancy: 0,
      sampleCount: 0,
    };
  }

  let totalTemp = 0;
  let totalHum = 0;
  let totalLdr = 0;
  let maxVib = 0;
  let totalOcc = 0;

  for (const f of frames) {
    totalTemp += f.temperature;
    totalHum += f.humidity;
    totalLdr += f.ldr;
    if (f.vibration > maxVib) maxVib = f.vibration;
    totalOcc += f.occupancy;
  }

  const n = frames.length;
  return {
    avgTemperature: Math.round((totalTemp / n) * 10) / 10,
    avgHumidity: Math.round((totalHum / n) * 10) / 10,
    avgLdr: Math.round(totalLdr / n),
    peakVibration: maxVib,
    avgOccupancy: Math.round((totalOcc / n) * 10) / 10,
    sampleCount: n,
  };
}
