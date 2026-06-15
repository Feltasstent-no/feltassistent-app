import { supabase } from './supabase';
import { enqueue } from './offline-queue';

export async function resilientUpdate(params: {
  table: string;
  data: Record<string, unknown>;
  column: string;
  value: string;
}): Promise<{ error: any; queued: boolean }> {
  if (!navigator.onLine) {
    enqueue({
      table: params.table,
      type: 'update',
      data: params.data,
      filter: { column: params.column, value: params.value },
    });
    return { error: null, queued: true };
  }

  const { error } = await supabase
    .from(params.table)
    .update(params.data)
    .eq(params.column, params.value);

  if (error) {
    enqueue({
      table: params.table,
      type: 'update',
      data: params.data,
      filter: { column: params.column, value: params.value },
    });
    return { error: null, queued: true };
  }

  return { error: null, queued: false };
}

export async function resilientInsert(params: {
  table: string;
  data: Record<string, unknown>;
}): Promise<{ error: any; queued: boolean }> {
  if (!navigator.onLine) {
    enqueue({
      table: params.table,
      type: 'insert',
      data: params.data,
    });
    return { error: null, queued: true };
  }

  const { error } = await supabase
    .from(params.table)
    .insert(params.data);

  if (error) {
    enqueue({
      table: params.table,
      type: 'insert',
      data: params.data,
    });
    return { error: null, queued: true };
  }

  return { error: null, queued: false };
}
