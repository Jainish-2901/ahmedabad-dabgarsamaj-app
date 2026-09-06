/**
 * Helper to identify placeholder / dummy DOBs (e.g. 1900-01-01 used for DB constraints when DOB is unknown)
 */
export function isDummyDOB(dobString?: string | null): boolean {
  if (!dobString || typeof dobString !== 'string') return true;
  const trimmed = dobString.trim();
  return (
    trimmed === '' ||
    trimmed === '1900-01-01' ||
    trimmed === '01-01-1900' ||
    trimmed.startsWith('1900-01-01')
  );
}

/**
 * Parse any date format (DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, ISO) into a valid Date object.
 */
export function parseDOB(dobString?: string | null): Date | null {
  if (!dobString || typeof dobString !== 'string') return null;
  const trimmed = dobString.trim();
  if (isDummyDOB(trimmed)) return null;

  // Match DD-MM-YYYY or DD/MM/YYYY
  const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (ddmmyyyyMatch) {
    const day = parseInt(ddmmyyyyMatch[1], 10);
    const month = parseInt(ddmmyyyyMatch[2], 10) - 1; // 0-indexed
    const year = parseInt(ddmmyyyyMatch[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime()) && d.getDate() === day && d.getMonth() === month && d.getFullYear() === year) {
      return d;
    }
  }

  // Match 4-digit year e.g. "1990" or "2021"
  const yyyyMatch = trimmed.match(/^(\d{4})$/);
  if (yyyyMatch) {
    const year = parseInt(yyyyMatch[1], 10);
    return new Date(year, 0, 1);
  }

  // Fallback to standard Date parser (YYYY-MM-DD or ISO)
  const standardDate = new Date(trimmed);
  if (!isNaN(standardDate.getTime())) {
    return standardDate;
  }

  return null;
}

/**
 * Calculate age dynamically from a Date of Birth (DOB) string.
 * Supports DD-MM-YYYY, DD/MM/YYYY, and YYYY-MM-DD formats.
 * If deceasedDateString is provided, calculates the age at demise (difference between DOB and demise date).
 */
export function calculateAge(dobString?: string | null, deceasedDateString?: string | null): number | undefined {
  const birthDate = parseDOB(dobString);
  if (!birthDate) return undefined;

  const endDate = (deceasedDateString ? parseDOB(deceasedDateString) : null) || new Date();
  let age = endDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = endDate.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && endDate.getDate() < birthDate.getDate())) {
    age--;
  }

  return Math.max(0, age);
}

/**
 * Format human-readable age:
 * - If < 1 year: displays months (e.g. "6 Months" or "15 Days" if < 1 month)
 * - If >= 1 year: displays years (e.g. "25 Years")
 * If deceasedDateString is provided, calculates age at demise.
 */
export function formatAge(dobString?: string | null, fallbackAge?: number, deceasedDateString?: string | null): string {
  const birthDate = parseDOB(dobString);
  const endDate = (deceasedDateString ? parseDOB(deceasedDateString) : null) || new Date();

  if (birthDate) {
    let years = endDate.getFullYear() - birthDate.getFullYear();
    let months = endDate.getMonth() - birthDate.getMonth();
    let days = endDate.getDate() - birthDate.getDate();

    if (days < 0) {
      months--;
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    if (years <= 0) {
      if (months <= 0) {
        const diffTime = Math.abs(endDate.getTime() - birthDate.getTime());
        const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (totalDays <= 0) return 'Newborn (નવજાત)';
        return `${totalDays} ${totalDays === 1 ? 'Day' : 'Days'} (${totalDays} દિવસ)`;
      }
      return `${months} ${months === 1 ? 'Month' : 'Months'} (${months} મહિના)`;
    }

    return `${years} ${years === 1 ? 'Year' : 'Years'} (${years} વર્ષ)`;
  }

  if (fallbackAge !== undefined && fallbackAge >= 0) {
    if (fallbackAge === 0) return '< 1 Year';
    return `${fallbackAge} ${fallbackAge === 1 ? 'Year' : 'Years'}`;
  }

  return 'N/A';
}

/**
 * Short age format for cards and lists (e.g. "6 months", "15 days", "25 yrs")
 * If deceasedDateString is provided, calculates age at demise.
 */
export function formatAgeShort(dobString?: string | null, fallbackAge?: number, deceasedDateString?: string | null): string {
  const birthDate = parseDOB(dobString);
  const endDate = (deceasedDateString ? parseDOB(deceasedDateString) : null) || new Date();

  if (birthDate) {
    let years = endDate.getFullYear() - birthDate.getFullYear();
    let months = endDate.getMonth() - birthDate.getMonth();
    let days = endDate.getDate() - birthDate.getDate();

    if (days < 0) {
      months--;
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    if (years <= 0) {
      if (months <= 0) {
        const diffTime = Math.abs(endDate.getTime() - birthDate.getTime());
        const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (totalDays <= 0) return 'Newborn';
        return `${totalDays} ${totalDays === 1 ? 'day' : 'days'}`;
      }
      return `${months} ${months === 1 ? 'month' : 'months'}`;
    }

    return `${years} yrs`;
  }

  if (fallbackAge !== undefined && fallbackAge >= 0) {
    if (fallbackAge === 0) return '< 1 yr';
    return `${fallbackAge} yrs`;
  }

  return '';
}

/**
 * Format date for display in DD-MM-YYYY format
 */
export function formatDate(dateString?: string | null): string {
  if (!dateString || isDummyDOB(dateString)) return '';
  const d = parseDOB(dateString);
  if (!d) return '';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}-${month}-${year}`;
}

/**
 * Format date for PostgreSQL DATE column (YYYY-MM-DD)
 */
export function formatDateForDB(dateString?: string | null): string {
  if (!dateString || isDummyDOB(dateString)) return '';
  const d = parseDOB(dateString);
  if (!d) return '';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${year}-${month}-${day}`;
}

/**
 * Validate DD-MM-YYYY format and realistic birthdate
 */
export function isValidDOB(dobString?: string | null): boolean {
  const d = parseDOB(dobString);
  if (!d) return false;
  const today = new Date();
  const minYear = 1900;
  return d.getTime() <= today.getTime() && d.getFullYear() >= minYear;
}

/**
 * Get age group for reporting according to Section 27
 */
export function getAgeGroup(age?: number): string {
  if (age === undefined || age < 0) return 'Unknown';
  if (age <= 5) return '0–5 (Toddler)';
  if (age <= 12) return '6–12 (Child)';
  if (age <= 17) return '13–17 (Teen)';
  if (age <= 25) return '18–25 (Youth)';
  if (age <= 40) return '26–40 (Adult)';
  if (age <= 60) return '41–60 (Middle Age)';
  return '60+ (Senior Citizen)';
}
