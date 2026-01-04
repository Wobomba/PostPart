import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// PostPart brand colors
const COLORS = {
  primary: '#E91E63',
  secondary: '#9C27B0',
  text: '#1e293b',
  textSecondary: '#64748b',
  border: '#e2e8f0',
  background: '#f8fafc',
};

// Add logo to PDF (using base64 or URL)
const addLogo = (doc: jsPDF, logoDataUrl?: string) => {
  try {
    // If logo is provided, add it
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, 'PNG', 15, 10, 30, 30);
    } else {
      // Fallback: Just add "PostPart" text as logo
      doc.setFontSize(24);
      doc.setTextColor(COLORS.primary);
      doc.setFont('helvetica', 'bold');
      doc.text('PostPart', 15, 25);
      
      // Tagline
      doc.setFontSize(8);
      doc.setTextColor(COLORS.textSecondary);
      doc.setFont('helvetica', 'normal');
      doc.text('Well Mamas Well Babies', 15, 32);
    }
  } catch (error) {
    console.error('Error adding logo:', error);
  }
};

// Add header with title
const addHeader = (doc: jsPDF, title: string, subtitle?: string) => {
  addLogo(doc);
  
  // Title
  doc.setFontSize(18);
  doc.setTextColor(COLORS.text);
  doc.setFont('helvetica', 'bold');
  const titleY = 25;
  doc.text(title, doc.internal.pageSize.width / 2, titleY, { align: 'center' });
  
  // Subtitle
  if (subtitle) {
    doc.setFontSize(11);
    doc.setTextColor(COLORS.textSecondary);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, doc.internal.pageSize.width / 2, titleY + 7, { align: 'center' });
  }
  
  // Line under header
  doc.setDrawColor(COLORS.border);
  doc.setLineWidth(0.5);
  doc.line(15, 45, doc.internal.pageSize.width - 15, 45);
  
  return 50; // Return Y position where content should start
};

// Add footer with page numbers and generation date
const addFooter = (doc: jsPDF) => {
  const pageCount = doc.internal.pages.length - 1; // Subtract the first empty page
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Page number
    doc.setFontSize(9);
    doc.setTextColor(COLORS.textSecondary);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    
    // Generation date
    doc.setFontSize(8);
    doc.text(
      `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
      pageWidth - 15,
      pageHeight - 10,
      { align: 'right' }
    );
  }
};

// Organisation Report
export const generateOrganisationPDF = (
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
  const doc = new jsPDF();
  
  // Add header
  const startY = addHeader(
    doc,
    `Report of ${data.name}`,
    `Organisation Activity Report`
  );
  
  let currentY = startY + 5;
  
  // Organisation Details Section
  doc.setFontSize(14);
  doc.setTextColor(COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text('Organisation Details', 15, currentY);
  currentY += 8;
  
  doc.setFontSize(10);
  doc.setTextColor(COLORS.text);
  doc.setFont('helvetica', 'normal');
  
  const details = [
    ['Status:', data.status.toUpperCase()],
    ['Plan Type:', data.plan_type || 'N/A'],
    ['Industry:', data.industry || 'N/A'],
    ['Company Size:', data.size || 'N/A'],
    ['Contact Person:', data.contact_name || 'N/A'],
    ['Contact Email:', data.contact_email || 'N/A'],
    ['Contact Phone:', data.contact_phone || 'N/A'],
    ['Address:', `${data.address || ''} ${data.city || ''}`.trim() || 'N/A'],
  ];
  
  autoTable(doc, {
    startY: currentY,
    head: [],
    body: details,
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: COLORS.textSecondary, cellWidth: 40 },
      1: { textColor: COLORS.text },
    },
  });
  
  currentY = (doc as any).lastAutoTable.finalY + 10;
  
  // Statistics Section
  doc.setFontSize(14);
  doc.setTextColor(COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text('Statistics', 15, currentY);
  currentY += 8;
  
  const stats = [
    ['Total Parents:', data.parentCount.toString()],
    ['Total Check-Ins:', data.checkInCount.toString()],
    ['Check-Ins Today:', data.todayCheckIns.toString()],
    ['Last Activity:', data.lastCheckInDate ? new Date(data.lastCheckInDate).toLocaleString() : 'Never'],
  ];
  
  autoTable(doc, {
    startY: currentY,
    head: [],
    body: stats,
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: COLORS.textSecondary, cellWidth: 40 },
      1: { textColor: COLORS.text, fontStyle: 'bold' },
    },
  });
  
  currentY = (doc as any).lastAutoTable.finalY + 10;
  
  // Parents List Section (if there are parents)
  if (data.parents && data.parents.length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.text('Associated Parents', 15, currentY);
    currentY += 8;
    
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
    
    autoTable(doc, {
      startY: currentY,
      head: [['Name', 'Email', 'Joined Date']],
      body: filteredParents.map((p) => [
        p.full_name,
        p.email || 'N/A',
        new Date(p.created_at).toLocaleDateString(),
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: COLORS.primary,
        textColor: '#ffffff',
        fontStyle: 'bold',
        fontSize: 10,
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      alternateRowStyles: {
        fillColor: COLORS.background,
      },
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Recent Check-Ins Section (if available)
  if (data.recentCheckIns && data.recentCheckIns.length > 0) {
    // Add new page if needed
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFontSize(14);
    doc.setTextColor(COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.text('Recent Check-Ins', 15, currentY);
    currentY += 8;
    
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
    
    const checkInData = filteredCheckIns.map((c: any) => {
      const child = Array.isArray(c.children) ? c.children[0] : c.children;
      const center = Array.isArray(c.centers) ? c.centers[0] : c.centers;
      return [
        new Date(c.check_in_time).toLocaleString(),
        center?.name || 'Unknown',
        child ? `${child.first_name} ${child.last_name}` : 'Unknown',
      ];
    });
    
    autoTable(doc, {
      startY: currentY,
      head: [['Date & Time', 'Centre', 'Child']],
      body: checkInData,
      theme: 'grid',
      headStyles: {
        fillColor: COLORS.secondary,
        textColor: '#ffffff',
        fontStyle: 'bold',
        fontSize: 10,
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      alternateRowStyles: {
        fillColor: COLORS.background,
      },
    });
  }
  
  // Add footer
  addFooter(doc);
  
  // Save PDF
  doc.save(`${data.name.replace(/\s+/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.pdf`);
};

// Activity Logs Report
export const generateActivityLogsPDF = (
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
  const doc = new jsPDF();
  
  // Create subtitle with date range
  let subtitle = 'Activity Logs Report';
  if (filters?.startDate && filters?.endDate) {
    subtitle = `Activity Logs from ${filters.startDate.toLocaleDateString()} to ${filters.endDate.toLocaleDateString()}`;
  } else if (filters?.startDate) {
    subtitle = `Activity Logs from ${filters.startDate.toLocaleDateString()}`;
  } else if (filters?.endDate) {
    subtitle = `Activity Logs until ${filters.endDate.toLocaleDateString()}`;
  }
  
  // Add header
  const startY = addHeader(doc, 'Activity Logs Report', subtitle);
  
  let currentY = startY + 5;
  
  // Summary Section
  doc.setFontSize(14);
  doc.setTextColor(COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text('Report Summary', 15, currentY);
  currentY += 8;
  
  const summary = [
    ['Total Activities:', logs.length.toString()],
    ['Date Range:', filters?.startDate && filters?.endDate 
      ? `${filters.startDate.toLocaleDateString()} - ${filters.endDate.toLocaleDateString()}`
      : 'All Time'
    ],
  ];
  
  if (filters?.activityType && filters.activityType !== 'all') {
    summary.push(['Activity Type Filter:', filters.activityType]);
  }
  
  if (filters?.entityType && filters.entityType !== 'all') {
    summary.push(['Entity Type Filter:', filters.entityType]);
  }
  
  autoTable(doc, {
    startY: currentY,
    head: [],
    body: summary,
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: COLORS.textSecondary, cellWidth: 50 },
      1: { textColor: COLORS.text },
    },
  });
  
  currentY = (doc as any).lastAutoTable.finalY + 10;
  
  // Activity Logs Table
  doc.setFontSize(14);
  doc.setTextColor(COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text('Activity Details', 15, currentY);
  currentY += 8;
  
  const logsData = logs.map((log) => [
    new Date(log.created_at).toLocaleString(),
    log.activity_type.replace(/_/g, ' ').toUpperCase(),
    log.entity_type.charAt(0).toUpperCase() + log.entity_type.slice(1),
    log.entity_name,
    log.description.substring(0, 60) + (log.description.length > 60 ? '...' : ''),
  ]);
  
  autoTable(doc, {
    startY: currentY,
    head: [['Date & Time', 'Activity', 'Entity', 'Name', 'Description']],
    body: logsData,
    theme: 'grid',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: '#ffffff',
      fontStyle: 'bold',
      fontSize: 9,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 30 },
      2: { cellWidth: 20 },
      3: { cellWidth: 35 },
      4: { cellWidth: 60 },
    },
    alternateRowStyles: {
      fillColor: COLORS.background,
    },
  });
  
  // Add footer
  addFooter(doc);
  
  // Save PDF
  const dateStr = new Date().toISOString().split('T')[0];
  doc.save(`Activity_Logs_Report_${dateStr}.pdf`);
};

// Parent Report
export const generateParentPDF = (
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
  const doc = new jsPDF();
  
  // Add header
  const startY = addHeader(
    doc,
    `Report of ${data.full_name}`,
    `Parent Activity Report`
  );
  
  let currentY = startY + 5;
  
  // Parent Details Section
  doc.setFontSize(14);
  doc.setTextColor(COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text('Parent Details', 15, currentY);
  currentY += 8;
  
  doc.setFontSize(10);
  doc.setTextColor(COLORS.text);
  doc.setFont('helvetica', 'normal');
  
  const details = [
    ['Email:', data.email || 'N/A'],
    ['Phone:', data.phone || 'N/A'],
    ['Status:', data.status.toUpperCase()],
    ['Organisation:', data.organization?.name || 'Not Assigned'],
    ['Member Since:', new Date(data.created_at).toLocaleDateString()],
  ];
  
  if (data.organization?.industry) {
    details.push(['Industry:', data.organization.industry]);
  }
  
  autoTable(doc, {
    startY: currentY,
    head: [],
    body: details,
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: COLORS.textSecondary, cellWidth: 40 },
      1: { textColor: COLORS.text },
    },
  });
  
  currentY = (doc as any).lastAutoTable.finalY + 10;
  
  // Statistics Section
  doc.setFontSize(14);
  doc.setTextColor(COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text('Statistics', 15, currentY);
  currentY += 8;
  
  const stats = [
    ['Total Children:', data.children.length.toString()],
    ['Total Check-Ins:', data.totalCheckIns.toString()],
  ];
  
  autoTable(doc, {
    startY: currentY,
    head: [],
    body: stats,
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: COLORS.textSecondary, cellWidth: 40 },
      1: { textColor: COLORS.text, fontStyle: 'bold' },
    },
  });
  
  currentY = (doc as any).lastAutoTable.finalY + 10;
  
  // Children Section
  if (data.children && data.children.length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.text('Children', 15, currentY);
    currentY += 8;
    
    autoTable(doc, {
      startY: currentY,
      head: [['Name', 'Age Group', 'Added Date']],
      body: data.children.map((child) => [
        `${child.first_name} ${child.last_name}`,
        child.age_group || 'N/A',
        new Date(child.created_at).toLocaleDateString(),
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: COLORS.primary,
        textColor: '#ffffff',
        fontStyle: 'bold',
        fontSize: 10,
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      alternateRowStyles: {
        fillColor: COLORS.background,
      },
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Recent Check-Ins Section
  if (data.checkIns && data.checkIns.length > 0) {
    // Add new page if needed
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFontSize(14);
    doc.setTextColor(COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.text('Recent Check-Ins', 15, currentY);
    currentY += 8;
    
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
    
    const checkInData = filteredCheckIns.map((c) => [
      new Date(c.check_in_time).toLocaleString(),
      c.center.name,
      `${c.child.first_name} ${c.child.last_name}`,
    ]);
    
    autoTable(doc, {
      startY: currentY,
      head: [['Date & Time', 'Centre', 'Child']],
      body: checkInData,
      theme: 'grid',
      headStyles: {
        fillColor: COLORS.secondary,
        textColor: '#ffffff',
        fontStyle: 'bold',
        fontSize: 10,
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      alternateRowStyles: {
        fillColor: COLORS.background,
      },
    });
  }
  
  // Add footer
  addFooter(doc);
  
  // Save PDF
  doc.save(`${data.full_name.replace(/\s+/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.pdf`);
};

// Centre Report
export const generateCentrePDF = (
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
  const doc = new jsPDF();
  
  // Add header
  const startY = addHeader(
    doc,
    `Report of ${data.name}`,
    `Day Care Centre Activity Report`
  );
  
  let currentY = startY + 5;
  
  // Centre Details Section
  doc.setFontSize(14);
  doc.setTextColor(COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text('Centre Details', 15, currentY);
  currentY += 8;
  
  doc.setFontSize(10);
  doc.setTextColor(COLORS.text);
  doc.setFont('helvetica', 'normal');
  
  const details = [
    ['Status:', data.is_verified ? 'VERIFIED' : 'PENDING VERIFICATION'],
    ['Address:', `${data.address}, ${data.city}`],
  ];
  
  if (data.district) {
    details.push(['District:', data.district]);
  }
  
  if (data.region) {
    details.push(['Region:', data.region]);
  }
  
  details.push(['Capacity:', `${data.capacity} children`]);
  
  if (data.age_range_min !== undefined && data.age_range_max !== undefined) {
    details.push(['Age Range:', `${data.age_range_min} - ${data.age_range_max} years`]);
  }
  
  if (data.operating_schedule) {
    details.push(['Operating Hours:', data.operating_schedule]);
  }
  
  autoTable(doc, {
    startY: currentY,
    head: [],
    body: details,
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: COLORS.textSecondary, cellWidth: 40 },
      1: { textColor: COLORS.text },
    },
  });
  
  currentY = (doc as any).lastAutoTable.finalY + 10;
  
  // Services Offered Section
  if (data.services_offered && data.services_offered.length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.text('Services Offered', 15, currentY);
    currentY += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(COLORS.text);
    doc.setFont('helvetica', 'normal');
    
    data.services_offered.forEach((service) => {
      doc.text(`• ${service}`, 20, currentY);
      currentY += 5;
    });
    
    currentY += 5;
  }
  
  // Statistics Section
  doc.setFontSize(14);
  doc.setTextColor(COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text('Statistics', 15, currentY);
  currentY += 8;
  
  const stats = [
    ['Total Check-Ins:', data.totalCheckIns.toString()],
    ['Check-Ins Today:', data.todayCheckIns.toString()],
    ['Check-Ins This Week:', data.weeklyCheckIns.toString()],
    ['Check-Ins This Month:', data.monthlyCheckIns.toString()],
    ['Unique Parents:', data.uniqueParents.toString()],
  ];
  
  autoTable(doc, {
    startY: currentY,
    head: [],
    body: stats,
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: COLORS.textSecondary, cellWidth: 40 },
      1: { textColor: COLORS.text, fontStyle: 'bold' },
    },
  });
  
  currentY = (doc as any).lastAutoTable.finalY + 10;
  
  // Recent Check-Ins Section
  if (data.recentCheckIns && data.recentCheckIns.length > 0) {
    // Add new page if needed
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFontSize(14);
    doc.setTextColor(COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.text('Recent Check-Ins', 15, currentY);
    currentY += 8;
    
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
    
    const checkInData = filteredCheckIns.map((c) => [
      new Date(c.check_in_time).toLocaleString(),
      c.parent.full_name,
      `${c.child.first_name} ${c.child.last_name}`,
    ]);
    
    autoTable(doc, {
      startY: currentY,
      head: [['Date & Time', 'Parent', 'Child']],
      body: checkInData,
      theme: 'grid',
      headStyles: {
        fillColor: COLORS.secondary,
        textColor: '#ffffff',
        fontStyle: 'bold',
        fontSize: 10,
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      alternateRowStyles: {
        fillColor: COLORS.background,
      },
    });
  }
  
  // Add footer
  addFooter(doc);
  
  // Save PDF
  doc.save(`${data.name.replace(/\s+/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.pdf`);
};

