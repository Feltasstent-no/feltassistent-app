import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { TrainingEntry, Discipline, TrainingEntryImage } from '../types/database';
import { ArrowLeft, CreditCard as Edit, Trash2, Upload, X, Image as ImageIcon } from 'lucide-react';

export function TrainingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [entry, setEntry] = useState<TrainingEntry | null>(null);
  const [discipline, setDiscipline] = useState<Discipline | null>(null);
  const [images, setImages] = useState<TrainingEntryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchEntry();
    fetchImages();
  }, [id]);

  const fetchEntry = async () => {
    if (!id) return;

    const { data: entryData } = await supabase
      .from('training_entries')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (entryData) {
      setEntry(entryData);

      if (entryData.discipline_id) {
        const { data: disciplineData } = await supabase
          .from('disciplines')
          .select('*')
          .eq('id', entryData.discipline_id)
          .maybeSingle();

        if (disciplineData) {
          setDiscipline(disciplineData);
        }
      }
    }

    setLoading(false);
  };

  const fetchImages = async () => {
    if (!id) return;

    const { data } = await supabase
      .from('training_entry_images')
      .select('*')
      .eq('entry_id', id)
      .order('created_at', { ascending: true });

    if (data) {
      setImages(data);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !id || !user) return;

    setUploading(true);

    try {
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user.id}/${id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('target-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('training_entry_images')
        .insert({
          entry_id: id,
          user_id: user.id,
          storage_path: filePath,
        });

      if (dbError) throw dbError;

      fetchImages();
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (image: TrainingEntryImage) => {
    if (!confirm('Er du sikker på at du vil slette dette bildet?')) return;

    await supabase.storage.from('target-images').remove([image.storage_path]);
    await supabase.from('training_entry_images').delete().eq('id', image.id);

    fetchImages();
  };

  const getImageUrl = (path: string) => {
    const { data } = supabase.storage.from('target-images').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleDelete = async () => {
    if (!id || !confirm('Er du sikker på at du vil slette denne treningsøkten?')) return;

    for (const image of images) {
      await supabase.storage.from('target-images').remove([image.storage_path]);
    }

    await supabase.from('training_entries').delete().eq('id', id);
    navigate('/training');
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      </Layout>
    );
  }

  if (!entry) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-slate-600">Treningsøkt ikke funnet</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl pb-20 md:pb-8">
        <div className="mb-8">
          <button
            onClick={() => navigate('/training')}
            className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Tilbake</span>
          </button>

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Treningsøkt</h1>
              <p className="text-slate-600 mt-1">
                {new Date(entry.entry_date).toLocaleDateString('nb-NO', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={handleDelete}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Slett"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Grunnleggende info</h2>

            <div className="grid grid-cols-2 gap-4">
              {discipline && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Disiplin</p>
                  <p className="font-medium text-slate-900">{discipline.name}</p>
                </div>
              )}

              {entry.class_code && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Klasse</p>
                  <p className="font-medium text-slate-900">{entry.class_code}</p>
                </div>
              )}

              {entry.location && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Sted</p>
                  <p className="font-medium text-slate-900">{entry.location}</p>
                </div>
              )}

              {entry.distance_m && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Avstand</p>
                  <p className="font-medium text-slate-900">{entry.distance_m} m</p>
                </div>
              )}

              {entry.position && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Stilling</p>
                  <p className="font-medium text-slate-900 capitalize">{entry.position}</p>
                </div>
              )}

              {entry.shots_total && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Antall skudd</p>
                  <p className="font-medium text-slate-900">{entry.shots_total}</p>
                </div>
              )}
            </div>
          </div>

          {(entry.score || entry.inner_hits || entry.hits || entry.duration_seconds) && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Resultat</h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {entry.score !== null && entry.score > 0 && (
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Poeng</p>
                    <p className="text-2xl font-bold text-emerald-600">{entry.score}</p>
                  </div>
                )}

                {entry.inner_hits !== null && entry.inner_hits > 0 && (
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Innertreff</p>
                    <p className="text-2xl font-bold text-slate-900">{entry.inner_hits}</p>
                  </div>
                )}

                {entry.hits !== null && entry.hits > 0 && (
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Treff</p>
                    <p className="text-2xl font-bold text-slate-900">{entry.hits}</p>
                  </div>
                )}

                {entry.duration_seconds && (
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Varighet</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {Math.floor(entry.duration_seconds / 60)}:{(entry.duration_seconds % 60).toString().padStart(2, '0')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {(entry.weather || entry.wind_notes) && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Forhold</h2>

              <div className="space-y-3">
                {entry.weather && (
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Vær</p>
                    <p className="text-slate-900">{entry.weather}</p>
                  </div>
                )}

                {entry.wind_notes && (
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Vind</p>
                    <p className="text-slate-900">{entry.wind_notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {(entry.technical_notes || entry.mental_notes || entry.equipment_notes || entry.general_notes) && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Notater</h2>

              <div className="space-y-4">
                {entry.technical_notes && (
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-1">Teknisk</p>
                    <p className="text-slate-900">{entry.technical_notes}</p>
                  </div>
                )}

                {entry.mental_notes && (
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-1">Mentalt</p>
                    <p className="text-slate-900">{entry.mental_notes}</p>
                  </div>
                )}

                {entry.equipment_notes && (
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-1">Utstyr</p>
                    <p className="text-slate-900">{entry.equipment_notes}</p>
                  </div>
                )}

                {entry.general_notes && (
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-1">Generelt</p>
                    <p className="text-slate-900">{entry.general_notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Skivebilder</h2>
              <label className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition flex items-center space-x-2 text-sm">
                <Upload className="w-4 h-4" />
                <span>{uploading ? 'Laster opp...' : 'Last opp'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>

            {images.length === 0 ? (
              <div className="text-center py-8">
                <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 text-sm">Ingen bilder lagt til ennå</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {images.map((image) => (
                  <div key={image.id} className="relative group">
                    <img
                      src={getImageUrl(image.storage_path)}
                      alt="Skivebilde"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => handleDeleteImage(image)}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
