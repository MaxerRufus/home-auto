import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { generateDeviceToken, hashDeviceToken } from '@/lib/device-token';

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Device name is required' }, { status: 400 });
    }

    // Try to get authenticated user from Supabase session
    const supabaseUserClient = createServerSupabaseClient();
    const { data: { user } } = await supabaseUserClient.auth.getUser();

    const adminSupabase = createAdminClient();

    // If user is logged in, use user.id. Otherwise in local demo mode, fetch or use a demo owner uuid.
    let ownerId = user?.id;

    if (!ownerId) {
      // Check if any user exists or use dummy fallback for demo preview
      const { data: users } = await adminSupabase.from('devices').select('owner_id').limit(1);
      if (users && users.length > 0) {
        ownerId = users[0].owner_id;
      } else {
        ownerId = '00000000-0000-0000-0000-000000000001';
      }
    }

    // Generate high-entropy 32-byte secret token
    const clearToken = generateDeviceToken();
    const tokenHash = hashDeviceToken(clearToken);

    // Insert device record
    const { data: newDevice, error: devErr } = await adminSupabase
      .from('devices')
      .insert({
        name: name.trim(),
        owner_id: ownerId,
        token_hash: tokenHash,
      })
      .select()
      .single();

    if (devErr) {
      return NextResponse.json({ error: devErr.message }, { status: 500 });
    }

    // Initialize the 4 default relays matching the ESP8266 hardware specification:
    // Relay 0: Light A (PCF8574 P0)
    // Relay 1: Light B (PCF8574 P1)
    // Relay 2: Fan (PCF8574 P2)
    // Relay 3: Main Plug (ESP8266 GPIO12)
    await adminSupabase.from('relays').insert([
      { device_id: newDevice.id, relay_index: 0, label: 'Light A', category: 'light', state: false },
      { device_id: newDevice.id, relay_index: 1, label: 'Light B', category: 'light', state: false },
      { device_id: newDevice.id, relay_index: 2, label: 'Fan', category: 'fan', state: false },
      { device_id: newDevice.id, relay_index: 3, label: 'Main Plug', category: 'plug', state: false },
    ]);

    return NextResponse.json({
      success: true,
      device: newDevice,
      // The secret token is returned ONLY ONCE upon creation!
      oneTimeSecretToken: clearToken,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
