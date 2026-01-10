import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

/**
 * POST /api/push-notifications
 * Send push notifications to multiple devices using Expo Push Notification service
 */
export async function POST(request: NextRequest) {
  try {
    const { pushTokens, title, message, data } = await request.json();

    if (!pushTokens || !Array.isArray(pushTokens) || pushTokens.length === 0) {
      return NextResponse.json(
        { error: 'Push tokens array is required' },
        { status: 400 }
      );
    }

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      );
    }

    // Filter out null/undefined tokens
    const validTokens = pushTokens.filter(token => token && typeof token === 'string');

    if (validTokens.length === 0) {
      return NextResponse.json(
        { error: 'No valid push tokens provided' },
        { status: 400 }
      );
    }

    // Prepare notification messages for Expo Push Notification service
    const messages = validTokens.map(token => ({
      to: token,
      sound: 'default',
      title,
      body: message,
      data: data || {},
      priority: 'high' as const,
      channelId: 'default',
    }));

    // Send notifications via Expo Push Notification service
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Expo Push API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to send push notifications', details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();
    
    // Count successful sends
    const successCount = result.data?.filter((r: any) => r.status === 'ok').length || 0;
    const failureCount = validTokens.length - successCount;

    return NextResponse.json({
      success: true,
      sent: successCount,
      failed: failureCount,
      total: validTokens.length,
      details: result.data,
    });
  } catch (error: any) {
    console.error('Error sending push notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

