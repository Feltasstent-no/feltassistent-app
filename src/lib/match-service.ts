import { supabase } from './supabase';
import type { FieldFigure } from '../types/database';
import { getElevationForClickTable, getWindForClickTable } from './click-table-resolver';

export interface MatchSession {
  id: string;
  user_id: string;
  click_table_id: string | null;
  template_id: string | null;
  match_name: string;
  match_date: string;
  status: 'setup' | 'in_progress' | 'completed' | 'paused';
  current_hold_index: number;
  wind_speed_mps: number;
  wind_direction_degrees: number;
  competition_type: 'grovfelt' | 'finfelt';
  shooter_class_id?: string | null;
  notes?: string;
  total_hits?: number | null;
  inner_hits?: number | null;
  result_notes?: string | null;
  calculated_shot_count?: number | null;
  actual_shot_count?: number | null;
  ammo_inventory_id?: string | null;
  ammo_deducted_count?: number | null;
  created_at: string;
  completed_at?: string;
}

export interface MatchHold {
  id: string;
  match_session_id: string;
  order_index: number;
  field_figure_id: string | null;
  distance_m: number | null;
  recommended_clicks: number | null;
  recommended_wind_clicks: number;
  shooting_time_seconds: number;
  shot_count: number;
  wind_correction_clicks: number;
  monitor_image_url?: string;
  notes?: string;
  completed: boolean;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface MatchHoldWithFigure extends MatchHold {
  field_figure: FieldFigure;
}

export async function createMatchSession(params: {
  ballisticProfileId?: string;
  templateId: string;
  matchName: string;
  windSpeedMps?: number;
  windDirectionDegrees?: number;
  fieldType?: 'grovfelt' | 'finfelt';
}): Promise<{ session: MatchSession | null; holds: MatchHold[] | null; error: any }> {
  const { data: template, error: templateError } = await supabase
    .from('competition_templates')
    .select('*')
    .eq('id', params.templateId)
    .maybeSingle();

  if (templateError || !template) {
    return { session: null, holds: null, error: templateError || new Error('Template not found') };
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { session: null, holds: null, error: new Error('User not authenticated') };
  }

  const { data: session, error: sessionError } = await supabase
    .from('match_sessions')
    .insert({
      user_id: user.id,
      click_table_id: params.ballisticProfileId || null,
      template_id: params.templateId,
      match_name: params.matchName,
      match_date: new Date().toISOString().split('T')[0],
      wind_speed_mps: params.windSpeedMps || 0,
      wind_direction_degrees: params.windDirectionDegrees || 0,
      competition_type: params.fieldType || 'grovfelt',
      status: 'setup',
      current_hold_index: 0,
    })
    .select()
    .single();

  if (sessionError || !session) {
    return { session: null, holds: null, error: sessionError };
  }

  const numberOfHolds = template.default_stages || 10;
  const fieldType = params.fieldType || 'grovfelt';

  const defaultShootTime = fieldType === 'finfelt'
    ? (template.default_shoot_time || 120)
    : (template.default_shoot_time || 60);

  const defaultShotCount = 6;

  const holdsToCreate = Array.from({ length: numberOfHolds }, (_, index) => ({
    match_session_id: session.id,
    order_index: index,
    shooting_time_seconds: defaultShootTime,
    shot_count: defaultShotCount,
    field_figure_id: null,
    distance_m: null,
    recommended_clicks: null,
    wind_correction_clicks: 0,
    completed: false,
  }));

  const { data: holds, error: holdsError } = await supabase
    .from('match_holds')
    .insert(holdsToCreate)
    .select();

  if (holdsError) {
    return { session, holds: null, error: holdsError };
  }

  return { session, holds, error: null };
}

export async function getActiveMatchSession(userId: string): Promise<MatchSession | null> {
  const { data } = await supabase
    .from('match_sessions')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['in_progress', 'paused'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

export async function getMatchSession(sessionId: string): Promise<MatchSession | null> {
  const { data } = await supabase
    .from('match_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();

  return data;
}

export async function getMatchHolds(sessionId: string): Promise<MatchHoldWithFigure[]> {
  const { data } = await supabase
    .from('match_holds')
    .select(`
      *,
      field_figure:field_figures(*)
    `)
    .eq('match_session_id', sessionId)
    .order('order_index');

  return (data || []).map((hold: any) => ({
    ...hold,
    field_figure: hold.field_figure,
  }));
}

export async function getCurrentHold(sessionId: string, holdIndex: number): Promise<MatchHoldWithFigure | null> {
  console.log('[match-service] ========== GET CURRENT HOLD ==========');
  console.log('[match-service] Fetching hold:', { sessionId, holdIndex });

  const { data } = await supabase
    .from('match_holds')
    .select(`
      *,
      field_figure:field_figures(*)
    `)
    .eq('match_session_id', sessionId)
    .eq('order_index', holdIndex)
    .maybeSingle();

  console.log('[match-service] ========== CURRENT HOLD FROM DB ==========');
  if (data) {
    console.log('[match-service] Hold found:', {
      hold_id: data.id,
      order_index: holdIndex,
      field_figure_id: data.field_figure_id,
      figure_code: data.field_figure?.code || 'NULL',
      figure_name: data.field_figure?.name || 'NULL',
      distance_m: data.distance_m,
      shot_count: data.shot_count
    });
  } else {
    console.error('[match-service] ❌ No hold found for order_index:', holdIndex);
  }

  if (!data) return null;

  return {
    ...data,
    field_figure: data.field_figure,
  };
}

export async function startHold(holdId: string): Promise<void> {
  const { data } = await supabase
    .from('match_holds')
    .select('started_at')
    .eq('id', holdId)
    .maybeSingle();

  if (!data?.started_at) {
    await supabase
      .from('match_holds')
      .update({ started_at: new Date().toISOString() })
      .eq('id', holdId);
  }
}

export function getElapsedTime(startedAt: string | null): number {
  if (!startedAt) return 0;
  const start = new Date(startedAt).getTime();
  const now = Date.now();
  return Math.floor((now - start) / 1000);
}

export async function completeHold(holdId: string, notes?: string): Promise<void> {
  await supabase
    .from('match_holds')
    .update({
      completed: true,
      completed_at: new Date().toISOString(),
      notes: notes || null,
    })
    .eq('id', holdId);
}

export async function updateMatchSessionHoldIndex(sessionId: string, newIndex: number): Promise<void> {
  await supabase
    .from('match_sessions')
    .update({ current_hold_index: newIndex })
    .eq('id', sessionId);
}

export async function pauseMatchSession(sessionId: string): Promise<void> {
  await supabase
    .from('match_sessions')
    .update({ status: 'paused' })
    .eq('id', sessionId);
}

export async function resumeMatchSession(sessionId: string): Promise<void> {
  await supabase
    .from('match_sessions')
    .update({ status: 'in_progress' })
    .eq('id', sessionId);
}

export async function completeMatchSession(sessionId: string): Promise<void> {
  await supabase
    .from('match_sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', sessionId);
}

export async function cancelMatchSession(sessionId: string): Promise<void> {
  await supabase
    .from('match_sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', sessionId);
}

export async function uploadMonitorPhoto(
  holdId: string,
  userId: string,
  imageBlob: Blob
): Promise<{ url: string | null; error: any }> {
  const storagePath = `${userId}/${holdId}_${Date.now()}.jpg`;

  console.log('[match-service] uploadMonitorPhoto:', {
    holdId,
    userId,
    storagePath,
    blobSize: imageBlob.size,
    blobType: imageBlob.type,
  });

  const uploadBlob = imageBlob.type === 'image/jpeg'
    ? imageBlob
    : new Blob([imageBlob], { type: 'image/jpeg' });

  const { error: uploadError } = await supabase.storage
    .from('monitor-photos')
    .upload(storagePath, uploadBlob, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (uploadError) {
    console.error('[match-service] uploadMonitorPhoto FAILED:', uploadError);
    return { url: null, error: uploadError };
  }

  console.log('[match-service] uploadMonitorPhoto storage OK, path:', storagePath);

  const { error: dbError } = await supabase
    .from('match_holds')
    .update({ monitor_image_url: storagePath })
    .eq('id', holdId);

  if (dbError) {
    console.error('[match-service] uploadMonitorPhoto DB update FAILED:', dbError);
    return { url: null, error: dbError };
  }

  console.log('[match-service] uploadMonitorPhoto DB saved path:', storagePath);
  return { url: storagePath, error: null };
}

export async function getMatchHistory(userId: string, limit: number = 20): Promise<MatchSession[]> {
  const { data } = await supabase
    .from('match_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('match_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  return data || [];
}

export async function getMatchStats(sessionId: string): Promise<{
  totalHolds: number;
  completedHolds: number;
  totalShots: number;
  duration: number | null;
}> {
  const { data: holds } = await supabase
    .from('match_holds')
    .select('id, completed, started_at, completed_at, shot_count')
    .eq('match_session_id', sessionId);

  const { data: session } = await supabase
    .from('match_sessions')
    .select('created_at, completed_at')
    .eq('id', sessionId)
    .maybeSingle();

  const totalShots = (holds || [])
    .filter((h: any) => h.completed)
    .reduce((sum: number, h: any) => sum + (h.shot_count || 0), 0);

  let duration = null;
  if (session?.created_at && session?.completed_at) {
    const start = new Date(session.created_at).getTime();
    const end = new Date(session.completed_at).getTime();
    duration = Math.floor((end - start) / 1000);
  }

  return {
    totalHolds: holds?.length || 0,
    completedHolds: holds?.filter((h: any) => h.completed).length || 0,
    totalShots,
    duration,
  };
}

export async function updateMatchHold(params: {
  holdId: string;
  fieldFigureId?: string;
  distanceM?: number;
  shootingTimeSeconds?: number;
  shotCount?: number;
  recommendedClicks?: number;
  notes?: string;
}): Promise<{ error: any }> {
  console.log('[match-service] ========== UPDATE MATCH HOLD ==========');
  console.log('[match-service] holdId:', params.holdId);
  console.log('[match-service] fieldFigureId to save:', params.fieldFigureId);

  const updateData: any = {};

  if (params.fieldFigureId !== undefined) updateData.field_figure_id = params.fieldFigureId;
  if (params.distanceM !== undefined) updateData.distance_m = params.distanceM;
  if (params.shootingTimeSeconds !== undefined) updateData.shooting_time_seconds = params.shootingTimeSeconds;
  if (params.shotCount !== undefined) updateData.shot_count = params.shotCount;
  if (params.recommendedClicks !== undefined) updateData.recommended_clicks = params.recommendedClicks;
  if (params.notes !== undefined) updateData.notes = params.notes;

  console.log('[match-service] updateData object:', updateData);

  const { error } = await supabase
    .from('match_holds')
    .update(updateData)
    .eq('id', params.holdId);

  if (error) {
    console.error('[match-service] ❌ Update failed:', error);
  } else {
    console.log('[match-service] ✅ Update successful, verifying from DB...');

    const { data: verifyData } = await supabase
      .from('match_holds')
      .select(`
        id,
        order_index,
        field_figure_id,
        distance_m,
        field_figures (
          id,
          code,
          name
        )
      `)
      .eq('id', params.holdId)
      .maybeSingle();

    console.log('[match-service] ========== DB VERIFICATION ==========');
    console.log('[match-service] Hold after update:', {
      hold_id: verifyData?.id,
      order_index: verifyData?.order_index,
      field_figure_id: verifyData?.field_figure_id,
      figure_code: (verifyData as any)?.field_figures?.code || 'NULL',
      figure_name: (verifyData as any)?.field_figures?.name || 'NULL'
    });
  }

  return { error };
}

export async function addMatchHold(params: {
  sessionId: string;
  shootingTimeSeconds: number;
  shotCount: number;
  fieldFigureId?: string | null;
  distanceM?: number | null;
}): Promise<{ hold: MatchHold | null; error: any }> {
  const { data: existingHolds } = await supabase
    .from('match_holds')
    .select('order_index')
    .eq('match_session_id', params.sessionId)
    .order('order_index', { ascending: false })
    .limit(1);

  const nextIndex = existingHolds && existingHolds.length > 0
    ? existingHolds[0].order_index + 1
    : 0;

  const { data, error } = await supabase
    .from('match_holds')
    .insert({
      match_session_id: params.sessionId,
      order_index: nextIndex,
      shooting_time_seconds: params.shootingTimeSeconds,
      shot_count: params.shotCount,
      field_figure_id: params.fieldFigureId ?? null,
      distance_m: params.distanceM ?? null,
      recommended_clicks: null,
      wind_correction_clicks: 0,
      completed: false,
    })
    .select()
    .single();

  return { hold: data, error };
}

export async function isMatchReadyToStart(sessionId: string): Promise<boolean> {
  const { data: holds } = await supabase
    .from('match_holds')
    .select('field_figure_id, distance_m')
    .eq('match_session_id', sessionId);

  if (!holds || holds.length === 0) return false;

  return holds.every((hold: any) =>
    hold.field_figure_id !== null &&
    hold.distance_m !== null &&
    hold.distance_m > 0
  );
}

async function calculateRecommendedClicks(clickTableId: string, distanceM: number): Promise<number> {
  return getElevationForClickTable(clickTableId, distanceM);
}

export async function startMatchSession(sessionId: string): Promise<{ error: any }> {
  const ready = await isMatchReadyToStart(sessionId);
  if (!ready) {
    return { error: new Error('Not all holds are configured') };
  }

  const { data: session } = await supabase
    .from('match_sessions')
    .select('click_table_id, competition_type, wind_speed_mps, wind_direction_degrees')
    .eq('id', sessionId)
    .maybeSingle();

  if (!session) {
    return { error: new Error('Session not found') };
  }

  const isFinfelt = session.competition_type === 'finfelt';

  if (!isFinfelt && !session.click_table_id) {
    return { error: new Error('No click table found for session') };
  }

  if (!isFinfelt) {
    const { data: holds } = await supabase
      .from('match_holds')
      .select('id, distance_m')
      .eq('match_session_id', sessionId);

    if (!holds) {
      return { error: new Error('No holds found') };
    }

    const windSpeed = session.wind_speed_mps || 0;
    const windDir = session.wind_direction_degrees || 0;
    const windDirRad = (windDir * Math.PI) / 180;
    const effectiveCrosswind = Math.abs(windSpeed * Math.sin(windDirRad));

    for (const hold of holds) {
      if (hold.distance_m && session.click_table_id) {
        const recommendedClicks = await calculateRecommendedClicks(session.click_table_id, hold.distance_m);
        const recommendedWindClicks = effectiveCrosswind > 0
          ? await getWindForClickTable(session.click_table_id, hold.distance_m, effectiveCrosswind)
          : 0;

        await supabase
          .from('match_holds')
          .update({
            recommended_clicks: recommendedClicks,
            recommended_wind_clicks: recommendedWindClicks,
            wind_correction_clicks: recommendedWindClicks,
          })
          .eq('id', hold.id);
      }
    }
  }

  const { error } = await supabase
    .from('match_sessions')
    .update({ status: 'in_progress' })
    .eq('id', sessionId);

  return { error };
}

export async function recalculateHoldClicks(
  sessionId: string,
  holdId: string,
  distanceM: number
): Promise<{ recommendedClicks: number; recommendedWindClicks: number; error: any }> {
  const { data: session } = await supabase
    .from('match_sessions')
    .select('click_table_id, competition_type, wind_speed_mps, wind_direction_degrees')
    .eq('id', sessionId)
    .maybeSingle();

  if (!session || !session.click_table_id || session.competition_type === 'finfelt') {
    return { recommendedClicks: 0, recommendedWindClicks: 0, error: null };
  }

  const recommendedClicks = await calculateRecommendedClicks(session.click_table_id, distanceM);

  const windSpeed = session.wind_speed_mps || 0;
  const windDir = session.wind_direction_degrees || 0;
  const windDirRad = (windDir * Math.PI) / 180;
  const effectiveCrosswind = Math.abs(windSpeed * Math.sin(windDirRad));

  const recommendedWindClicks = effectiveCrosswind > 0
    ? await getWindForClickTable(session.click_table_id, distanceM, effectiveCrosswind)
    : 0;

  const { error } = await supabase
    .from('match_holds')
    .update({
      recommended_clicks: recommendedClicks,
      recommended_wind_clicks: recommendedWindClicks,
      wind_correction_clicks: recommendedWindClicks,
    })
    .eq('id', holdId);

  return { recommendedClicks, recommendedWindClicks, error };
}

export async function updateHoldWindCorrection(holdId: string, windClicks: number): Promise<{ error: any }> {
  const { error } = await supabase
    .from('match_holds')
    .update({ wind_correction_clicks: windClicks })
    .eq('id', holdId);

  return { error };
}

export async function updateMatchShooterClass(sessionId: string, shooterClassId: string): Promise<{ error: any }> {
  const { error } = await supabase
    .from('match_sessions')
    .update({ shooter_class_id: shooterClassId })
    .eq('id', sessionId);

  return { error };
}

export async function updateMatchResult(params: {
  sessionId: string;
  totalHits?: number | null;
  innerHits?: number | null;
  resultNotes?: string | null;
}): Promise<{ error: any }> {
  const updateData: Record<string, unknown> = {};

  if (params.totalHits !== undefined) updateData.total_hits = params.totalHits;
  if (params.innerHits !== undefined) updateData.inner_hits = params.innerHits;
  if (params.resultNotes !== undefined) updateData.result_notes = params.resultNotes;

  const { error } = await supabase
    .from('match_sessions')
    .update(updateData)
    .eq('id', params.sessionId);

  return { error };
}

export async function updateMatchShotCounts(params: {
  sessionId: string;
  calculatedShotCount: number;
  actualShotCount?: number | null;
}): Promise<{ error: any }> {
  const updateData: Record<string, unknown> = {
    calculated_shot_count: params.calculatedShotCount,
  };

  if (params.actualShotCount !== undefined) {
    updateData.actual_shot_count = params.actualShotCount;
  }

  const { error } = await supabase
    .from('match_sessions')
    .update(updateData)
    .eq('id', params.sessionId);

  return { error };
}

export async function updateMatchAmmoSelection(sessionId: string, ammoInventoryId: string | null): Promise<{ error: any }> {
  const { error } = await supabase
    .from('match_sessions')
    .update({ ammo_inventory_id: ammoInventoryId })
    .eq('id', sessionId);

  return { error };
}

export async function updateMatchAmmoDeduction(params: {
  sessionId: string;
  ammoInventoryId: string;
  ammoDeductedCount: number;
}): Promise<{ error: any }> {
  const { error } = await supabase
    .from('match_sessions')
    .update({
      ammo_inventory_id: params.ammoInventoryId,
      ammo_deducted_count: params.ammoDeductedCount,
    })
    .eq('id', params.sessionId);

  return { error };
}

export function getEffectiveShotCount(session: MatchSession, calculatedFromHolds: number): number {
  if (session.actual_shot_count != null) {
    return session.actual_shot_count;
  }
  if (session.calculated_shot_count != null) {
    return session.calculated_shot_count;
  }
  return calculatedFromHolds;
}

export async function getMatchHoldImages(sessionId: string): Promise<Array<{
  holdId: string;
  orderIndex: number;
  imageUrl: string;
  figureName: string;
  distanceM: number;
}>> {
  const { data } = await supabase
    .from('match_holds')
    .select(`
      id,
      order_index,
      monitor_image_url,
      distance_m,
      field_figure:field_figures(name)
    `)
    .eq('match_session_id', sessionId)
    .not('monitor_image_url', 'is', null)
    .order('order_index');

  if (!data) return [];

  const holdsWithImages = data.filter((h: any) => h.monitor_image_url);

  if (holdsWithImages.length === 0) return [];

  const paths = holdsWithImages.map((h: any) => h.monitor_image_url as string);

  const resolvedUrls = await resolveMonitorImageUrls(paths);

  return holdsWithImages.map((h: any, i: number) => ({
    holdId: h.id,
    orderIndex: h.order_index,
    imageUrl: resolvedUrls[i],
    figureName: h.field_figure?.name || 'Ukjent',
    distanceM: h.distance_m || 0,
  }));
}

async function resolveMonitorImageUrls(storedValues: string[]): Promise<string[]> {
  return Promise.all(storedValues.map(async (stored) => {
    if (stored.startsWith('http://') || stored.startsWith('https://')) {
      console.log('[match-service] resolveImage: legacy full URL, using as-is:', stored);
      return stored;
    }

    const { data, error } = await supabase.storage
      .from('monitor-photos')
      .createSignedUrl(stored, 3600);

    if (error || !data?.signedUrl) {
      console.error('[match-service] resolveImage: signedUrl FAILED for path:', stored, error);
      const { data: pub } = supabase.storage.from('monitor-photos').getPublicUrl(stored);
      console.log('[match-service] resolveImage: falling back to publicUrl:', pub.publicUrl);
      return pub.publicUrl;
    }

    console.log('[match-service] resolveImage: signedUrl OK for path:', stored);
    return data.signedUrl;
  }));
}
