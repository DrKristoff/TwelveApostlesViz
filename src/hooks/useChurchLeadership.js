import { useState, useMemo, useEffect } from 'react';
import apostlesData from '../data/apostles.json';
import { isBefore, isAfter, parseISO, addDays, isSameDay } from 'date-fns';

// Helper to check if a date is between start and end
const isBetween = (date, start, end) => {
  if (!start) return false;
  const d = parseISO(date);
  const s = parseISO(start);
  if (isBefore(d, s)) return false;
  if (!end) return true; // Current role
  const e = parseISO(end);
  return isBefore(d, e) || isSameDay(d, e); // Inclusive end? Usually exclusive for "until", but for "served until" it might be inclusive.
  // Let's assume inclusive for death dates, but strict for role changes.
  // Actually, if someone dies on date X, they are gone AFTER date X? Or ON date X?
  // Let's say for a given date, we show the state at the END of that day?
  // Or simpler: strictly < end.
};

const getSeniorityDate = (person) => {
    // Ordination date is the primary key.
    // If missing, use startDate of first role.
    if (person.ordinationDate) return person.ordinationDate;
    if (person.roles && person.roles.length > 0) {
        // Find earliest role
        const earliest = [...person.roles].sort((a,b) => a.startDate.localeCompare(b.startDate))[0];
        return earliest.startDate;
    }
    return "9999-12-31";
}

export const useChurchLeadership = (currentDate) => {
  const leadershipData = useMemo(() => {
    // 1. Identify living apostles (including FP) on this date
    const living = apostlesData.filter(p => {
        const ordDate = getSeniorityDate(p);
        if (!ordDate) return false;
        // Must be ordained/called before or on current date
        if (isAfter(parseISO(ordDate), parseISO(currentDate))) return false;

        // Must be alive (or died after current date)
        if (p.deathDate && (isBefore(parseISO(p.deathDate), parseISO(currentDate)) || isSameDay(parseISO(p.deathDate), parseISO(currentDate)))) {
             // He died on this day or before.
             // If he died ON this day, should he show? Usually "History" shows state at end of day, so he is gone.
             return false;
        }
        return true;
    });

    // 2. Determine Roles
    // We need to find who is President, 1st Counselor, 2nd Counselor
    let president = null;
    let firstCounselor = null;
    let secondCounselor = null;
    let otherCounselors = [];

    // Create a map of personId -> Active Role
    const activeRoles = new Map();

    living.forEach(p => {
        // Find active role for this person on this date
        // Sort roles by startDate descending to find the most specific/recent valid one?
        // Actually, a person might have overlapping roles (e.g. Apostle AND Counselor).
        // But usually "President" or "Counselor" supersedes "Apostle" in the display.

        const validRoles = p.roles.filter(r => {
            if (!r.startDate) return false;
            // Started before or on current date
            if (isAfter(parseISO(r.startDate), parseISO(currentDate))) return false;
            // Ended after current date, or is null
            if (r.endDate && (isBefore(parseISO(r.endDate), parseISO(currentDate)) || isSameDay(parseISO(r.endDate), parseISO(currentDate)))) {
               return false;
            }
            return true;
        });

        // Hierarchy of display: President > Counselor > Apostle
        // Find best role
        let bestRole = 'Apostle'; // Default if they are in the list

        const hasPresident = validRoles.find(r => r.type === 'President');
        const has1st = validRoles.find(r => r.type === 'First Counselor');
        const has2nd = validRoles.find(r => r.type === 'Second Counselor');
        const hasCounselor = validRoles.find(r => r.type === 'Counselor');

        if (hasPresident) bestRole = 'President';
        else if (has1st) bestRole = 'First Counselor';
        else if (has2nd) bestRole = 'Second Counselor';
        else if (hasCounselor) bestRole = 'Counselor';

        activeRoles.set(p.id, bestRole);

        if (bestRole === 'President') president = p;
        else if (bestRole === 'First Counselor') firstCounselor = p;
        else if (bestRole === 'Second Counselor') secondCounselor = p;
        else if (bestRole === 'Counselor') otherCounselors.push(p);
    });

    // 3. Handle Vacancy / Interregnum
    // If President is null, the First Presidency is dissolved.
    // Everyone returns to Quorum.
    // HOWEVER, the data from Wikipedia usually has "Apostle" roles covering the whole period,
    // and "President" roles only for the tenure.
    // If there is no active "President" role found, logic naturally puts them as "Apostle" (default).
    // So `president` will be null.
    // Counselors might still have "Counselor" dates in JSON if the data isn't perfectly trimmed for the interregnum.
    // BUT historically, counselors return to their place in the 12.
    // My parser logic just captures start/end from text. Wikipedia text usually says "Counselor ... date - date".
    // If the dates are correct in JSON, they should automatically "fall off" counseling roles when the President dies.
    // Let's assume the JSON dates reflect the dissolution.

    // Sort Quorum
    // Filter out anyone who is currently President or Counselor (if FP exists)
    // If President doesn't exist, technically NO ONE is a counselor (unless it's a special case, but usually they revert).
    // If `president` is null, we should force everyone to be 'Apostle' unless they are 'Acting President of Quorum' which is fine.

    let firstPresidency = [];
    if (president) {
        firstPresidency.push({ ...president, roleDisplay: 'President' });
        if (firstCounselor) firstPresidency.push({ ...firstCounselor, roleDisplay: 'First Counselor' });
        if (secondCounselor) firstPresidency.push({ ...secondCounselor, roleDisplay: 'Second Counselor' });
        otherCounselors.forEach(c => firstPresidency.push({ ...c, roleDisplay: 'Counselor' }));
    }

    const quorum = living.filter(p => {
        if (!president) return true; // Everyone in quorum if no president
        const role = activeRoles.get(p.id);
        return role === 'Apostle';
    }).sort((a, b) => {
        // Sort by seniority (Ordination Date)
        const dateA = getSeniorityDate(a);
        const dateB = getSeniorityDate(b);
        if (dateA === dateB) {
            // Tie break by birth date
            return (a.birthDate || '').localeCompare(b.birthDate || '');
        }
        return dateA.localeCompare(dateB);
    });

    return {
        firstPresidency,
        quorum
    };
  }, [currentDate]);

  return leadershipData;
};

export const getAllEvents = () => {
    const events = new Set();
    // Add today
    events.add(new Date().toISOString().split('T')[0]);

    apostlesData.forEach(p => {
        if (p.ordinationDate) events.add(p.ordinationDate);
        if (p.deathDate) events.add(p.deathDate);
        p.roles.forEach(r => {
            if (r.startDate) events.add(r.startDate);
            if (r.endDate) events.add(r.endDate);
        });
    });

    return Array.from(events).sort();
};

export const getEventsOnDate = (dateString) => {
    const events = [];

    apostlesData.forEach(p => {
        const name = p.name.replace(/^Name: /, '');

        if (p.ordinationDate === dateString) {
            events.push(`${name} ordained as an Apostle`);
        }
        if (p.deathDate === dateString) {
            events.push(`${name} died`);
        }

        p.roles.forEach(r => {
            // Determine role name
            let roleName = r.type;
            if (r.type === 'First Counselor') roleName = 'First Counselor in the First Presidency';
            else if (r.type === 'Second Counselor') roleName = 'Second Counselor in the First Presidency';
            else if (r.type === 'President') roleName = 'President of the Church';
            else if (r.type === 'Counselor') roleName = 'Counselor in the First Presidency';

            if (r.startDate === dateString) {
                // If the role is just "Apostle" and it matches ordination, we skip to avoid dupes?
                // Actually, often ordination happens same day as setting apart, but usually Ordination is distinct.
                // However, our data parser sets startDate for 'Apostle' roles too.
                // Let's filter: if it's "Apostle" and matches ordination date, don't show twice.
                if (r.type === 'Apostle' && r.startDate === p.ordinationDate) {
                    // Already covered by ordination check
                } else {
                    events.push(`${name} called as ${roleName}`);
                }
            }

            if (r.endDate === dateString) {
                if (r.type === 'President') {
                    // Usually implies death, but sometimes released? (Rare)
                    // If deathDate matches, we can skip or show both.
                    // Let's show both for clarity unless it's redundant.
                }
                events.push(`${name} released as ${roleName}`);
            }
        });
    });

    return events;
};
