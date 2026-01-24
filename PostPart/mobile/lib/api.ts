import { Platform } from 'react-native';

/**
 * API Configuration
 * Base URL for the admin API endpoints
 */

// For preview builds (APK), you can point to your deployed admin URL.
// For local development, ensure your phone and computer are on the same Wi-Fi network.
const DEFAULT_DEV_URL = 'http://192.168.100.4:3000';
const DEFAULT_PROD_URL = 'https://postpart-admin.vercel.app';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_ADMIN_API_URL ||
  (Platform.OS === 'web' ? DEFAULT_PROD_URL : __DEV__ ? DEFAULT_DEV_URL : DEFAULT_PROD_URL);

/**
 * Get the full API URL for an endpoint
 */
export function getApiUrl(endpoint: string): string {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/api/${cleanEndpoint}`;
}

/**
 * Make an API request
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = getApiUrl(endpoint);

  console.log('Making API request to:', url);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = 'Unknown error';
      let errorDetails: any = {};
      try {
        const error = await response.json();
        errorMessage = error.error || error.message || `API request failed: ${response.statusText}`;
        errorDetails = error;
      } catch {
        errorMessage = `API request failed: ${response.status} ${response.statusText}`;
      }

      console.error('API request failed:', {
        url,
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        details: errorDetails,
      });

      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('API request successful:', url);
    return data;
  } catch (error: any) {
    // Handle network errors
    if (error.message?.includes('Network request failed') ||
        error.message?.includes('Failed to fetch') ||
        error.name === 'TypeError') {
      console.error('Network error:', {
        url,
        message: error.message,
        name: error.name,
      });
      throw new Error('Network error. Please check your internet connection and ensure the admin server is running.');
    }

    // Re-throw other errors
    throw error;
  }
}

