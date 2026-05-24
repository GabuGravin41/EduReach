/**
 * Kenyan university unit codes encode the year of study in the first digit
 * of their 3-digit number — e.g. EEE 203 is year 2, ECU 301 is year 3.
 * These helpers let the UI organise engineering units by year and tailor
 * suggestions to the student's year of study.
 */

/** Returns the year (1-5) extracted from a unit code, or null. */
export function yearFromCode(code?: string | null): number | null {
  if (!code) return null;
  // Find the first 3+ digit run and take its leading digit.
  const m = code.match(/\d{3,}/);
  if (!m) return null;
  const digit = parseInt(m[0][0], 10);
  return digit >= 1 && digit <= 5 ? digit : null;
}

/** Returns the year (1-5) from a profile's year_of_study string, or null. */
export function profileYear(user?: { year_of_study?: string } | null): number | null {
  const s = user?.year_of_study || '';
  const m = s.match(/[1-5]/);
  return m ? parseInt(m[0], 10) : null;
}

export const YEAR_LABEL: Record<number, string> = {
  1: '1st year',
  2: '2nd year',
  3: '3rd year',
  4: '4th year',
  5: '5th year',
};
