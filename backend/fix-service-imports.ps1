$ErrorActionPreference = "Stop"

$files = @(
    "services/survival/purge-engine.ts",
    "services/survival/reputation-engine.ts",
    "services/survival/state-engine.ts",
    "services/survival/survival-engine.ts",
    "services/survival/threat-engine.ts",
    "services/translationService.ts"
)

$baseDir = "g:\Chris Home\Documents\GitHub\Puurga\backend"

foreach ($file in $files) {
    $filePath = Join-Path $baseDir $file
    
    if (-not (Test-Path $filePath)) {
        Write-Host "Skipping $file - file not found"
        continue
    }
    
    $content = Get-Content $filePath -Raw -Encoding UTF8
    $originalContent = $content
    
    # Fix imports - replace supabaseClient with requireSupabase
    $content = $content -replace "import \{ supabaseClient \} from", "import { requireSupabase } from"
    $content = $content -replace "import \{ supabaseAdminClient \} from", "import { requireSupabaseAdmin } from"
    
    if ($content -ne $originalContent) {
        Set-Content $filePath $content -Encoding UTF8 -NoNewline
        Write-Host "Fixed import in $file"
    } else {
        Write-Host "No import fixes needed for $file"
    }
}

Write-Host "Done fixing service imports!"
