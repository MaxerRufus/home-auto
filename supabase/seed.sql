-- ==============================================================================
-- SMART HOME HUB: SUPABASE SEED DATA (OPTIONAL FOR TESTING)
-- ==============================================================================

-- Sample mock device registration (replace owner_id with your auth.users uuid)
-- SHA-256 for test token 'dev_token_secret_123456789' is:
-- 5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8

DO $$
DECLARE
    demo_user_id UUID;
    demo_device_id UUID;
BEGIN
    SELECT id INTO demo_user_id FROM auth.users LIMIT 1;
    
    IF demo_user_id IS NOT NULL THEN
        INSERT INTO public.devices (
            owner_id,
            name,
            token_hash,
            config,
            calibration,
            last_state,
            last_seen
        ) VALUES (
            demo_user_id,
            'Living Room Hub',
            '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
            '{
                "light_threshold": 35,
                "temp_threshold": 26,
                "auto_lights": true,
                "auto_plug": true,
                "light_off_delay_sec": 180,
                "temp_hysteresis": 2.0
            }'::jsonb,
            '{
                "dark_baseline": 42,
                "daylight_baseline": 870,
                "light_a_contrib": 125,
                "light_b_contrib": 160,
                "both_contrib": 290,
                "accel_rest": 16384,
                "knock_threshold": 4200,
                "floor_dist_a": 218.5,
                "floor_dist_b": 219.0,
                "height_offset": 0.0,
                "direction_flipped": false
            }'::jsonb,
            '{
                "occupancy": 2,
                "temperature": 24.5,
                "humidity": 48.0,
                "ambient_light": 62,
                "intensity": 75,
                "relays": [true, true, false, true],
                "manual_override": false,
                "override_remaining_sec": 0
            }'::jsonb,
            now()
        ) RETURNING id INTO demo_device_id;

        -- Insert recent sample events
        INSERT INTO public.events (device_id, type_code, value, metadata, created_at)
        VALUES
            (demo_device_id, 1, 176.4, '{"band": "Average adult"}'::jsonb, now() - interval '12 minutes'),
            (demo_device_id, 5, 0, '{"relay": "Light A", "state": true}'::jsonb, now() - interval '12 minutes'),
            (demo_device_id, 1, 162.0, '{"band": "Average adult"}'::jsonb, now() - interval '8 minutes'),
            (demo_device_id, 3, 4850, '{"note": "Deliberate knock detected"}'::jsonb, now() - interval '5 minutes'),
            (demo_device_id, 4, 3, '{"switch": 4, "relay": "Single Light"}'::jsonb, now() - interval '2 minutes');

    END IF;
END $$;
