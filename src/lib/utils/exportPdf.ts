import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert, Platform } from 'react-native';
import { Family, FamilyMember } from '@/types/database';
import { formatAge, formatAgeShort, formatDate } from '@/lib/utils/date';
import { getOccupationDisplay } from '@/constants/occupations';
import { getRelationshipDisplay } from '@/constants/relationships';

export type ExportDirectoryFamilyItem = Family & {
  members?: FamilyMember[];
  head_name?: string;
  area_name?: string;
};

/**
 * Helper to format education details for booklet PDF/Print
 */
function formatPdfEducation(m: FamilyMember): string {
  const isDeceased = m.is_deceased === true || (m as any).status === 'DECEASED';
  if (isDeceased) return '-';

  const edu = (m as any).educationRecord || {};
  const course = edu.course_or_standard || (edu.education_level ? `${edu.education_level}` : '') || '';
  const fallback = m.education_status && m.education_status !== 'Completed' && m.education_status !== 'Studying'
    ? m.education_status
    : '';
  const mainCourse = course || fallback || m.education_status || '-';
  const inst = edu.institution ? `<div style="color:#64748B; font-size:7.5px; line-height:1.15; margin-top:1px;">🏫 ${edu.institution}</div>` : '';
  const year = edu.passing_year ? `<div style="color:#64748B; font-size:7.5px; line-height:1.15;">📅 પાસિંગ: ${edu.passing_year}</div>` : '';
  return `<span style="font-weight:600; font-size:8.5px;">${mainCourse}</span>${inst}${year}`;
}

/**
 * Helper to format occupation details for booklet PDF/Print
 */
function formatPdfOccupation(m: FamilyMember): string {
  const isDeceased = m.is_deceased === true || (m as any).status === 'DECEASED';
  if (isDeceased) return '-';

  const occTypeRaw = m.occupation_type || (m as any).occupationRecord?.occupation_type;
  if (!occTypeRaw) return '-';

  const occDisplay = getOccupationDisplay(occTypeRaw) || occTypeRaw;
  const occRec = (m as any).occupationRecord || {};
  const details = m.occupation_details || occRec.details || {};

  const orgName =
    occRec.organization_name ||
    occRec.business_name ||
    details.company_name ||
    details.business_name ||
    details.shop_name ||
    details.practice_name ||
    details.school_or_college ||
    details.work_description ||
    details.specialization ||
    details.previous_organization ||
    '';

  const role = occRec.designation || details.designation || details.profession || details.current_year_or_std || details.business_type || details.shop_type || '';
  const loc = occRec.work_location || details.work_location || details.business_location || details.shop_location || details.village_or_taluka || '';

  const detailsList = [orgName, role, loc].filter(Boolean);
  if (detailsList.length > 0) {
    return `<div style="font-weight:600; font-size:8.5px; line-height:1.2;">${occDisplay}</div><div style="color:#475569; font-size:7.5px; line-height:1.15; margin-top:1px;">${detailsList.join(' • ')}</div>`;
  }
  return `<span style="font-weight:600; font-size:8.5px;">${occDisplay}</span>`;
}

/**
 * Helper to format contact details for booklet PDF/Print
 */
function formatPdfContact(m: FamilyMember): string {
  const isDeceased = m.is_deceased === true || (m as any).status === 'DECEASED';
  if (isDeceased) return '-';

  const contactItems: string[] = [];
  if (m.mobile) contactItems.push(`<div style="white-space:nowrap; font-weight:600; font-size:8.5px;">📱 ${m.mobile}</div>`);
  if (m.email) contactItems.push(`<div style="font-size:7.5px; color:#475569; word-break:break-all; line-height:1.15;">✉️ ${m.email}</div>`);
  if (m.residence_type === 'SEPARATE' && (m.separate_address || m.separate_city)) {
    const sep = [m.separate_address, m.separate_city, m.separate_pincode].filter(Boolean).join(', ');
    contactItems.push(`<div style="color:#D97706; font-size:7.5px; line-height:1.15; margin-top:1px;">🏠 અલગ: ${sep}</div>`);
  }
  return contactItems.length > 0 ? contactItems.join('') : '-';
}

/**
 * Generate a beautifully styled HTML template for a Single Family Booklet
 */
export function generateSingleFamilyHtml(family: Family | ExportDirectoryFamilyItem, members: FamilyMember[]): string {
  const head = members.find((m) => m.relation === 'FAMILY_HEAD') || members[0];
  const dateStr = new Date().toLocaleDateString('gu-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const memberRows = members
    .map((m, idx) => {
      const isDeceased = m.is_deceased === true || (m as any).status === 'DECEASED';
      const nameDisplay = isDeceased ? `🕊️ સ્વ. ${m.name}` : m.name;
      const ageDisplay = isDeceased
        ? (m.deceased_date && formatAge(m.dob, undefined, m.deceased_date) !== 'N/A'
            ? `સ્વર્ગસ્થ (ઉંમર: ${formatAge(m.dob, undefined, m.deceased_date)})`
            : (m.deceased_date ? `સ્વર્ગસ્થ (${formatDate(m.deceased_date) || m.deceased_date})` : 'સ્વર્ગસ્થ'))
        : (formatAge(m.dob) || '-');

      const relDisplay = m.display_relation || getRelationshipDisplay(m.relation) || m.relation;
      const eduStr = formatPdfEducation(m);
      const occStr = formatPdfOccupation(m);
      const contactStr = formatPdfContact(m);

      return `
        <tr style="background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'}; ${isDeceased ? 'color: #64748B;' : ''}">
          <td style="padding: 3px 4px; border: 1px solid #CBD5E1; text-align: center; font-size: 8.5px; font-weight: bold;">${idx + 1}</td>
          <td style="padding: 3px 4px; border: 1px solid #CBD5E1; font-size: 8.5px;">
            <strong style="color: ${isDeceased ? '#475569' : '#0F172A'}; font-size: 9.5px;">${nameDisplay}</strong>
            ${isDeceased ? `<br/><span style="display:inline-block; background:#E2E8F0; color:#475569; padding:1px 4px; border-radius:3px; font-size:7.5px; margin-top:1px;">🕊️ સ્વર્ગસ્થ ${m.deceased_date ? `• અવસાન: ${formatDate(m.deceased_date) || m.deceased_date}` : ''}</span>` : ''}
            ${m.blood_group ? `<br/><span style="display:inline-block; color:#DC2626; font-size:8px; font-weight:bold;">🩸 ${m.blood_group}</span>` : ''}
            ${m.birth_place ? `<br/><span style="display:inline-block; color:#64748B; font-size:8px;">📍 ${m.birth_place}</span>` : ''}
          </td>
          <td style="padding: 3px 4px; border: 1px solid #CBD5E1; text-align: center; white-space: nowrap; font-size: 8.5px;">${relDisplay}</td>
          <td style="padding: 3px 4px; border: 1px solid #CBD5E1; text-align: center; white-space: nowrap; font-size: 8.5px;">${m.gender || '-'}</td>
          <td style="padding: 3px 4px; border: 1px solid #CBD5E1; text-align: center; white-space: nowrap; font-size: 8.5px;">${formatDate(m.dob) || '-'}</td>
          <td style="padding: 3px 4px; border: 1px solid #CBD5E1; text-align: center; white-space: nowrap; font-size: 8.5px;">${ageDisplay}</td>
          <td style="padding: 3px 4px; border: 1px solid #CBD5E1; font-size: 8.5px;">${eduStr}</td>
          <td style="padding: 3px 4px; border: 1px solid #CBD5E1; font-size: 8.5px;">${occStr}</td>
          <td style="padding: 3px 4px; border: 1px solid #CBD5E1; text-align: center; font-size: 8.5px;">${contactStr}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${family.family_code} - અમદાવાદ ડબગર સમાજ પરિચય પુસ્તિકા</title>
        <style>
          @page { size: A4 portrait; margin: 8mm; }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #1E293B;
            margin: 0;
            padding: 0;
            background: #FFFFFF;
          }
          .header-box {
            border: 1.5px solid #0284C7;
            border-radius: 6px;
            padding: 8px 12px;
            text-align: center;
            background: linear-gradient(180deg, #F0F9FF 0%, #E0F2FE 100%);
            margin-bottom: 8px;
          }
          .title {
            font-size: 18px;
            font-weight: 800;
            color: #0369A1;
            margin: 0 0 2px 0;
          }
          .subtitle {
            font-size: 11px;
            color: #0284C7;
            font-weight: 600;
            margin: 0;
          }
          .family-summary {
            display: flex;
            justify-content: space-between;
            background: #F8FAFC;
            border: 1.5px solid #CBD5E1;
            border-radius: 5px;
            padding: 6px 10px;
            margin-bottom: 8px;
            font-size: 10px;
          }
          .info-col {
            flex: 1;
            line-height: 1.4;
          }
          .info-col strong {
            color: #0F172A;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8.5px;
            margin-top: 6px;
          }
          th {
            background-color: #0284C7;
            color: #FFFFFF;
            padding: 4px;
            border: 1px solid #0284C7;
            font-weight: bold;
            font-size: 8.5px;
            text-align: center;
          }
          .footer {
            margin-top: 10px;
            padding-top: 6px;
            border-top: 1px solid #E2E8F0;
            display: flex;
            justify-content: space-between;
            font-size: 8.5px;
            color: #64748B;
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <h1 class="title">અમદાવાદ ડબગર સમાજ પરિચય પુસ્તિકા</h1>
          <p class="subtitle">Ahmedabad Dabgar Samaj Directory & Family Booklet</p>
        </div>

        <div class="family-summary">
          <div class="info-col">
            <div><strong>પરિવાર કોડ / Code:</strong> <span style="color:#0F172A; font-weight:800; font-size:11px; background:#FFFFFF; border:1px solid #64748B; padding:1px 5px; border-radius:3px; margin-left:4px;">${family.family_code}</span></div>
            <div style="margin-top:3px;"><strong>પરિવાર વડા / Head:</strong> <strong style="color:#0F172A; font-size:12px; font-weight:800;">${head?.name || '-'}</strong></div>
            <div style="margin-top:2px;"><strong>શહેર / વતન:</strong> <span style="color:#0F172A; font-weight:600;">${(family as any).native_place || family.city || 'Ahmedabad'}</span></div>
          </div>
          <div class="info-col" style="text-align: right;">
            <div><strong>વિસ્તાર / Area:</strong> <span style="color:#0F172A; font-weight:600;">${(family as any).area_name || family.city || 'Ahmedabad'}</span></div>
            <div style="margin-top:2px;"><strong>સરનામું / Address:</strong> <span style="color:#0F172A; font-weight:600;">${family.address || '-'}</span></div>
            <div style="margin-top:2px;"><strong>કુલ સભ્યો / Members:</strong> <span style="color:#0369A1; font-weight:800;">${members.length}</span></div>
          </div>
        </div>

        <div style="color: #0F172A; font-size: 11px; font-weight: bold; margin: 8px 0 4px 0; border-bottom: 1.5px solid #0284C7; padding-bottom: 2px;">
          👨‍👩‍👧‍👦 પરિવારના સભ્યોની સંપૂર્ણ વિગત (Family Members List)
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 20px;">#</th>
              <th style="text-align: left;">સભ્યનું નામ / Name</th>
              <th style="white-space: nowrap;">સંબંધ</th>
              <th style="white-space: nowrap;">જાતિ</th>
              <th style="white-space: nowrap;">જન્મ તારીખ</th>
              <th style="white-space: nowrap;">ઉંમર</th>
              <th style="text-align: left;">શિક્ષણ</th>
              <th style="text-align: left;">વ્યવસાય / વિગત</th>
              <th style="white-space: nowrap;">મોબાઈલ</th>
            </tr>
          </thead>
          <tbody>
            ${memberRows}
          </tbody>
        </table>

        <div class="footer">
          <div>અમદાવાદ ડબગર સમાજ પરિચય પુસ્તિકા • Official Community Record</div>
          <div>તારીખ: ${dateStr}</div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generate a beautifully styled HTML template for the Full Community Directory
 */
export function generateCommunityBookletHtml(families: ExportDirectoryFamilyItem[]): string {
  const dateStr = new Date().toLocaleDateString('gu-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const totalMembers = families.reduce((acc, f) => acc + (f.members?.length || 0), 0);

  const familySections = families
    .map((fam, fIdx) => {
      const head = fam.members?.find((m: FamilyMember) => m.relation === 'FAMILY_HEAD') || fam.members?.[0];
      const memberRows = (fam.members || [])
        .map((m: FamilyMember, mIdx: number) => {
          const isDeceased = m.is_deceased === true || (m as any).status === 'DECEASED';
          const nameDisplay = isDeceased ? `🕊️ સ્વ. ${m.name}` : m.name;
          const ageDisplay = isDeceased
            ? (m.deceased_date && formatAge(m.dob, undefined, m.deceased_date) !== 'N/A'
                ? `સ્વર્ગસ્થ (${formatAge(m.dob, undefined, m.deceased_date)})`
                : (m.deceased_date ? `સ્વર્ગસ્થ (${formatDate(m.deceased_date) || m.deceased_date})` : 'સ્વર્ગસ્થ'))
            : (formatAge(m.dob) || '-');

          const relDisplay = m.display_relation || getRelationshipDisplay(m.relation) || m.relation;
          const eduStr = formatPdfEducation(m);
          const occStr = formatPdfOccupation(m);
          const contactStr = formatPdfContact(m);

          return `
            <tr style="background-color: ${mIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'}; ${isDeceased ? 'color: #64748B;' : ''}">
              <td style="padding: 3px 4px; border: 1px solid #CBD5E1; text-align: center; font-size: 8.5px;">${mIdx + 1}</td>
              <td style="padding: 3px 4px; border: 1px solid #CBD5E1; font-size: 8.5px;">
                <strong style="color: ${isDeceased ? '#475569' : '#0F172A'}; font-size: 9px;">${nameDisplay}</strong>
                ${isDeceased ? `<br/><span style="display:inline-block; background:#E2E8F0; color:#475569; padding:1px 4px; border-radius:3px; font-size:7.5px; margin-top:1px;">🕊️ સ્વર્ગસ્થ ${m.deceased_date ? `• ${formatDate(m.deceased_date) || m.deceased_date}` : ''}</span>` : ''}
                ${m.blood_group ? `<br/><span style="color:#DC2626; font-size:8px; font-weight:bold;">🩸 ${m.blood_group}</span>` : ''}
                ${m.birth_place ? `<br/><span style="color:#64748B; font-size:8px;">📍 ${m.birth_place}</span>` : ''}
              </td>
              <td style="padding: 3px 4px; border: 1px solid #CBD5E1; text-align: center; white-space: nowrap; font-size: 8.5px;">${relDisplay}</td>
              <td style="padding: 3px 4px; border: 1px solid #CBD5E1; text-align: center; white-space: nowrap; font-size: 8.5px;">${m.gender || '-'}</td>
              <td style="padding: 3px 4px; border: 1px solid #CBD5E1; text-align: center; white-space: nowrap; font-size: 8.5px;">${formatDate(m.dob) || '-'}</td>
              <td style="padding: 3px 4px; border: 1px solid #CBD5E1; text-align: center; white-space: nowrap; font-size: 8.5px;">${ageDisplay}</td>
              <td style="padding: 3px 4px; border: 1px solid #CBD5E1; font-size: 8.5px;">${eduStr}</td>
              <td style="padding: 3px 4px; border: 1px solid #CBD5E1; font-size: 8.5px;">${occStr}</td>
              <td style="padding: 3px 4px; border: 1px solid #CBD5E1; text-align: center; font-size: 8.5px;">${contactStr}</td>
            </tr>
          `;
        })
        .join('');

      return `
        <div style="page-break-inside: avoid; margin-bottom: 10px; border: 1.5px solid #0284C7; border-radius: 5px; overflow: hidden;">
          <div style="background: #F1F5F9; border-bottom: 1.5px solid #0284C7; padding: 5px 8px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span style="color: #0F172A; font-size: 13px; font-weight: 800;">${fIdx + 1}. ${head?.name || fam.head_name || 'પરિવાર'}</span>
              <span style="color: #0F172A; font-size: 10.5px; font-weight: 800; margin-left: 8px; background: #FFFFFF; border: 1px solid #64748B; padding: 1px 6px; border-radius: 4px; display: inline-block;">કોડ: ${fam.family_code}</span>
            </div>
            <div style="font-size: 10px; color: #1E293B; font-weight: 700;">
              📍 ${fam.area_name || fam.city || 'Ahmedabad'} • 🏠 ${(fam as any).native_place || fam.city || 'Ahmedabad'}
            </div>
          </div>
          <div style="padding: 3px 8px; background: #FFFFFF; font-size: 9.5px; border-bottom: 1px solid #CBD5E1; color: #0F172A;">
            <strong>સરનામું:</strong> <span style="font-weight: 600; color: #0F172A;">${fam.address || '-'}</span> | <strong>સભ્યો:</strong> <span style="font-weight: 800; color: #0369A1;">${fam.members?.length || 0}</span>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 8.5px;">
            <thead>
              <tr style="background: #F1F5F9; color: #334155;">
                <th style="padding: 3px 4px; border: 1px solid #CBD5E1; width: 20px; font-size: 8.5px;">#</th>
                <th style="padding: 3px 4px; border: 1px solid #CBD5E1; font-size: 8.5px; text-align: left;">નામ</th>
                <th style="padding: 3px 4px; border: 1px solid #CBD5E1; font-size: 8.5px; white-space: nowrap;">સંબંધ</th>
                <th style="padding: 3px 4px; border: 1px solid #CBD5E1; font-size: 8.5px; white-space: nowrap;">જાતિ</th>
                <th style="padding: 3px 4px; border: 1px solid #CBD5E1; font-size: 8.5px; white-space: nowrap;">જન્મ તારીખ</th>
                <th style="padding: 3px 4px; border: 1px solid #CBD5E1; font-size: 8.5px; white-space: nowrap;">ઉંમર</th>
                <th style="padding: 3px 4px; border: 1px solid #CBD5E1; font-size: 8.5px; text-align: left;">શિક્ષણ</th>
                <th style="padding: 3px 4px; border: 1px solid #CBD5E1; font-size: 8.5px; text-align: left;">વ્યવસાય</th>
                <th style="padding: 3px 4px; border: 1px solid #CBD5E1; font-size: 8.5px; white-space: nowrap;">મોબાઈલ</th>
              </tr>
            </thead>
            <tbody>
              ${memberRows}
            </tbody>
          </table>
        </div>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>અમદાવાદ ડબગર સમાજ પરિચય પુસ્તિકા</title>
        <style>
          @page { size: A4 portrait; margin: 8mm; }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #1E293B;
            margin: 0;
            padding: 0;
            background: #FFFFFF;
          }
          .cover-header {
            text-align: center;
            border: 1.5px solid #0284C7;
            padding: 8px 12px;
            background: #F0F9FF;
            border-radius: 6px;
            margin-bottom: 10px;
          }
        </style>
      </head>
      <body>
        <div class="cover-header">
          <h1 style="color: #0369A1; font-size: 18px; margin: 0 0 3px 0; font-weight: 700;">અમદાવાદ ડબગર સમાજ પરિચય પુસ્તિકા</h1>
          <p style="color: #0284C7; font-size: 11px; margin: 0 0 6px 0; font-weight: 600;">Ahmedabad Dabgar Samaj Directory & Booklet</p>
          <div style="font-size: 10px; color: #475569;">
            કુલ પરિવારો: <strong>${families.length}</strong> | કુલ સભ્યો: <strong>${totalMembers}</strong> | પ્રકાશન તારીખ: <strong>${dateStr}</strong>
          </div>
        </div>

        ${familySections}

        <div style="text-align: center; margin-top: 12px; font-size: 9px; color: #64748B; border-top: 1px solid #E2E8F0; padding-top: 6px;">
          શ્રી અમદાવાદ ડબગર સમાજ પરિચય પુસ્તિકા • સર્વ અધિકાર સુરક્ષિત
        </div>
      </body>
    </html>
  `;
}

/**
 * On Web, expo-print's printAsync ignores the HTML and prints the app's current DOM.
 * This helper renders the actual generated booklet HTML into an isolated iframe
 * so the browser's print dialog prints/saves the actual booklet as PDF.
 */
function printHtmlOnWeb(html: string): void {
  if (typeof document === 'undefined') return;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch {}
      }, 1500);
    }, 400);
  }
}

/**
 * Export and Share single family booklet as PDF
 */
export async function exportFamilyAsPdf(family: Family | ExportDirectoryFamilyItem, members: FamilyMember[]): Promise<void> {
  try {
    const html = generateSingleFamilyHtml(family, members);
    if (Platform.OS === 'web') {
      printHtmlOnWeb(html);
      return;
    }

    const { uri, base64 } = await Print.printToFileAsync({ html, base64: true });
    let shareUri = uri;

    const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
    if (baseDir) {
      const cleanCode = (family.family_code || 'family').replace(/[^a-zA-Z0-9_-]/g, '_');
      const targetUri = `${baseDir}family_${cleanCode}_${Date.now()}.pdf`;
      try {
        if (base64) {
          await FileSystem.writeAsStringAsync(targetUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          shareUri = targetUri;
        } else {
          await FileSystem.copyAsync({ from: uri, to: targetUri });
          shareUri = targetUri;
        }
      } catch (fsErr) {
        console.warn('FileSystem prepare PDF error:', fsErr);
      }
    }

    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (isSharingAvailable) {
      await Sharing.shareAsync(shareUri, {
        mimeType: 'application/pdf',
        dialogTitle: `${family.family_code || 'Family'} - Family Booklet PDF`,
        UTI: '.pdf',
      });
    } else {
      Alert.alert('PDF Exported', `PDF file generated successfully at:\n${shareUri}`);
    }
  } catch (err: any) {
    console.error('Export family PDF error:', err);
    Alert.alert('Export Error', err?.message || 'Failed to generate PDF.');
  }
}

/**
 * Export and Share full community directory as PDF
 */
export async function exportCommunityDirectoryAsPdf(families: ExportDirectoryFamilyItem[]): Promise<void> {
  try {
    const html = generateCommunityBookletHtml(families);
    if (Platform.OS === 'web') {
      printHtmlOnWeb(html);
      return;
    }

    const { uri, base64 } = await Print.printToFileAsync({ html, base64: true });
    let shareUri = uri;

    const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
    if (baseDir) {
      const targetUri = `${baseDir}dabgar_samaj_parichay_pustika_${Date.now()}.pdf`;
      try {
        if (base64) {
          await FileSystem.writeAsStringAsync(targetUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          shareUri = targetUri;
        } else {
          await FileSystem.copyAsync({ from: uri, to: targetUri });
          shareUri = targetUri;
        }
      } catch (fsErr) {
        console.warn('FileSystem prepare Directory PDF error:', fsErr);
      }
    }

    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (isSharingAvailable) {
      await Sharing.shareAsync(shareUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'અમદાવાદ ડબગર સમાજ પરિચય પુસ્તિકા PDF',
        UTI: '.pdf',
      });
    } else {
      Alert.alert('Directory PDF Exported', `PDF file generated successfully at:\n${shareUri}`);
    }
  } catch (err: any) {
    console.error('Export directory PDF error:', err);
    Alert.alert('Export Error', err?.message || 'Failed to generate Directory PDF.');
  }
}

/**
 * Print single family directly via System Printer
 */
export async function printFamilyDirectly(family: Family | ExportDirectoryFamilyItem, members: FamilyMember[]): Promise<void> {
  try {
    const html = generateSingleFamilyHtml(family, members);
    if (Platform.OS === 'web') {
      printHtmlOnWeb(html);
      return;
    }
    await Print.printAsync({ html });
  } catch (err: any) {
    console.error('Print family error:', err);
    Alert.alert('Print Error', err?.message || 'Failed to print.');
  }
}

/**
 * Print entire community directory directly via System Printer
 */
export async function printCommunityDirectoryDirectly(families: ExportDirectoryFamilyItem[]): Promise<void> {
  try {
    const html = generateCommunityBookletHtml(families);
    if (Platform.OS === 'web') {
      printHtmlOnWeb(html);
      return;
    }
    await Print.printAsync({ html });
  } catch (err: any) {
    console.error('Print directory error:', err);
    Alert.alert('Print Error', err?.message || 'Failed to print Directory.');
  }
}

/**
 * Generate a high-resolution, printable Digital Family Smart ID Card (Front & Back)
 */
export function generateDigitalFamilyIdCardHtml(family: Family, members: FamilyMember[]): string {
  const isDeceasedMember = (m: FamilyMember) =>
    m.is_deceased === true || (m as any).status === 'DECEASED' || (m.occupation_details as any)?.is_deceased === true;

  const livingMembers = members.filter((m) => !isDeceasedMember(m));
  const head =
    livingMembers.find((m) => m.relation === 'FAMILY_HEAD') ||
    members.find((m) => m.relation === 'FAMILY_HEAD') ||
    members[0];
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    `https://ahmedabaddabgarsamaj.vercel.app/family-card?code=${family.family_code}`
  )}`;

  const memberRowsHtml = livingMembers
    .slice(0, 8)
    .map(
      (m, idx) => `
      <tr>
        <td style="padding: 4px 6px; border-bottom: 1px solid #E2E8F0; font-size: 11px; font-weight: bold; text-align: center;">${idx + 1}</td>
        <td style="padding: 4px 6px; border-bottom: 1px solid #E2E8F0; font-size: 11px; font-weight: 600;">${m.name}</td>
        <td style="padding: 4px 6px; border-bottom: 1px solid #E2E8F0; font-size: 11px; text-align: center; color: #1E3A8A;">${m.display_relation || m.relation}</td>
        <td style="padding: 4px 6px; border-bottom: 1px solid #E2E8F0; font-size: 11px; text-align: center;">${formatAgeShort(m.dob, m.age) || '-'}</td>
        <td style="padding: 4px 6px; border-bottom: 1px solid #E2E8F0; font-size: 11px; text-align: center; color: #DC2626; font-weight: bold;">${m.blood_group || '-'}</td>
      </tr>
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="gu">
    <head>
      <meta charset="UTF-8">
      <title>${family.family_code} - Digital Family ID Card</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 15mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Gujarati", sans-serif;
        }
        body {
          background-color: #F8FAFC;
          color: #0F172A;
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .page-header {
          text-align: center;
          margin-bottom: 24px;
        }
        .page-header h1 {
          font-size: 22px;
          color: #1E3A8A;
          font-weight: 800;
        }
        .page-header p {
          font-size: 13px;
          color: #64748B;
          margin-top: 4px;
        }
        .cards-wrapper {
          display: flex;
          flex-direction: column;
          gap: 24px;
          align-items: center;
          max-width: 520px;
          width: 100%;
        }
        .id-card {
          width: 500px;
          height: 310px;
          border-radius: 16px;
          background: #FFFFFF;
          border: 2px solid #0284C7;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          overflow: hidden;
          position: relative;
          display: flex;
          flex-direction: column;
          page-break-inside: avoid;
        }
        .card-top-bar {
          background: linear-gradient(135deg, #0F172A 0%, #1E3A8A 50%, #0369A1 100%);
          color: #FFFFFF;
          padding: 10px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 3px solid #F59E0B;
        }
        .card-top-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .card-top-titles h2 {
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.5px;
        }
        .card-top-titles span {
          font-size: 10px;
          color: #BAE6FD;
          font-weight: 600;
          display: block;
        }
        .code-badge {
          background: #F59E0B;
          color: #0F172A;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 1px;
        }
        .card-front-body {
          flex: 1;
          display: flex;
          padding: 14px 16px;
          gap: 16px;
          background: radial-gradient(circle at 90% 10%, rgba(2,132,199,0.05) 0%, transparent 60%);
        }
        .photo-column {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 105px;
        }
        .head-avatar-frame {
          width: 88px;
          height: 88px;
          border-radius: 44px;
          border: 3px solid #0284C7;
          overflow: hidden;
          background: #E2E8F0;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .head-avatar-frame img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .head-avatar-frame .fallback-letter {
          font-size: 32px;
          font-weight: 800;
          color: #0284C7;
        }
        .head-tag {
          margin-top: 6px;
          font-size: 10px;
          font-weight: 700;
          color: #0369A1;
          background: #E0F2FE;
          padding: 2px 8px;
          border-radius: 10px;
          text-align: center;
        }
        .info-column {
          flex: 1;
          display: flex;
          flex-direction: column;
          justifyContent: space-between;
        }
        .head-name {
          font-size: 16px;
          font-weight: 800;
          color: #0F172A;
          line-height: 1.2;
        }
        .info-grid {
          margin-top: 6px;
          font-size: 11px;
          line-height: 1.5;
          color: #334155;
        }
        .info-grid strong {
          color: #0F172A;
        }
        .qr-column {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 85px;
        }
        .qr-column img {
          width: 75px;
          height: 75px;
          border: 1px solid #CBD5E1;
          border-radius: 6px;
          padding: 2px;
          background: #FFF;
        }
        .qr-caption {
          font-size: 8px;
          font-weight: 700;
          color: #64748B;
          margin-top: 4px;
          text-align: center;
        }
        .card-footer {
          background: #F1F5F9;
          border-top: 1px solid #E2E8F0;
          padding: 6px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10px;
          font-weight: 600;
          color: #475569;
        }
        .footer-verified {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #16A34A;
          font-weight: 700;
        }
        /* BACK CARD STYLES */
        .card-back-header {
          background: linear-gradient(135deg, #1E293B 0%, #334155 100%);
          color: #FFFFFF;
          padding: 8px 16px;
          font-size: 12px;
          font-weight: 700;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .roster-table {
          width: 100%;
          border-collapse: collapse;
        }
        .roster-table th {
          background: #F8FAFC;
          font-size: 10px;
          padding: 4px 6px;
          color: #64748B;
          border-bottom: 1px solid #CBD5E1;
          text-align: left;
        }
        .back-office-note {
          background: #EFF6FF;
          padding: 6px 12px;
          border-top: 1px dashed #93C5FD;
          font-size: 9.5px;
          color: #1E40AF;
          line-height: 1.4;
          text-align: center;
          margin-top: auto;
        }
        .cut-notice {
          font-size: 11px;
          color: #94A3B8;
          text-align: center;
          border-top: 1px dashed #CBD5E1;
          padding-top: 12px;
          width: 100%;
          margin-top: 10px;
        }
        @media print {
          body {
            background: #FFFFFF;
            padding: 0;
          }
          .id-card {
            box-shadow: none;
            border: 1.5px solid #000;
          }
        }
      </style>
    </head>
    <body>
      <div class="page-header">
        <h1>અમદાવાદ ડબગર સમાજ - ડિજિટલ સ્માર્ટ ઓળખ પત્ર</h1>
        <p>OFFICIAL DIGITAL FAMILY SMART IDENTITY CARD • CENSUS REGISTER</p>
      </div>

      <div class="cards-wrapper">
        <!-- FRONT SIDE -->
        <div class="id-card">
          <div class="card-top-bar">
            <div class="card-top-left">
              <div class="card-top-titles">
                <h2>અમદાવાદ ડબગર સમાજ</h2>
                <span>OFFICIAL DIGITAL FAMILY IDENTITY CARD</span>
              </div>
            </div>
            <div class="code-badge">${family.family_code}</div>
          </div>

          <div class="card-front-body">
            <div class="photo-column">
              <div class="head-avatar-frame">
                ${
                  head?.photo_url
                    ? `<img src="${head.photo_url}" alt="${head.name}" />`
                    : `<span class="fallback-letter">${(head?.name || 'H').charAt(0)}</span>`
                }
              </div>
              <div class="head-tag">પરિવાર વડા</div>
            </div>

            <div class="info-column">
              <div>
                <div class="head-name">${head?.name || 'Head Member'}</div>
                <div class="info-grid">
                  <div><strong>મોબાઈલ:</strong> ${head?.mobile || 'N/A'}</div>
                  <div><strong>વતન:</strong> ${(family as any).native_place || family.city || 'Ahmedabad'}</div>
                  <div><strong>સરનામું:</strong> ${family.address}</div>
                  <div><strong>શહેર/પિન:</strong> ${family.city}, ${family.state} - ${family.pincode}</div>
                </div>
              </div>
              <div style="font-size: 10px; color: #0284C7; font-weight: 700;">
                કુલ સભ્યો: ${livingMembers.length} • પુરુષ: ${livingMembers.filter((m) => m.gender === 'Male').length} • સ્ત્રી: ${livingMembers.filter((m) => m.gender === 'Female').length}
              </div>
            </div>

            <div class="qr-column">
              <img src="${qrUrl}" alt="QR Verification" />
              <span class="qr-caption">Scan to Verify સત્તાવાર ચકાસણી</span>
            </div>
          </div>

          <div class="card-footer">
            <div class="footer-verified">
              <span>🛡️ OFFICIAL CENSUS ID • સત્તાવાર પ્રમાણિત</span>
            </div>
            <div>Active / સક્રિય પરિચય પુસ્તિકા</div>
          </div>
        </div>

        <!-- BACK SIDE -->
        <div class="id-card">
          <div class="card-back-header">
            <span>FAMILY MEMBERS ROSTER / પરિવારના સર્વ સભ્યો</span>
            <span>CODE: ${family.family_code}</span>
          </div>

          <div style="padding: 6px 12px; flex: 1; overflow: hidden;">
            <table class="roster-table">
              <thead>
                <tr>
                  <th style="text-align: center; width: 28px;">#</th>
                  <th>સભ્યનું નામ</th>
                  <th style="text-align: center;">સંબંધ</th>
                  <th style="text-align: center;">ઉંમર</th>
                  <th style="text-align: center;">બ્લડ</th>
                </tr>
              </thead>
              <tbody>
                ${memberRowsHtml}
              </tbody>
            </table>
          </div>

          <div class="back-office-note">
            <strong>અમદાવાદ ડબગર સમાજ કાર્યાલય</strong><br/>
            આ ઓળખપત્ર અમદાવાદ ડબગર સમાજ વસ્તી ગણતરી અને ડિજિટલ પરિચય પુસ્તિકા અંતર્ગત માન્ય છે.<br/>
            ઈમેલ: ahmedabaddabgarsamaj@gmail.com
          </div>

          <div class="card-footer" style="background: #0F172A; color: #94A3B8;">
            <span>Digital ID Card System</span>
            <span>Issued: ${new Date().toLocaleDateString('en-GB')}</span>
          </div>
        </div>

        <div class="cut-notice">
          ✂️ પ્રિન્ટ કર્યા બાદ કાર્ડની બોર્ડર પરથી કાપીને લેમિનેટ કરી પર્સ / પોકેટમાં રાખી શકાય છે.
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Export and Print Digital Family ID Card as PDF
 */
export async function exportFamilyIdCardAsPdf(family: Family, members: FamilyMember[]): Promise<void> {
  try {
    const html = generateDigitalFamilyIdCardHtml(family, members);
    if (Platform.OS === 'web') {
      printHtmlOnWeb(html);
      return;
    }

    const { uri, base64 } = await Print.printToFileAsync({ html, base64: true });
    let shareUri = uri;

    const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
    if (baseDir) {
      const cleanCode = (family.family_code || 'id_card').replace(/[^a-zA-Z0-9_-]/g, '_');
      const targetUri = `${baseDir}ID_Card_${cleanCode}_${Date.now()}.pdf`;
      try {
        if (base64) {
          await FileSystem.writeAsStringAsync(targetUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          shareUri = targetUri;
        } else {
          await FileSystem.copyAsync({ from: uri, to: targetUri });
          shareUri = targetUri;
        }
      } catch (fsErr) {
        console.warn('FileSystem prepare ID card error:', fsErr);
      }
    }

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(shareUri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `${family.family_code} Digital ID Card`,
      });
    } else {
      Alert.alert('ID Card Exported', `PDF file generated successfully at:\n${shareUri}`);
    }
  } catch (err: any) {
    console.error('Export ID card error:', err);
    Alert.alert('Export Error', err?.message || 'Failed to generate ID card PDF.');
  }
}

