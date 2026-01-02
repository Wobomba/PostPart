import { supabase } from '../../lib/supabase';

export type ActivityType =
  | 'user_account_created'
  | 'user_login'
  | 'user_logout'
  | 'parent_created'
  | 'parent_organisation_assigned'
  | 'parent_organisation_updated'
  | 'parent_status_changed'
  | 'parent_details_updated'
  | 'parent_deleted'
  | 'organisation_created'
  | 'organisation_updated'
  | 'organisation_deleted'
  | 'organisation_status_changed'
  | 'center_created'
  | 'center_updated'
  | 'center_deleted'
  | 'center_verified'
  | 'checkin_completed'
  | 'allocation_created'
  | 'allocation_updated'
  | 'system_error'
  | 'system_warning';

export type EntityType = 'user' | 'parent' | 'organisation' | 'center' | 'checkin' | 'allocation' | 'system';

interface LogActivityParams {
  activityType: ActivityType;
  entityType: EntityType;
  entityId: string;
  entityName: string;
  relatedEntityType?: EntityType;
  relatedEntityId?: string;
  relatedEntityName?: string;
  description: string;
  metadata?: Record<string, any>;
}

/**
 * Logs an activity to the activity_log table
 * This creates an audit trail for all admin actions
 */
export async function logActivity(params: LogActivityParams) {
  try {
    const {
      activityType,
      entityType,
      entityId,
      entityName,
      relatedEntityType,
      relatedEntityId,
      relatedEntityName,
      description,
      metadata,
    } = params;

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('activity_log').insert({
      activity_type: activityType,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      related_entity_type: relatedEntityType,
      related_entity_id: relatedEntityId,
      related_entity_name: relatedEntityName,
      admin_user_id: user?.id,
      description,
      metadata: metadata || {},
    });

    if (error) {
      console.error('Error logging activity:', error);
      // Don't throw - logging should not break the main flow
    }
  } catch (error) {
    console.error('Error in logActivity:', error);
    // Don't throw - logging should not break the main flow
  }
}

/**
 * Helper function to create activity descriptions
 */
export const ActivityDescriptions = {
  parentCreated: (parentName: string) => `New parent ${parentName} registered`,
  parentOrganisationAssigned: (parentName: string, orgName: string) =>
    `${parentName} assigned to ${orgName}`,
  parentOrganisationUpdated: (parentName: string, oldOrg: string, newOrg: string) =>
    `${parentName} moved from ${oldOrg} to ${newOrg}`,
  parentStatusChanged: (parentName: string, oldStatus: string, newStatus: string) =>
    `${parentName} status changed from ${oldStatus} to ${newStatus}`,
  parentDetailsUpdated: (parentName: string, fields: string[]) =>
    `${parentName} details updated (${fields.join(', ')})`,
  organisationCreated: (orgName: string) => `New organisation ${orgName} created`,
  organisationUpdated: (orgName: string, fields: string[]) =>
    `${orgName} updated (${fields.join(', ')})`,
  organisationDeleted: (orgName: string) => `Organisation ${orgName} deleted`,
  organisationStatusChanged: (orgName: string, oldStatus: string, newStatus: string) =>
    `${orgName} status changed from ${oldStatus} to ${newStatus}`,
  checkInCompleted: (parentName: string, centerName: string) =>
    `${parentName} checked in at ${centerName}`,
};

