/**
 * Builds lib/address/pincode-directory.json from India Post's All India
 * Pincode Directory (data.gov.in, Government Open Data Licence – India).
 *
 *   node scripts/build-pincode-directory.mjs <newer.csv> [<older.csv> …]
 *
 * Built on 22 Oct 2026 from the 2022 release (as mirrored at
 * github.com/dropdevrahul/pincodes-india, pincode.csv) and the official
 * 2019 file (data.gov.in/sites/default/files/dataurl31052019/Pincode_30052019.csv).
 * To refresh, download the newest release from data.gov.in and pass it first.
 *
 * Pass the newest release first: a PIN found there takes its state, district
 * and areas from it, and older files only add PINs the newer one lacks. Every
 * state name must map to a GST state code, or the build stops — an unmapped
 * name would silently mark a whole state's PINs as unverified.
 *
 * Output: one line per PIN, `pin|stateCodes|district|areas`, where stateCodes
 * and areas are comma- and semicolon-separated. A single string keeps the JSON
 * small and keeps TypeScript from inferring a type for 19,000 keys.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUTPUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'address', 'pincode-directory.json');
const MAX_AREAS = 3;

/** India Post's state spellings (old and new releases) → GST state code. */
const STATE_CODES = {
  'JAMMU AND KASHMIR': '01',
  'HIMACHAL PRADESH': '02',
  PUNJAB: '03',
  CHANDIGARH: '04',
  UTTARAKHAND: '05',
  HARYANA: '06',
  DELHI: '07',
  RAJASTHAN: '08',
  'UTTAR PRADESH': '09',
  BIHAR: '10',
  SIKKIM: '11',
  'ARUNACHAL PRADESH': '12',
  NAGALAND: '13',
  MANIPUR: '14',
  MIZORAM: '15',
  TRIPURA: '16',
  MEGHALAYA: '17',
  MEGALAYA: '17',
  ASSAM: '18',
  'WEST BENGAL': '19',
  JHARKHAND: '20',
  ODISHA: '21',
  CHHATTISGARH: '22',
  CHATTISGARH: '22',
  'MADHYA PRADESH': '23',
  GUJARAT: '24',
  'THE DADRA AND NAGAR HAVELI AND DAMAN AND DIU': '26',
  'DADRA AND NAGAR HAV.': '26',
  'DAMAN AND DIU': '26',
  MAHARASHTRA: '27',
  KARNATAKA: '29',
  GOA: '30',
  LAKSHADWEEP: '31',
  KERALA: '32',
  'TAMIL NADU': '33',
  PUDUCHERRY: '34',
  PONDICHERRY: '34',
  'ANDAMAN AND NICOBAR ISLANDS': '35',
  'ANDAMAN AND NICO.IN.': '35',
  TELANGANA: '36',
  'ANDHRA PRADESH': '37',
  LADAKH: '38',
};

/** Head and sub offices name an area better than branch offices do. */
const OFFICE_RANK = { HO: 0, SO: 1, BO: 2 };

/** RFC 4180 CSV → rows of fields. Handles quoted fields with commas and doubled quotes. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some((value) => value !== '')) rows.push(row);
  return rows;
}

function titleCase(value) {
  return value.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

/** "Navrangpura S.O" → "Navrangpura"; "Ahmedabad G.P.O." → "Ahmedabad". */
function areaName(officeName) {
  return officeName
    .replace(/\s+(B\.?\s?O|S\.?\s?O|H\.?\s?O|G\.?\s?P\.?\s?O|P\.?\s?O)\.?(\s*\(.*\))?$/i, '')
    .replace(/[|;,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function readDirectory(path) {
  const [header, ...rows] = parseCsv(readFileSync(path, 'utf8').replace(/^﻿/, ''));
  // Releases differ on spacing: "Office Name" in 2019, "OfficeName" in 2022.
  const normalise = (value) => value.replace(/\s+/g, '').toLowerCase();
  const column = (name) => {
    const index = header.findIndex((value) => normalise(value) === normalise(name));
    if (index === -1) throw new Error(`${path}: no "${name}" column`);
    return index;
  };
  const col = {
    pin: column('Pincode'),
    office: column('OfficeName'),
    type: column('OfficeType'),
    delivery: column('Delivery'),
    district: column('District'),
    state: column('StateName'),
  };

  const pins = new Map();
  for (const row of rows) {
    const pin = row[col.pin]?.trim();
    if (!/^[1-9]\d{5}$/.test(pin ?? '')) continue;
    // India Post's own placeholder row (PIN 999999) is not a place.
    if (/^test office$/i.test(row[col.office].trim())) continue;
    const stateName = row[col.state].trim().toUpperCase();
    const stateCode = STATE_CODES[stateName];
    if (!stateCode) throw new Error(`${path}: unmapped state "${stateName}" (PIN ${pin})`);

    const entry = pins.get(pin) ?? { states: new Set(), districts: new Map(), offices: [] };
    entry.states.add(stateCode);
    const district = titleCase(row[col.district].trim());
    entry.districts.set(district, (entry.districts.get(district) ?? 0) + 1);
    entry.offices.push({
      name: areaName(row[col.office]),
      rank: OFFICE_RANK[row[col.type].trim().toUpperCase()] ?? 3,
      delivers: row[col.delivery].trim().toLowerCase() === 'delivery',
    });
    pins.set(pin, entry);
  }
  return pins;
}

function summarise(pin, entry) {
  const district = [...entry.districts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const areas = [];
  const offices = [...entry.offices].sort(
    (a, b) => Number(b.delivers) - Number(a.delivers) || a.rank - b.rank || a.name.localeCompare(b.name),
  );
  for (const office of offices) {
    if (office.name && !areas.includes(office.name)) areas.push(office.name);
    if (areas.length === MAX_AREAS) break;
  }
  return `${pin}|${[...entry.states].sort().join(',')}|${district}|${areas.join(';')}`;
}

const sources = process.argv.slice(2);
if (sources.length === 0) {
  console.error('Usage: node scripts/build-pincode-directory.mjs <newer.csv> [<older.csv> …]');
  process.exit(1);
}

const merged = new Map();
for (const source of sources) {
  const pins = readDirectory(source);
  let added = 0;
  for (const [pin, entry] of pins) {
    if (merged.has(pin)) continue;
    merged.set(pin, entry);
    added += 1;
  }
  console.log(`${source}: ${pins.size} PINs, ${added} new`);
}

const lines = [...merged.keys()].sort().map((pin) => summarise(pin, merged.get(pin)));
writeFileSync(
  OUTPUT,
  `${JSON.stringify({
    source: 'India Post All India Pincode Directory (data.gov.in, GODL-India)',
    builtAt: new Date().toISOString().slice(0, 10),
    pins: lines.join('\n'),
  })}\n`,
);
console.log(`Wrote ${lines.length} PINs to ${OUTPUT}`);
