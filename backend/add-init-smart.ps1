$ErrorActionPreference = "Stop"

$files = @(
    "routes/groups.ts",
    "routes/messages.ts",
    "routes/superadmin.ts",
    "routes/social.ts",
    "routes/certifications.ts",
    "routes/comments.ts",
    "routes/credits.ts",
    "routes/dashboard.ts",
    "routes/games.ts",
    "routes/matchmaking.ts",
    "services/challengeService.ts",
    "services/social/alliance-engine.ts"
)

$baseDir = "g:\Chris Home\Documents\GitHub\Puurga\backend"

function Add-RouteHandlerInit($content) {
    # Pattern for router handlers: router.get/post/etc with async arrow function
    # Only match if it's NOT already followed by const supabaseClient
    $pattern = '(router\.(get|post|put|delete|patch)\([^)]*,\s*(?:auth\s*,\s*)?(?:validateNotGhosted\s*,\s*)?(?:upload\.single\([^)]+\)\s*,\s*)?async\s*\([^)]*\)\s*=>\s*\{)'
    
    $result = $content
    
    # Check if the pattern is followed by const supabaseClient within next 200 chars
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

function Add-StandaloneAsyncInit($content) {
    # Pattern for standalone async functions (not inside class)
    # async function name() { or const name = async () => {
    $pattern = '(?m)^async\s+(?:function\s+\w+|\w+)\s*\([^)]*\)\s*\{'
    
    $result = $content
    
    $result = [regex]::Replace($result, $pattern, {
        param($match)
        $pos = $match.Index + $match.Length
        $next200 = $result.Substring($pos, [Math]::Min(200, $result.Length - $pos))
        
        if ($next200 -match "const supabaseClient") {
            return $match # Already has initialization
        }
        
        return "$match`n  const supabaseClient = requireSupabase();`n  const supabaseAdminClient = requireSupabaseAdmin();"
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
    
    $content = Add-RouteHandlerInit $content
    $content = Add-StandaloneAsyncInit $content
    
    if ($content -ne $originalContent) {
        Set-Content $filePath $content -Encoding UTF8 -NoNewline
        Write-Host "Added initialization to $file"
    } else {
        Write-Host "No initialization needed for $file"
    }
}

Write-Host "Done adding initializations!"
