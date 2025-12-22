/**
 * FlowScale Security: OAuth Token Storage
 * 
 * Provides encrypted storage for OAuth tokens with project-scoping
 * Enforces the Architectural Security Contract:
 * - Tokens stored encrypted in database (never filesystem)
 * - Tokens scoped per user + project
 * - Service-side only access (never exposed to frontend)
 */

import crypto from 'crypto';
import { supabase } from './supabase.js';

// ============================================
// CONFIGURATION
// ============================================

// Encryption key must be 32 bytes for AES-256
const ENCRYPTION_KEY = process.env.OAUTH_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) { // 32 bytes = 64 hex chars
    console.warn('[OAuth Storage] ⚠️  OAUTH_ENCRYPTION_KEY not configured or invalid length');
    console.warn('[OAuth Storage] ⚠️  OAuth token encryption will be disabled');
    console.warn('[OAuth Storage] ⚠️  Generate 32-byte key: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
}

// ============================================
// ENCRYPTION UTILITIES
// ============================================

/**
 * Encrypts a token using AES-256-GCM
 * @param {string} token - Plain text token to encrypt
 * @returns {string} - Encrypted token in format: iv:authTag:encryptedData (all hex encoded)
 */
function encryptToken(token) {
    if (!ENCRYPTION_KEY) {
        throw new Error('Cannot encrypt token: OAUTH_ENCRYPTION_KEY not configured');
    }

    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const iv = crypto.randomBytes(16); // 128-bit IV for GCM

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    // Format: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a token encrypted with encryptToken()
 * @param {string} encryptedToken - Encrypted token from encryptToken()
 * @returns {string} - Decrypted plain text token
 */
function decryptToken(encryptedToken) {
    if (!ENCRYPTION_KEY) {
        throw new Error('Cannot decrypt token: OAUTH_ENCRYPTION_KEY not configured');
    }

    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const parts = encryptedToken.split(':');

    if (parts.length !== 3) {
        throw new Error('Invalid encrypted token format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

// ============================================
// TOKEN STORAGE FUNCTIONS
// ============================================

/**
 * Stores an OAuth refresh token for a user + project
 * @param {string} userId - User ID from auth.users
 * @param {string} projectId - Project ID
 * @param {string} provider - OAuth provider (e.g., 'google_drive')
 * @param {string} refreshToken - Plain text refresh token
 */
async function storeOAuthToken(userId, projectId, provider, refreshToken) {
    if (!supabase) {
        throw new Error('Supabase client not initialized');
    }

    if (!userId || !projectId || !provider || !refreshToken) {
        throw new Error('Missing required parameters for token storage');
    }

    try {
        // Encrypt the refresh token
        const encryptedToken = encryptToken(refreshToken);

        // Upsert to database (update if exists, insert if not)
        const { data, error } = await supabase
            .from('oauth_tokens')
            .upsert({
                user_id: userId,
                project_id: projectId,
                provider,
                encrypted_token: encryptedToken,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,project_id,provider'
            })
            .select();

        if (error) {
            throw new Error(`Failed to store OAuth token: ${error.message}`);
        }

        console.log(`[OAuth Storage] ✅ Token stored for ${provider} (user: ${userId}, project: ${projectId})`);
        return data;
    } catch (error) {
        console.error('[OAuth Storage] ❌ Failed to store token:', error.message);
        throw error;
    }
}

/**
 * Retrieves an OAuth refresh token for a user + project
 * @param {string} userId - User ID from auth.users
 * @param {string} projectId - Project ID
 * @param {string} provider - OAuth provider (e.g., 'google_drive')
 * @returns {string|null} - Decrypted refresh token or null if not found
 */
async function getOAuthToken(userId, projectId, provider) {
    if (!supabase) {
        throw new Error('Supabase client not initialized');
    }

    if (!userId || !projectId || !provider) {
        throw new Error('Missing required parameters for token retrieval');
    }

    try {
        const { data, error } = await supabase
            .from('oauth_tokens')
            .select('encrypted_token')
            .eq('user_id', userId)
            .eq('project_id', projectId)
            .eq('provider', provider)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No rows returned - token not found
                console.log(`[OAuth Storage] Token not found for ${provider} (user: ${userId}, project: ${projectId})`);
                return null;
            }
            throw new Error(`Failed to retrieve OAuth token: ${error.message}`);
        }

        if (!data || !data.encrypted_token) {
            return null;
        }

        // Decrypt and return
        const decryptedToken = decryptToken(data.encrypted_token);
        console.log(`[OAuth Storage] ✅ Token retrieved for ${provider} (user: ${userId}, project: ${projectId})`);
        return decryptedToken;
    } catch (error) {
        console.error('[OAuth Storage] ❌ Failed to retrieve token:', error.message);
        throw error;
    }
}

/**
 * Deletes an OAuth token for a user + project
 * @param {string} userId - User ID from auth.users
 * @param {string} projectId - Project ID
 * @param {string} provider - OAuth provider (e.g., 'google_drive')
 */
async function deleteOAuthToken(userId, projectId, provider) {
    if (!supabase) {
        throw new Error('Supabase client not initialized');
    }

    if (!userId || !projectId || !provider) {
        throw new Error('Missing required parameters for token deletion');
    }

    try {
        const { error } = await supabase
            .from('oauth_tokens')
            .delete()
            .eq('user_id', userId)
            .eq('project_id', projectId)
            .eq('provider', provider);

        if (error) {
            throw new Error(`Failed to delete OAuth token: ${error.message}`);
        }

        console.log(`[OAuth Storage] ✅ Token deleted for ${provider} (user: ${userId}, project: ${projectId})`);
    } catch (error) {
        console.error('[OAuth Storage] ❌ Failed to delete token:', error.message);
        throw error;
    }
}

/**
 * Lists all OAuth providers configured for a user + project
 * @param {string} userId - User ID from auth.users
 * @param {string} projectId - Project ID
 * @returns {Array<string>} - Array of provider names
 */
async function listOAuthProviders(userId, projectId) {
    if (!supabase) {
        throw new Error('Supabase client not initialized');
    }

    if (!userId || !projectId) {
        throw new Error('Missing required parameters');
    }

    try {
        const { data, error } = await supabase
            .from('oauth_tokens')
            .select('provider')
            .eq('user_id', userId)
            .eq('project_id', projectId);

        if (error) {
            throw new Error(`Failed to list OAuth providers: ${error.message}`);
        }

        return data ? data.map(row => row.provider) : [];
    } catch (error) {
        console.error('[OAuth Storage] ❌ Failed to list providers:', error.message);
        throw error;
    }
}

// ============================================
// EXPORTS
// ============================================

export {
    storeOAuthToken,
    getOAuthToken,
    deleteOAuthToken,
    listOAuthProviders,
    encryptToken,
    decryptToken
};
