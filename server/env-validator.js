/**
 * FlowScale Security: Environment Variable Validator
 * 
 * Enforces the Architectural Security Contract:
 * - All secrets MUST be read from backend ENV variables
 * - Server MUST refuse to start if critical secrets are missing
 * - No fallback keys allowed
 * 
 * This module validates environment on server boot and fails fast.
 */

// ============================================
// REQUIRED BACKEND SECRETS (CRITICAL)
// ============================================
// These MUST exist or the server will not start

const REQUIRED_BACKEND_SECRETS = [
  {
    key: 'SUPABASE_URL',
    description: 'Supabase project URL',
    example: 'https://your-project.supabase.co'
  },
  {
    key: 'SUPABASE_SERVICE_ROLE_KEY',
    description: 'Supabase service role key (backend only)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  }
];

// ============================================
// RECOMMENDED SECRETS (WARNINGS ONLY)
// ============================================
// These are optional but recommended for full functionality

const RECOMMENDED_SECRETS = [
  {
    key: 'GOOGLE_CLIENT_ID',
    description: 'Google OAuth client ID (for Google Drive integration)',
    feature: 'Google Drive export'
  },
  {
    key: 'GOOGLE_CLIENT_SECRET',
    description: 'Google OAuth client secret (for Google Drive integration)',
    feature: 'Google Drive export'
  },
  {
    key: 'OAUTH_ENCRYPTION_KEY',
    description: '32-byte encryption key for OAuth token storage',
    feature: 'Secure OAuth token storage'
  },
  {
    key: 'OPENAI_API_KEY',
    description: 'OpenAI API key for GPT models',
    feature: 'OpenAI content generation'
  },
  {
    key: 'ANTHROPIC_API_KEY',
    description: 'Anthropic API key for Claude models',
    feature: 'Anthropic content generation'
  },
  {
    key: 'ELEVENLABS_API_KEY',
    description: 'ElevenLabs API key for voice generation',
    feature: 'Voice generation'
  }
];

// ============================================
// FORBIDDEN ENV PATTERNS
// ============================================
// These should NEVER be used in backend code

const FORBIDDEN_BACKEND_PATTERNS = [
  {
    pattern: /^VITE_.*SERVICE_ROLE/i,
    reason: 'Service role keys must NEVER use VITE_ prefix (frontend exposure risk)'
  },
  {
    pattern: /^VITE_.*SECRET/i,
    reason: 'Secrets must NEVER use VITE_ prefix (frontend exposure risk)'
  }
];

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validates that a required environment variable exists and has a value
 */
function validateRequired(envVar) {
  const value = process.env[envVar.key];

  if (!value || value.trim().length === 0) {
    return {
      valid: false,
      key: envVar.key,
      error: `MISSING REQUIRED SECRET: ${envVar.key}`,
      description: envVar.description,
      example: envVar.example
    };
  }

  // Check minimum length for secrets (prevent placeholder values)
  if (value.length < 10) {
    return {
      valid: false,
      key: envVar.key,
      error: `INVALID SECRET: ${envVar.key} appears to be a placeholder (too short)`,
      description: envVar.description,
      example: envVar.example
    };
  }

  return { valid: true, key: envVar.key };
}

/**
 * Checks for recommended environment variables
 */
function checkRecommended(envVar) {
  const value = process.env[envVar.key];

  if (!value || value.trim().length === 0) {
    return {
      present: false,
      key: envVar.key,
      feature: envVar.feature,
      description: envVar.description
    };
  }

  return { present: true, key: envVar.key };
}

/**
 * Scans environment for forbidden patterns
 */
function scanForbiddenPatterns() {
  const violations = [];

  for (const [key, value] of Object.entries(process.env)) {
    for (const forbidden of FORBIDDEN_BACKEND_PATTERNS) {
      if (forbidden.pattern.test(key)) {
        violations.push({
          key,
          reason: forbidden.reason,
          value: value ? '***REDACTED***' : '(empty)'
        });
      }
    }
  }

  return violations;
}

/**
 * Main validation function - called on server startup
 * Throws error if validation fails
 */
function validateEnvironment(options = {}) {
  const { silent = false, exitOnError = true } = options;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔒 FlowScale Security: Environment Validation');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  const results = {
    required: [],
    recommended: [],
    forbidden: [],
    valid: true
  };

  // 1. Validate REQUIRED secrets
  console.log('📋 Checking REQUIRED secrets...');
  for (const envVar of REQUIRED_BACKEND_SECRETS) {
    const result = validateRequired(envVar);
    results.required.push(result);

    if (!result.valid) {
      console.error(`   ❌ ${result.error}`);
      console.error(`      Description: ${result.description}`);
      console.error(`      Example: ${result.example}`);
      results.valid = false;
    } else {
      console.log(`   ✅ ${result.key}`);
    }
  }
  console.log('');

  // 2. Check RECOMMENDED secrets
  console.log('💡 Checking RECOMMENDED secrets...');
  for (const envVar of RECOMMENDED_SECRETS) {
    const result = checkRecommended(envVar);
    results.recommended.push(result);

    if (!result.present) {
      console.warn(`   ⚠️  ${result.key} - ${result.feature} will be unavailable`);
    } else {
      console.log(`   ✅ ${result.key}`);
    }
  }
  console.log('');

  // 3. Scan for FORBIDDEN patterns
  console.log('🚫 Scanning for FORBIDDEN patterns...');
  results.forbidden = scanForbiddenPatterns();

  if (results.forbidden.length > 0) {
    console.error('   ❌ SECURITY VIOLATION: Forbidden environment variables detected!');
    for (const violation of results.forbidden) {
      console.error(`      ${violation.key}: ${violation.reason}`);
    }
    results.valid = false;
  } else {
    console.log('   ✅ No forbidden patterns detected');
  }
  console.log('');

  // 4. Final validation result
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (results.valid) {
    console.log('✅ Environment validation PASSED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    return results;
  } else {
    console.error('❌ Environment validation FAILED');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('');
    console.error('The server cannot start due to missing or invalid configuration.');
    console.error('Please check your .env file and ensure all required secrets are set.');
    console.error('');
    console.error('For more information, see:');
    console.error('  - .env.example (template with all required variables)');
    console.error('  - SECURITY_ARCHITECTURE.md (security guidelines)');
    console.error('');

    if (exitOnError) {
      process.exit(1);
    } else {
      throw new Error('Environment validation failed - missing required secrets');
    }
  }
}

/**
 * Get validation summary (for health checks)
 */
function getValidationSummary() {
  try {
    const results = validateEnvironment({ silent: true, exitOnError: false });
    return {
      valid: results.valid,
      requiredCount: results.required.length,
      requiredValid: results.required.filter(r => r.valid).length,
      recommendedCount: results.recommended.length,
      recommendedPresent: results.recommended.filter(r => r.present).length,
      forbiddenCount: results.forbidden.length
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}

// ============================================
// EXPORTS
// ============================================

export {
  validateEnvironment,
  getValidationSummary,
  REQUIRED_BACKEND_SECRETS,
  RECOMMENDED_SECRETS
};

// If run directly, execute validation
// Note: ES modules don't have require.main, use import.meta.url instead
if (import.meta.url === `file://${process.argv[1]}`) {
  validateEnvironment();
}
