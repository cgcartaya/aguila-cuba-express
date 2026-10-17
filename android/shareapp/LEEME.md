# ShareAPP · Primeras fases para Android

Estos archivos se integran en el proyecto **ShareAPP** que ya creaste con **Empty Activity / Kotlin / Jetpack Compose**. No es una APK compilada ni un proyecto Gradle independiente.

## Primero: publicar el backend

El PR de Perla Marketplace debe estar fusionado y desplegado en `https://perlamarketplace.com`. La migración `shareapp_gestores` ya se instaló en Supabase el 17 de octubre de 2026; el módulo está deshabilitado por defecto. No la ejecutes de nuevo manualmente.

En el administrador de una tienda abre **Marketing → Gestores · ShareAPP**, habilita el módulo y guarda. Crea una invitación, cópiala y compártela con el gestor.

En esta fase el gestor necesita una cuenta de autenticación de Perla ya existente. El gestor no necesita pertenecer a `store_users` ni recibir un rol administrativo. No añadas una membresía de administrador para darle acceso a ShareAPP. El autorregistro y la recuperación de contraseña dentro de la app quedan para una fase posterior.

## Instalar en tu proyecto Android Studio

1. Haz una copia de tu `MainActivity.kt` actual.
2. Copia los dos archivos de `app/src/main/java/com/example/shareapp/` a la misma carpeta de tu proyecto: `MainActivity.kt` y `ShareApi.kt`. Reemplaza el primero.
3. En `app/src/main/AndroidManifest.xml`, agrega esta línea dentro de `<manifest>`, antes de `<application>`:

   ```xml
   <uses-permission android:name="android.permission.INTERNET" />
   ```

4. El paquete de ambos archivos es `com.example.shareapp`, el que aparece en tu captura. Si lo cambiaste, modifica la primera línea de ambos.
5. Sincroniza Gradle y ejecuta la aplicación con **Run ▶**.
6. Entra con una cuenta de Perla. Pega la invitación del dueño y pulsa **Aceptar invitación**.
7. Selecciona tienda, busca un producto o combo y pulsa **Preparar publicación**. Revisa el texto y pulsa **Compartir en redes…**. Android abrirá el selector de aplicaciones.

Usa las dependencias de Compose / Material 3 y coroutines incluidas por el proyecto Compose estándar. No instala SDK de Supabase ni utiliza claves privadas en el teléfono. La app solicita la configuración pública al backend.

## Prueba de atribución

- Abre el enlace compartido en otro navegador o teléfono.
- Navega a otro producto, agrega artículos y crea un pedido de prueba autorizado por la tienda.
- En ShareAPP debe aparecer un pedido creado, sin venta pagada.
- Cuando la tienda confirme el pago mediante su flujo habitual, actualizar los resultados debe mostrar la venta pagada.
- La app conserva la sesión solo en memoria y refresca sus tokens mientras está abierta. Después de cerrarla por completo tendrás que entrar otra vez. La persistencia segura de sesión queda para una fase posterior.

Los enlaces deben conservarse en las publicaciones. Una foto o texto publicado sin enlace no permite atribuir entradas. Las vistas previas de WhatsApp/Facebook usan las imágenes del producto de la tienda; compartir la imagen como archivo, crear postales y seleccionar varios productos quedan para fases posteriores.

## Validación y límites

Backend: TypeScript, lint de archivos nuevos, pruebas de firmas/permisos y pruebas SQL de aislamiento y ventas. Los archivos Kotlin no se han compilado en este entorno, que no dispone de Android SDK ni del Gradle de tu proyecto. Si aparece un error al integrar, comparte el mensaje de compilación y los archivos Gradle de ShareAPP para adaptar las versiones exactas.
