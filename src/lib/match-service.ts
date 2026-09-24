import { supabase } from './supabase';
import type { FieldFigure } from '../types/database';
import { getElevationForClickTable, getWindForClickTable } from './click-table-resolver';
import { resilientUpdate } from './resilient-save';

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
  distance_mode?: 'kjent' | 'ukjent';
  shooter_class_id?: string | null;
  notes?: string;
  total_hits?: number | null;
  inner_hits?: number | null;
  result_notes?: string | null;
  calculated_shot_count?: number | null;
  actual_shot_count?: number | null;
  ammo_inventory_id?: string | null;
  ammo_deducted_count?: number | null;
  started_at?: string;
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
  elevation_correction_clicks: number | null;
  recommended_wind_clicks: number;
  shooting_time_seconds: number;
  shot_count: number;
  wind_correction_clicks: number;
  monitor_image_url?: string;
  notes?: string;
  is_composite: boolean;
  completed: boolean;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  reshoot_of_hold_id?: string | null;
  counts_for_score?: boolean;
}

export interface MatchHoldWithFigure extends MatchHold {
  field_figure: FieldFigure;
  sub_holds?: MatchSubHold[];
}

export interface MatchSubHold {
  id: string;
  match_hold_id: string;
  order_index: number;
  field_figure_id: string | null;
  field_figure?: FieldFigure | null;
  distance_m: number | null;
  shot_count: number;
  elevation_clicks: number | null;
  wind_clicks: number | null;
  wind_direction: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function effectiveElevation(hold: {
  elevation_correction_clicks?: number | null;
  recommended_clicks?: number | null;
}): number | null {
  return hold.elevation_correction_clicks ?? hold.recommended_clicks ?? null;
}

export function isDistanceMissing(distanceM: number | null | undefined): boolean {
  return !distanceM || distanceM <= 0;
}

export function isShootingTimeMissing(seconds: number | null | undefined): boolean {
  return !seconds || seconds <= 0;
}

export function getMissingHoldFields(
  hold: MatchHoldWithFigure,
  subHolds?: MatchSubHold[] | null
): string[] {
  const missing: string[] = [];
  const isComposite = hold.is_composite && subHolds && subHolds.length > 0;

  if (isComposite) {
    if (subHolds!.some(sh => !sh.field_figure_id)) missing.push('Figur');
    if (subHolds!.some(sh => isDistanceMissing(sh.distance_m))) missing.push('Avstand');
  } else {
    if (!hold.field_figure_id) missing.push('Figur');
    if (isDistanceMissing(hold.distance_m)) missing.push('Avstand');
  }

  if (isShootingTimeMissing(hold.shooting_time_seconds)) missing.push('Skytetid');

  return missing;
}

type HoldNumberingInfo = Pick<MatchHold, 'id' | 'order_index' | 'reshoot_of_hold_id'>;

export function getOrdinaryHolds<T extends HoldNumberingInfo>(holds: T[]): T[] {
  return holds
    .filter(h => !h.reshoot_of_hold_id)
    .sort((a, b) => a.order_index - b.order_index);
}

export function getOrdinaryHoldCount(holds: HoldNumberingInfo[]): number {
  return getOrdinaryHolds(holds).length;
}

export function getLogicalHoldNumber(
  hold: HoldNumberingInfo | null | undefined,
  holds: HoldNumberingInfo[]
): number {
  if (!hold) return 0;
  const ordinary = getOrdinaryHolds(holds);
  const targetId = hold.reshoot_of_hold_id ?? hold.id;
  const idx = ordinary.findIndex(h => h.id === targetId);
  return idx >= 0 ? idx + 1 : ordinary.length;
}

export interface MatchSubHoldImage {
  id: string;
  match_sub_hold_id: string;
  storage_path: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
  imageUrl?: string;
}

export async function createMatchSession(params: {
  ballisticProfileId?: string;
  templateId: string;
  matchName: string;
  windSpeedMps?: number;
  windDirectionDegrees?: number;
  fieldType?: 'grovfelt' | 'finfelt';
  distanceMode?: 'kjent' | 'ukjent';
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
      distance_mode: params.distanceMode || 'kjent',
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

export async function getActiveMatchSessions(userId: string): Promise<MatchSession[]> {
  const { data } = await supabase
    .from('match_sessions')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['setup', 'in_progress', 'paused'])
    .order('created_at', { ascending: false });

  return data || [];
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
  const { data } = await supabase
    .from('match_holds')
    .select(`
      *,
      field_figure:field_figures(*)
    `)
    .eq('match_session_id', sessionId)
    .eq('order_index', holdIndex)
    .maybeSingle();

  if (!data) return null;

  return {
    ...data,
    field_figure: data.field_figure,
  };
}

export async function startHold(holdId: string): Promise<void> {
  const { data } = await supabase
    .from('match_holds')
    .select('started_at, match_session_id')
    .eq('id', holdId)
    .maybeSingle();

  if (!data?.started_at) {
    const now = new Date().toISOString();
    await supabase
      .from('match_holds')
      .update({ started_at: now })
      .eq('id', holdId);

    if (data?.match_session_id) {
      const { data: sess } = await supabase
        .from('match_sessions')
        .select('started_at')
        .eq('id', data.match_session_id)
        .maybeSingle();

      if (!sess?.started_at) {
        await supabase
          .from('match_sessions')
          .update({ started_at: now })
          .eq('id', data.match_session_id);
      }
    }
  }
}

export function getElapsedTime(startedAt: string | null): number {
  if (!startedAt) return 0;
  const start = new Date(startedAt).getTime();
  const now = Date.now();
  return Math.floor((now - start) / 1000);
}

export async function completeHold(holdId: string, notes?: string): Promise<void> {
  await resilientUpdate({
    table: 'match_holds',
    data: {
      completed: true,
      completed_at: new Date().toISOString(),
      notes: notes || null,
    },
    column: 'id',
    value: holdId,
  });
}

export async function updateMatchSessionHoldIndex(sessionId: string, newIndex: number): Promise<void> {
  await resilientUpdate({
    table: 'match_sessions',
    data: { current_hold_index: newIndex },
    column: 'id',
    value: sessionId,
  });
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

  const { error: dbError } = await supabase
    .from('match_holds')
    .update({ monitor_image_url: storagePath })
    .eq('id', holdId);

  if (dbError) {
    console.error('[match-service] uploadMonitorPhoto DB update FAILED:', dbError);
    return { url: null, error: dbError };
  }

  return { url: storagePath, error: null };
}

function isExternalUrl(value: string | null | undefined): boolean {
  return !!value && (value.startsWith('http://') || value.startsWith('https://'));
}

// Safe add/replace of a hold's single monitor image. Uploads the new file to a
// fresh path first, then repoints the row. The old storage object is removed
// only after the DB update succeeds, so a failure never leaves the hold without
// a usable image.
export async function replaceHoldMonitorImage(
  holdId: string,
  userId: string,
  imageBlob: Blob
): Promise<{ url: string | null; error: any }> {
  const { data: existing } = await supabase
    .from('match_holds')
    .select('monitor_image_url')
    .eq('id', holdId)
    .maybeSingle();
  const oldPath = existing?.monitor_image_url as string | undefined;

  const storagePath = `${userId}/${holdId}_${Date.now()}.jpg`;
  const uploadBlob = imageBlob.type === 'image/jpeg'
    ? imageBlob
    : new Blob([imageBlob], { type: 'image/jpeg' });

  const { error: uploadError } = await supabase.storage
    .from('monitor-photos')
    .upload(storagePath, uploadBlob, { contentType: 'image/jpeg', upsert: true });
  if (uploadError) return { url: null, error: uploadError };

  const { error: dbError } = await supabase
    .from('match_holds')
    .update({ monitor_image_url: storagePath })
    .eq('id', holdId);
  if (dbError) {
    await supabase.storage.from('monitor-photos').remove([storagePath]);
    return { url: null, error: dbError };
  }

  if (oldPath && oldPath !== storagePath && !isExternalUrl(oldPath)) {
    await supabase.storage.from('monitor-photos').remove([oldPath]);
  }

  return { url: storagePath, error: null };
}

// Clears a hold's monitor image. The DB reference is cleared first so we never
// point at a deleted file; a storage-delete failure afterwards is reported but
// the DB stays cleared (no dangling reference is restored).
export async function clearHoldMonitorImage(holdId: string): Promise<{ error: any }> {
  const { data: existing, error: readError } = await supabase
    .from('match_holds')
    .select('monitor_image_url')
    .eq('id', holdId)
    .maybeSingle();
  if (readError) return { error: readError };

  const oldPath = existing?.monitor_image_url as string | undefined;

  const { error: dbError } = await supabase
    .from('match_holds')
    .update({ monitor_image_url: null })
    .eq('id', holdId);
  if (dbError) return { error: dbError };

  if (oldPath && !isExternalUrl(oldPath)) {
    const { error: storageError } = await supabase.storage
      .from('monitor-photos')
      .remove([oldPath]);
    if (storageError) return { error: storageError };
  }

  return { error: null };
}

export async function resolveMonitorImageUrl(storedValue: string): Promise<string> {
  const [url] = await resolveMonitorImageUrls([storedValue]);
  return url;
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
    .select('created_at, started_at, completed_at')
    .eq('id', sessionId)
    .maybeSingle();

  const totalShots = (holds || [])
    .reduce((sum: number, h: any) => sum + (h.shot_count || 0), 0);

  let duration = null;
  if (session?.completed_at) {
    const startRef = session.started_at || session.created_at;
    const start = new Date(startRef).getTime();
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
  distanceM?: number | null;
  shootingTimeSeconds?: number | null;
  shotCount?: number;
  recommendedClicks?: number;
  elevationCorrectionClicks?: number | null;
  notes?: string;
}): Promise<{ error: any }> {
  const updateData: any = {};

  if (params.fieldFigureId !== undefined) updateData.field_figure_id = params.fieldFigureId;
  if (params.distanceM !== undefined) updateData.distance_m = params.distanceM;
  if (params.shootingTimeSeconds !== undefined) updateData.shooting_time_seconds = params.shootingTimeSeconds;
  if (params.shotCount !== undefined) updateData.shot_count = params.shotCount;
  if (params.recommendedClicks !== undefined) updateData.recommended_clicks = params.recommendedClicks;
  if (params.elevationCorrectionClicks !== undefined) updateData.elevation_correction_clicks = params.elevationCorrectionClicks;
  if (params.notes !== undefined) updateData.notes = params.notes;

  const { error } = await resilientUpdate({
    table: 'match_holds',
    data: updateData,
    column: 'id',
    value: params.holdId,
  });

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

export async function hasReshoot(originalHoldId: string): Promise<boolean> {
  const { data } = await supabase
    .from('match_holds')
    .select('id')
    .eq('reshoot_of_hold_id', originalHoldId)
    .limit(1)
    .maybeSingle();
  return !!data;
}

export async function createReshootHold(originalHoldId: string): Promise<{ hold: MatchHold | null; error: any }> {
  const { data: original, error: readError } = await supabase
    .from('match_holds')
    .select('*')
    .eq('id', originalHoldId)
    .maybeSingle();

  if (readError || !original) {
    return { hold: null, error: readError || new Error('Original hold not found') };
  }

  if (original.reshoot_of_hold_id) {
    return { hold: null, error: new Error('Kan ikke opprette omskyting av en omskyting') };
  }

  const existing = await hasReshoot(originalHoldId);
  if (existing) {
    return { hold: null, error: new Error('Hold har allerede en omskyting') };
  }

  const { data: last } = await supabase
    .from('match_holds')
    .select('order_index')
    .eq('match_session_id', original.match_session_id)
    .order('order_index', { ascending: false })
    .limit(1);

  const nextIndex = last && last.length > 0 ? last[0].order_index + 1 : 0;

  const { data: inserted, error: insertError } = await supabase
    .from('match_holds')
    .insert({
      match_session_id: original.match_session_id,
      order_index: nextIndex,
      field_figure_id: original.field_figure_id,
      distance_m: original.distance_m,
      recommended_clicks: original.recommended_clicks,
      elevation_correction_clicks: original.elevation_correction_clicks,
      recommended_wind_clicks: original.recommended_wind_clicks,
      shooting_time_seconds: original.shooting_time_seconds,
      shot_count: original.shot_count,
      wind_correction_clicks: original.wind_correction_clicks,
      is_composite: original.is_composite,
      completed: false,
      reshoot_of_hold_id: original.id,
      counts_for_score: false,
    })
    .select()
    .single();

  if (insertError || !inserted) {
    return { hold: null, error: insertError };
  }

  if (original.is_composite) {
    const { data: subs } = await supabase
      .from('match_sub_holds')
      .select('*')
      .eq('match_hold_id', original.id)
      .order('order_index');

    if (subs && subs.length > 0) {
      const copies = subs.map((sh: any) => ({
        match_hold_id: inserted.id,
        order_index: sh.order_index,
        field_figure_id: sh.field_figure_id,
        distance_m: sh.distance_m,
        shot_count: sh.shot_count,
        elevation_clicks: sh.elevation_clicks,
        wind_clicks: sh.wind_clicks,
        wind_direction: sh.wind_direction,
      }));
      await supabase.from('match_sub_holds').insert(copies);
    }
  }

  return { hold: inserted, error: null };
}

export async function setCountingAttempt(params: {
  originalHoldId: string;
  reshootHoldId: string;
  winner: 'original' | 'reshoot';
}): Promise<{ error: any }> {
  const originalCounts = params.winner === 'original';
  const { error: err1 } = await supabase
    .from('match_holds')
    .update({ counts_for_score: originalCounts })
    .eq('id', params.originalHoldId);
  if (err1) return { error: err1 };

  const { error: err2 } = await supabase
    .from('match_holds')
    .update({ counts_for_score: !originalCounts })
    .eq('id', params.reshootHoldId);
  return { error: err2 };
}

export async function isMatchReadyToStart(sessionId: string): Promise<boolean> {
  const { data: session } = await supabase
    .from('match_sessions')
    .select('distance_mode')
    .eq('id', sessionId)
    .maybeSingle();

  if (session?.distance_mode === 'ukjent') {
    const { data: holds } = await supabase
      .from('match_holds')
      .select('id')
      .eq('match_session_id', sessionId);
    return (holds?.length ?? 0) > 0;
  }

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
    .select('click_table_id, competition_type, wind_speed_mps, wind_direction_degrees, distance_mode')
    .eq('id', sessionId)
    .maybeSingle();

  if (!session) {
    return { error: new Error('Session not found') };
  }

  const isFinfelt = session.competition_type === 'finfelt';
  const isUnknown = session.distance_mode === 'ukjent';

  if (!isFinfelt && !isUnknown && !session.click_table_id) {
    return { error: new Error('No click table found for session') };
  }

  if (!isFinfelt && !isUnknown) {
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

export async function updateHoldElevationCorrection(
  holdId: string,
  elevationClicks: number | null
): Promise<{ error: any }> {
  const { error } = await supabase
    .from('match_holds')
    .update({ elevation_correction_clicks: elevationClicks })
    .eq('id', holdId);

  return { error };
}

export async function correctCompletedHold(
  holdId: string,
  sessionId: string,
  updates: { field_figure_id?: string | null; distance_m?: number | null; notes?: string | null }
): Promise<{ error: any }> {
  const payload: Record<string, any> = {};
  if (updates.field_figure_id !== undefined) payload.field_figure_id = updates.field_figure_id;
  if (updates.distance_m !== undefined) payload.distance_m = updates.distance_m;
  if (updates.notes !== undefined) payload.notes = updates.notes;

  if (Object.keys(payload).length === 0) return { error: null };

  const { error } = await supabase
    .from('match_holds')
    .update(payload)
    .eq('id', holdId);

  if (error) return { error };

  if (updates.distance_m != null && updates.distance_m > 0) {
    await recalculateHoldClicks(sessionId, holdId, updates.distance_m);
  }

  return { error: null };
}

export async function correctCompletedSubHold(
  subHoldId: string,
  updates: { field_figure_id?: string | null; distance_m?: number | null; notes?: string | null }
): Promise<{ error: any }> {
  const payload: Record<string, any> = {};
  if (updates.field_figure_id !== undefined) payload.field_figure_id = updates.field_figure_id;
  if (updates.distance_m !== undefined) payload.distance_m = updates.distance_m;
  if (updates.notes !== undefined) payload.notes = updates.notes;

  if (Object.keys(payload).length === 0) return { error: null };

  const { error } = await supabase
    .from('match_sub_holds')
    .update(payload)
    .eq('id', subHoldId);

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

  const { error } = await resilientUpdate({
    table: 'match_sessions',
    data: updateData,
    column: 'id',
    value: params.sessionId,
  });

  return { error };
}

export async function updateMatchMetadata(params: {
  sessionId: string;
  matchName: string;
  notes: string;
}): Promise<{ error: any }> {
  const { error } = await resilientUpdate({
    table: 'match_sessions',
    data: {
      match_name: params.matchName,
      notes: params.notes || null,
    },
    column: 'id',
    value: params.sessionId,
  });

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
  const results: string[] = [];
  for (const stored of storedValues) {
    if (stored.startsWith('http://') || stored.startsWith('https://')) {
      results.push(stored);
      continue;
    }
    const { data, error } = await supabase.storage
      .from('monitor-photos')
      .createSignedUrl(stored, 3600);
    if (error || !data?.signedUrl) {
      const { data: pub } = supabase.storage.from('monitor-photos').getPublicUrl(stored);
      results.push(pub.publicUrl);
    } else {
      results.push(data.signedUrl);
    }
  }
  return results;
}

export async function getSubHolds(holdId: string): Promise<MatchSubHold[]> {
  const { data } = await supabase
    .from('match_sub_holds')
    .select(`
      *,
      field_figure:field_figures(*)
    `)
    .eq('match_hold_id', holdId)
    .order('order_index');

  return (data || []).map((sh: any) => ({
    ...sh,
    field_figure: sh.field_figure,
  }));
}

export async function getSubHoldsForSession(sessionId: string): Promise<Record<string, MatchSubHold[]>> {
  const { data: holds } = await supabase
    .from('match_holds')
    .select('id')
    .eq('match_session_id', sessionId)
    .eq('is_composite', true);

  if (!holds || holds.length === 0) return {};

  const holdIds = holds.map(h => h.id);
  const { data: subHolds } = await supabase
    .from('match_sub_holds')
    .select(`
      *,
      field_figure:field_figures(*)
    `)
    .in('match_hold_id', holdIds)
    .order('order_index');

  const grouped: Record<string, MatchSubHold[]> = {};
  for (const sh of subHolds || []) {
    if (!grouped[sh.match_hold_id]) grouped[sh.match_hold_id] = [];
    grouped[sh.match_hold_id].push({ ...sh, field_figure: sh.field_figure });
  }
  return grouped;
}

export async function createSubHold(params: {
  matchHoldId: string;
  orderIndex: number;
  fieldFigureId?: string | null;
  distanceM?: number | null;
  shotCount: number;
  elevationClicks?: number | null;
  windClicks?: number | null;
  windDirection?: string | null;
}): Promise<{ subHold: MatchSubHold | null; error: any }> {
  const { data, error } = await supabase
    .from('match_sub_holds')
    .insert({
      match_hold_id: params.matchHoldId,
      order_index: params.orderIndex,
      field_figure_id: params.fieldFigureId ?? null,
      distance_m: params.distanceM ?? null,
      shot_count: params.shotCount,
      elevation_clicks: params.elevationClicks ?? null,
      wind_clicks: params.windClicks ?? null,
      wind_direction: params.windDirection ?? null,
    })
    .select()
    .single();

  return { subHold: data, error };
}

export async function updateSubHold(params: {
  subHoldId: string;
  fieldFigureId?: string | null;
  distanceM?: number | null;
  shotCount?: number;
  elevationClicks?: number | null;
  windClicks?: number | null;
  windDirection?: string | null;
  notes?: string | null;
}): Promise<{ error: any }> {
  const updateData: any = {};
  if (params.fieldFigureId !== undefined) updateData.field_figure_id = params.fieldFigureId;
  if (params.distanceM !== undefined) updateData.distance_m = params.distanceM;
  if (params.shotCount !== undefined) updateData.shot_count = params.shotCount;
  if (params.elevationClicks !== undefined) updateData.elevation_clicks = params.elevationClicks;
  if (params.windClicks !== undefined) updateData.wind_clicks = params.windClicks;
  if (params.windDirection !== undefined) updateData.wind_direction = params.windDirection;
  if (params.notes !== undefined) updateData.notes = params.notes;

  const { error } = await supabase
    .from('match_sub_holds')
    .update(updateData)
    .eq('id', params.subHoldId);

  return { error };
}

export async function deleteSubHold(subHoldId: string): Promise<{ error: any }> {
  const { error } = await supabase
    .from('match_sub_holds')
    .delete()
    .eq('id', subHoldId);

  return { error };
}

export async function syncCompositeHoldShotCount(holdId: string): Promise<void> {
  const { data: subHolds } = await supabase
    .from('match_sub_holds')
    .select('shot_count')
    .eq('match_hold_id', holdId);

  const total = (subHolds || []).reduce((sum, sh) => sum + sh.shot_count, 0);

  await supabase
    .from('match_holds')
    .update({ shot_count: Math.max(1, total) })
    .eq('id', holdId);
}

export async function uploadSubHoldImage(
  subHoldId: string,
  userId: string,
  imageBlob: Blob
): Promise<{ image: MatchSubHoldImage | null; error: any }> {
  const storagePath = `${userId}/sub_${subHoldId}_${Date.now()}.jpg`;

  const uploadBlob = imageBlob.type === 'image/jpeg'
    ? imageBlob
    : new Blob([imageBlob], { type: 'image/jpeg' });

  const { error: uploadError } = await supabase.storage
    .from('monitor-photos')
    .upload(storagePath, uploadBlob, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (uploadError) return { image: null, error: uploadError };

  const { data: maxSort } = await supabase
    .from('match_sub_hold_images')
    .select('sort_order')
    .eq('match_sub_hold_id', subHoldId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSort = (maxSort?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from('match_sub_hold_images')
    .insert({
      match_sub_hold_id: subHoldId,
      storage_path: storagePath,
      sort_order: nextSort,
    })
    .select()
    .single();

  return { image: data, error };
}

export async function getSubHoldImages(subHoldId: string): Promise<MatchSubHoldImage[]> {
  const { data } = await supabase
    .from('match_sub_hold_images')
    .select('*')
    .eq('match_sub_hold_id', subHoldId)
    .order('sort_order');

  if (!data || data.length === 0) return [];

  const resolved = await resolveMonitorImageUrls(data.map(img => img.storage_path));

  return data.map((img, i) => ({
    ...img,
    imageUrl: resolved[i],
  }));
}

export async function deleteSubHoldImage(imageId: string): Promise<{ error: any }> {
  const { data: img } = await supabase
    .from('match_sub_hold_images')
    .select('storage_path')
    .eq('id', imageId)
    .maybeSingle();

  if (img?.storage_path) {
    await supabase.storage.from('monitor-photos').remove([img.storage_path]);
  }

  const { error } = await supabase
    .from('match_sub_hold_images')
    .delete()
    .eq('id', imageId);

  return { error };
}

export async function getAllSubHoldImagesForSession(sessionId: string): Promise<Array<{
  subHoldId: string;
  holdOrderIndex: number;
  subHoldOrderIndex: number;
  imageUrl: string;
  figureName: string;
  distanceM: number;
}>> {
  const { data: holds } = await supabase
    .from('match_holds')
    .select('id, order_index')
    .eq('match_session_id', sessionId)
    .eq('is_composite', true);

  if (!holds || holds.length === 0) return [];

  const holdIds = holds.map(h => h.id);
  const holdMap = Object.fromEntries(holds.map(h => [h.id, h.order_index]));

  const { data: subHolds } = await supabase
    .from('match_sub_holds')
    .select(`
      id,
      match_hold_id,
      order_index,
      distance_m,
      field_figure:field_figures(name)
    `)
    .in('match_hold_id', holdIds)
    .order('order_index');

  if (!subHolds || subHolds.length === 0) return [];

  const subHoldIds = subHolds.map(sh => sh.id);

  const { data: images } = await supabase
    .from('match_sub_hold_images')
    .select('*')
    .in('match_sub_hold_id', subHoldIds)
    .order('sort_order');

  if (!images || images.length === 0) return [];

  const paths = images.map(img => img.storage_path);
  const resolvedUrls = await resolveMonitorImageUrls(paths);

  const subHoldMap = Object.fromEntries(subHolds.map(sh => [sh.id, sh]));

  return images.map((img, i) => {
    const sh = subHoldMap[img.match_sub_hold_id];
    return {
      subHoldId: img.match_sub_hold_id,
      holdOrderIndex: holdMap[sh.match_hold_id] ?? 0,
      subHoldOrderIndex: sh.order_index,
      imageUrl: resolvedUrls[i],
      figureName: (sh as any).field_figure?.name || 'Ukjent',
      distanceM: sh.distance_m || 0,
    };
  });
}
