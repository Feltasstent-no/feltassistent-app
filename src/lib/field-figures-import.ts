import { supabase } from './supabase';

export interface FieldFigureImportData {
  code: string;
  short_code?: string;
  name: string;
  description?: string;
  category_id?: string;
  width_mm?: number;
  height_mm?: number;
  normal_distance_m?: number;
  max_distance_m?: number;
  ag3_hk416_max_distance_m?: number;
  shape_type?: 'standing' | 'circle' | 'half_circle' | 'triangle' | 'rectangle' | 'polygon' | 'custom';
  svg_content: string;
  notes?: string;
  is_active?: boolean;
}

export async function importFieldFigures(figures: FieldFigureImportData[]) {
  const results = {
    success: [] as string[],
    failed: [] as { code: string; error: string }[],
  };

  for (const figure of figures) {
    const { error } = await supabase.from('field_figures').insert({
      code: figure.code,
      short_code: figure.short_code || null,
      name: figure.name,
      description: figure.description || null,
      category_id: figure.category_id || null,
      width_mm: figure.width_mm || null,
      height_mm: figure.height_mm || null,
      normal_distance_m: figure.normal_distance_m || null,
      max_distance_m: figure.max_distance_m || null,
      ag3_hk416_max_distance_m: figure.ag3_hk416_max_distance_m || null,
      shape_type: figure.shape_type || null,
      svg_content: figure.svg_content,
      svg_data: figure.svg_content,
      notes: figure.notes || null,
      is_active: figure.is_active !== undefined ? figure.is_active : true,
      difficulty: 1,
      order_index: 0,
      distance_m: figure.normal_distance_m || 100,
    });

    if (error) {
      results.failed.push({ code: figure.code, error: error.message });
    } else {
      results.success.push(figure.code);
    }
  }

  return results;
}

export const exampleFigures: FieldFigureImportData[] = [
  {
    code: 'B100',
    short_code: 'B100',
    name: 'Grovfelt stående, 100 cm bred',
    description: 'Standard grovfelt stående figur',
    width_mm: 1000,
    height_mm: 1800,
    normal_distance_m: 525,
    max_distance_m: 600,
    ag3_hk416_max_distance_m: 400,
    shape_type: 'standing',
    svg_content: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 180"><rect width="100" height="180" fill="black"/></svg>',
    notes: 'Placeholder - replace with actual figure',
    is_active: true,
  },
  {
    code: 'C35',
    short_code: 'C35',
    name: 'Sirkel 35 cm diameter',
    description: 'Sirkulær feltfigur',
    width_mm: 350,
    height_mm: 350,
    normal_distance_m: 300,
    max_distance_m: 400,
    ag3_hk416_max_distance_m: 300,
    shape_type: 'circle',
    svg_content: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="black"/></svg>',
    notes: 'Placeholder - replace with actual figure',
    is_active: true,
  },
  {
    code: '1/4',
    short_code: '1/4',
    name: 'Kvartfigur',
    description: 'En fjerdedels figur',
    width_mm: 550,
    height_mm: 1000,
    normal_distance_m: 200,
    max_distance_m: 300,
    ag3_hk416_max_distance_m: 200,
    shape_type: 'custom',
    svg_content: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 55 100"><path d="M0,0 L55,0 L55,100 L0,50 Z" fill="black"/></svg>',
    notes: 'Placeholder - replace with actual figure',
    is_active: true,
  },
];
