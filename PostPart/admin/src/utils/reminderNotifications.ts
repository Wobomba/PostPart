/**
 * Reminder Notification System
 * 
 * Sends reminder notifications to parents to pick up their children
 * based on daycare center operating hours (e.g., 6am-6pm)
 */

import { supabase } from '../../lib/supabase';
import { logActivity } from './activityLogger';

interface OperatingHours {
  startHour: number; // 0-23
  endHour: number; // 0-23
}

/**
 * Parse operating hours from string format (e.g., "6am-6pm", "9:00 AM - 5:00 PM")
 */
export function parseOperatingHours(hoursString?: string): OperatingHours | null {
  if (!hoursString) return null;

  // Try to parse common formats
  // Format 1: "6am-6pm" or "6am - 6pm"
  const simpleFormat = hoursString.match(/(\d+)(am|pm)\s*-\s*(\d+)(am|pm)/i);
  if (simpleFormat) {
    let startHour = parseInt(simpleFormat[1]);
    const startPeriod = simpleFormat[2].toLowerCase();
    let endHour = parseInt(simpleFormat[3]);
    const endPeriod = simpleFormat[4].toLowerCase();

    // Convert to 24-hour format
    if (startPeriod === 'pm' && startHour !== 12) startHour += 12;
    if (startPeriod === 'am' && startHour === 12) startHour = 0;
    if (endPeriod === 'pm' && endHour !== 12) endHour += 12;
    if (endPeriod === 'am' && endHour === 12) endHour = 0;

    return { startHour, endHour };
  }

  // Format 2: "9:00 AM - 5:00 PM"
  const detailedFormat = hoursString.match(/(\d+):(\d+)\s*(am|pm)\s*-\s*(\d+):(\d+)\s*(am|pm)/i);
  if (detailedFormat) {
    let startHour = parseInt(detailedFormat[1]);
    const startPeriod = detailedFormat[3].toLowerCase();
    let endHour = parseInt(detailedFormat[4]);
    const endPeriod = detailedFormat[6].toLowerCase();

    if (startPeriod === 'pm' && startHour !== 12) startHour += 12;
    if (startPeriod === 'am' && startHour === 12) startHour = 0;
    if (endPeriod === 'pm' && endHour !== 12) endHour += 12;
    if (endPeriod === 'am' && endHour === 12) endHour = 0;

    return { startHour, endHour };
  }

  return null;
}

/**
 * Check if current time is within reminder window (30 minutes before closing)
 */
export function shouldSendReminder(operatingHours: OperatingHours): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Calculate reminder time (30 minutes before closing)
  let reminderHour = operatingHours.endHour;
  let reminderMinute = 30;

  if (reminderMinute === 0) {
    reminderHour = operatingHours.endHour - 1;
    reminderMinute = 30;
  }

  // Check if current time is within the reminder window (30 min before closing to closing time)
  const reminderTime = reminderHour * 60 + reminderMinute;
  const currentTime = currentHour * 60 + currentMinute;
  const closingTime = operatingHours.endHour * 60;

  return currentTime >= reminderTime && currentTime < closingTime;
}

/**
 * Send reminder notifications to parents with active check-ins
 */
export async function sendPickupReminders(): Promise<void> {
  try {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Get all active check-ins (checked in but not checked out)
    const { data: activeCheckIns, error: checkInsError } = await supabase
      .from('checkins')
      .select(`
        id,
        parent_id,
        child_id,
        center_id,
        check_in_time,
        profiles!inner(id, full_name, status),
        children!inner(first_name, last_name),
        centers!inner(id, name, hours_of_operation, operating_schedule, custom_hours)
      `)
      .is('check_out_time', null)
      .eq('profiles.status', 'active');

    if (checkInsError) {
      console.error('Error fetching active check-ins:', checkInsError);
      return;
    }

    if (!activeCheckIns || activeCheckIns.length === 0) {
      return; // No active check-ins
    }

    // Group check-ins by center
    const checkInsByCenter = new Map<string, any[]>();
    activeCheckIns.forEach((checkIn: any) => {
      const centerId = checkIn.center_id;
      if (!checkInsByCenter.has(centerId)) {
        checkInsByCenter.set(centerId, []);
      }
      checkInsByCenter.get(centerId)!.push(checkIn);
    });

    // Process each center
    for (const [centerId, checkIns] of checkInsByCenter.entries()) {
      const center = checkIns[0].centers;
      // Try to parse operating hours from various fields
      const hoursString = center.hours_of_operation || center.custom_hours || center.operating_schedule;
      const operatingHours = parseOperatingHours(hoursString);

      if (!operatingHours) {
        continue; // Skip centers without operating hours
      }

      // Check if we should send reminders for this center
      if (!shouldSendReminder(operatingHours)) {
        continue;
      }

      // Check if reminder was already sent today (to avoid duplicates)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      const { data: existingReminders } = await supabase
        .from('notifications')
        .select('id')
        .eq('target_type', 'pickup_reminder')
        .eq('target_id', centerId)
        .gte('created_at', today.toISOString())
        .lte('created_at', todayEnd.toISOString());

      if (existingReminders && existingReminders.length > 0) {
        continue; // Reminder already sent today
      }

      // Get unique parent IDs
      const parentIds = [...new Set(checkIns.map((ci: any) => ci.parent_id))];

      // Create notification
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) continue;

      const { data: notification, error: notifError } = await supabase
        .from('notifications')
        .insert({
          title: 'Time to Pick Up Your Child',
          message: `Reminder: ${center.name} closes at ${operatingHours.endHour > 12 ? operatingHours.endHour - 12 : operatingHours.endHour}${operatingHours.endHour >= 12 ? 'pm' : 'am'}. Please pick up your child soon.`,
          type: 'reminder',
          priority: 'high',
          target_type: 'pickup_reminder',
          target_id: centerId,
          created_by: user.id,
        })
        .select()
        .single();

      if (notifError) {
        console.error('Error creating reminder notification:', notifError);
        continue;
      }

      // Create parent_notifications entries
      const parentNotifications = parentIds.map(parentId => ({
        notification_id: notification.id,
        parent_id: parentId,
        is_read: false,
      }));

      const { error: insertError } = await supabase
        .from('parent_notifications')
        .upsert(parentNotifications, {
          onConflict: 'notification_id,parent_id',
          ignoreDuplicates: false,
        });

      if (insertError) {
        console.error('Error inserting parent notifications:', insertError);
        continue;
      }

      // Log activity for each parent
      for (const checkIn of checkIns) {
        const profile = Array.isArray(checkIn.profiles) ? checkIn.profiles[0] : checkIn.profiles;
        const child = Array.isArray(checkIn.children) ? checkIn.children[0] : checkIn.children;

        await logActivity({
          activityType: 'pickup_reminder_sent',
          entityType: 'checkin',
          entityId: checkIn.id,
          entityName: `${child?.first_name} ${child?.last_name}`,
          related_entity_type: 'center',
          related_entity_id: centerId,
          related_entity_name: center.name,
          description: `Pickup reminder sent to ${profile?.full_name} for ${child?.first_name} ${child?.last_name} at ${center.name}`,
          metadata: {
            center_closing_hour: operatingHours.endHour,
            reminder_sent_at: now.toISOString(),
          },
        });
      }
    }
  } catch (error) {
    console.error('Error sending pickup reminders:', error);
  }
}

/**
 * Run reminder check (to be called periodically, e.g., every 15 minutes)
 */
export async function runReminderCheck(): Promise<void> {
  await sendPickupReminders();
}

