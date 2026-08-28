$ErrorActionPreference = "Stop"

$files = @(
    "services/social/alliance-engine.ts",
    "services/survival/inactivity-engine.ts",
    "services/survival/purgatory-engine.ts",
    "services/survival/purge-engine.ts",
    "services/survival/reputation-engine.ts",
    "services/survival/state-engine.ts",
    "services/survival/survival-engine.ts",
    "services/survival/threat-engine.ts",
    "services/translationService.ts",
    "services/userService.ts",
    "services/inactivityService.ts",
    "services/mediaService.ts",
    "services/pushNotificationService.ts",
    "services/certificationPricing.ts"
)

$baseDir = "g:\Chris Home\Documents\GitHub\Puurga\backend"

function Add-StaticMethodInit($content) {
    # Pattern for static async methods: static async methodName(params) {
    $pattern = 'static\s+async\s+\w+\s*\([^)]*\)\s*\{'
    
    $result = $content
    
    $result = [regex]::Replace($result, $pattern, {
        param($match)
        $pos = $match.Index + $match.Length
        $next200 = $result.Substring($pos, [Math]::Min(200, $result.Length - $pos))
        
        if ($next200 -match "const supabaseClient") {
            return $match # Already has initialization
        }
        
        return "$match`n    const supabaseClient = requireSupabase();`n    const supabaseAdminClient = requireSupabaseAdmin();"
    }, [System.Text.RegularExpressions.RegexOptions]::Singleline)
    
    return $result
}

function Add-AsyncMethodInit($content) {
    # Pattern for async methods (not static): async methodName(params) {
    $pattern = '(?m)^\s+async\s+\w+\s*\([^)]*\)\s*\{'
    
    $result = $content
    
    $result = [regex]::Replace($result, $pattern, {
        param($match)
        $pos = $match.Index + $match.Length
        $next200 = $result.Substring($pos, [Math]::Min(200, $result.Length - $pos))
        
        if ($next200 -match "const supabaseClient") {
            return $match # Already has initialization
        }
        
        return "$match`n    const supabaseClient = requireSupabase();`n    const supabaseAdminClient = requireSupabaseAdmin();"
    }, [System.Text.RegularExpressions.RegexOptions]::Multiline)
    
    return $result
}

foreach ($file in $files) {
    $filePath = Join-Path $baseDir $file
    
    if (-not (Test-Path $filePath)) {
        Write-Host "Skipping $file - file not found"
        continue
    }
    
    $content = Get-Content $filePath -Raw -Encoding UTF8
    $originalContent = $content
    
    $content = Add-StaticMethodInit $content
    $content = Add-AsyncMethodInit $content
    
    if ($content -ne $originalContent) {
        Set-Content $filePath $content -Encoding UTF8 -NoNewline
        Write-Host "Added initialization to $file"
    } else {
        Write-Host "No initialization needed for $file"
    }
}

Write-Host "Done adding initializations to class methods!"
