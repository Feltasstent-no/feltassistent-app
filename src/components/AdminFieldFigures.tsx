import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { FieldFigure, FieldFigureCategory } from '../types/database';
import { FieldFigurePreview } from './FieldFigurePreview';
import { Target, Plus, Save, X, CreditCard as Edit2, Trash2, Eye, Upload } from 'lucide-react';

export function AdminFieldFigures() {
  const [figures, setFigures] = useState<FieldFigure[]>([]);
  const [categories, setCategories] = useState<FieldFigureCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [previewFigure, setPreviewFigure] = useState<FieldFigure | null>(null);
  const [uploading, setUploading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'grovfelt' | 'finfelt'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingFileInputRef, setEditingFileInputRef] = useState<Record<string, HTMLInputElement | null>>({});
  const [syncing, setSyncing] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    short_code: '',
    name: '',
    description: '',
    category_id: '',
    width_mm: 0,
    height_mm: 0,
    normal_distance_m: 0,
    max_distance_m: 0,
    ag3_hk416_max_distance_m: 0,
    shape_type: 'standing',
    svg_content: '',
    notes: '',
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [figuresRes, categoriesRes] = await Promise.all([
      supabase.from('field_figures').select('*').order('code'),
      supabase.from('field_figure_categories').select('*').order('display_order'),
    ]);

    if (figuresRes.data) setFigures(figuresRes.data);
    if (categoriesRes.data) setCategories(categoriesRes.data);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!formData.code || !formData.name) {
      alert('Kode og navn er påkrevd');
      return;
    }

    const { error } = await supabase
      .from('field_figures')
      .insert({
        code: formData.code,
        short_code: formData.short_code || null,
        name: formData.name,
        description: formData.description || null,
        category_id: formData.category_id || null,
        width_mm: formData.width_mm || null,
        height_mm: formData.height_mm || null,
        normal_distance_m: formData.normal_distance_m || null,
        max_distance_m: formData.max_distance_m || null,
        ag3_hk416_max_distance_m: formData.ag3_hk416_max_distance_m || null,
        shape_type: formData.shape_type || null,
        svg_content: formData.svg_content || null,
        svg_data: formData.svg_content || '<svg></svg>',
        notes: formData.notes || null,
        is_active: formData.is_active,
        target_count: 1,
        difficulty: 1,
        order_index: 0,
        distance_m: formData.normal_distance_m || 100,
      });

    if (error) {
      alert('Kunne ikke opprette figur: ' + error.message);
      return;
    }

    setShowNew(false);
    resetForm();
    fetchData();
  };

  const handleUpdate = async (id: string) => {
    const figure = figures.find(f => f.id === id);
    if (!figure) return;

    const { error } = await supabase
      .from('field_figures')
      .update({
        code: figure.code,
        short_code: figure.short_code,
        name: figure.name,
        description: figure.description,
        category_id: figure.category_id,
        width_mm: figure.width_mm,
        height_mm: figure.height_mm,
        normal_distance_m: figure.normal_distance_m,
        max_distance_m: figure.max_distance_m,
        ag3_hk416_max_distance_m: figure.ag3_hk416_max_distance_m,
        shape_type: figure.shape_type,
        svg_content: figure.svg_content,
        svg_data: figure.svg_content || figure.svg_data,
        notes: figure.notes,
        is_active: figure.is_active,
      })
      .eq('id', id);

    if (error) {
      alert('Kunne ikke oppdatere figur: ' + error.message);
      return;
    }

    setEditingId(null);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Er du sikker på at du vil slette denne figuren? Dette kan påvirke eksisterende stevner.')) {
      return;
    }

    const { error } = await supabase
      .from('field_figures')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Kunne ikke slette figur: ' + error.message);
      return;
    }

    fetchData();
  };

  const startEdit = (figure: FieldFigure) => {
    setEditingId(figure.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    fetchData();
  };

  const updateFigure = (id: string, field: keyof FieldFigure, value: any) => {
    setFigures(figures.map(f =>
      f.id === id ? { ...f, [field]: value } : f
    ));
  };

  const resetForm = () => {
    setFormData({
      code: '',
      short_code: '',
      name: '',
      description: '',
      category_id: '',
      width_mm: 0,
      height_mm: 0,
      normal_distance_m: 0,
      max_distance_m: 0,
      ag3_hk416_max_distance_m: 0,
      shape_type: 'standing',
      svg_content: '',
      notes: '',
      is_active: true,
    });
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return null;
    return categories.find(c => c.id === categoryId)?.name;
  };

  const handleFileUpload = async (file: File, figureId?: string) => {
    if (!file) return null;

    const allowedTypes = ['image/svg+xml', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      alert('Kun SVG og PNG filer er tillatt');
      return null;
    }

    setUploading(true);

    try {
      let svgContent = '';

      if (file.type === 'image/svg+xml') {
        const text = await file.text();
        svgContent = text;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('field-figures')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('field-figures')
        .getPublicUrl(filePath);

      if (figureId) {
        const updateData: any = {
          image_url: publicUrl,
          file_type: file.type,
        };

        if (svgContent) {
          updateData.svg_data = svgContent;
          updateData.svg_content = svgContent;
        }

        await supabase
          .from('field_figures')
          .update(updateData)
          .eq('id', figureId);
      }

      return { imageUrl: publicUrl, fileType: file.type, svgContent };
    } catch (error: any) {
      alert('Kunne ikke laste opp fil: ' + error.message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleNewFigureFileUpload = async (file: File) => {
    const result = await handleFileUpload(file);
    if (result) {
      setFormData({
        ...formData,
        svg_content: '',
      });
    }
  };

  const handleEditFigureFileUpload = async (file: File, figureId: string) => {
    const result = await handleFileUpload(file, figureId);
    if (result) {
      fetchData();
    }
  };

  const handleSyncAllFromStorage = async () => {
    if (!confirm('Dette vil oppdatere svg_data for alle figurer som har image_url. Fortsette?')) {
      return;
    }

    setSyncing(true);
    let updated = 0;
    let failed = 0;

    for (const figure of figures) {
      if (!figure.image_url || figure.file_type !== 'image/svg+xml') {
        continue;
      }

      try {
        console.log(`Syncing ${figure.code}...`);
        const response = await fetch(figure.image_url);
        if (!response.ok) {
          console.error(`Failed to fetch ${figure.code}`);
          failed++;
          continue;
        }

        const svgContent = await response.text();
        const { error } = await supabase
          .from('field_figures')
          .update({
            svg_data: svgContent,
            svg_content: svgContent,
          })
          .eq('id', figure.id);

        if (error) {
          console.error(`Failed to update ${figure.code}:`, error);
          failed++;
        } else {
          updated++;
        }
      } catch (err) {
        console.error(`Error syncing ${figure.code}:`, err);
        failed++;
      }
    }

    setSyncing(false);
    alert(`✅ Synkronisering fullført!\n\nOppdatert: ${updated}\nFeilet: ${failed}`);
    fetchData();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      </div>
    );
  }

  const filteredFigures = figures.filter(figure => {
    if (categoryFilter === 'all') return true;
    return figure.category === categoryFilter;
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-900">Feltfigur-bibliotek</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncAllFromStorage}
            disabled={syncing}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center space-x-2 disabled:opacity-50"
            title="Synkroniser alle SVG-filer fra storage"
          >
            <Upload className="w-4 h-4" />
            <span>{syncing ? 'Synkroniserer...' : 'Sync SVG'}</span>
          </button>
          <button
            onClick={() => setShowNew(!showNew)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center space-x-2"
          >
            {showNew ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span className="hidden sm:inline">{showNew ? 'Avbryt' : 'Ny figur'}</span>
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              categoryFilter === 'all'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Alle ({figures.length})
          </button>
          <button
            onClick={() => setCategoryFilter('grovfelt')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              categoryFilter === 'grovfelt'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Grovfelt ({figures.filter(f => f.category === 'grovfelt').length})
          </button>
          <button
            onClick={() => setCategoryFilter('finfelt')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              categoryFilter === 'finfelt'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Finfelt ({figures.filter(f => f.category === 'finfelt').length})
          </button>
        </div>
      </div>

      {showNew && (
        <div className="mb-6 p-4 sm:p-6 bg-slate-50 rounded-lg space-y-4">
          <h3 className="font-semibold text-slate-900 mb-4">Opprett ny feltfigur</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Kode *</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="B100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Kortkode</label>
              <input
                type="text"
                value={formData.short_code}
                onChange={(e) => setFormData({ ...formData, short_code: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="B100 / C35 / 1/4"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Navn *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Grovfelt stående, 100 cm bred"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Beskrivelse</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                placeholder="Beskrivelse av figuren..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Kategori</label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">Velg kategori...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Formtype</label>
              <select
                value={formData.shape_type}
                onChange={(e) => setFormData({ ...formData, shape_type: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="standing">Stående</option>
                <option value="circle">Sirkel</option>
                <option value="half_circle">Halvsirkel</option>
                <option value="triangle">Trekant</option>
                <option value="rectangle">Rektangel</option>
                <option value="polygon">Polygon</option>
                <option value="custom">Tilpasset</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Bredde (mm)</label>
              <input
                type="number"
                min="0"
                value={formData.width_mm || ''}
                onChange={(e) => setFormData({ ...formData, width_mm: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="550"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Høyde (mm)</label>
              <input
                type="number"
                min="0"
                value={formData.height_mm || ''}
                onChange={(e) => setFormData({ ...formData, height_mm: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="1000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Normalavstand (m)</label>
              <input
                type="number"
                min="0"
                value={formData.normal_distance_m || ''}
                onChange={(e) => setFormData({ ...formData, normal_distance_m: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="525"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Maksavstand (m)</label>
              <input
                type="number"
                min="0"
                value={formData.max_distance_m || ''}
                onChange={(e) => setFormData({ ...formData, max_distance_m: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">AG3/HK416 maks (m)</label>
              <input
                type="number"
                min="0"
                value={formData.ag3_hk416_max_distance_m || ''}
                onChange={(e) => setFormData({ ...formData, ag3_hk416_max_distance_m: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="400"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Figurbilde (PNG eller SVG fil)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".svg,.png,image/svg+xml,image/png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleNewFigureFileUpload(file);
                  }
                }}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-slate-500">
                Last opp en PNG eller SVG fil. Alternativt kan du lime inn SVG-kode nedenfor.
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Eller lim inn SVG-innhold
              </label>
              <textarea
                value={formData.svg_content}
                onChange={(e) => setFormData({ ...formData, svg_content: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none font-mono text-sm"
                placeholder="<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>...</svg>"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Notater</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                placeholder="Interne notater..."
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 rounded"
                />
                <span className="text-sm text-slate-700">Aktiv</span>
              </label>
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={uploading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            <span>{uploading ? 'Laster opp fil...' : 'Opprett figur'}</span>
          </button>
        </div>
      )}

      <div className="space-y-2">
        {filteredFigures.map((figure) => (
          <div
            key={figure.id}
            className="p-4 bg-slate-50 rounded-lg border border-slate-200"
          >
            {editingId === figure.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Kode</label>
                    <input
                      type="text"
                      value={figure.code}
                      onChange={(e) => updateFigure(figure.id, 'code', e.target.value)}
                      className="w-full px-3 py-2 rounded border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Kortkode</label>
                    <input
                      type="text"
                      value={figure.short_code || ''}
                      onChange={(e) => updateFigure(figure.id, 'short_code', e.target.value)}
                      className="w-full px-3 py-2 rounded border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Navn</label>
                    <input
                      type="text"
                      value={figure.name}
                      onChange={(e) => updateFigure(figure.id, 'name', e.target.value)}
                      className="w-full px-3 py-2 rounded border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Beskrivelse</label>
                    <textarea
                      value={figure.description || ''}
                      onChange={(e) => updateFigure(figure.id, 'description', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 rounded border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Kategori</label>
                    <select
                      value={figure.category_id || ''}
                      onChange={(e) => updateFigure(figure.id, 'category_id', e.target.value)}
                      className="w-full px-3 py-2 rounded border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm"
                    >
                      <option value="">Ingen kategori</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Formtype</label>
                    <select
                      value={figure.shape_type || 'standing'}
                      onChange={(e) => updateFigure(figure.id, 'shape_type', e.target.value)}
                      className="w-full px-3 py-2 rounded border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm"
                    >
                      <option value="standing">Stående</option>
                      <option value="circle">Sirkel</option>
                      <option value="half_circle">Halvsirkel</option>
                      <option value="triangle">Trekant</option>
                      <option value="rectangle">Rektangel</option>
                      <option value="polygon">Polygon</option>
                      <option value="custom">Tilpasset</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Bredde (mm)</label>
                    <input
                      type="number"
                      value={figure.width_mm || ''}
                      onChange={(e) => updateFigure(figure.id, 'width_mm', parseInt(e.target.value) || null)}
                      className="w-full px-3 py-2 rounded border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Høyde (mm)</label>
                    <input
                      type="number"
                      value={figure.height_mm || ''}
                      onChange={(e) => updateFigure(figure.id, 'height_mm', parseInt(e.target.value) || null)}
                      className="w-full px-3 py-2 rounded border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Normalavstand (m)</label>
                    <input
                      type="number"
                      value={figure.normal_distance_m || ''}
                      onChange={(e) => updateFigure(figure.id, 'normal_distance_m', parseInt(e.target.value) || null)}
                      className="w-full px-3 py-2 rounded border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Maksavstand (m)</label>
                    <input
                      type="number"
                      value={figure.max_distance_m || ''}
                      onChange={(e) => updateFigure(figure.id, 'max_distance_m', parseInt(e.target.value) || null)}
                      className="w-full px-3 py-2 rounded border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">AG3/HK416 maks (m)</label>
                    <input
                      type="number"
                      value={figure.ag3_hk416_max_distance_m || ''}
                      onChange={(e) => updateFigure(figure.id, 'ag3_hk416_max_distance_m', parseInt(e.target.value) || null)}
                      className="w-full px-3 py-2 rounded border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">SVG-innhold</label>
                    <textarea
                      value={figure.svg_content || ''}
                      onChange={(e) => updateFigure(figure.id, 'svg_content', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 rounded border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm resize-none font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Last opp nytt bilde (PNG eller SVG)
                    </label>
                    <input
                      type="file"
                      accept=".svg,.png,image/svg+xml,image/png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleEditFigureFileUpload(file, figure.id);
                        }
                      }}
                      className="w-full px-3 py-2 rounded border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm"
                    />
                    {figure.image_url && (
                      <p className="mt-1 text-xs text-emerald-600">
                        ✓ Fil lastet opp
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Notater</label>
                    <textarea
                      value={figure.notes || ''}
                      onChange={(e) => updateFigure(figure.id, 'notes', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 rounded border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm resize-none"
                    />
                  </div>

                  <div className="flex items-center">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={figure.is_active}
                        onChange={(e) => updateFigure(figure.id, 'is_active', e.target.checked)}
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 rounded"
                      />
                      <span className="text-sm text-slate-700">Aktiv</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <button
                    onClick={() => handleUpdate(figure.id)}
                    disabled={uploading}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                    <span>{uploading ? 'Laster opp...' : 'Lagre'}</span>
                  </button>
                  <button
                    onClick={cancelEdit}
                    disabled={uploading}
                    className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X className="w-4 h-4" />
                    <span>Avbryt</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="flex-shrink-0">
                    <FieldFigurePreview figure={figure} size="sm" showDetails={false} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-bold text-slate-900">
                        {figure.short_code || figure.code}
                      </p>
                      <span className="text-slate-400">•</span>
                      <p className="text-slate-900">{figure.name}</p>
                      {!figure.is_active && (
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-xs rounded-full">
                          Inaktiv
                        </span>
                      )}
                      {getCategoryName(figure.category_id) && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                          {getCategoryName(figure.category_id)}
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-slate-600 space-y-1">
                      {figure.description && (
                        <p>{figure.description}</p>
                      )}
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {figure.width_mm && figure.height_mm && (
                          <span>{figure.width_mm} × {figure.height_mm} mm</span>
                        )}
                        {figure.normal_distance_m && (
                          <span>Normal: {figure.normal_distance_m}m</span>
                        )}
                        {figure.max_distance_m && (
                          <span>Maks: {figure.max_distance_m}m</span>
                        )}
                        {figure.ag3_hk416_max_distance_m && (
                          <span>AG3/HK416: {figure.ag3_hk416_max_distance_m}m</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setPreviewFigure(figure)}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                    title="Forhåndsvis"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => startEdit(figure)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Rediger"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(figure.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Slett"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {filteredFigures.length === 0 && !showNew && (
          <p className="text-center text-slate-600 py-8">
            {categoryFilter === 'all'
              ? 'Ingen feltfigurer funnet'
              : `Ingen ${categoryFilter === 'grovfelt' ? 'grovfelt' : 'finfelt'} figurer funnet`}
          </p>
        )}
      </div>

      {previewFigure && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewFigure(null)}
        >
          <div
            className="bg-white rounded-xl p-4 sm:p-6 max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">
                {previewFigure.short_code || previewFigure.code} - {previewFigure.name}
              </h3>
              <button
                onClick={() => setPreviewFigure(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="flex items-center justify-center bg-slate-50 rounded-lg p-8 mb-4">
              <FieldFigurePreview figure={previewFigure} size="xl" showDetails={false} />
            </div>

            <div className="space-y-2 text-sm">
              {previewFigure.description && (
                <p className="text-slate-700">{previewFigure.description}</p>
              )}
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                {previewFigure.width_mm && previewFigure.height_mm && (
                  <div>
                    <span className="font-medium">Dimensjoner:</span> {previewFigure.width_mm} × {previewFigure.height_mm} mm
                  </div>
                )}
                {previewFigure.normal_distance_m && (
                  <div>
                    <span className="font-medium">Normalavstand:</span> {previewFigure.normal_distance_m}m
                  </div>
                )}
                {previewFigure.max_distance_m && (
                  <div>
                    <span className="font-medium">Maksavstand:</span> {previewFigure.max_distance_m}m
                  </div>
                )}
                {previewFigure.ag3_hk416_max_distance_m && (
                  <div>
                    <span className="font-medium">AG3/HK416 maks:</span> {previewFigure.ag3_hk416_max_distance_m}m
                  </div>
                )}
                {previewFigure.shape_type && (
                  <div>
                    <span className="font-medium">Type:</span> {previewFigure.shape_type}
                  </div>
                )}
              </div>
              {previewFigure.notes && (
                <p className="text-slate-500 italic mt-2">{previewFigure.notes}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
