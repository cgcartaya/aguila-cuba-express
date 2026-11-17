# Gestión de Trámites

El módulo reutiliza `procedure_catalog`, `procedure_requests`, `procedure_audit`, los estados y transiciones existentes, los endpoints `/api/admin/procedures` y `/api/public/procedures`, y la auditoría con revisión optimista. No hay copias por cliente ni tablas paralelas.

## Activar otra empresa

Después de aplicar la migración y publicar el código:

1. Entrar como superadministrador a **SaaS → Tiendas → Editar → Módulos**.
2. Activar **Gestión de Trámites** y guardar. Los demás módulos conservan sus valores.
3. Entrar en esa empresa y abrir **Trámites → Configuración**. Crear un código único del servicio (minúsculas, números y guiones), nombre, descripción, variantes, requisitos, tarifas, imagen HTTPS y orden. Se puede hacer obligatorio u opcional el correo.
4. Guardar borradores para revisión; **Publicar versión** actualiza el catálogo público. Desmarcar Servicio activo y publicar oculta el servicio. El historial de versiones y las solicitudes anteriores se conservan.
5. Activar por separado **Formulario público de trámites** desde SaaS si se quiere recibir solicitudes desde la landing. Requiere el módulo activo. No se activa por defecto para otras empresas.

WF Cargo conserva ambos interruptores activos mediante la migración, su catálogo y sus referencias UUID. Su landing mantiene su presentación y fotografías; utiliza el mismo hook y validación de solicitudes que el formulario compartido. El catálogo inicial de WF solo puede cargarse en WF. Otras tiendas crean sus propios servicios.

## Operación

- Dashboard con seis estados y un indicador independiente Sin asignar. Las tarjetas filtran la lista; los contadores representan todas las solicitudes permitidas al usuario, independientemente de los filtros de la lista.
- Filtros combinables de referencia completa o parcial, contacto, estado, servicio, responsable y fechas UTC; 25 filas por página y orden por fecha estable. En móvil/tablet se muestran tarjetas.
- Las solicitudes manuales y web comparten cola y referencia. Orígenes: web, presencial, teléfono, WhatsApp. Las manuales registran el creador.
- El detalle carga la versión exacta del catálogo usada al crear la solicitud, no la versión actual. Los requisitos guardan una instantánea. Notas internas se agregan con actor, fecha, revisión y evento en la auditoría.
- La recepción declarada por el cliente no equivale a verificación del empleado. Completar sigue exigiendo los requisitos verificados y las transiciones existentes. Reabrir solicitudes cerradas requiere supervisor.

## Acceso y aislamiento

- OWNER y ADMIN administran todas las solicitudes y el catálogo de su empresa. OPERATIONS crea solicitudes asignadas a sí mismo y consulta/gestiona únicamente las asignadas; no edita catálogo ni reasigna empleados. El superadministrador usa la tienda seleccionada y también necesita que el módulo esté activo.
- El servidor valida token con Auth, perfil activo, membresía activa, rol, empresa activa y módulo en cada operación. `x-store-id` es una selección, nunca autorización. Membresías ambiguas requieren selección explícita.
- Todas las consultas de catálogo, solicitudes, historial y empleados se acotan por tienda. Las modificaciones comprueban revisión y asignación. El servidor valida que el responsable pertenezca a esa empresa.
- Las tablas de trámites conservan RLS y carecen de permisos directos para anon/authenticated. Los datos se sirven exclusivamente tras autorización desde el servidor. Las funciones de actualización y notas solo son ejecutables por service_role. No se concede ningún acceso nuevo a las tablas.
- Un trigger impide que propietarios se activen los nuevos interruptores mediante una actualización directa de stores; únicamente superadministradores activos o service_role pueden hacerlo.
- En dominios de clientes, el layout también bloquea el módulo desactivado. En el host neutral de la plataforma, la selección vive en la sesión existente del cliente: la shell verifica sesión y las APIs verifican empresa y módulo antes de retornar datos.
- El catálogo público requiere empresa activa y ambos interruptores. Devuelve solo configuración de servicios; crear una solicitud devuelve solo su referencia. No existe consulta pública de solicitudes, notas o historial.
- Los helpers WF usados por casillero no cambian. Los helpers multitenant se usan exclusivamente en trámites.

## Migración y entrega

Aplicar `supabase/migrations/20261117182229_global_procedures_module.sql` **antes** del código, porque las nuevas consultas seleccionan columnas nuevas. Es aditiva: agrega interruptores a stores, origen, creador, notas y una referencia de texto calculada a partir del UUID original, además de índice por tienda/fecha. Actualiza la función de auditoría sin modificar las referencias ni las transiciones. No borra filas ni catálogos. Las otras tiendas quedan desactivadas.

Desactivar cambia únicamente el acceso. Reactivar recupera catálogo, datos y configuración. La política de retención previa (contacto a 90 días y eliminación de solicitudes cerradas a 12 meses) sigue existiendo; no se introduce una eliminación por desactivación.

No se aplicó la migración ni se fusionó/desplegó a producción durante esta entrega. Tras autorización, comprobar en producción las dos solicitudes nuevas y los seis servicios publicados de WF Cargo observados durante la revisión de solo lectura del 17 de noviembre de 2026.

## Archivos principales

| Área | Archivos |
| --- | --- |
| Dashboard y catálogo | `app/admin/(store)/tramites/{layout.tsx,ProceduresAdmin.tsx,CatalogEditor.tsx,ManualRequest.tsx}` |
| API existente | `app/api/{admin,public}/procedures/route.ts` |
| Dominio y validación compartida | `lib/procedures/{server.ts,catalog.ts,submission.ts}` |
| Activación SaaS | `app/admin/(saas)/stores/[id]/edit/page.tsx` |
| Navegación, acceso y tipos | `lib/admin/{nav-config.ts,access.ts,access-service.ts}`, `lib/services/stores.ts`, `lib/saas/{store-types.ts,store-metadata.ts}` |
| Landing y formulario reutilizable | `app/page.tsx`, `components/procedures/{PublicProcedures.tsx,usePublicProcedures.ts}`, `components/landing/wfcargo/{WfCargoLanding.tsx,ManagedProcedures.tsx}` |
| Base de datos y pruebas | Migración indicada y `tests/global-procedures.test.mjs` |

## Verificación

Las pruebas de API usan dobles de la base y ejecutan los handlers reales, y las pruebas SQL ejecutan ambas migraciones en PostgreSQL embebido (PGlite). Cubren autorización, separación entre empresas, filtros combinados, contadores exactos, paginación, creación manual/web, notas, referencias, auditoría, revisiones concurrentes, requisitos pendientes y activación/desactivación sin pérdida de datos.

La revisión visual se hizo sobre el componente real renderizado con datos de prueba en anchos de escritorio, 768 px y 390 px; no simula una sesión real de Supabase ni sustituye una prueba integral de autenticación contra una base de staging migrada. El flujo completo con usuarios reales queda para el entorno migrado.

Resultados de validación de la rama:

- 32 pruebas del módulo y regresiones de WF/casillero/navegación pasan.
- `npx tsc --noEmit` pasa.
- ESLint de todos los archivos TypeScript/JavaScript modificados o nuevos pasa.
- El lint general no está limpio en la base: la copia sin cambios de `main` reportó 423 errores y 141 advertencias. No se incluyeron arreglos ajenos al módulo.
- `tests/wfcargo-pickup.test.mjs` falla también en la copia sin cambios de `main`: su cargador no resuelve `@/lib/pickups/itinerary`. Se deja documentado como limitación de la regresión, sin cambiar la implementación de recogidas.
