# ELIMINA SOLO LOS ARCHIVOS DUPLICADOS DEL ADMIN DE MENU.
# El endpoint app/api/public/menu-delivery-zones/route.ts NO se elimina:
# se reemplaza por la versión del ZIP y ahora consulta delivery_zones.

$paths = @(
  "lib/services/menu-delivery-zones-admin.ts",
  "components/admin/menu/MenuDeliveryZonesManager.tsx",
  "app/admin/(store)/menu/zonas-delivery"
)

foreach ($p in $paths) {
  if (Test-Path -LiteralPath $p) {
    Remove-Item -LiteralPath $p -Recurse -Force
    Write-Host "Eliminado: $p"
  } else {
    Write-Host "No existe / ya eliminado: $p"
  }
}

Write-Host ""
Write-Host "Limpieza terminada."
Write-Host "La pantalla oficial queda en: /admin/settings/delivery-zones"
