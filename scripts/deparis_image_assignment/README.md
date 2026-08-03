# Asignación masiva de imágenes — DeParis

Este paquete enlaza automáticamente **80 imágenes confirmadas** con los productos ya importados.

## Qué hace
- Localiza la tienda por slug (`deparis`).
- Busca cada producto por nombre normalizado y precio.
- Sube la imagen al bucket `product-images`.
- Crea la fila correspondiente en `product_images` como imagen principal.
- Actualiza también `products.image_url` por compatibilidad.
- Omite productos que ya tienen imagen, salvo que uses `--overwrite`.
- Nunca aplica los 13 casos dudosos incluidos en `mapping.review.csv`.

## Variables necesarias
```env
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
DEPARIS_STORE_SLUG=deparis
```
No subas la service role key al repositorio.

## Ejecución
Copia esta carpeta dentro del proyecto. Desde la raíz:

```bash
node ruta/deparis_image_assignment/scripts/assign-deparis-images.mjs
```
Eso solo simula. Para aplicar:

```bash
node ruta/deparis_image_assignment/scripts/assign-deparis-images.mjs --apply
```
Para reemplazar imágenes existentes:

```bash
node ruta/deparis_image_assignment/scripts/assign-deparis-images.mjs --apply --overwrite
```

Al finalizar se crea `resultado-asignacion.json` con el resumen y cualquier error.
