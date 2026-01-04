import { NextRequest, NextResponse } from 'next/server';
import { runReminderCheck } from '../../../utils/reminderNotifications';

/**
 * API endpoint to trigger reminder notifications
 * Can be called by a cron job or scheduled task
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authorization (you can add API key check here)
    const authHeader = request.headers.get('authorization');
    // For now, we'll allow it. In production, add proper API key validation
    
    await runReminderCheck();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Reminder check completed' 
    });
  } catch (error: any) {
    console.error('Error running reminder check:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for manual testing
 */
export async function GET(request: NextRequest) {
  try {
    await runReminderCheck();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Reminder check completed' 
    });
  } catch (error: any) {
    console.error('Error running reminder check:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

