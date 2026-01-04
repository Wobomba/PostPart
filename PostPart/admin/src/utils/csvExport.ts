/**
 * CSV Export Utilities
 * 
 * Provides functions for exporting data to CSV format
 */

// Helper function to escape CSV values
const escapeCSV = (value: any): string => {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

// Helper function to convert array of objects to CSV
const arrayToCSV = (data: any[], headers: string[]): string => {
  const csvRows: string[] = [];
  
  // Add headers
  csvRows.push(headers.map(escapeCSV).join(','));
  
  // Add data rows
  data.forEach((row) => {
    const values = headers.map((header) => {
      // Handle nested properties (e.g., "center.name")
      const keys = header.split('.');
      let value = row;
      for (const key of keys) {
        value = value?.[key];
      }
      return escapeCSV(value);
    });
    csvRows.push(values.join(','));
  });
  
  return csvRows.join('\n');
};

// Helper function to download CSV
const downloadCSV = (csvContent: string, filename: string) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Organisation Report CSV
export const generateOrganisationCSV = (
  data: {
    name: string;
    industry?: string;
    status: string;
    plan_type?: string;
    size?: string;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
    address?: string;
    city?: string;
    parentCount: number;
    checkInCount: number;
    todayCheckIns: number;
    lastCheckInDate?: string;
    parents: Array<{ full_name: string; email?: string; created_at: string }>;
    recentCheckIns: Array<any>;
  },
  dateRange?: { startDate?: Date; endDate?: Date }
) => {
  const csvRows: string[] = [];
  
  // Header
  csvRows.push(`Report of ${data.name}`);
  csvRows.push(`Organisation Activity Report`);
  csvRows.push(`Generated on ${new Date().toLocaleString()}`);
  csvRows.push(''); // Empty row
  
  // Organisation Details
  csvRows.push('Organisation Details');
  csvRows.push('Field,Value');
  csvRows.push(`Status,${escapeCSV(data.status.toUpperCase())}`);
  csvRows.push(`Plan Type,${escapeCSV(data.plan_type || 'N/A')}`);
  csvRows.push(`Industry,${escapeCSV(data.industry || 'N/A')}`);
  csvRows.push(`Company Size,${escapeCSV(data.size || 'N/A')}`);
  csvRows.push(`Contact Person,${escapeCSV(data.contact_name || 'N/A')}`);
  csvRows.push(`Contact Email,${escapeCSV(data.contact_email || 'N/A')}`);
  csvRows.push(`Contact Phone,${escapeCSV(data.contact_phone || 'N/A')}`);
  csvRows.push(`Address,${escapeCSV(`${data.address || ''} ${data.city || ''}`.trim() || 'N/A')}`);
  csvRows.push(''); // Empty row
  
  // Statistics
  csvRows.push('Statistics');
  csvRows.push('Metric,Value');
  csvRows.push(`Total Parents,${data.parentCount}`);
  csvRows.push(`Total Check-Ins,${data.checkInCount}`);
  csvRows.push(`Check-Ins Today,${data.todayCheckIns}`);
  csvRows.push(`Last Activity,${data.lastCheckInDate ? new Date(data.lastCheckInDate).toLocaleString() : 'Never'}`);
  csvRows.push(''); // Empty row
  
  // Parents List
  if (data.parents && data.parents.length > 0) {
    csvRows.push('Associated Parents');
    csvRows.push('Name,Email,Joined Date');
    let filteredParents = data.parents;
    if (dateRange?.startDate || dateRange?.endDate) {
      filteredParents = data.parents.filter((p) => {
        const createdDate = new Date(p.created_at);
        if (dateRange.startDate && createdDate < dateRange.startDate) return false;
        if (dateRange.endDate) {
          const endDate = new Date(dateRange.endDate);
          endDate.setHours(23, 59, 59, 999);
          if (createdDate > endDate) return false;
        }
        return true;
      });
    }
    filteredParents.forEach((p) => {
      csvRows.push(`${escapeCSV(p.full_name)},${escapeCSV(p.email || 'N/A')},${escapeCSV(new Date(p.created_at).toLocaleDateString())}`);
    });
    csvRows.push(''); // Empty row
  }
  
  // Recent Check-Ins
  if (data.recentCheckIns && data.recentCheckIns.length > 0) {
    csvRows.push('Recent Check-Ins');
    csvRows.push('Date & Time,Centre,Child');
    let filteredCheckIns = data.recentCheckIns;
    if (dateRange?.startDate || dateRange?.endDate) {
      filteredCheckIns = data.recentCheckIns.filter((c: any) => {
        const checkInDate = new Date(c.check_in_time);
        if (dateRange.startDate && checkInDate < dateRange.startDate) return false;
        if (dateRange.endDate) {
          const endDate = new Date(dateRange.endDate);
          endDate.setHours(23, 59, 59, 999);
          if (checkInDate > endDate) return false;
        }
        return true;
      });
    }
    filteredCheckIns.forEach((c: any) => {
      const child = Array.isArray(c.children) ? c.children[0] : c.children;
      const center = Array.isArray(c.centers) ? c.centers[0] : c.centers;
      csvRows.push(
        `${escapeCSV(new Date(c.check_in_time).toLocaleString())},${escapeCSV(center?.name || 'Unknown')},${escapeCSV(child ? `${child.first_name} ${child.last_name}` : 'Unknown')}`
      );
    });
  }
  
  const csvContent = csvRows.join('\n');
  const filename = `${data.name.replace(/\s+/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csvContent, filename);
};

// Activity Logs Report CSV
export const generateActivityLogsCSV = (
  logs: Array<{
    activity_type: string;
    entity_type: string;
    entity_name: string;
    related_entity_name?: string;
    description: string;
    created_at: string;
  }>,
  filters?: {
    startDate?: Date;
    endDate?: Date;
    activityType?: string;
    entityType?: string;
  }
) => {
  const csvRows: string[] = [];
  
  // Header
  csvRows.push('Activity Logs Report');
  
  let subtitle = 'Activity Logs Report';
  if (filters?.startDate && filters?.endDate) {
    subtitle = `Activity Logs from ${filters.startDate.toLocaleDateString()} to ${filters.endDate.toLocaleDateString()}`;
  } else if (filters?.startDate) {
    subtitle = `Activity Logs from ${filters.startDate.toLocaleDateString()}`;
  } else if (filters?.endDate) {
    subtitle = `Activity Logs until ${filters.endDate.toLocaleDateString()}`;
  }
  csvRows.push(subtitle);
  csvRows.push(`Generated on ${new Date().toLocaleString()}`);
  csvRows.push(''); // Empty row
  
  // Summary
  csvRows.push('Report Summary');
  csvRows.push('Field,Value');
  csvRows.push(`Total Activities,${logs.length}`);
  csvRows.push(`Date Range,${filters?.startDate && filters?.endDate 
    ? `${filters.startDate.toLocaleDateString()} - ${filters.endDate.toLocaleDateString()}`
    : 'All Time'
  }`);
  
  if (filters?.activityType && filters.activityType !== 'all') {
    csvRows.push(`Activity Type Filter,${escapeCSV(filters.activityType)}`);
  }
  
  if (filters?.entityType && filters.entityType !== 'all') {
    csvRows.push(`Entity Type Filter,${escapeCSV(filters.entityType)}`);
  }
  csvRows.push(''); // Empty row
  
  // Activity Logs
  csvRows.push('Activity Details');
  csvRows.push('Date & Time,Activity,Entity,Name,Description');
  logs.forEach((log) => {
    csvRows.push(
      `${escapeCSV(new Date(log.created_at).toLocaleString())},${escapeCSV(log.activity_type.replace(/_/g, ' ').toUpperCase())},${escapeCSV(log.entity_type.charAt(0).toUpperCase() + log.entity_type.slice(1))},${escapeCSV(log.entity_name)},${escapeCSV(log.description)}`
    );
  });
  
  const csvContent = csvRows.join('\n');
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `Activity_Logs_Report_${dateStr}.csv`;
  downloadCSV(csvContent, filename);
};

// Parent Report CSV
export const generateParentCSV = (
  data: {
  full_name: string;
  email?: string;
  phone?: string;
  status: string;
  created_at: string;
  organization?: { name: string; industry?: string };
  children: Array<{
    first_name: string;
    last_name: string;
    age_group?: string;
    created_at: string;
  }>;
  checkIns: Array<{
    check_in_time: string;
    center: { name: string };
    child: { first_name: string; last_name: string };
  }>;
  totalCheckIns: number;
  },
  dateRange?: { startDate?: Date; endDate?: Date }
) => {
  const csvRows: string[] = [];
  
  // Header
  csvRows.push(`Report of ${data.full_name}`);
  csvRows.push(`Parent Activity Report`);
  csvRows.push(`Generated on ${new Date().toLocaleString()}`);
  csvRows.push(''); // Empty row
  
  // Parent Details
  csvRows.push('Parent Details');
  csvRows.push('Field,Value');
  csvRows.push(`Email,${escapeCSV(data.email || 'N/A')}`);
  csvRows.push(`Phone,${escapeCSV(data.phone || 'N/A')}`);
  csvRows.push(`Status,${escapeCSV(data.status.toUpperCase())}`);
  csvRows.push(`Organisation,${escapeCSV(data.organization?.name || 'Not Assigned')}`);
  csvRows.push(`Member Since,${escapeCSV(new Date(data.created_at).toLocaleDateString())}`);
  
  if (data.organization?.industry) {
    csvRows.push(`Industry,${escapeCSV(data.organization.industry)}`);
  }
  csvRows.push(''); // Empty row
  
  // Statistics
  csvRows.push('Statistics');
  csvRows.push('Metric,Value');
  csvRows.push(`Total Children,${data.children.length}`);
  csvRows.push(`Total Check-Ins,${data.totalCheckIns}`);
  csvRows.push(''); // Empty row
  
  // Children
  if (data.children && data.children.length > 0) {
    csvRows.push('Children');
    csvRows.push('Name,Age Group,Added Date');
    data.children.forEach((child) => {
      csvRows.push(
        `${escapeCSV(`${child.first_name} ${child.last_name}`)},${escapeCSV(child.age_group || 'N/A')},${escapeCSV(new Date(child.created_at).toLocaleDateString())}`
      );
    });
    csvRows.push(''); // Empty row
  }
  
  // Recent Check-Ins
  if (data.checkIns && data.checkIns.length > 0) {
    csvRows.push('Recent Check-Ins');
    csvRows.push('Date & Time,Centre,Child');
    let filteredCheckIns = data.checkIns;
    if (dateRange?.startDate || dateRange?.endDate) {
      filteredCheckIns = data.checkIns.filter((c) => {
        const checkInDate = new Date(c.check_in_time);
        if (dateRange.startDate && checkInDate < dateRange.startDate) return false;
        if (dateRange.endDate) {
          const endDate = new Date(dateRange.endDate);
          endDate.setHours(23, 59, 59, 999);
          if (checkInDate > endDate) return false;
        }
        return true;
      });
    }
    filteredCheckIns.forEach((c) => {
      csvRows.push(
        `${escapeCSV(new Date(c.check_in_time).toLocaleString())},${escapeCSV(c.center.name)},${escapeCSV(`${c.child.first_name} ${c.child.last_name}`)}`
      );
    });
  }
  
  const csvContent = csvRows.join('\n');
  const filename = `${data.full_name.replace(/\s+/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csvContent, filename);
};

// Centre Report CSV
export const generateCentreCSV = (
  data: {
  name: string;
  address: string;
  city: string;
  district?: string;
  region?: string;
  capacity: number;
  is_verified: boolean;
  services_offered?: string[];
  operating_schedule?: string;
  description?: string;
  age_range_min?: number;
  age_range_max?: number;
  totalCheckIns: number;
  todayCheckIns: number;
  weeklyCheckIns: number;
  monthlyCheckIns: number;
  uniqueParents: number;
  recentCheckIns: Array<{
    check_in_time: string;
    parent: { full_name: string };
    child: { first_name: string; last_name: string };
  }>;
  },
  dateRange?: { startDate?: Date; endDate?: Date }
) => {
  const csvRows: string[] = [];
  
  // Header
  csvRows.push(`Report of ${data.name}`);
  csvRows.push(`Day Care Centre Activity Report`);
  csvRows.push(`Generated on ${new Date().toLocaleString()}`);
  csvRows.push(''); // Empty row
  
  // Centre Details
  csvRows.push('Centre Details');
  csvRows.push('Field,Value');
  csvRows.push(`Status,${escapeCSV(data.is_verified ? 'VERIFIED' : 'PENDING VERIFICATION')}`);
  csvRows.push(`Address,${escapeCSV(`${data.address}, ${data.city}`)}`);
  
  if (data.district) {
    csvRows.push(`District,${escapeCSV(data.district)}`);
  }
  
  if (data.region) {
    csvRows.push(`Region,${escapeCSV(data.region)}`);
  }
  
  csvRows.push(`Capacity,${escapeCSV(`${data.capacity} children`)}`);
  
  if (data.age_range_min !== undefined && data.age_range_max !== undefined) {
    csvRows.push(`Age Range,${escapeCSV(`${data.age_range_min} - ${data.age_range_max} years`)}`);
  }
  
  if (data.operating_schedule) {
    csvRows.push(`Operating Hours,${escapeCSV(data.operating_schedule)}`);
  }
  csvRows.push(''); // Empty row
  
  // Services Offered
  if (data.services_offered && data.services_offered.length > 0) {
    csvRows.push('Services Offered');
    data.services_offered.forEach((service) => {
      csvRows.push(escapeCSV(service));
    });
    csvRows.push(''); // Empty row
  }
  
  // Statistics
  csvRows.push('Statistics');
  csvRows.push('Metric,Value');
  csvRows.push(`Total Check-Ins,${data.totalCheckIns}`);
  csvRows.push(`Check-Ins Today,${data.todayCheckIns}`);
  csvRows.push(`Check-Ins This Week,${data.weeklyCheckIns}`);
  csvRows.push(`Check-Ins This Month,${data.monthlyCheckIns}`);
  csvRows.push(`Unique Parents,${data.uniqueParents}`);
  csvRows.push(''); // Empty row
  
  // Recent Check-Ins
  if (data.recentCheckIns && data.recentCheckIns.length > 0) {
    csvRows.push('Recent Check-Ins');
    csvRows.push('Date & Time,Parent,Child');
    let filteredCheckIns = data.recentCheckIns;
    if (dateRange?.startDate || dateRange?.endDate) {
      filteredCheckIns = data.recentCheckIns.filter((c) => {
        const checkInDate = new Date(c.check_in_time);
        if (dateRange.startDate && checkInDate < dateRange.startDate) return false;
        if (dateRange.endDate) {
          const endDate = new Date(dateRange.endDate);
          endDate.setHours(23, 59, 59, 999);
          if (checkInDate > endDate) return false;
        }
        return true;
      });
    }
    filteredCheckIns.forEach((c) => {
      csvRows.push(
        `${escapeCSV(new Date(c.check_in_time).toLocaleString())},${escapeCSV(c.parent.full_name)},${escapeCSV(`${c.child.first_name} ${c.child.last_name}`)}`
      );
    });
  }
  
  const csvContent = csvRows.join('\n');
  const filename = `${data.name.replace(/\s+/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csvContent, filename);
};

