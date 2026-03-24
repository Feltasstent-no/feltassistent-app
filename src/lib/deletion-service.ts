import { supabase } from './supabase';

export interface DeletionResult {
  success: boolean;
  error?: string;
  deletedRows?: {
    competition_entries?: number;
    competition_stage_images?: number;
    competition_ai_summaries?: number;
    training_entries?: number;
    training_entry_images?: number;
  };
  deletedFiles?: number;
}

export async function deleteCompetition(
  competitionId: string,
  userId: string
): Promise<DeletionResult> {
  try {
    const { data: competition, error: fetchError } = await supabase
      .from('competitions')
      .select('id, user_id')
      .eq('id', competitionId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!competition) throw new Error('Stevne ikke funnet');
    if (competition.user_id !== userId) {
      throw new Error('Du har ikke tilgang til å slette dette stevnet');
    }

    const { data: entries } = await supabase
      .from('competition_entries')
      .select('id')
      .eq('competition_id', competitionId);

    const entryIds = entries?.map((e) => e.id) || [];

    let deletedFiles = 0;
    if (entryIds.length > 0) {
      const { data: images } = await supabase
        .from('competition_stage_images')
        .select('storage_path')
        .in('entry_id', entryIds)
        .not('storage_path', 'is', null);

      if (images && images.length > 0) {
        const paths = images
          .map((img) => img.storage_path)
          .filter((path): path is string => path !== null);

        if (paths.length > 0) {
          const { data: removedFiles, error: storageError } = await supabase.storage
            .from('competition-images')
            .remove(paths);

          if (!storageError && removedFiles) {
            deletedFiles = removedFiles.length;
          }
        }
      }
    }

    const { error: deleteError } = await supabase
      .from('competitions')
      .delete()
      .eq('id', competitionId);

    if (deleteError) throw deleteError;

    return {
      success: true,
      deletedFiles,
    };
  } catch (error) {
    console.error('Error deleting competition:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Ukjent feil',
    };
  }
}

export async function deleteCompetitionEntry(
  entryId: string,
  userId: string
): Promise<DeletionResult> {
  try {
    const { data: entry, error: fetchError } = await supabase
      .from('competition_entries')
      .select('id, user_id')
      .eq('id', entryId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!entry) throw new Error('Deltakelse ikke funnet');
    if (entry.user_id !== userId) {
      throw new Error('Du har ikke tilgang til å slette denne deltakelsen');
    }

    const { data: images } = await supabase
      .from('competition_stage_images')
      .select('storage_path')
      .eq('entry_id', entryId)
      .not('storage_path', 'is', null);

    let deletedFiles = 0;
    if (images && images.length > 0) {
      const paths = images
        .map((img) => img.storage_path)
        .filter((path): path is string => path !== null);

      if (paths.length > 0) {
        const { data: removedFiles, error: storageError } = await supabase.storage
          .from('competition-images')
          .remove(paths);

        if (!storageError && removedFiles) {
          deletedFiles = removedFiles.length;
        }
      }
    }

    const { error: deleteError } = await supabase
      .from('competition_entries')
      .delete()
      .eq('id', entryId);

    if (deleteError) throw deleteError;

    return {
      success: true,
      deletedFiles,
    };
  } catch (error) {
    console.error('Error deleting entry:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Ukjent feil',
    };
  }
}

export async function deleteTrainingEntry(
  entryId: string,
  userId: string
): Promise<DeletionResult> {
  try {
    const { data: entry, error: fetchError } = await supabase
      .from('training_entries')
      .select('id, user_id')
      .eq('id', entryId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!entry) throw new Error('Treningslogg ikke funnet');
    if (entry.user_id !== userId) {
      throw new Error('Du har ikke tilgang til å slette denne treningsloggen');
    }

    const { data: images } = await supabase
      .from('training_entry_images')
      .select('storage_path')
      .eq('entry_id', entryId)
      .not('storage_path', 'is', null);

    let deletedFiles = 0;
    if (images && images.length > 0) {
      const paths = images
        .map((img) => img.storage_path)
        .filter((path): path is string => path !== null);

      if (paths.length > 0) {
        const { data: removedFiles, error: storageError } = await supabase.storage
          .from('training-images')
          .remove(paths);

        if (!storageError && removedFiles) {
          deletedFiles = removedFiles.length;
        }
      }
    }

    const { error: deleteError } = await supabase
      .from('training_entries')
      .delete()
      .eq('id', entryId);

    if (deleteError) throw deleteError;

    return {
      success: true,
      deletedFiles,
    };
  } catch (error) {
    console.error('Error deleting training entry:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Ukjent feil',
    };
  }
}

export async function deleteMatchSession(matchId: string): Promise<void> {
  const { error } = await supabase
    .from('match_sessions')
    .delete()
    .eq('id', matchId);

  if (error) {
    throw new Error(error.message || 'Kunne ikke slette stevnet');
  }
}
