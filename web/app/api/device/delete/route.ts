import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { deviceId } = await req.json();

    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
    }

    // Try to get authenticated user from Supabase session
    const supabaseUserClient = createServerSupabaseClient();
    const { data: { user } } = await supabaseUserClient.auth.getUser();

    const adminSupabase = createAdminClient();

    // Verify ownership if user is logged in
    if (user?.id) {
      const { data: existingDevice } = await adminSupabase
        .from('devices')
        .select('owner_id')
        .eq('id', deviceId)
        .single();

      if (existingDevice && existingDevice.owner_id !== user.id) {
        return NextResponse.json({ error: 'Unauthorized to delete this device' }, { status: 403 });
      }
    }

    // Explicitly delete dependent telemetry and relay records
    await adminSupabase.from('relays').delete().eq('device_id', deviceId);
    await adminSupabase.from('events').delete().eq('device_id', deviceId);
    await adminSupabase.from('sensor_blobs').delete().eq('device_id', deviceId);

    // Delete the device record
    const { error: delErr } = await adminSupabase
      .from('devices')
      .delete()
      .eq('id', deviceId);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Device successfully removed',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
