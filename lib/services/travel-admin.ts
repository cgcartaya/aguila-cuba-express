import { supabase } from '@/lib/supabase';
import { TRAVEL_BUCKET, validateTravelContent, type TravelContent, type TravelPackage } from '@/lib/travel/types';

export async function listTravelPackages(storeId: string): Promise<TravelPackage[]> {
  const { data, error } = await supabase.from('travel_packages').select('*').eq('store_id', storeId).order('created_at');
  if (error) throw new Error('No se pudo cargar el catálogo de viajes.');
  return data || [];
}
export async function saveTravelPackage(storeId: string, content: TravelContent, status: TravelPackage['status'], previous?: TravelPackage): Promise<TravelPackage> {
  const problem = validateTravelContent(content, status);
  if (problem) throw new Error(problem);
  const payload = { content, status };
  const query = previous
    ? supabase.from('travel_packages').update(payload).eq('store_id', storeId).eq('id', previous.id).eq('version', previous.version)
    : supabase.from('travel_packages').insert({ ...payload, store_id: storeId });
  const { data, error } = await query.select('*').maybeSingle();
  if (error?.code === '23505') throw new Error('Este PDF ya fue importado. Recarga el catálogo para abrir el paquete existente.');
  if (error) throw new Error('No se pudo guardar el paquete. Verifica tus permisos y vuelve a intentar.');
  if (!data) throw new Error('Otro usuario modificó este paquete. Cierra el editor, recarga el catálogo y vuelve a abrirlo.');
  return data;
}
export async function deleteTravelPackage(pkg: TravelPackage) {
  const { data, error } = await supabase.from('travel_packages').delete().eq('store_id', pkg.store_id).eq('id', pkg.id).eq('version', pkg.version).select('id');
  if (error) throw new Error('No se pudo eliminar el paquete.');
  if (!data?.length) throw new Error('El paquete cambió. Recarga el catálogo antes de eliminarlo.');
}
export async function uploadTravelAsset(storeId: string, file: File | Blob, kind: 'pdf' | 'image') {
  const limit = kind === 'pdf' ? 50 * 1024 * 1024 : 8 * 1024 * 1024;
  if (file.size > limit) throw new Error(kind === 'pdf' ? 'El PDF supera los 50 MB.' : 'La imagen supera los 8 MB.');
  const allowed = kind === 'pdf' ? ['application/pdf'] : ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) throw new Error('Formato de archivo no admitido.');
  const extension = kind === 'pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : file.type === 'image/jpeg' ? 'jpg' : 'webp';
  const path = `${storeId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(TRAVEL_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(`No se pudo subir el archivo. ${error.message || 'Puedes volver a intentarlo.'}`);
  return supabase.storage.from(TRAVEL_BUCKET).getPublicUrl(path).data.publicUrl;
}
