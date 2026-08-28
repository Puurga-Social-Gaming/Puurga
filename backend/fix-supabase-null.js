const fs = require('fs');
const path = require('path');

const filesToFix = [
  'check_columns.ts',
  'middleware/ghostMode.ts',
  'routes/calls.ts',
  'routes/certifications.ts',
  'routes/comments.ts',
  'routes/credits.ts',
  'routes/crypto.ts',
  'routes/dashboard.ts',
  'routes/games.ts',
  'routes/groups.ts',
  'routes/matchmaking.ts',
  'routes/media.ts',
  'routes/messages.ts',
  'routes/progression.ts',
  'routes/purgatory.ts',
  'routes/purging.ts',
  'routes/redemption.ts',
  'routes/search.ts',
  'routes/security.ts',
  'routes/settings.ts',
  'routes/social.ts',
  'routes/superadmin.ts',
  'routes/survival.ts',
  'routes/testGhostMode.ts',
  'routes/translate.ts',
  'routes/typing.ts',
  'scratch/test_fallback.ts',
  'services/certificationPricing.ts',
  'services/challengeService.ts',
  'services/inactivityService.ts',
  'services/mediaService.ts',
  'services/pushNotificationService.ts',
  'services/social/alliance-engine.ts',
  'services/survival/inactivity-engine.ts',
  'services/survival/purgatory-engine.ts',
  'services/survival/purge-engine.ts',
  'services/survival/reputation-engine.ts',
  'services/survival/state-engine.ts',
  'services/survival/survival-engine.ts',
  'services/survival/threat-engine.ts',
  'services/translationService.ts',
  'services/userService.ts'
];

function fixFile(filePath) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`Skipping ${filePath} - file not found`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;

  // Step 1: Fix imports
  // Replace import { supabase } with import { requireSupabase, requireSupabaseAdmin }
  if (content.includes("import { supabase }")) {
    content = content.replace(
      /import { supabase } from ['"]\.\.\/config\/supabase['"]/,
      "import { requireSupabase, requireSupabaseAdmin } from '../config/supabase'"
    );
  }
  
  // Replace import { supabase, supabaseAdmin } with import { requireSupabase, requireSupabaseAdmin }
  if (content.includes("import { supabase, supabaseAdmin }")) {
    content = content.replace(
      /import { supabase, supabaseAdmin } from ['"]\.\.\/config\/supabase['"]/,
      "import { requireSupabase, requireSupabaseAdmin } from '../config/supabase'"
    );
  }

  // Step 2: Replace await supabase with await supabaseClient (but not in imports)
  // First, we need to add const supabaseClient = requireSupabase(); at the start of async functions
  // This is complex, so we'll do a simpler approach: replace all supabase. with supabaseClient.
  // Then add the initialization at function starts
  
  // Replace supabaseAdmin. with supabaseAdminClient.
  content = content.replace(/(?<!require)supabaseAdmin\./g, 'supabaseAdminClient.');
  
  // Replace supabase. with supabaseClient. (but not in comments or strings)
  // This is a simple replacement that might have false positives, but we'll fix those
  content = content.replace(/(?<!require)supabase\./g, 'supabaseClient.');

  // Step 3: Add client initialization at the start of async functions
  // Find all async function definitions and add initialization after the opening brace
  const asyncFunctionRegex = /(async\s+(?:function\s+\w+|\w+)\s*\([^)]*\)\s*(?:=>\s*)?{|async\s*\([^)]*\)\s*=>\s*{)/g;
  
  content = content.replace(asyncFunctionRegex, (match) => {
    // Check if this function already has supabaseClient initialization
    // We'll add it after the opening brace
    return match + '\n  const supabaseClient = requireSupabase();\n  const supabaseAdminClient = requireSupabaseAdmin();';
  });

  // Also add at the start of router handlers (router.get, router.post, etc.)
  const routerHandlerRegex = /(router\.(get|post|put|delete|patch)\([^)]*,\s*(?:auth\s*,\s*)?(?:validateNotGhosted\s*,\s*)?(?:upload\.single\([^)]+\)\s*,\s*)?async\s*\([^)]*\)\s*=>\s*{)/g;
  
  content = content.replace(routerHandlerRegex, (match) => {
    return match + '\n    const supabaseClient = requireSupabase();\n    const supabaseAdminClient = requireSupabaseAdmin();';
  });

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content);
    console.log(`Fixed ${filePath}`);
  } else {
    console.log(`No changes needed for ${filePath}`);
  }
}

filesToFix.forEach(fixFile);
console.log('Done!');
