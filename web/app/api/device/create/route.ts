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
