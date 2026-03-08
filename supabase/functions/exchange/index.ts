// supabase/functions/exchange/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const EXCHANGE_RATE_STARS = 500;
const EXCHANGE_RATE_TOSS = 100;
const MAX_PER_DAY = 3;

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }),
      { status: 405, headers: CORS_HEADERS },
    );
  }

  try {
    const { userKey, starsToSpend } = await req.json();

    if (!userKey || typeof userKey !== 'string') {
      return new Response(
        JSON.stringify({ error: 'INVALID_USER_KEY', message: 'userKey\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4' }),
        { status: 400, headers: CORS_HEADERS },
      );
    }

    if (
      !starsToSpend ||
      starsToSpend < EXCHANGE_RATE_STARS ||
      starsToSpend % EXCHANGE_RATE_STARS !== 0
    ) {
      return new Response(
        JSON.stringify({
          error: 'INVALID_AMOUNT',
          message: `${EXCHANGE_RATE_STARS}\uBCC4 \uB2E8\uC704\uB85C \uAD50\uD658 \uAC00\uB2A5\uD569\uB2C8\uB2E4`,
        }),
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const tossPoints = (starsToSpend / EXCHANGE_RATE_STARS) * EXCHANGE_RATE_TOSS;

    // Supabase client (service_role)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sb = createClient(supabaseUrl, serviceKey, { db: { schema: 'math_attack' } });

    // 1. Check daily limit
    const today = new Date().toISOString().slice(0, 10);
    const { count: todayCount } = await sb
      .from('point_exchanges')
      .select('id', { count: 'exact', head: true })
      .eq('user_key', userKey)
      .eq('status', 'success')
      .gte('created_at', `${today}T00:00:00.000Z`);

    if ((todayCount ?? 0) >= MAX_PER_DAY) {
      return new Response(
        JSON.stringify({
          error: 'DAILY_LIMIT',
          message: `\uC77C\uC77C \uAD50\uD658 \uD69F\uC218(${MAX_PER_DAY}\uD68C)\uB97C \uCD08\uACFC\uD588\uC2B5\uB2C8\uB2E4`,
        }),
        { status: 429, headers: CORS_HEADERS },
      );
    }

    // 2. Check balance
    const { data: pointData } = await sb
      .from('user_points')
      .select('balance, total_spent')
      .eq('user_key', userKey)
      .maybeSingle();

    const balance = pointData?.balance ?? 0;
    if (balance < starsToSpend) {
      return new Response(
        JSON.stringify({ error: 'INSUFFICIENT_STARS', message: '\uBCC4\uC774 \uBD80\uC871\uD569\uB2C8\uB2E4' }),
        { status: 400, headers: CORS_HEADERS },
      );
    }

    // 3. Create pending exchange record
    const { data: exchangeRecord, error: insertErr } = await sb
      .from('point_exchanges')
      .insert({
        user_key: userKey,
        stars_spent: starsToSpend,
        toss_points: tossPoints,
        promotion_code: 'EXCHANGE',
        status: 'pending',
      })
      .select('id')
      .single();

    if (insertErr) {
      return new Response(
        JSON.stringify({ error: 'DB_ERROR', message: insertErr.message }),
        { status: 500, headers: CORS_HEADERS },
      );
    }

    // 4. Deduct stars
    const newBalance = balance - starsToSpend;
    const currentTotalSpent = pointData?.total_spent ?? 0;
    const { error: deductErr } = await sb
      .from('user_points')
      .update({
        balance: newBalance,
        total_spent: currentTotalSpent + starsToSpend,
        updated_at: new Date().toISOString(),
      })
      .eq('user_key', userKey);

    if (deductErr) {
      // Rollback exchange record
      await sb
        .from('point_exchanges')
        .update({ status: 'failed', error_message: deductErr.message })
        .eq('id', exchangeRecord.id);
      return new Response(
        JSON.stringify({ error: 'DEDUCT_FAILED', message: deductErr.message }),
        { status: 500, headers: CORS_HEADERS },
      );
    }

    // 5. Record transaction
    await sb.from('point_transactions').insert({
      user_key: userKey,
      amount: -starsToSpend,
      type: 'exchange',
      description: `${starsToSpend}\uBCC4 \u2192 ${tossPoints} \uD1A0\uC2A4 \uD3EC\uC778\uD2B8 \uAD50\uD658`,
      reference_id: exchangeRecord.id,
    });

    // 6. Mark success (actual Toss promotion API would be called here)
    // For now, mark as success -- real promotion integration requires console setup
    await sb
      .from('point_exchanges')
      .update({
        status: 'success',
        updated_at: new Date().toISOString(),
      })
      .eq('id', exchangeRecord.id);

    return new Response(
      JSON.stringify({
        success: true,
        starsSpent: starsToSpend,
        tossPoints,
        newBalance,
        exchangeId: exchangeRecord.id,
      }),
      { status: 200, headers: CORS_HEADERS },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[exchange]', message);
    return new Response(
      JSON.stringify({ error: 'INTERNAL_ERROR', message }),
      { status: 500, headers: CORS_HEADERS },
    );
  }
});
