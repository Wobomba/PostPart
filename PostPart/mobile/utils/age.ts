/**
 * Calculate and format age from date of birth
 * Always returns format "X years Y months old" (e.g., "0 years 6 months old" for children under 1 year)
 */
export function calculateAge(dateOfBirth: string): string {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  
  // Adjust if birthday hasn't occurred this year
  if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
    years--;
    months += 12;
  }
  
  // Adjust months if day hasn't occurred this month
  if (today.getDate() < birthDate.getDate()) {
    months--;
    if (months < 0) {
      months += 12;
      years--;
    }
  }
  
  // Always show "X years Y months old" format for consistency
  const yearsText = years === 1 ? '1 year' : `${years} years`;
  const monthsText = months === 1 ? '1 month' : `${months} months`;
  
  return `${yearsText} ${monthsText} old`;
}

