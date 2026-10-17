# Cuentas y sesiones de ShareAPP

El dueño/ADMIN crea cuentas Auth gestionadas con nombre/correo. No se escriben perfiles administrativos ni membresías store_users. Un correo existente devuelve conflicto: debe utilizar invitación y su contraseña no se cambia.

Dos modos: contraseña aleatoria desconocida + enlace para que el gestor defina la suya, o contraseña temporal elegida por el dueño. password_pending bloquea todas las APIs privadas hasta completar el cambio. Web y administración usan sesiones independientes; tras actualizar, el gestor deberá iniciar sesión otra vez porque no se hereda la sesión administrativa anterior.

El alta es gestionada por un administrador (email_confirm=true); no se presenta como verificación de propiedad del buzón. El dueño entrega el enlace por un canal privado a la persona prevista. Durante las pruebas de implementación no se crean usuarios reales ni se envían correos.

## Activación y contraseñas

Token aleatorio de 32 bytes en fragmento de URL, solo SHA-256 almacenado y vencimiento de 7 días. El navegador retira el fragmento del historial al leerlo. POST adquiere una reserva condicional para impedir usos concurrentes y consume el token tras actualizar Auth. GET no consume el enlace.

La temporal no se almacena en texto ni se devuelve por API. Una huella HMAC permite exigir una contraseña personal diferente y se elimina al terminar. La definitiva queda únicamente en Auth. El servidor verifica getUser y solo cambia la contraseña del actor autenticado, ignorando cualquier userId enviado por el cliente. La política exige 12–128 caracteres con letras y números, además de los requisitos de Auth.

Si falla el alta, se intenta eliminar únicamente la identidad nueva creada por esa petición. Auth y Postgres no comparten transacción: un corte después de reservar un enlace puede requerir revisar el registro. Si Auth se actualiza y falla la confirmación en la tabla, el gestor puede iniciar sesión con su contraseña elegida y completar el cambio desde la pantalla obligatoria.

## Invitaciones y recuperación

Las nuevas invitaciones están vinculadas al correo exacto. Las anteriores sin correo siguen siendo compatibles y muestran la identidad que las acepta. Las invitaciones no se envían automáticamente.

Olvidé mi contraseña utiliza el correo estándar de Supabase y /gestores/recuperar. Requiere correo transaccional configurado y URL de retorno permitida. El callback guarda la sesión solo en el cliente de ShareAPP. Si vuelve al Site URL y este sirve la misma app, el componente raíz reenvía la recuperación. La entrega real de correo no se ha probado durante la implementación.

Cerrar sesión usa scope local. La contraseña es global a la persona; desactivar una membresía solo afecta a esa tienda. El cambio de contraseña no revoca automáticamente otras sesiones en esta entrega.

## API

- POST /api/shareapp/accounts: dueño/ADMIN crea cuenta o rota activación de una cuenta pendiente creada por su tienda.
- GET /api/shareapp/me: identidad real y passwordPending, disponible durante el primer acceso.
- POST /api/shareapp/password: cambio de contraseña de la propia identidad y finalización del alta.
- POST /api/shareapp/activation: consulta/consumo de token de activación, sin sesión previa.

La migración 20261017202012_shareapp_accounts.sql se aplicó y coincide con el historial remoto. Añade email opcional a shareapp_members y la tabla privada shareapp_accounts con RLS y permisos directos revocados. No modifica gestores ni permisos existentes.

Validación: TypeScript, ESLint, build web y tests Node/API + SQL aislado. Android se entrega sin compilar; la revisión visual automatizada sigue limitada por la disponibilidad del navegador.
