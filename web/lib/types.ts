export type RelayCategory = 'light' | 'fan' | 'plug' | 'ac' | 'other';

export interface DeviceConfig {
  light_threshold: number;      // % ambient (e.g. 35)
  temp_threshold: number;       // °C (e.g. 28)
  auto_lights: boolean;
  auto_plug: boolean;
  light_off_delay_sec: number;  // 180s (3 mins)
  temp_hysteresis: number;      // 2.0 °C
}

export interface DeviceCalibration {
  dark_baseline: number;
  daylight_baseline: number;
  light_a_contrib: number;
  light_b_contrib: number;
  both_contrib: number;
  accel_rest: number;
  knock_threshold: number;
  floor_dist_a: number;
  floor_dist_b: number;
  height_offset: number;
  direction_flipped: boolean;
}

export interface DeviceState {
  occupancy: number;
  temperature: number;
  humidity: number;
  ambient_light: number;
  raw_ldr?: number;
  intensity: number;
  relays: boolean[];
  manual_override: boolean;
  override_remaining_sec: number;
  free_heap?: number;
}

export interface Device {
  id: string;
  owner_id: string;
  name: string;
  token_hash: string;
  config: DeviceConfig;
  calibration: DeviceCalibration;
  last_state: DeviceState;
  last_seen: string;
  created_at: string;
}

export interface Relay {
  id: string;
  device_id: string;
  relay_index: number;
  label: string;
  category: RelayCategory;
  state: boolean;
  updated_at: string;
}

export interface DeviceEvent {
  id: number;
  device_id: string;
  type_code: 1 | 2 | 3 | 4 | 5; // 1: Entry, 2: Exit, 3: Knock, 4: Wall switch, 5: Relay change
  value: number | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface SensorBlob {
  id: number;
  device_id: string;
  hour_start: string;
  frame_count: number;
  data: string; // base64 or bytea
  created_at: string;
}
