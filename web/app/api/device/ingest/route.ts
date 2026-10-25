import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { hashDeviceToken } from '@/lib/device-token';
import { HOURLY_BLOB_SIZE_BYTES } from '@/lib/bitpack';

export async function POST(req: NextRequest) {
  try {
    const deviceId = req.headers.get('x-device-id');
    const deviceToken = req.headers.get('x-device-token');
    const hourEpochHeader = req.headers.get('x-hour-epoch');

    if (!deviceId || !deviceToken) {
      return NextResponse.json({ error: 'x-device-id and x-device-token headers required' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const tokenHash = hashDeviceToken(deviceToken);

    // Verify device
    const { data: device, error: devErr } = await supabase
      .from('devices')
      .select('id, token_hash')
      .eq('id', deviceId)
      .single();

    if (devErr || !device || device.token_hash !== tokenHash) {
      return NextResponse.json({ error: 'Unauthorized device' }, { status: 401 });
    }

    // Read body buffer
    const arrayBuffer = await req.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return NextResponse.json({ error: 'Empty payload buffer' }, { status: 400 });
    }

    // Determine hour timestamp (aligned to the top of the hour)
    let hourStart: Date;
    if (hourEpochHeader && !isNaN(Number(hourEpochHeader))) {
      const d = new Date(Number(hourEpochHeader) * 1000);
      d.setMinutes(0, 0, 0);
      hourStart = d;
    } else {
      const d = new Date();
      d.setMinutes(0, 0, 0);
      hourStart = d;
    }

    // Convert to hex string for Postgres bytea format: '\x...'
    const byteaHex = '\\x' + buffer.toString('hex');

    const { error: insertErr } = await supabase
      .from('sensor_blobs')
      .upsert(
        {
          device_id: deviceId,
          hour_start: hourStart.toISOString(),
          frame_count: Math.floor(buffer.length / 6),
          data: byteaHex,
        },
        { onConflict: 'device_id,hour_start' }
      );

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // Update last_seen
    await supabase
      .from('devices')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', deviceId);

    return NextResponse.json({
      status: 'ingested',
      bytes_received: buffer.length,
      hour_start: hourStart.toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
