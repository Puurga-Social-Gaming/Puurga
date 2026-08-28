$ErrorActionPreference = "Stop"

$files = @(
    "check_columns.ts",
    "middleware/ghostMode.ts",
    "routes/calls.ts",
    "routes/certifications.ts",
    "routes/comments.ts",
    "routes/credits.ts",
    "routes/crypto.ts",
    "routes/dashboard.ts",
    "routes/games.ts",
    "routes/groups.ts",
    "routes/matchmaking.ts",
    "routes/media.ts",
    "routes/messages.ts",
    "routes/progression.ts",
    "routes/purgatory.ts",
    "routes/purging.ts",
    "routes/redemption.ts",
    "routes/search.ts",
    "routes/security.ts",
    "routes/settings.ts",
    "routes/social.ts",
    "routes/superadmin.ts",
    "routes/survival.ts",
    "routes/testGhostMode.ts",
    "routes/translate.ts",
    "routes/typing.ts",
    "scratch/test_fallback.ts",
    "services/certificationPricing.ts",
    "services/challengeService.ts",
    "services/inactivityService.ts",
    "services/mediaService.ts",
    "services/pushNotificationService.ts",
    "services/social/alliance-engine.ts",
    "services/survival/inactivity-engine.ts",
    "services/survival/purgatory-engine.ts",
    "services/survival/purge-engine.ts",
    "services/survival/reputation-engine.ts",
    "services/survival/state-engine.ts",
    "services/survival/survival-engine.ts",
    "services/survival/threat-engine.ts",
    "services/translationService.ts",
    "services/userService.ts"
)

$baseDir = "g:\Chris Home\Documents\GitHub\Puurga\backend"

function Add-Initialization($content) {
    # Pattern to match async function/route handler start
    # We need to add initialization after the opening brace of async functions
    
    # For router handlers: router.get/post/etc with async arrow function
    $routerPattern = '(router\.(get|post|put|delete|patch)\([^)]*,\s*(?:auth\s*,\s*)?(?:validateNotGhosted\s*,\s*)?(?:upload\.single\([^)]+\)\s*,\s*)?async\s*\([^)]*\)\s*=>\s*\{)'
    
    # For async functions: async function name() { or async () => {
    $asyncFuncPattern = '(async\s+(?:function\s+\w+|\w+)\s*\([^)]*\)\s*\{)'
    $asyncArrowPattern = '(async\s*\([^)]*\)\s*=>\s*\{)'
    
    $result = $content
    
    # Add initialization for router handlers
    $result = $result -replace $routerPattern, {
        param($match)
        "$match`n    const supabaseClient = requireSupabase();`n    const supabaseAdminClient = requireSupabaseAdmin();"
    }
    
    # Add initialization for async functions
    $result = $result -replace $asyncFuncPattern, {
        param($match)
        "$match`n  const supabaseClient = requireSupabase();`n  const supabaseAdminClient = requireSupabaseAdmin();"
    }
    
    $result = $result -replace $asyncArrowPattern, {
        param($match)
        "$match`n  const supabaseClient = requireSupabase();`n  const supabaseAdminClient = requireSupabaseAdmin();"
    }
    
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
    
    $content = Add-Initialization $content
    
    if ($content -ne $originalContent) {
        Set-Content $filePath $content -Encoding UTF8 -NoNewline
        Write-Host "Added initialization to $file"
    } else {
        Write-Host "No initialization needed for $file (or already added)"
    }
}

Write-Host "Done adding initializations!"
