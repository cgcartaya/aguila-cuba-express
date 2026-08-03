# Optimización segura de imágenes — DeParis

Este paquete convierte las imágenes actuales de DeParis a **WebP**, limita sus dimensiones y actualiza las URLs en la base de datos sin eliminar los archivos originales.

## Seguridad aplicada

- Por defecto trabaja en **simulación**.
- Solo procesa productos pertenecientes a la tienda cuyo slug es `deparis`.
- Usa rutas nuevas dentro de `product-images`, evitando problemas de caché.
- Actualiza `product_images` y `products.image_url` cuando corresponde.
- Si el WebP pesa igual o más que el original, no lo sustituye.
- Los originales quedan intactos hasta ejecutar el script de limpieza por separado.
- Genera un reporte JSON detallado.

## 1. Copiar la carpeta

Copia `DeParis_Optimizacion_Imagenes` dentro de la raíz del proyecto.

## 2. Instalar Sharp

Desde la raíz del proyecto:

```powershell
npm install sharp
```

El proyecto ya debe tener `@supabase/supabase-js`. Si no lo tiene:

```powershell
npm install @supabase/supabase-js
```

## 3. Variables de entorno en PowerShell

Usa las mismas credenciales que utilizaste para la asignación masiva:

```powershell
$env:SUPABASE_URL="https://TU-PROYECTO.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="TU_SERVICE_ROLE_KEY"
$env:DEPARIS_STORE_SLUG="deparis"
```

No escribas los símbolos `PS>` ni `>>` y no compartas la service role key.

Opcionalmente puedes ajustar:

```powershell
$env:IMAGE_MAX_WIDTH="1200"
$env:IMAGE_MAX_HEIGHT="1200"
$env:IMAGE_WEBP_QUALITY="82"
```

## 4. Simulación

Desde la raíz del proyecto:

```powershell
node .\DeParis_Optimizacion_Imagenes\scripts\optimize-deparis-images.mjs
```

La simulación descarga y procesa las imágenes para calcular el ahorro, pero no sube ni actualiza nada. Crea:

```text
DeParis_Optimizacion_Imagenes\simulacion-optimizacion.json
```

Revisa al final del terminal:

- `candidates`
- `skippedNoSavings`
- `errors`
- `estimated_saved`
- `estimated_saved_percent`

## 5. Aplicar

Cuando la simulación no tenga errores importantes:

```powershell
node .\DeParis_Optimizacion_Imagenes\scripts\optimize-deparis-images.mjs --apply
```

Esto crea archivos WebP nuevos, actualiza la base de datos y genera:

```text
DeParis_Optimizacion_Imagenes\resultado-optimizacion.json
```

Después recarga la tienda con `Ctrl + F5` y revisa varios productos.

## 6. Borrar originales — solo después de revisar

Primero simula la limpieza:

```powershell
node .\DeParis_Optimizacion_Imagenes\scripts\cleanup-deparis-originals.mjs
```

Cuando hayas comprobado la tienda y desees liberar espacio:

```powershell
node .\DeParis_Optimizacion_Imagenes\scripts\cleanup-deparis-originals.mjs --apply
```

El limpiador solo elimina las rutas antiguas incluidas como exitosas en `resultado-optimizacion.json`.

## Repetir una optimización

Las imágenes que ya estén dentro de `/optimized/` se omiten. Para regenerarlas con otra calidad o tamaño:

```powershell
node .\DeParis_Optimizacion_Imagenes\scripts\optimize-deparis-images.mjs --apply --overwrite-optimized
```

Antes de repetir, cambia calidad o dimensiones para que la ruta o el contenido deseado sean coherentes.
