-- ==============================================================================
-- SMART HOME HUB: SUPABASE DATABASE SCHEMA & RLS POLICIES
-- Target: Supabase (PostgreSQL 15+)
-- Features: Devices, Relays, Events, Packed Sensor Blobs, Realtime & RLS
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean drop of existing tables in case of previous conflicting definitions
DROP TRIGGER IF EXISTS tr_new_device ON public.devices;
DROP FUNCTION IF EXISTS public.handle_new_device();

DROP TABLE IF EXISTS public.sensor_blobs CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.relays CASCADE;
DROP TABLE IF EXISTS public.devices CASCADE;

-- 2. DEVICES TABLE
-- Stores registered hub devices, owners, authentication hashes, configs, and calibrations.
CREATE TABLE public.devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    token_hash TEXT NOT NULL, -- SHA-256 hex hash of the one-time device token
    config JSONB NOT NULL DEFAULT '{
        "light_threshold": 35,
        "temp_threshold": 28,
        "auto_lights": true,
        "auto_plug": true,
        "light_off_delay_sec": 180,
        "temp_hysteresis": 2.0
    }'::jsonb,
    calibration JSONB NOT NULL DEFAULT '{
        "dark_baseline": 50,
        "daylight_baseline": 850,
        "light_a_contrib": 120,
        "light_b_contrib": 150,
        "both_contrib": 280,
        "accel_rest": 16384,
        "knock_threshold": 4000,
        "floor_dist_a": 220.0,
        "floor_dist_b": 220.0,
        "height_offset": 0.0,
        "direction_flipped": false
    }'::jsonb,
    last_state JSONB DEFAULT '{
        "occupancy": 0,
        "temperature": 25.0,
        "humidity": 50.0,
        "ambient_light": 45,
        "intensity": 0,
        "relays": [false, false, false, false],
        "manual_override": false,
        "override_remaining_sec": 0
    }'::jsonb,
    last_seen TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for device token authentication and owner lookups
CREATE INDEX idx_devices_owner_id ON public.devices(owner_id);
CREATE INDEX idx_devices_token_hash ON public.devices(token_hash);

-- 3. RELAYS TABLE
-- Represents the 4 controllable channels per device.
CREATE TABLE public.relays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
    relay_index SMALLINT NOT NULL CHECK (relay_index BETWEEN 0 AND 3),
    label TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('light', 'fan', 'plug', 'ac', 'other')),
    state BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_device_relay UNIQUE (device_id, relay_index)
);

CREATE INDEX idx_relays_device_id ON public.relays(device_id);

-- 4. EVENTS TABLE
-- High-value discrete events (doorway entry/exit with height, knocks, switch presses, relay toggles)
CREATE TABLE public.events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
    type_code SMALLINT NOT NULL CHECK (type_code IN (1, 2, 3, 4, 5)),
    -- 1: Entry, 2: Exit, 3: Knock, 4: Wall switch, 5: Relay change
    value NUMERIC(6, 2) NULL, -- Height in cm for 1 & 2; Relay index for 4 & 5; Peak accel for 3
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_events_device_created ON public.events(device_id, created_at DESC);

-- 5. HOURLY SENSOR BLOBS TABLE
-- Stores 60 minutes of sensor frames in 360 bytes (bytea).
CREATE TABLE public.sensor_blobs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
    hour_start TIMESTAMPTZ NOT NULL,
    frame_count SMALLINT NOT NULL DEFAULT 60,
    data BYTEA NOT NULL, -- 360 bytes (6 bytes per minute)
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_device_hour UNIQUE (device_id, hour_start)
);

CREATE INDEX idx_sensor_blobs_device_hour ON public.sensor_blobs(device_id, hour_start DESC);

-- 6. AUTOMATIC DEFAULT RELAYS SEED TRIGGER
-- When a user registers a new device, initialize the 4 relay records automatically.
CREATE OR REPLACE FUNCTION public.handle_new_device()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.relays (device_id, relay_index, label, category, state)
    VALUES
        (NEW.id, 0, 'Light A', 'light', false),
        (NEW.id, 1, 'Light B', 'light', false),
        (NEW.id, 2, 'Main Plug', 'plug', false),
        (NEW.id, 3, 'Single Light', 'light', false);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_new_device
AFTER INSERT ON public.devices
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_device();

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_blobs ENABLE ROW LEVEL SECURITY;

-- Devices: User can view and manage only devices they own
CREATE POLICY "Users can select own devices"
ON public.devices FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own devices"
ON public.devices FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own devices"
ON public.devices FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete own devices"
ON public.devices FOR DELETE
TO authenticated
USING (auth.uid() = owner_id);

-- Relays: User can view and update relays of devices they own
CREATE POLICY "Users can select relays of own devices"
ON public.relays FOR SELECT
TO authenticated
USING (
    device_id IN (SELECT id FROM public.devices WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can update relays of own devices"
ON public.relays FOR UPDATE
TO authenticated
USING (
    device_id IN (SELECT id FROM public.devices WHERE owner_id = auth.uid())
)
WITH CHECK (
    device_id IN (SELECT id FROM public.devices WHERE owner_id = auth.uid())
);

-- Events: User can view events of own devices
CREATE POLICY "Users can select events of own devices"
ON public.events FOR SELECT
TO authenticated
USING (
    device_id IN (SELECT id FROM public.devices WHERE owner_id = auth.uid())
);

-- Sensor Blobs: User can view blobs of own devices
CREATE POLICY "Users can select sensor blobs of own devices"
ON public.sensor_blobs FOR SELECT
TO authenticated
USING (
    device_id IN (SELECT id FROM public.devices WHERE owner_id = auth.uid())
);

-- 8. REALTIME REPLICATION CONFIGURATION
-- Ensure the tables are published to Supabase Realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'devices'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.devices;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'relays'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.relays;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'events'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
    END IF;
END $$;
