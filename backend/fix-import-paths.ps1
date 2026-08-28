$ErrorActionPreference = "Stop"

$files = @(
    "services/survival/purge-engine.ts",
    "services/survival/reputation-engine.ts",
    "services/survival/state-engine.ts",
    "services/survival/survival-engine.ts",
    "services/survival/threat-engine.ts",
    "services/translationService.ts",
    "services/userService.ts"
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
    
    # Fix incorrect import paths
    $content = $content -replace "from '\.\./\.\./config/supabaseClient'", "from '../../config/supabase'"
    $content = $content -replace "from '\.\./config/supabaseClient'", "from '../config/supabase'"
    
    if ($content -ne $originalContent) {
        Set-Content $filePath $content -Encoding UTF8 -NoNewline
        Write-Host "Fixed import path in $file"
    } else {
        Write-Host "No import path fixes needed for $file"
    }
}

Write-Host "Done fixing import paths!"
