# ShareAPP · Cuentas de gestores y acceso

Kit para el proyecto ShareAPP / Empty Activity / Kotlin / Jetpack Compose, paquete com.example.shareapp. Es código fuente para integrar; todavía no es una APK compilada.

## Primero, desplegar el backend

Fusionar y desplegar el PR de cuentas en perlamarketplace.com. Las dos migraciones de ShareAPP ya están instaladas; no ejecutarlas otra vez.

En Marketing → Gestores · ShareAPP:

1. Habilita ShareAPP en la tienda y guarda.
2. Usa Crear cuenta de gestor con nombre y correo.
3. Elige Enlace de activación (recomendado) o Contraseña temporal.
4. Comparte el enlace privado con el gestor para que elija su contraseña. Vence en 7 días y se usa una vez. También puede entrar en la app con la temporal; debe cambiarla antes de ver productos.
5. Si ya tiene cuenta, usa Invitar gestor existente con su correo. Su contraseña no se modifica.

La cuenta no recibe perfil administrativo ni membresía en store_users. Puede vincularse a varias tiendas. Desactivarla en una tienda no elimina sus otros accesos.

## Android Studio

1. Respalda MainActivity.kt.
2. Copia MainActivity.kt y ShareApi.kt desde app/src/main/java/com/example/shareapp/ de este paquete a la misma carpeta de tu proyecto. Reemplaza ambos si instalaste la primera versión.
3. En app/src/main/AndroidManifest.xml, dentro de manifest y antes de application, agrega: <uses-permission android:name="android.permission.INTERNET" />
4. Si cambiaste el paquete de tu proyecto, adapta la primera línea de ambos archivos Kotlin.
5. Sincroniza Gradle y ejecuta Run ▶.
6. Entra con correo y contraseña del gestor. Si es temporal, define una nueva al entrar.
7. Comprueba el nombre/correo y la tienda seleccionada, busca un producto y prepara una publicación.

Usa Compose/Material 3 y coroutines del proyecto estándar; no contiene claves privadas. La sesión queda en memoria y se renueva mientras la app está abierta. Tras cerrarla por completo hay que entrar de nuevo.

## Recuperación

Escribe tu correo y pulsa Olvidé mi contraseña. La entrega del correo depende de Supabase Auth y su configuración de email. La contraseña nueva se define en una página web de ShareAPP. Agrega https://perlamarketplace.com/gestores/recuperar a Supabase Auth → URL Configuration → Redirect URLs. Hay un reenvío de recuperación si el proveedor vuelve a una URL de esta misma aplicación.

Después del despliegue, comprueba la recepción real del correo con una cuenta de prueba.

## Pruebas

- Cuenta nueva: activar enlace y entrar en Android con la contraseña elegida.
- Temporal: catálogo bloqueado hasta cambiarla por una distinta.
- Invitación: solo la acepta el correo previsto.
- Cerrar ShareAPP no cierra la sesión administrativa del navegador.
- Producto compartido → visita desde otro navegador → pedido pendiente → venta tras confirmar pago.

Backend validado con TypeScript, ESLint, build y pruebas de permisos/contraseñas/atribución. Kotlin aún requiere compilación en tu proyecto: este entorno no dispone de Android SDK ni de tus archivos Gradle.
