const XLSX = require('xlsx');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const os = require('os');

// 1. Read environment variables
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Anon Key in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to calculate age from DOB
function calculateAge(dobString) {
  if (!dobString) return '';
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 0 ? age : '';
}

// Helper to format relation nicely
function formatRelation(relation) {
  const map = {
    'FAMILY_HEAD': 'પરિવારના વડા (Head)',
    'WIFE': 'પત્ની (Wife)',
    'HUSBAND': 'પતિ (Husband)',
    'SON': 'પુત્ર (Son)',
    'DAUGHTER': 'પુત્રી (Daughter)',
    'FATHER': 'પિતા (Father)',
    'MOTHER': 'માતા (Mother)',
    'BROTHER': 'ભાઈ (Brother)',
    'SISTER': 'બહેન (Sister)',
    'GRANDFATHER': 'દાદા (Grandfather)',
    'GRANDMOTHER': 'દાદી (Grandmother)',
    'GRANDSON': 'પૌત્ર (Grandson)',
    'GRANDDAUGHTER': 'પૌત્રી (Granddaughter)',
    'DAUGHTER_IN_LAW': 'પુત્રવધૂ (Daughter-in-law)',
    'SON_IN_LAW': 'જમાઈ (Son-in-law)',
    'OTHER': 'અન્ય (Other)',
  };
  return map[relation] || relation || '';
}

function formatResidence(resType) {
  if (resType === 'SAME_AS_FAMILY') return 'પરિવાર સાથે (With Family)';
  if (resType === 'SEPARATE') return 'અલગ રહેઠાણ (Separate)';
  return resType || '';
}

async function fetchFullData() {
  console.log('Fetching live data from Supabase...');
  const [famRes, memRes, eduRes, occRes, areaRes, profRes] = await Promise.all([
    supabase.from('families').select('*').order('family_code', { ascending: true }),
    supabase.from('family_members').select('*').order('created_at', { ascending: true }),
    supabase.from('education_records').select('*'),
    supabase.from('occupation_records').select('*'),
    supabase.from('areas').select('*'),
    supabase.from('profiles').select('*'),
  ]);

  if (famRes.error) throw new Error('Error fetching families: ' + famRes.error.message);
  if (memRes.error) throw new Error('Error fetching members: ' + memRes.error.message);

  const families = famRes.data || [];
  const members = memRes.data || [];
  const educations = eduRes.data || [];
  const occupations = occRes.data || [];
  const areas = areaRes.data || [];
  const profiles = profRes.data || [];

  const areaMap = new Map(areas.map(a => [a.id, a.name]));
  const profileMap = new Map(profiles.map(p => [p.auth_user_id, p]));

  const eduMap = new Map();
  educations.forEach(e => {
    if (!eduMap.has(e.family_member_id)) eduMap.set(e.family_member_id, []);
    eduMap.get(e.family_member_id).push(e);
  });

  const occMap = new Map();
  occupations.forEach(o => {
    if (!occMap.has(o.family_member_id)) occMap.set(o.family_member_id, []);
    occMap.get(o.family_member_id).push(o);
  });

  const membersByFamily = new Map();
  members.forEach(m => {
    if (!membersByFamily.has(m.family_id)) membersByFamily.set(m.family_id, []);
    membersByFamily.get(m.family_id).push(m);
  });

  return { families, members, eduMap, occMap, areaMap, profileMap, membersByFamily };
}

async function buildExcelFile() {
  const { families, members, eduMap, occMap, areaMap, profileMap, membersByFamily } = await fetchFullData();
  console.log(`Processing ${families.length} families and ${members.length} members...`);

  function getMemberEmail(m, fam) {
    if (m?.email && m.email.trim()) return m.email.trim();
    if (m?.occupation_details?.email && m.occupation_details.email.trim()) return m.occupation_details.email.trim();
    if (fam?.head_user_id && (m?.relation === 'FAMILY_HEAD' || !m)) {
      const prof = profileMap.get(fam.head_user_id);
      if (prof?.email) return prof.email.trim();
    }
    return '';
  }

  // SHEET 1: સમાજ પુસ્તિકા (Booklet - Family-wise)
  const bookletRows = [[
    'પરિવાર કોડ', 'સંબંધ / હોદ્દો', 'સભ્યનું પૂરું નામ', 'જાતિ (Gender)', 'જન્મ તારીખ (DOB)', 'ઉંમર (Age)',
    'બ્લડ ગ્રુપ', 'મૂળ વતન / જન્મસ્થળ', 'મોબાઈલ નંબર', 'ઈમેલ એડ્રેસ', 'શિક્ષણ ડિગ્રી / ધોરણ', 'શાળા / કોલેજનું નામ',
    'અભ્યાસ સ્થિતિ', 'વ્યવસાય પ્રકાર', 'કંપની / પેઢીનું નામ', 'હોદ્દો / પદ', 'કામકાજનું સ્થળ', 'અનુભવ (વર્ષ)',
    'રહેઠાણ પ્રકાર', 'ઘરનું સરનામું', 'શહેર', 'પીનકોડ', 'અલગ સરનામું (જો હોય તો)', 'હયાત / સ્વર્ગસ્થ',
    'સ્વર્ગસ્થ તારીખ', 'એડિટ પરવાનગી', 'ફોટો લિંક'
  ]];

  families.forEach(fam => {
    const famMembers = membersByFamily.get(fam.id) || [];
    famMembers.sort((a, b) => {
      if (a.relation === 'FAMILY_HEAD') return -1;
      if (b.relation === 'FAMILY_HEAD') return 1;
      if (a.relation === 'WIFE' || a.relation === 'HUSBAND') return -1;
      if (b.relation === 'WIFE' || b.relation === 'HUSBAND') return 1;
      return 0;
    });

    famMembers.forEach(m => {
      const edus = eduMap.get(m.id) || [];
      const occs = occMap.get(m.id) || [];
      const primaryEdu = edus[0] || {};
      const primaryOcc = occs[0] || {};

      const orgName = primaryOcc.organization_name || primaryOcc.business_name || m.occupation_details?.company_name || m.occupation_details?.business_name || m.occupation_details?.shop_name || '';
      const desig = primaryOcc.designation || m.occupation_details?.designation || m.occupation_details?.current_year_or_std || '';
      const workLoc = primaryOcc.work_location || m.occupation_details?.work_location || m.occupation_details?.shop_location || '';
      const exp = primaryOcc.experience_years || m.occupation_details?.experience_years || '';
      const course = primaryEdu.course_or_standard || (primaryEdu.education_level ? `${primaryEdu.education_level} - ${primaryEdu.course_or_standard || ''}` : '') || '';
      const inst = primaryEdu.institution || m.occupation_details?.school_or_college || '';
      const eduStat = primaryEdu.education_status || m.education_status || '';
      const memberEmail = getMemberEmail(m, fam);

      const sepAddr = m.residence_type === 'SEPARATE'
        ? [m.separate_address, m.separate_city, m.separate_pincode].filter(Boolean).join(', ')
        : '';

      bookletRows.push([
        fam.family_code, formatRelation(m.relation), m.name, m.gender || '', m.dob || '', calculateAge(m.dob),
        m.blood_group || '', m.birth_place || '', m.mobile || '', memberEmail, course, inst, eduStat,
        primaryOcc.occupation_type || m.occupation_type || '', orgName, desig, workLoc, exp,
        formatResidence(m.residence_type), fam.address, fam.city, fam.pincode, sepAddr,
        m.is_deceased ? 'સ્વર્ગસ્થ' : 'હયાત', m.deceased_date || '', m.can_edit_family ? 'હા (Yes)' : 'ના (No)',
        m.photo_url || ''
      ]);
    });

    bookletRows.push(new Array(27).fill(''));
  });

  // SHEET 2: પરિવારોની યાદી (Families Master)
  const familyRows = [[
    'ક્રમ (No.)', 'પરિવાર કોડ (Family Code)', 'મુખ્ય વડીલનું નામ (Head Name)', 'વડાનો મોબાઈલ (Head Mobile)',
    'વડાનું ઈમેલ (Head Email)', 'કુલ સભ્યો (Members Count)', 'ઘરનું સરનામું (Address)', 'વિસ્તાર (Area)',
    'શહેર (City)', 'રાજ્ય (State)', 'પીનકોડ (Pincode)', 'સ્ટેટસ (Status)', 'નોંધણી તારીખ (Registered At)'
  ]];

  families.forEach((fam, idx) => {
    const famMembers = membersByFamily.get(fam.id) || [];
    const head = famMembers.find(m => m.relation === 'FAMILY_HEAD') || famMembers[0] || {};
    const areaName = fam.area_id ? (areaMap.get(fam.area_id) || '') : '';
    const regDate = fam.created_at ? new Date(fam.created_at).toLocaleDateString('en-IN') : '';
    const headEmail = getMemberEmail(head, fam);

    familyRows.push([
      idx + 1, fam.family_code, head.name || 'N/A', head.mobile || '', headEmail,
      famMembers.length, fam.address, areaName, fam.city, fam.state, fam.pincode, fam.status, regDate
    ]);
  });

  // SHEET 3: તમામ સભ્યો માસ્ટર (All Members Master)
  const memberRows = [[
    'ક્રમ', 'પરિવાર કોડ', 'સભ્યનું નામ', 'વડીલ સાથે સંબંધ', 'જાતિ', 'જન્મ તારીખ', 'ઉંમર', 'બ્લડ ગ્રુપ',
    'મૂળ વતન', 'મોબાઈલ નંબર', 'ઈમેલ', 'શિક્ષણ સ્તર', 'કોર્સ / ધોરણ', 'સંસ્થા / કોલેજ', 'અભ્યાસ સ્થિતિ',
    'પાસિંગ વર્ષ', 'વ્યવસાય પ્રકાર', 'પેઢી / કંપની / સંસ્થા', 'હોદ્દો / પદ', 'ધંધાનો પ્રકાર', 'કામનું સ્થળ',
    'અનુભવ (વર્ષ)', 'પરિવારનું સરનામું', 'શહેર', 'પીનકોડ', 'રહેઠાણ પ્રકાર', 'અલગ સરનામું', 'હયાત / સ્વર્ગસ્થ', 'નોંધણી તારીખ'
  ]];

  members.forEach((m, idx) => {
    const fam = families.find(f => f.id === m.family_id) || {};
    const edus = eduMap.get(m.id) || [];
    const occs = occMap.get(m.id) || [];
    const primaryEdu = edus[0] || {};
    const primaryOcc = occs[0] || {};

    const orgName = primaryOcc.organization_name || primaryOcc.business_name || m.occupation_details?.company_name || m.occupation_details?.business_name || m.occupation_details?.shop_name || '';
    const desig = primaryOcc.designation || m.occupation_details?.designation || m.occupation_details?.current_year_or_std || '';
    const workLoc = primaryOcc.work_location || m.occupation_details?.work_location || m.occupation_details?.shop_location || '';
    const exp = primaryOcc.experience_years || m.occupation_details?.experience_years || '';
    const regDate = m.created_at ? new Date(m.created_at).toLocaleDateString('en-IN') : '';
    const memberEmail = getMemberEmail(m, fam);

    memberRows.push([
      idx + 1, fam.family_code || '', m.name, formatRelation(m.relation), m.gender || '', m.dob || '',
      calculateAge(m.dob), m.blood_group || '', m.birth_place || '', m.mobile || '', memberEmail,
      primaryEdu.education_level || '', primaryEdu.course_or_standard || '',
      primaryEdu.institution || m.occupation_details?.school_or_college || '',
      primaryEdu.education_status || m.education_status || '', primaryEdu.passing_year || '',
      primaryOcc.occupation_type || m.occupation_type || '', orgName, desig,
      primaryOcc.business_type || m.occupation_details?.shop_type || '', workLoc, exp,
      fam.address || '', fam.city || '', fam.pincode || '', formatResidence(m.residence_type),
      m.separate_address || '', m.is_deceased ? 'સ્વર્ગસ્થ' : 'હયાત', regDate
    ]);
  });

  // SHEET 4: શિક્ષણ અને રોજગાર
  const careerRows = [[
    'પરિવાર કોડ', 'સભ્યનું નામ', 'ઉંમર', 'જાતિ', 'મોબાઈલ', 'ઈમેલ', 'શિક્ષણ ડિગ્રી / ધોરણ',
    'સંસ્થા / યુનિવર્સિટી', 'શિક્ષણ સ્થિતિ', 'પાસિંગ વર્ષ', 'વ્યવસાય વર્ગ', 'પેઢી / કંપનીનું નામ',
    'હોદ્દો / ડેઝિગ્નેશન', 'કામકાજનું સ્થળ', 'અનુભવ (વર્ષ)'
  ]];

  members.forEach(m => {
    const fam = families.find(f => f.id === m.family_id) || {};
    const edus = eduMap.get(m.id) || [];
    const occs = occMap.get(m.id) || [];
    const primaryEdu = edus[0] || {};
    const primaryOcc = occs[0] || {};

    const orgName = primaryOcc.organization_name || primaryOcc.business_name || m.occupation_details?.company_name || m.occupation_details?.business_name || m.occupation_details?.shop_name || '';
    const desig = primaryOcc.designation || m.occupation_details?.designation || m.occupation_details?.current_year_or_std || '';
    const workLoc = primaryOcc.work_location || m.occupation_details?.work_location || m.occupation_details?.shop_location || '';
    const exp = primaryOcc.experience_years || m.occupation_details?.experience_years || '';
    const memberEmail = getMemberEmail(m, fam);

    careerRows.push([
      fam.family_code || '', m.name, calculateAge(m.dob), m.gender || '', m.mobile || '', memberEmail,
      primaryEdu.course_or_standard || primaryEdu.education_level || '',
      primaryEdu.institution || m.occupation_details?.school_or_college || '',
      primaryEdu.education_status || m.education_status || '', primaryEdu.passing_year || '',
      primaryOcc.occupation_type || m.occupation_type || '', orgName, desig, workLoc, exp
    ]);
  });

  // Create Workbook
  const wb = XLSX.utils.book_new();
  const wsBooklet = XLSX.utils.aoa_to_sheet(bookletRows);
  const wsFamilies = XLSX.utils.aoa_to_sheet(familyRows);
  const wsMembers = XLSX.utils.aoa_to_sheet(memberRows);
  const wsCareer = XLSX.utils.aoa_to_sheet(careerRows);

  const bookletColWidths = [
    { wch: 14 }, { wch: 22 }, { wch: 28 }, { wch: 10 }, { wch: 14 }, { wch: 8 },
    { wch: 10 }, { wch: 16 }, { wch: 15 }, { wch: 28 }, { wch: 22 }, { wch: 28 },
    { wch: 14 }, { wch: 18 }, { wch: 30 }, { wch: 18 }, { wch: 22 }, { wch: 10 },
    { wch: 18 }, { wch: 35 }, { wch: 14 }, { wch: 10 }, { wch: 25 }, { wch: 12 },
    { wch: 14 }, { wch: 14 }, { wch: 40 },
  ];
  wsBooklet['!cols'] = bookletColWidths;
  wsMembers['!cols'] = bookletColWidths;

  XLSX.utils.book_append_sheet(wb, wsBooklet, 'સમાજ પુસ્તિકા (Booklet)');
  XLSX.utils.book_append_sheet(wb, wsFamilies, 'પરિવારોની યાદી (Families)');
  XLSX.utils.book_append_sheet(wb, wsMembers, 'તમામ સભ્યો (All Members)');
  XLSX.utils.book_append_sheet(wb, wsCareer, 'શિક્ષણ અને રોજગાર (Directory)');

  const tempDir = os.tmpdir();
  const todayStr = new Date().toISOString().split('T')[0];
  const filename = `Ahmedabad_Dabgar_Samaj_Master_Directory_${todayStr}.xlsx`;
  const filePath = path.join(tempDir, filename);

  XLSX.writeFile(wb, filePath);

  return { filePath, filename, familyCount: families.length, memberCount: members.length };
}

async function sendEmailWithBackup(filePath, filename, familyCount, memberCount, smtpUser, smtpPass, recipientEmail) {
  if (!smtpUser || !smtpPass || !recipientEmail) {
    console.log('Skipping email send: Missing SMTP credentials or recipient.');
    return false;
  }

  console.log(`Attempting to send backup email to ${recipientEmail}...`);
  const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const mailOptions = {
    from: `"અમદાવાદ ડાબગર સમાજ" <${recipientEmail}>`,
    to: recipientEmail,
    subject: `અમદાવાદ ડાબગર સમાજ - સાપ્તાહિક સંપૂર્ણ ડેટાબેકઅપ પુસ્તિકા (${new Date().toLocaleDateString('gu-IN')})`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
        <h2 style="color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 8px;">અમદાવાદ ડાબગર સમાજ ડિજિટલ ડિરેક્ટરી</h2>
        <p>જય શ્રી કૃષ્ણ,</p>
        <p>આ સાથે ડાબગર સમાજ એપ્લિકેશનના સર્વર પરથી <b>શરૂઆતથી આજ દિન સુધીનો સંપૂર્ણ ડેટાબેકઅપ</b> એક્સેલ ફાઈલ (.xlsx) સ્વરૂપે મોકલેલ છે.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background: #f8fafc;">
          <tr>
            <td style="padding: 8px; border: 1px solid #cbd5e1;"><b>કુલ પરિવારો:</b></td>
            <td style="padding: 8px; border: 1px solid #cbd5e1;">${familyCount}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #cbd5e1;"><b>કુલ નોંધાયેલ સભ્યો:</b></td>
            <td style="padding: 8px; border: 1px solid #cbd5e1;">${memberCount}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #cbd5e1;"><b>બેકઅપ તારીખ:</b></td>
            <td style="padding: 8px; border: 1px solid #cbd5e1;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
          </tr>
        </table>

        <p>આ ફાઈલમાં નીચે મુજબના ૪ અલગ અલગ વિભાગો (Tabs) આપેલા છે:</p>
        <ol>
          <li><b>સમાજ પુસ્તિકા (Booklet):</b> પરિવાર પ્રમાણે ગોઠવેલ સંપૂર્ણ ડેટા.</li>
          <li><b>પરિવારોની યાદી (Families):</b> વડીલોના નામ અને સરનામાની યાદી.</li>
          <li><b>તમામ સભ્યો (All Members):</b> દરેક સભ્યની તમામ વિગતો સાથેનું માસ્ટર ટેબલ.</li>
          <li><b>શિક્ષણ અને રોજગાર (Directory):</b> અભ્યાસ અને વ્યવસાયની વિશેષ માહિતી.</li>
        </ol>

        <p style="color: #64748b; font-size: 12px; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
          આ ઈમેલ સર્વર પરથી ઓટોમેટિક સાપ્તાહિક બેકઅપ સિસ્ટમ દ્વારા મોકલવામાં આવેલ છે.
        </p>
      </div>
    `,
    attachments: [
      {
        filename: filename,
        path: filePath,
      },
    ],
  };

  const info = await transporter.sendMail(mailOptions);
  console.log('Email sent successfully! MessageId:', info.messageId);
  return true;
}

async function main() {
  let tempFilePath = null;
  try {
    const { filePath, filename, familyCount, memberCount } = await buildExcelFile();
    tempFilePath = filePath;
    console.log(`\n========================================`);
    console.log(`Excel generated in temporary directory: ${filePath}`);
    console.log(`Families: ${familyCount}, Members: ${memberCount}`);
    console.log(`========================================\n`);

    // Optional CLI arguments for sending email:
    // node scripts/export-and-email-backup.js <smtpUser> <smtpPass> <recipientEmail>
    const args = process.argv.slice(2);
    const smtpUser = args[0] || env.BREVO_SMTP_USER || process.env.BREVO_SMTP_USER || null;
    const smtpPass = args[1] || env.BREVO_SMTP_KEY || process.env.BREVO_SMTP_KEY || null;
    const recipient = args[2] || env.BACKUP_RECIPIENT_EMAIL || process.env.BACKUP_RECIPIENT_EMAIL || null;

    if (smtpUser) {
      await sendEmailWithBackup(filePath, filename, familyCount, memberCount, smtpUser, smtpPass, recipient);
    } else {
      console.log('To send via email, run:');
      console.log('node scripts/export-and-email-backup.js <brevo_smtp_login_username> <brevo_smtp_key> <recipient_email>');
    }
  } catch (err) {
    console.error('Fatal backup error:', err);
    process.exit(1);
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log('Temporary excel file deleted cleanly.');
      } catch (cleanErr) {
        // Ignored
      }
    }
  }
}

main();
