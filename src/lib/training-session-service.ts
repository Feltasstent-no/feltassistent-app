import { supabase } from './supabase';
import type { TrainingSession, TrainingSeries, TrainingSeriesImage } from '../types/database';
import { compressImage } from './image-compression';

export interface CreateSessionParams {
  userId: string;
  title: string;
  sessionDate: string;
  disciplineId?: string | null;
  location?: string | null;
  weaponId?: string | null;
  barrelId?: string | null;
  ammoInventoryId?: string | null;
  classCode?: string | null;
  weather?: string | null;
  windNotes?: string | null;
  notes?: string | null;
  sessionType?: 'training' | 'range_match';
}

export async function createTrainingSession(params: CreateSessionParams): Promise<{ data: TrainingSession | null; error: any }> {
  const { data, error } = await supabase
    .from('training_sessions')
    .insert({
      user_id: params.userId,
      title: params.title,
      session_date: params.sessionDate,
      discipline_id: params.disciplineId || null,
      location: params.location || null,
      weapon_id: params.weaponId || null,
      barrel_id: params.barrelId || null,
      ammo_inventory_id: params.ammoInventoryId || null,
      class_code: params.classCode || null,
      weather: params.weather || null,
      wind_notes: params.windNotes || null,
      notes: params.notes || null,
      session_type: params.sessionType || 'training',
    })
    .select()
    .single();

  return { data, error };
}

export async function getTrainingSession(sessionId: string): Promise<TrainingSession | null> {
  const { data } = await supabase
    .from('training_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();

  return data;
}

export async function getActiveTrainingSessions(userId: string): Promise<TrainingSession[]> {
  const { data } = await supabase
    .from('training_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  return data || [];
}

export async function getTrainingSessionHistory(userId: string, limit = 50): Promise<TrainingSession[]> {
  const { data } = await supabase
    .from('training_sessions')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['completed', 'cancelled'])
    .order('session_date', { ascending: false })
    .limit(limit);

  return data || [];
}

export async function getRangeMatchSessions(userId: string, limit = 50): Promise<TrainingSession[]> {
  const { data } = await supabase
    .from('training_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('session_type', 'range_match')
    .order('session_date', { ascending: false })
    .limit(limit);

  return data || [];
}

export async function updateTrainingSessionMetadata(params: {
  sessionId: string;
  title?: string;
  notes?: string | null;
  weather?: string | null;
  windNotes?: string | null;
  location?: string | null;
}): Promise<{ error: any }> {
  const updateData: Record<string, unknown> = {};
  if (params.title !== undefined) updateData.title = params.title;
  if (params.notes !== undefined) updateData.notes = params.notes;
  if (params.weather !== undefined) updateData.weather = params.weather;
  if (params.windNotes !== undefined) updateData.wind_notes = params.windNotes;
  if (params.location !== undefined) updateData.location = params.location;

  const { error } = await supabase
    .from('training_sessions')
    .update(updateData)
    .eq('id', params.sessionId);

  return { error };
}

export async function completeTrainingSession(sessionId: string): Promise<{ error: any }> {
  const series = await getTrainingSeries(sessionId);

  const totalShots = series.reduce((sum, s) => sum + (s.shot_count || 0), 0);
  const totalScore = series.reduce((sum, s) => sum + (s.score || 0), 0);
  const totalInnerHits = series.reduce((sum, s) => sum + (s.inner_hits || 0), 0);

  const { error } = await supabase
    .from('training_sessions')
    .update({
      status: 'completed',
      total_shots: totalShots,
      total_score: totalScore,
      total_inner_hits: totalInnerHits,
      completed_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  return { error };
}

export async function cancelTrainingSession(sessionId: string): Promise<{ error: any }> {
  const { error } = await supabase
    .from('training_sessions')
    .update({ status: 'cancelled' })
    .eq('id', sessionId);

  return { error };
}

export async function deleteTrainingSession(sessionId: string): Promise<{ error: any }> {
  const images = await getAllSeriesImagesForSession(sessionId);
  if (images.length > 0) {
    const paths = images.map(img => img.storage_path);
    await supabase.storage.from('target-images').remove(paths);
  }

  const { error } = await supabase
    .from('training_sessions')
    .delete()
    .eq('id', sessionId);

  return { error };
}

export async function getTrainingSeries(sessionId: string): Promise<TrainingSeries[]> {
  const { data } = await supabase
    .from('training_series')
    .select('*')
    .eq('session_id', sessionId)
    .order('order_index');

  return data || [];
}

export async function addTrainingSeries(params: {
  sessionId: string;
  userId: string;
  orderIndex: number;
  shotCount?: number;
  shootingTimeSeconds?: number | null;
  distanceM?: number | null;
}): Promise<{ data: TrainingSeries | null; error: any }> {
  const { data, error } = await supabase
    .from('training_series')
    .insert({
      session_id: params.sessionId,
      user_id: params.userId,
      order_index: params.orderIndex,
      shot_count: params.shotCount || 5,
      shooting_time_seconds: params.shootingTimeSeconds || null,
      distance_m: params.distanceM || null,
    })
    .select()
    .single();

  return { data, error };
}

export async function updateTrainingSeries(params: {
  seriesId: string;
  score?: number | null;
  innerHits?: number | null;
  hits?: number | null;
  shotCount?: number;
  shootingTimeSeconds?: number | null;
  distanceM?: number | null;
  notes?: string | null;
  completed?: boolean;
}): Promise<{ error: any }> {
  const updateData: Record<string, unknown> = {};
  if (params.score !== undefined) updateData.score = params.score;
  if (params.innerHits !== undefined) updateData.inner_hits = params.innerHits;
  if (params.hits !== undefined) updateData.hits = params.hits;
  if (params.shotCount !== undefined) updateData.shot_count = params.shotCount;
  if (params.shootingTimeSeconds !== undefined) updateData.shooting_time_seconds = params.shootingTimeSeconds;
  if (params.distanceM !== undefined) updateData.distance_m = params.distanceM;
  if (params.notes !== undefined) updateData.notes = params.notes;
  if (params.completed !== undefined) {
    updateData.completed = params.completed;
    if (params.completed) updateData.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('training_series')
    .update(updateData)
    .eq('id', params.seriesId);

  return { error };
}

export async function deleteTrainingSeries(seriesId: string): Promise<{ error: any }> {
  const images = await getSeriesImages(seriesId);
  if (images.length > 0) {
    const paths = images.map(img => img.storage_path);
    await supabase.storage.from('target-images').remove(paths);
  }

  const { error } = await supabase
    .from('training_series')
    .delete()
    .eq('id', seriesId);

  return { error };
}

export async function getSeriesImages(seriesId: string): Promise<TrainingSeriesImage[]> {
  const { data } = await supabase
    .from('training_series_images')
    .select('*')
    .eq('series_id', seriesId)
    .order('created_at');

  return data || [];
}

export async function getAllSeriesImagesForSession(sessionId: string): Promise<TrainingSeriesImage[]> {
  const series = await getTrainingSeries(sessionId);
  if (series.length === 0) return [];

  const seriesIds = series.map(s => s.id);
  const { data } = await supabase
    .from('training_series_images')
    .select('*')
    .in('series_id', seriesIds)
    .order('created_at');

  return data || [];
}

function convertFileToJpeg(file: File, maxWidth = 1200, quality = 0.7): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round(height * (maxWidth / width));
        width = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => blob && blob.size > 0 ? resolve(blob) : reject(new Error('Conversion failed')),
        'image/jpeg',
        quality,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image')); };
    img.src = url;
  });
}

export async function uploadSeriesImage(params: {
  seriesId: string;
  userId: string;
  file: File;
}): Promise<{ data: TrainingSeriesImage | null; error: any }> {
  const compressedFile = await compressImage(params.file);
  let uploadBlob: Blob;
  try {
    uploadBlob = await convertFileToJpeg(compressedFile);
  } catch {
    uploadBlob = compressedFile;
  }

  const fileName = `${Math.random().toString(36).substring(2)}.jpg`;
  const filePath = `${params.userId}/training/${params.seriesId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('target-images')
    .upload(filePath, uploadBlob, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (uploadError) return { data: null, error: uploadError };

  const { data, error } = await supabase
    .from('training_series_images')
    .insert({
      series_id: params.seriesId,
      user_id: params.userId,
      storage_path: filePath,
    })
    .select()
    .single();

  return { data, error };
}

export async function deleteSeriesImage(image: TrainingSeriesImage): Promise<{ error: any }> {
  await supabase.storage.from('target-images').remove([image.storage_path]);

  const { error } = await supabase
    .from('training_series_images')
    .delete()
    .eq('id', image.id);

  return { error };
}

export function getImageUrl(storagePath: string): string {
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
    return storagePath;
  }
  const { data } = supabase.storage.from('target-images').getPublicUrl(storagePath);
  return data.publicUrl;
}
