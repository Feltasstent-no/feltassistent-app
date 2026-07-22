/**
 * Display name helpers for converting internal database keys to user-facing Norwegian text.
 * Use these throughout the UI to avoid showing raw snake_case keys or enum values.
 */

const CATEGORY_LABELS: Record<string, string> = {
  ungdom: 'Ungdom',
  junior: 'Junior',
  senior: 'Senior',
  veteran: 'Veteran',
  spesial: 'Spesial',
};

const FIELD_TYPE_LABELS: Record<string, string> = {
  finfelt: 'Finfelt',
  grovfelt: 'Grovfelt',
};

export function getCategoryDisplayName(category: string | null | undefined): string {
  if (!category) return '';
  return CATEGORY_LABELS[category] || category.charAt(0).toUpperCase() + category.slice(1);
}

export function getFieldTypeDisplayName(fieldType: string | null | undefined): string {
  if (!fieldType) return '';
  return FIELD_TYPE_LABELS[fieldType] || fieldType.charAt(0).toUpperCase() + fieldType.slice(1);
}

export function formatClassCode(code: string): string {
  return code
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
