# Lecturas públicas sin dependencia de la sesión administrativa

Las consultas del catálogo público utilizan `lib/supabase-public.ts`: clave pública, sin persistir sesión, sin refrescar tokens y sin procesar tokens de URL. Continúan aplicándose las políticas RLS del rol `anon` y los filtros existentes por tienda, actividad y papelera. No hay claves privilegiadas ni cambios de permisos.

Motivo: el cliente compartido con administración espera `auth.getSession()` antes de enviar consultas. Una sesión caducada cuyo refresh no responde puede bloquear incluso la lectura pública de productos y categorías. El cliente público no lee ni elimina esa sesión. Los getters y escrituras administrativos conservan su cliente autenticado; los settings y categorías públicos usan getters explícitos.

Las dos portadas de tienda muestran un error y un botón para reintentar cuando falla la carga de productos, categorías o settings. Esto no repara una conexión que tampoco pueda alcanzar la API REST: esos errores se comunican y permiten reintentar.

Validar con:

```
node --import /tmp/storefront-test-tools/node_modules/tsx/dist/loader.mjs --test tests/storefront/public-session.test.ts
SHAREAPP_PLAYWRIGHT_MODULE=/ruta/a/playwright node tests/storefront/browser.cjs
```

La prueba del navegador requiere el servidor local en el puerto 3200, compilado con `NEXT_PUBLIC_SUPABASE_URL=https://test.supabase.co` y una clave pública ficticia. Simula una sesión administrativa caducada cuya renovación queda pendiente, respuestas públicas y un fallo REST recuperable. No utiliza usuarios ni productos reales.
