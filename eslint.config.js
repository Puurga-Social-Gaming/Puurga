import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
);

/**
 * ========================================
 * PUURGA UI STABILIZATION - PRE-COMMIT CHECKS
 * ========================================
 * Run these commands before committing:
 * 
 * 1. Check for hardcoded colors:
 *    grep -rE "text-(white|black|gray|slate)" src/components/ | grep -v ".test." || echo "No hardcoded text colors"
 * 
 * 2. Check for hardcoded backgrounds:
 *    grep -rE "bg-(white|black|gray|slate)" src/components/ | grep -v ".test." || echo "No hardcoded backgrounds"
 * 
 * 3. Check for h-screen in components (except Layout):
 *    grep -r "h-screen" src/components/ | grep -v "Layout.tsx" || echo "No h-screen in components"
 * 
 * 4. Check for arbitrary z-index:
 *    grep -rE "z-\[99" src/ || echo "No arbitrary z-index"
 * 
 * To enforce these automatically, add to package.json:
 * 
 * "pre-commit": {
 *   "hooks": {
 *     "pre-commit": "grep -rE 'text-(white|black|gray)|bg-(white|black|gray)|h-screen' src/components/ | grep -v Layout && exit 1 || exit 0"
 *   }
 * }
 */
