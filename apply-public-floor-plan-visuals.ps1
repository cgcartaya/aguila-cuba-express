param([string]$ProjectRoot = ".")
$ErrorActionPreference = "Stop"

function Fail([string]$Message) {
  Write-Host "ERROR: $Message" -ForegroundColor Red
  exit 1
}

$root = (Resolve-Path $ProjectRoot).Path
$path = Join-Path $root "components\reservas\TableFloorPlan.tsx"

if (-not (Test-Path $path)) {
  Fail "No se encontro $path"
}

$text = Get-Content -Raw -Encoding UTF8 $path

if ($text.Contains('function StaffFigure({')) {
  Write-Host "TableFloorPlan.tsx ya tiene camareros mejorados." -ForegroundColor DarkGray
  exit 0
}

$marker = 'function ElementArt({ type }: { type: ReservationSpaceElement["element_type"] }) {'
$idx = $text.IndexOf($marker)
if ($idx -lt 0) { Fail "No encontre ElementArt en TableFloorPlan.tsx" }

$staff = @'
function StaffFigure({
  gender,
}: {
  gender: "male" | "female";
}) {
  const female = gender === "female";

  return (
    <svg viewBox="0 0 64 92" className="h-full w-full drop-shadow-sm" aria-hidden="true">
      <ellipse cx="32" cy="84" rx="17" ry="5" fill="rgba(15,23,42,.14)" />
      <circle cx="32" cy="17" r="10" fill="#E7B98B" />

      {female ? (
        <>
          <path d="M21 17c0-9 5-14 11-14s11 5 11 14c-2-5-6-8-11-8s-9 3-11 8Z" fill="#4B2E25" />
          <circle cx="43" cy="16" r="4" fill="#4B2E25" />
        </>
      ) : (
        <path d="M22 14c1-8 6-11 11-11 6 0 10 4 10 11-4-3-7-4-11-4-3 0-7 1-10 4Z" fill="#382820" />
      )}

      <rect x="28" y="25" width="8" height="7" rx="3" fill="#D9A97D" />

      {female ? (
        <path d="M20 34c4-4 8-6 12-6s8 2 12 6l5 30H15l5-30Z" fill="#D946EF" />
      ) : (
        <path d="M18 35c4-5 9-7 14-7s10 2 14 7l2 29H16l2-29Z" fill="#2563EB" />
      )}

      <path d="M27 30h10l4 29H23l4-29Z" fill="#F8FAFC" />
      <path d="M28 31l4 7 4-7" fill="none" stroke="#CBD5E1" strokeWidth="1.8" />

      <path d="M19 38 9 53" stroke="#E7B98B" strokeWidth="6" strokeLinecap="round" />
      <path d="M45 38 55 49" stroke="#E7B98B" strokeWidth="6" strokeLinecap="round" />

      <ellipse cx="55" cy="47" rx="9" ry="3" fill="#475569" />
      <rect x="54" y="44" width="2" height="3" rx="1" fill="#94A3B8" />
      <circle cx="55" cy="43" r="2.5" fill="#F59E0B" />

      <path d="M25 62 23 80" stroke="#1E293B" strokeWidth="7" strokeLinecap="round" />
      <path d="M39 62 41 80" stroke="#1E293B" strokeWidth="7" strokeLinecap="round" />
      <ellipse cx="22" cy="82" rx="6" ry="3" fill="#0F172A" />
      <ellipse cx="42" cy="82" rx="6" ry="3" fill="#0F172A" />
    </svg>
  );
}

'@

$text = $text.Insert($idx, $staff)

# Add waiter/waitress cases at beginning of ElementArt switch
$switchMarker = '  switch (type) {'
$switchPos = $text.IndexOf($switchMarker, $idx + $staff.Length)
if ($switchPos -lt 0) { Fail "No encontre switch de ElementArt" }
$insertPos = $switchPos + $switchMarker.Length

$cases = @'

    case "waiter":
      return (
        <div className="absolute inset-[4%] flex items-center justify-center">
          <StaffFigure gender="male" />
        </div>
      );

    case "waitress":
      return (
        <div className="absolute inset-[4%] flex items-center justify-center">
          <StaffFigure gender="female" />
        </div>
      );
'@
$text = $text.Insert($insertPos, $cases)

# Make public visual class know staff.
$needle = '      : element.element_type === "split_ac"' + "`r`n" +
          '      ? "border border-cyan-300 bg-cyan-50/90"' + "`r`n" +
          '      : "border border-black/10 bg-white/80";'
$replacement = '      : element.element_type === "split_ac"' + "`r`n" +
               '      ? "border border-cyan-300 bg-cyan-50/90"' + "`r`n" +
               '      : element.element_type === "waiter" || element.element_type === "waitress"' + "`r`n" +
               '      ? "border border-slate-200 bg-white/95"' + "`r`n" +
               '      : "border border-black/10 bg-white/80";'

if ($text.Contains($needle)) {
  $text = $text.Replace($needle, $replacement)
} else {
  # LF fallback
  $needle2 = $needle.Replace("`r`n","`n")
  $replacement2 = $replacement.Replace("`r`n","`n")
  if ($text.Contains($needle2)) {
    $text = $text.Replace($needle2,$replacement2)
  } else {
    Fail "No encontre bloque visual de PlanElement"
  }
}

# Show labels for waiter/waitress
$oldLabel = '        element.element_type === "stairs") && ('
$newLabel = '        element.element_type === "stairs" ||' + "`r`n" +
            '        element.element_type === "waiter" ||' + "`r`n" +
            '        element.element_type === "waitress") && ('
if ($text.Contains($oldLabel)) {
  $text = $text.Replace($oldLabel,$newLabel)
} else {
  $oldLabel2 = $oldLabel.Replace("`r`n","`n")
  if ($text.Contains($oldLabel2)) {
    $text = $text.Replace($oldLabel2,$newLabel.Replace("`r`n","`n"))
  } else {
    Fail "No encontre bloque de etiquetas publicas"
  }
}

Set-Content -Encoding UTF8 $path $text
Write-Host "OK - vista publica actualizada con camareros y camareras." -ForegroundColor Green
