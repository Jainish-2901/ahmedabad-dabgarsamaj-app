import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Alert, Platform } from 'react-native';
import { Family, FamilyMember } from '@/types/database';
import { formatAge, formatAgeShort, formatDate } from '@/lib/utils/date';

export type ExportDirectoryFamilyItem = Family & {
  members?: FamilyMember[];
  head_name?: string;
  area_name?: string;
};

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
        ? (m.deceased_date ? `સ્વર્ગસ્થ (${formatDate(m.deceased_date) || m.deceased_date})` : 'સ્વર્ગસ્થ')
        : formatAge(m.dob);

      const eduStr = m.education_status || (m as any).educationRecord?.course_or_standard || '-';
      const occType = m.occupation_type || (m as any).occupationRecord?.occupation_type || '-';
      const occDetails = m.occupation_details || (m as any).occupationRecord?.details || {};
      const occStr = occDetails.company_or_business_name
        ? `${occType} (${occDetails.company_or_business_name})`
        : occType;

      return `
        <tr style="background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'}; ${isDeceased ? 'color: #64748B;' : ''}">
          <td style="padding: 10px; border: 1px solid #E2E8F0; text-align: center; font-weight: bold;">${idx + 1}</td>
          <td style="padding: 10px; border: 1px solid #E2E8F0;">
            <strong style="color: ${isDeceased ? '#475569' : '#0F172A'}; font-size: 14px;">${nameDisplay}</strong>
            ${isDeceased ? '<br/><span style="display:inline-block; background:#E2E8F0; color:#475569; padding:2px 6px; border-radius:4px; font-size:11px; margin-top:2px;">🕊️ સ્વર્ગસ્થ</span>' : ''}
          </td>
          <td style="padding: 10px; border: 1px solid #E2E8F0; text-align: center;">${m.display_relation || m.relation}</td>
          <td style="padding: 10px; border: 1px solid #E2E8F0; text-align: center;">${m.gender || '-'}</td>
          <td style="padding: 10px; border: 1px solid #E2E8F0; text-align: center;">${formatDate(m.dob) || '-'}</td>
          <td style="padding: 10px; border: 1px solid #E2E8F0; text-align: center;">${ageDisplay}</td>
          <td style="padding: 10px; border: 1px solid #E2E8F0;">${eduStr}</td>
          <td style="padding: 10px; border: 1px solid #E2E8F0;">${occStr}</td>
          <td style="padding: 10px; border: 1px solid #E2E8F0; text-align: center;">${!isDeceased && m.mobile ? m.mobile : '-'}</td>
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
          @page { size: A4 portrait; margin: 15mm; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #1E293B;
            margin: 0;
            padding: 0;
            background: #FFFFFF;
          }
          .header-box {
            border: 2px solid #0284C7;
            border-radius: 8px;
            padding: 16px;
            text-align: center;
            background: linear-gradient(180deg, #F0F9FF 0%, #E0F2FE 100%);
            margin-bottom: 20px;
          }
          .title {
            font-size: 22px;
            font-weight: 800;
            color: #0369A1;
            margin: 0 0 4px 0;
          }
          .subtitle {
            font-size: 13px;
            color: #0284C7;
            font-weight: 600;
            margin: 0;
          }
          .family-summary {
            display: flex;
            justify-content: space-between;
            background: #F8FAFC;
            border: 1px solid #CBD5E1;
            border-radius: 6px;
            padding: 12px 16px;
            margin-bottom: 20px;
            font-size: 13px;
          }
          .info-col {
            flex: 1;
            line-height: 1.6;
          }
          .info-col strong {
            color: #0F172A;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-top: 10px;
          }
          th {
            background-color: #0284C7;
            color: #FFFFFF;
            padding: 10px;
            border: 1px solid #0284C7;
            font-weight: bold;
            text-align: center;
          }
          .footer {
            margin-top: 24px;
            padding-top: 12px;
            border-top: 1px solid #E2E8F0;
            display: flex;
            justify-content: space-between;
            font-size: 11px;
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
            <div><strong>પરિવાર કોડ / Family Code:</strong> <span style="color:#0284C7; font-weight:bold;">${family.family_code}</span></div>
            <div><strong>પરિવાર વડા / Head:</strong> ${head?.name || '-'}</div>
            <div><strong>શહેર / વતન:</strong> ${(family as any).native_place || family.city || 'Ahmedabad'}</div>
          </div>
          <div class="info-col" style="text-align: right;">
            <div><strong>વિસ્તાર / Area:</strong> ${(family as any).area_name || family.city || 'Ahmedabad'}</div>
            <div><strong>સરનામું / Address:</strong> ${family.address || '-'}</div>
            <div><strong>કુલ સભ્યો / Total Members:</strong> ${members.length}</div>
          </div>
        </div>

        <h3 style="color: #0F172A; font-size: 15px; margin: 16px 0 8px 0; border-bottom: 2px solid #0284C7; padding-bottom: 4px;">
          👨‍👩‍👧‍👦 પરિવારના સભ્યોની સંપૂર્ણ વિગત (Family Members List)
        </h3>

        <table>
          <thead>
            <tr>
              <th style="width: 30px;">#</th>
              <th>સભ્યનું નામ / Name</th>
              <th>સંબંધ</th>
              <th>જાતિ</th>
              <th>જન્મ તારીખ</th>
              <th>ઉંમર</th>
              <th>શિક્ષણ</th>
              <th>વ્યવસાય / વિગત</th>
              <th>મોબાઈલ</th>
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
            ? (m.deceased_date ? `સ્વર્ગસ્થ (${formatDate(m.deceased_date) || m.deceased_date})` : 'સ્વર્ગસ્થ')
            : formatAge(m.dob);

          const eduStr = m.education_status || (m as any).educationRecord?.course_or_standard || '-';
          const occType = m.occupation_type || (m as any).occupationRecord?.occupation_type || '-';

          return `
            <tr style="background-color: ${mIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'}; ${isDeceased ? 'color: #64748B;' : ''}">
              <td style="padding: 6px 8px; border: 1px solid #CBD5E1; text-align: center;">${mIdx + 1}</td>
              <td style="padding: 6px 8px; border: 1px solid #CBD5E1;">
                <strong>${nameDisplay}</strong>
              </td>
              <td style="padding: 6px 8px; border: 1px solid #CBD5E1; text-align: center;">${m.display_relation || m.relation}</td>
              <td style="padding: 6px 8px; border: 1px solid #CBD5E1; text-align: center;">${m.gender || '-'}</td>
              <td style="padding: 6px 8px; border: 1px solid #CBD5E1; text-align: center;">${formatDate(m.dob) || '-'}</td>
              <td style="padding: 6px 8px; border: 1px solid #CBD5E1; text-align: center;">${ageDisplay}</td>
              <td style="padding: 6px 8px; border: 1px solid #CBD5E1;">${eduStr}</td>
              <td style="padding: 6px 8px; border: 1px solid #CBD5E1;">${occType}</td>
              <td style="padding: 6px 8px; border: 1px solid #CBD5E1; text-align: center;">${!isDeceased && m.mobile ? m.mobile : '-'}</td>
            </tr>
          `;
        })
        .join('');

      return `
        <div style="page-break-inside: avoid; margin-bottom: 24px; border: 1px solid #0284C7; border-radius: 6px; overflow: hidden;">
          <div style="background: #0284C7; color: #FFFFFF; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span style="font-size: 15px; font-weight: bold;">${fIdx + 1}. ${head?.name || fam.head_name || 'પરિવાર'}</span>
              <span style="font-size: 12px; margin-left: 8px; background: rgba(255,255,255,0.25); padding: 2px 6px; border-radius: 4px;">કોડ: ${fam.family_code}</span>
            </div>
            <div style="font-size: 12px;">
              📍 ${fam.area_name || fam.city || 'Ahmedabad'} • 🏠 ${(fam as any).native_place || fam.city || 'Ahmedabad'}
            </div>
          </div>
          <div style="padding: 6px 12px; background: #F0F9FF; font-size: 12px; border-bottom: 1px solid #BAE6FD;">
            <strong>સરનામું:</strong> ${fam.address || '-'} | <strong>સભ્યો:</strong> ${fam.members?.length || 0}
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background: #F1F5F9; color: #334155;">
                <th style="padding: 6px; border: 1px solid #CBD5E1; width: 25px;">#</th>
                <th style="padding: 6px; border: 1px solid #CBD5E1;">નામ</th>
                <th style="padding: 6px; border: 1px solid #CBD5E1;">સંબંધ</th>
                <th style="padding: 6px; border: 1px solid #CBD5E1;">જાતિ</th>
                <th style="padding: 6px; border: 1px solid #CBD5E1;">જન્મ તારીખ</th>
                <th style="padding: 6px; border: 1px solid #CBD5E1;">ઉંમર</th>
                <th style="padding: 6px; border: 1px solid #CBD5E1;">શિક્ષણ</th>
                <th style="padding: 6px; border: 1px solid #CBD5E1;">વ્યવસાય</th>
                <th style="padding: 6px; border: 1px solid #CBD5E1;">મોબાઈલ</th>
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
          @page { size: A4 portrait; margin: 12mm; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #1E293B;
            margin: 0;
            padding: 0;
            background: #FFFFFF;
          }
          .cover-header {
            text-align: center;
            border: 3px double #0284C7;
            padding: 20px;
            background: #F0F9FF;
            border-radius: 8px;
            margin-bottom: 24px;
          }
        </style>
      </head>
      <body>
        <div class="cover-header">
          <h1 style="color: #0369A1; font-size: 26px; margin: 0 0 6px 0;">અમદાવાદ ડબગર સમાજ પરિચય પુસ્તિકા</h1>
          <p style="color: #0284C7; font-size: 14px; margin: 0 0 12px 0; font-weight: 600;">Ahmedabad Dabgar Samaj Directory & Booklet</p>
          <div style="font-size: 13px; color: #475569;">
            કુલ પરિવારો: <strong>${families.length}</strong> | કુલ સભ્યો: <strong>${totalMembers}</strong> | પ્રકાશન તારીખ: <strong>${dateStr}</strong>
          </div>
        </div>

        ${familySections}

        <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #64748B; border-top: 1px solid #E2E8F0; padding-top: 12px;">
          શ્રી અમદાવાદ ડબગર સમાજ પરિચય પુસ્તિકા • સર્વ અધિકાર સુરક્ષિત
        </div>
      </body>
    </html>
  `;
}

/**
 * Export and Share single family booklet as PDF
 */
export async function exportFamilyAsPdf(family: Family | ExportDirectoryFamilyItem, members: FamilyMember[]): Promise<void> {
  try {
    const html = generateSingleFamilyHtml(family, members);
    if (Platform.OS === 'web') {
      await Print.printAsync({ html });
      return;
    }

    const { uri } = await Print.printToFileAsync({ html });
    if (uri) {
      let shareUri = uri;
      try {
        const cleanName = `family_${(family.family_code || 'booklet').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
        const baseDir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory || '';
        if (baseDir) {
          const destPath = `${baseDir}${cleanName}`;
          await (FileSystem as any).copyAsync({ from: uri, to: destPath });
          shareUri = destPath;
        }
      } catch (copyErr) {
        console.warn('PDF copy warn:', copyErr);
      }

      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        try {
          await Sharing.shareAsync(shareUri, {
            mimeType: 'application/pdf',
            dialogTitle: `${family.family_code} - Family Booklet PDF`,
            UTI: 'com.adobe.pdf',
          });
          return;
        } catch (shareErr) {
          console.warn('Sharing rejected, falling back to print dialog:', shareErr);
          await Print.printAsync({ html });
          return;
        }
      } else {
        await Print.printAsync({ html });
      }
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
      await Print.printAsync({ html });
      return;
    }

    const { uri } = await Print.printToFileAsync({ html });
    if (uri) {
      let shareUri = uri;
      try {
        const cleanName = `dabgar_samaj_parichay_pustika_${Date.now()}.pdf`;
        const baseDir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory || '';
        if (baseDir) {
          const destPath = `${baseDir}${cleanName}`;
          await (FileSystem as any).copyAsync({ from: uri, to: destPath });
          shareUri = destPath;
        }
      } catch (copyErr) {
        console.warn('PDF copy warn:', copyErr);
      }

      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        try {
          await Sharing.shareAsync(shareUri, {
            mimeType: 'application/pdf',
            dialogTitle: 'અમદાવાદ ડબગર સમાજ પરિચય પુસ્તિકા PDF',
            UTI: 'com.adobe.pdf',
          });
          return;
        } catch (shareErr) {
          console.warn('Sharing rejected, falling back to print dialog:', shareErr);
          await Print.printAsync({ html });
          return;
        }
      } else {
        await Print.printAsync({ html });
      }
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
    await Print.printAsync({ html });
  } catch (err: any) {
    console.error('Print directory error:', err);
    Alert.alert('Print Error', err?.message || 'Failed to print Directory.');
  }
}
