import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { hashDeviceToken } from '@/lib/device-token';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { device_id, type_code, value, metadata } = body;
    const tokenHeader = req.headers.get('x-device-token');

    if (!device_id || !type_code) {
      return NextResponse.json({ error: 'device_id and type_code are required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify token if provided in header
    if (tokenHeader) {
      const tokenHash = hashDeviceToken(tokenHeader);
      const { data: dev } = await supabase
        .from('devices')
        .select('token_hash')
        .eq('id', device_id)
        .single();

      if (!dev || dev.token_hash !== tokenHash) {
        return NextResponse.json({ error: 'Unauthorized device' }, { status: 401 });
      }
    }

    const { data, error } = await supabase
      .from('events')
      .insert({
        device_id,
        type_code,
        value: value !== undefined ? value : null,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ status: 'recorded', event: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
