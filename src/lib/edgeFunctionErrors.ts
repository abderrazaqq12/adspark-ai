/**
 * Utility functions for parsing and displaying edge function errors
 */

export interface ParsedError {
  title: string;
  message: string;
  details?: string[];
  suggestions?: string[];
}

/**
 * Parse edge function error response and extract meaningful error messages
 */
export function parseEdgeFunctionError(error: any): ParsedError {
  const errorMessage = error?.message || error?.error || String(error);
  
  // Check for specific error patterns
  if (errorMessage.includes('Invalid configuration')) {
    const match = errorMessage.match(/market=([^,]+), language=(.+)/);
    return {
      title: 'Invalid Configuration',
      message: 'The market or language settings are not valid.',
      details: match ? [
        `Market value: "${match[1]}"`,
        `Language value: "${match[2]}"`,
      ] : undefined,
      suggestions: [
        'Go to Product Input stage and select a valid market',
        'Ensure language is set correctly (ar, en, es, fr, de, pt)',
      ],
    };
  }

  if (errorMessage.includes('Cannot read properties of undefined')) {
    const match = errorMessage.match(/reading '([^']+)'/);
    const property = match?.[1];
    return {
      title: 'Missing Data Error',
      message: `Required data field "${property}" is missing or invalid.`,
      details: [
        `The system expected a "${property}" value but received undefined`,
      ],
      suggestions: [
        'Ensure all required fields are filled in the Product Input stage',
        'Try refreshing the page and entering the data again',
        'Check if market and language settings are valid',
      ],
    };
  }

  if (errorMessage.includes('Not authenticated') || errorMessage.includes('401')) {
    return {
      title: 'Authentication Required',
      message: 'You need to be logged in to perform this action.',
      suggestions: [
        'Please log in to your account',
        'Your session may have expired - try refreshing the page',
      ],
    };
  }

  if (errorMessage.includes('webhook') || errorMessage.includes('n8n')) {
    return {
      title: 'Webhook Error',
      message: 'Failed to connect to the external webhook.',
      details: [errorMessage],
      suggestions: [
        'Check if your n8n webhook URL is correct in Settings',
        'Ensure your n8n workflow is active and listening',
        'Try disabling n8n Backend Mode to use built-in AI',
      ],
    };
  }

  if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
    return {
      title: 'Request Timeout',
      message: 'The request took too long to complete.',
      suggestions: [
        'The AI service may be busy - try again in a moment',
        'Check your internet connection',
        'Try with a shorter product description',
      ],
    };
  }

  if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
    return {
      title: 'Rate Limit Exceeded',
      message: 'Too many requests. Please wait before trying again.',
      suggestions: [
        'Wait a few minutes before making another request',
        'Consider upgrading your plan for higher limits',
      ],
    };
  }

  if (errorMessage.includes('Invalid JSON') || errorMessage.includes('JSON.parse')) {
    return {
      title: 'Response Parse Error',
      message: 'The server returned an invalid response.',
      suggestions: [
        'Try the request again',
        'If using n8n, check your workflow returns valid JSON',
      ],
    };
  }

  // Check for field validation patterns
  const fieldValidationMatch = errorMessage.match(/(?:missing|required|invalid)\s+(?:field[s]?:?\s*)?([a-zA-Z_,\s]+)/i);
  if (fieldValidationMatch) {
    const fields = fieldValidationMatch[1].split(/[,\s]+/).filter(Boolean);
    return {
      title: 'Missing Required Fields',
      message: 'Some required fields are missing or invalid.',
      details: fields.map(f => `Field: ${f}`),
      suggestions: [
        'Fill in all required fields in the Product Input stage',
        'Make sure product name and description are provided',
      ],
    };
  }

  // Generic error fallback
  return {
    title: 'Generation Error',
    message: errorMessage.length > 200 ? errorMessage.substring(0, 200) + '...' : errorMessage,
    suggestions: [
      'Check your input data and try again',
      'If the problem persists, try refreshing the page',
    ],
  };
}

/**
 * Format parsed error for toast display
 */
export function formatErrorForToast(parsedError: ParsedError): { title: string; description: string } {
  let description = parsedError.message;
  
  if (parsedError.details?.length) {
    description += '\n\n' + parsedError.details.join('\n');
  }
  
  if (parsedError.suggestions?.length) {
    description += '\n\n💡 ' + parsedError.suggestions[0];
  }
  
  return {
    title: parsedError.title,
    description,
  };
}

/**
 * Create a detailed error message string for logging
 */
export function createDetailedErrorLog(error: any, context: Record<string, any>): string {
  const parsedError = parseEdgeFunctionError(error);
  return JSON.stringify({
    ...parsedError,
    originalError: error?.message || String(error),
    context,
    timestamp: new Date().toISOString(),
  }, null, 2);
}
