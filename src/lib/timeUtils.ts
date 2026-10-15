/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Parses a time string (e.g., "15 mins", "1.5 hours", "2h", "45", "PT1H30M", "1:30") into total minutes.
 * Returns null if parsing fails completely.
 */
export function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  const cleaned = timeStr.trim().toLowerCase();
  if (!cleaned) return null;

  // 1. Check if ISO 8601 duration format (e.g., PT1H30M, PT45M, PT2H)
  if (cleaned.startsWith("pt")) {
    const hoursMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*h/);
    const minsMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*m/);
    let mins = 0;
    let parsedAny = false;
    if (hoursMatch) {
      mins += parseFloat(hoursMatch[1]) * 60;
      parsedAny = true;
    }
    if (minsMatch) {
      mins += parseFloat(minsMatch[1]);
      parsedAny = true;
    }
    if (parsedAny) return Math.round(mins);
  }

  // 2. Check if HH:MM colon format (e.g., "1:30", "0:45")
  const colonMatch = cleaned.match(/^(\d+):(\d{2})$/);
  if (colonMatch) {
    const hours = parseInt(colonMatch[1], 10);
    const minutes = parseInt(colonMatch[2], 10);
    return hours * 60 + minutes;
  }

  // 3. Check if it's purely a number (e.g., "45", "90")
  if (/^\d+(\.\d+)?$/.test(cleaned)) {
    return Math.round(parseFloat(cleaned));
  }

  // 4. Match hours and minutes components
  // Look for patterns like "1.5 hours", "1.5h", "45 mins", "45m"
  const hrPattern = /(\d+(?:\.\d+)?)\s*(?:hour|hours|hr|hrs|h)\b/g;
  const minPattern = /(\d+(?:\.\d+)?)\s*(?:minute|minutes|min|mins|m)\b/g;

  let totalMins = 0;
  let found = false;

  // Extract hours
  let hrMatch;
  while ((hrMatch = hrPattern.exec(cleaned)) !== null) {
    totalMins += parseFloat(hrMatch[1]) * 60;
    found = true;
  }

  // Extract minutes
  let minMatch;
  while ((minMatch = minPattern.exec(cleaned)) !== null) {
    totalMins += parseFloat(minMatch[1]);
    found = true;
  }

  if (found) {
    return Math.round(totalMins);
  }

  // Fallback: use generic parts regex
  const parts = cleaned.match(/(\d+(?:\.\d+)?)\s*(hour|hours|hr|hrs|h|minute|minutes|min|mins|m)?/g);
  if (parts) {
    let totalMinutes = 0;
    let parsedAny = false;
    for (const part of parts) {
      const numMatch = part.match(/(\d+(?:\.\d+)?)/);
      if (!numMatch) continue;
      const num = parseFloat(numMatch[1]);

      const unitMatch = part.match(/(hour|hours|hr|hrs|h|minute|minutes|min|mins|m)/);
      const unit = unitMatch ? unitMatch[1] : "";

      if (unit.startsWith("h")) {
        totalMinutes += num * 60;
        parsedAny = true;
      } else if (unit.startsWith("m") || unit === "") {
        totalMinutes += num;
        parsedAny = true;
      }
    }
    if (parsedAny) return Math.round(totalMinutes);
  }

  return null;
}

/**
 * Formats minutes into a beautiful, human-readable string.
 */
export function formatMinutesToHuman(mins: number): string {
  if (mins <= 0) return "0 mins";
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remainingMins = Math.round(mins % 60);
    if (remainingMins > 0) {
      return `${hrs} ${hrs === 1 ? "hr" : "hrs"} ${remainingMins} mins`;
    }
    return `${hrs} ${hrs === 1 ? "hour" : "hours"}`;
  }
  return `${mins} mins`;
}

/**
 * Normalizes a messy time string into a clean, standardized format.
 */
export function normalizeTimeStr(timeStr?: string): string {
  if (!timeStr) return "";
  const cleaned = timeStr.trim();
  if (!cleaned) return "";
  const mins = parseTimeToMinutes(cleaned);
  if (mins !== null && mins > 0) {
    return formatMinutesToHuman(mins);
  }
  return cleaned; // Fallback to raw string if it couldn't be parsed
}

/**
 * Formats the combined prep time and cook time cleanly.
 */
export function formatTotalTime(prepTime?: string, cookTime?: string): string {
  if (!prepTime && !cookTime) return "N/A";
  
  const prepMins = parseTimeToMinutes(prepTime);
  const cookMins = parseTimeToMinutes(cookTime);

  if (prepMins !== null || cookMins !== null) {
    const totalMins = (prepMins || 0) + (cookMins || 0);
    if (totalMins <= 0) return "N/A";
    return formatMinutesToHuman(totalMins);
  }

  if (!prepTime) return cookTime || "N/A";
  if (!cookTime) return prepTime || "N/A";

  // Graceful fallback if we cannot parse either
  return `${prepTime} + ${cookTime}`;
}
