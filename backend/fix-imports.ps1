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

foreach ($file in $files) {
    $filePath = Join-Path $baseDir $file
    
    if (-not (Test-Path $filePath)) {
        Write-Host "Skipping $file - file not found"
        continue
    }
    
    $content = Get-Content $filePath -Raw -Encoding UTF8
    $originalContent = $content
    
    # Fix imports - only change the import statement, not the usage yet
    $content = $content -replace "import \{ supabase \} from '\.\./config/supabase'", "import { requireSupabase, requireSupabaseAdmin } from '../config/supabase'"
    $content = $content -replace "import \{ supabase, supabaseAdmin \} from '\.\./config/supabase'", "import { requireSupabase, requireSupabaseAdmin } from '../config/supabase'"
    $content = $content -replace "import \{ supabase, supabaseAdmin \} from '\.\./\.\./config/supabase'", "import { requireSupabase, requireSupabaseAdmin } from '../../config/supabase'"
    
    if ($content -ne $originalContent) {
        Set-Content $filePath $content -Encoding UTF8 -NoNewline
        Write-Host "Fixed imports in $file"
    } else {
        Write-Host "No import changes needed for $file"
    }
}

Write-Host "Done with import fixes!"
