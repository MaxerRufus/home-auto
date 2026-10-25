import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { hashDeviceToken } from '@/lib/device-token';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { device_id, token } = body;

    if (!device_id || !token) {
      return NextResponse.json({ error: 'device_id and token are required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const tokenHash = hashDeviceToken(token);

    // Look up device
    const { data: device, error } = await supabase
      .from('devices')
      .select('id, name, token_hash, config, calibration, last_state')
      .eq('id', device_id)
      .single();

    if (error || !device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    // Verify token hash
    if (device.token_hash !== tokenHash) {
      return NextResponse.json({ error: 'Unauthorized: invalid device token' }, { status: 401 });
    }

    // Update last_seen
    await supabase
      .from('devices')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', device_id);

    // Provide session token and configuration to device
    // (Notice: Supabase JWT secret remains strictly on server)
    return NextResponse.json({
      status: 'authenticated',
      device_id: device.id,
      name: device.name,
      config: device.config,
      calibration: device.calibration,
      token: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'session-token',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
