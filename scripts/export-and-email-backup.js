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

// Helper to calculate age from DOB (or age at death for deceased members)
function calculateAge(dobString, deceasedDateString) {
  if (!dobString) return '';
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return '';
  const endDate = deceasedDateString ? new Date(deceasedDateString) : null;
  const end = (endDate && !isNaN(endDate.getTime())) ? endDate : new Date();
  let age = end.getFullYear() - dob.getFullYear();
  const m = end.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && end.getDate() < dob.getDate())) {
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
    'SON_WIFE': 'પુત્રવધૂ (Daughter-in-law)',
    'DAUGHTER_IN_LAW': 'પુત્રવધૂ (Daughter-in-law)',
    'DAUGHTER_HUSBAND': 'જમાઈ (Son-in-law)',
    'SON_IN_LAW': 'જમાઈ (Son-in-law)',
    'FATHER': 'પિતા (Father)',
    'MOTHER': 'માતા (Mother)',
    'BROTHER': 'ભાઈ (Brother)',
    'BROTHER_WIFE': 'ભાભી (Sister-in-law)',
    'SISTER': 'બહેન (Sister)',
    'SISTER_HUSBAND': 'બનેવી (Brother-in-law)',
    'GRANDFATHER': 'દાદા (Grandfather)',
    'GRANDMOTHER': 'દાદી (Grandmother)',
    'GRANDSON': 'પૌત્ર (Grandson)',
    'GRANDDAUGHTER': 'પૌત્રી (Granddaughter)',
    'FATHER_BROTHER': 'કાકા (Paternal Uncle)',
    'PATERNAL_UNCLE': 'કાકા (Paternal Uncle)',
    'PATERNAL_AUNT': 'કાકી (Paternal Aunt)',
    'MOTHER_BROTHER': 'મામા (Maternal Uncle)',
    'MATERNAL_UNCLE': 'મામા (Maternal Uncle)',
    'MATERNAL_AUNT': 'મામી (Maternal Aunt)',
    'FATHER_S_SISTER': 'ફઈ (Paternal Aunt)',
    'MOTHER_S_SISTER': 'માસી (Maternal Aunt)',
    'OTHER': 'અન્ય (Other)',
  };
  return map[relation] || relation || '';
}

function formatOccupationType(occCode) {
  if (!occCode) return '';
  const map = {
    'STUDENT': 'વિદ્યાર્થી (Student)',
    'EMPLOYEE': 'નોકરી (Employee)',
    'BUSINESS_OWNER': 'વેપાર (Business Owner)',
    'SHOP_OWNER': 'દુકાનદાર (Shop Owner)',
    'PROFESSIONAL': 'પ્રોફેશનલ (Doctor/CA/Lawyer)',
    'SELF_EMPLOYED': 'સ્વરોજગાર (Self Employed)',
    'FREELANCER': 'ફ્રીલાન્સર (Freelancer)',
    'FARMER': 'ખેડૂત (Farmer)',
    'HOMEMAKER': 'ગૃહિણી (Homemaker)',
    'RETIRED': 'નિવૃત્ત (Retired)',
    'UNEMPLOYED': 'નોકરીની શોધમાં (Job Seeking)',
    'OTHER': 'અન્ય (Other)',
  };
  return map[occCode] || occCode;
}

function extractOccupationInfo(m, primaryOcc = {}) {
  const occType = formatOccupationType(primaryOcc.occupation_type || m.occupation_type || '');
  const details = m.occupation_details || primaryOcc.details || {};

  const orgName =
    primaryOcc.organization_name ||
    primaryOcc.business_name ||
    details.company_name ||
    details.business_name ||
    details.shop_name ||
    details.practice_name ||
    details.school_or_college ||
    details.work_description ||
    details.specialization ||
    details.previous_organization ||
    '';

  const desig =
    primaryOcc.designation ||
    details.designation ||
    details.profession ||
    details.current_year_or_std ||
    '';

  const businessType =
    primaryOcc.business_type ||
    details.business_type ||
    details.shop_type ||
    '';

  const workLoc =
    primaryOcc.work_location ||
    details.work_location ||
    details.business_location ||
    details.shop_location ||
    details.village_or_taluka ||
    '';

  const exp =
    primaryOcc.experience_years ||
    details.experience_years ||
    '';

  return { occType, orgName, desig, businessType, workLoc, exp };
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

      const { occType, orgName, desig, workLoc, exp } = extractOccupationInfo(m, primaryOcc);
      const course = primaryEdu.course_or_standard || (primaryEdu.education_level ? `${primaryEdu.education_level} - ${primaryEdu.course_or_standard || ''}` : '') || '';
      const inst = primaryEdu.institution || m.occupation_details?.school_or_college || '';
      const eduStat = primaryEdu.education_status || m.education_status || '';
      const memberEmail = getMemberEmail(m, fam);

      const sepAddr = m.residence_type === 'SEPARATE'
        ? [m.separate_address, m.separate_city, m.separate_pincode].filter(Boolean).join(', ')
        : '';

      const memberDemiseDate = m.is_deceased ? (m.deceased_date || m.occupation_details?.deceased_date) : null;

      bookletRows.push([
        fam.family_code, formatRelation(m.relation), m.name, m.gender || '', m.dob || '', calculateAge(m.dob, memberDemiseDate),
        m.blood_group || '', m.birth_place || '', m.mobile || '', memberEmail, course, inst, eduStat,
        occType, orgName, desig, workLoc, exp,
        formatResidence(m.residence_type), fam.address, fam.city, fam.pincode, sepAddr,
        m.is_deceased ? 'સ્વર્ગસ્થ' : 'હયાત', m.deceased_date || '', m.can_edit_family ? 'હા (Yes)' : 'ના (No)',
        m.photo_url || ''
      ]);
    });

    bookletRows.push(new Array(27).fill(''));
  });

  const isDeceased = (m) => m.is_deceased === true || m.status === 'DECEASED' || m.occupation_details?.is_deceased === true;
  const livingMembers = members.filter(m => !isDeceased(m));
  const lateMembers = members.filter(m => isDeceased(m));

  // SHEET 2: પરિવારોની યાદી (Families Master)
  const familyRows = [[
    'ક્રમ (No.)', 'પરિવાર કોડ (Family Code)', 'મુખ્ય વડીલનું નામ (Head Name)', 'વડાનો મોબાઈલ (Head Mobile)',
    'વડાનું ઈમેલ (Head Email)', 'હયાત સભ્યો (Living)', 'સ્વર્ગસ્થ સભ્યો (Late)', 'કુલ સભ્યો (Total)', 'ઘરનું સરનામું (Address)', 'વિસ્તાર (Area)',
    'શહેર (City)', 'રાજ્ય (State)', 'પીનકોડ (Pincode)', 'સ્ટેટસ (Status)', 'નોંધણી તારીખ (Registered At)'
  ]];

  families.forEach((fam, idx) => {
    const famMembers = membersByFamily.get(fam.id) || [];
    const famLiving = famMembers.filter(m => !isDeceased(m));
    const famLate = famMembers.filter(m => isDeceased(m));
    const head = famLiving.find(m => m.relation === 'FAMILY_HEAD') || famMembers.find(m => m.relation === 'FAMILY_HEAD') || famMembers[0] || {};
    const areaName = fam.area_id ? (areaMap.get(fam.area_id) || '') : '';
    const regDate = fam.created_at ? new Date(fam.created_at).toLocaleDateString('en-IN') : '';
    const headEmail = getMemberEmail(head, fam);

    familyRows.push([
      idx + 1, fam.family_code, head.name || 'N/A', head.mobile || '', headEmail,
      famLiving.length, famLate.length, famMembers.length, fam.address, areaName, fam.city, fam.state, fam.pincode, fam.status, regDate
    ]);
  });

  // SHEET 3: હયાત સભ્યો માસ્ટર (Living Members Master - Without Late Members)
  const livingMemberRows = [[
    'ક્રમ', 'પરિવાર કોડ', 'સભ્યનું નામ', 'વડીલ સાથે સંબંધ', 'જાતિ', 'જન્મ તારીખ', 'ઉંમર', 'બ્લડ ગ્રુપ',
    'મૂળ વતન', 'મોબાઈલ નંબર', 'ઈમેલ', 'શિક્ષણ સ્તર', 'કોર્સ / ધોરણ', 'સંસ્થા / કોલેજ', 'અભ્યાસ સ્થિતિ',
    'પાસિંગ વર્ષ', 'વ્યવસાય પ્રકાર', 'પેઢી / કંપની / સંસ્થા', 'હોદ્દો / પદ', 'ધંધાનો પ્રકાર', 'કામનું સ્થળ',
    'અનુભવ (વર્ષ)', 'પરિવારનું સરનામું', 'શહેર', 'પીનકોડ', 'રહેઠાણ પ્રકાર', 'અલગ સરનામું', 'નોંધણી તારીખ'
  ]];

  livingMembers.forEach((m, idx) => {
    const fam = families.find(f => f.id === m.family_id) || {};
    const edus = eduMap.get(m.id) || [];
    const occs = occMap.get(m.id) || [];
    const primaryEdu = edus[0] || {};
    const primaryOcc = occs[0] || {};

    const { occType, orgName, desig, businessType, workLoc, exp } = extractOccupationInfo(m, primaryOcc);
    const regDate = m.created_at ? new Date(m.created_at).toLocaleDateString('en-IN') : '';
    const memberEmail = getMemberEmail(m, fam);

    livingMemberRows.push([
      idx + 1, fam.family_code || '', m.name, formatRelation(m.relation), m.gender || '', m.dob || '',
      calculateAge(m.dob, null), m.blood_group || '', m.birth_place || '', m.mobile || '', memberEmail,
      primaryEdu.education_level || '', primaryEdu.course_or_standard || '',
      primaryEdu.institution || m.occupation_details?.school_or_college || '',
      primaryEdu.education_status || m.education_status || '', primaryEdu.passing_year || '',
      occType, orgName, desig,
      businessType, workLoc, exp,
      fam.address || '', fam.city || '', fam.pincode || '', formatResidence(m.residence_type),
      m.separate_address || '', regDate
    ]);
  });

  // SHEET 4: સ્વર્ગસ્થ સભ્યો (Late Members - Memorial Directory)
  const lateMemberRows = [[
    'ક્રમ (No.)', 'પરિવાર કોડ (Family Code)', 'સ્વર્ગસ્થ સભ્યનું નામ (Late Member Name)',
    'વડીલ સાથે સંબંધ (Relation)', 'જાતિ (Gender)', 'જન્મ તારીખ (DOB)', 'સ્વર્ગવાસ તારીખ (Demise Date)',
    'અવસાન સમયે ઉંમર (Age at Demise)', 'બ્લડ ગ્રુપ (Blood Group)', 'મૂળ વતન (Native Place)',
    'પરિવારના વડાનું નામ (Family Head)', 'વડાનો મોબાઈલ (Head Contact)',
    'પરિવારનું સરનામું (Address)', 'શહેર (City)', 'પીનકોડ (Pincode)', 'નોંધણી તારીખ (Registered Date)'
  ]];

  lateMembers.forEach((m, idx) => {
    const fam = families.find(f => f.id === m.family_id) || {};
    const famMembers = membersByFamily.get(fam.id) || [];
    const head = famMembers.find(fm => fm.relation === 'FAMILY_HEAD' && !isDeceased(fm)) || famMembers.find(fm => fm.relation === 'FAMILY_HEAD') || famMembers[0] || {};
    const demiseDate = m.deceased_date || m.occupation_details?.deceased_date || '';
    const regDate = m.created_at ? new Date(m.created_at).toLocaleDateString('en-IN') : '';

    lateMemberRows.push([
      idx + 1, fam.family_code || '', m.name, formatRelation(m.relation), m.gender || '', m.dob || '',
      demiseDate, calculateAge(m.dob, demiseDate), m.blood_group || '', m.birth_place || '',
      head.name || 'N/A', head.mobile || '', fam.address || '', fam.city || '', fam.pincode || '', regDate
    ]);
  });

  // SHEET 5: શિક્ષણ અને રોજગાર (Active Living Members Career Directory)
  const careerRows = [[
    'પરિવાર કોડ', 'સભ્યનું નામ', 'ઉંમર', 'જાતિ', 'મોબાઈલ', 'ઈમેલ', 'શિક્ષણ ડિગ્રી / ધોરણ',
    'સંસ્થા / યુનિવર્સિટી', 'શિક્ષણ સ્થિતિ', 'પાસિંગ વર્ષ', 'વ્યવસાય વર્ગ', 'પેઢી / કંપનીનું નામ',
    'હોદ્દો / ડેઝિગ્નેશન', 'કામકાજનું સ્થળ', 'અનુભવ (વર્ષ)'
  ]];

  livingMembers.forEach(m => {
    const fam = families.find(f => f.id === m.family_id) || {};
    const edus = eduMap.get(m.id) || [];
    const occs = occMap.get(m.id) || [];
    const primaryEdu = edus[0] || {};
    const primaryOcc = occs[0] || {};

    const { occType, orgName, desig, workLoc, exp } = extractOccupationInfo(m, primaryOcc);
    const memberEmail = getMemberEmail(m, fam);

    careerRows.push([
      fam.family_code || '', m.name, calculateAge(m.dob, null), m.gender || '', m.mobile || '', memberEmail,
      primaryEdu.course_or_standard || primaryEdu.education_level || '',
      primaryEdu.institution || m.occupation_details?.school_or_college || '',
      primaryEdu.education_status || m.education_status || '', primaryEdu.passing_year || '',
      occType, orgName, desig, workLoc, exp
    ]);
  });

  // Create Workbook
  const wb = XLSX.utils.book_new();
  const wsBooklet = XLSX.utils.aoa_to_sheet(bookletRows);
  const wsFamilies = XLSX.utils.aoa_to_sheet(familyRows);
  const wsLiving = XLSX.utils.aoa_to_sheet(livingMemberRows);
  const wsLate = XLSX.utils.aoa_to_sheet(lateMemberRows);
  const wsCareer = XLSX.utils.aoa_to_sheet(careerRows);

  const bookletColWidths = [
    { wch: 14 }, { wch: 22 }, { wch: 28 }, { wch: 10 }, { wch: 14 }, { wch: 8 },
    { wch: 10 }, { wch: 16 }, { wch: 15 }, { wch: 28 }, { wch: 22 }, { wch: 28 },
    { wch: 14 }, { wch: 18 }, { wch: 30 }, { wch: 18 }, { wch: 22 }, { wch: 10 },
    { wch: 18 }, { wch: 35 }, { wch: 14 }, { wch: 10 }, { wch: 25 }, { wch: 12 },
    { wch: 14 }, { wch: 14 }, { wch: 40 },
  ];
  wsBooklet['!cols'] = bookletColWidths;
  wsLiving['!cols'] = bookletColWidths;
  wsLate['!cols'] = [
    { wch: 10 }, { wch: 14 }, { wch: 28 }, { wch: 22 }, { wch: 10 }, { wch: 14 },
    { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 25 }, { wch: 16 },
    { wch: 35 }, { wch: 14 }, { wch: 12 }, { wch: 14 }
  ];

  XLSX.utils.book_append_sheet(wb, wsBooklet, 'સમાજ પુસ્તિકા (Booklet)');
  XLSX.utils.book_append_sheet(wb, wsFamilies, 'પરિવારોની યાદી (Families)');
  XLSX.utils.book_append_sheet(wb, wsLiving, 'હયાત સભ્યો (Living Members)');
  XLSX.utils.book_append_sheet(wb, wsLate, 'સ્વર્ગસ્થ સભ્યો (Late Members)');
  XLSX.utils.book_append_sheet(wb, wsCareer, 'શિક્ષણ અને રોજગાર (Directory)');

  const tempDir = os.tmpdir();
  const todayStr = new Date().toISOString().split('T')[0];
  const filename = `Ahmedabad_Dabgar_Samaj_Master_Directory_${todayStr}.xlsx`;
  const filePath = path.join(tempDir, filename);

  XLSX.writeFile(wb, filePath);

  return {
    filePath,
    filename,
    familyCount: families.length,
    livingCount: livingMembers.length,
    lateCount: lateMembers.length,
    memberCount: members.length
  };
}

async function sendEmailWithBackup(filePath, filename, familyCount, livingCount, lateCount, memberCount, smtpUser, smtpPass, recipientEmail) {
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
    subject: `અમદાવાદ ડાબગર સમાજ - સંપૂર્ણ ડેટાબેકઅપ પુસ્તિકા (${new Date().toLocaleDateString('gu-IN')})`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 650px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
        <h2 style="color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 8px;">અમદાવાદ ડાબગર સમાજ ડિજિટલ ડિરેક્ટરી</h2>
        <p>જય શ્રી કૃષ્ણ,</p>
        <p>આ સાથે ડાબગર સમાજ એપ્લિકેશનના સર્વર પરથી <b>સંપૂર્ણ ડેટાબેકઅપ</b> એક્સેલ ફાઈલ (.xlsx) સ્વરૂપે મોકલેલ છે.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background: #f8fafc;">
          <tr>
            <td style="padding: 8px; border: 1px solid #cbd5e1;"><b>કુલ પરિવારો:</b></td>
            <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">${familyCount}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #cbd5e1;"><b>હયાત સભ્યો (Living):</b></td>
            <td style="padding: 8px; border: 1px solid #cbd5e1; color: #16a34a; font-weight: bold;">${livingCount}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #cbd5e1;"><b>સ્વર્ગસ્થ સભ્યો (Late):</b></td>
            <td style="padding: 8px; border: 1px solid #cbd5e1; color: #64748b; font-weight: bold;">${lateCount}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #cbd5e1;"><b>કુલ નોંધાયેલ સભ્યો:</b></td>
            <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">${memberCount}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #cbd5e1;"><b>બેકઅપ તારીખ:</b></td>
            <td style="padding: 8px; border: 1px solid #cbd5e1;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
          </tr>
        </table>

        <p><b>આ એક્સેલ ફાઈલમાં નીચે મુજબના ૫ અલગ અલગ વિભાગો (Sheets / Tabs) આપેલા છે:</b></p>
        <ol style="line-height: 1.8;">
          <li><b>સમાજ પુસ્તિકા (Booklet):</b> પરિવાર પ્રમાણે ગોઠવેલ સંપૂર્ણ સભ્યોની યાદી.</li>
          <li><b>પરિવારોની યાદી (Families):</b> વડીલોના નામ, હયાત/સ્વર્ગસ્થ સભ્યોની સંખ્યા અને સરનામાની યાદી.</li>
          <li><b>હયાત સભ્યો (Living Members):</b> સમાજના તમામ હયાત સભ્યોની વિગત (સ્વર્ગસ્થ સભ્યો વગર).</li>
          <li><b>સ્વર્ગસ્થ સભ્યો (Late Members):</b> સમાજના સ્વર્ગસ્થ વડીલો/સભ્યોની સ્મૃતિ યાદી (અવસાન તારીખ સહિત).</li>
          <li><b>શિક્ષણ અને રોજગાર (Directory):</b> હયાત સભ્યોના અભ્યાસ અને વ્યવસાયની વિશેષ માહિતી.</li>
        </ol>

        <p style="color: #64748b; font-size: 12px; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
          આ ઈમેલ અમદાવાદ ડાબગર સમાજ સિસ્ટમ દ્વારા મોકલવામાં આવેલ છે.
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
  let keepLocalCopy = false;
  try {
    const { filePath, filename, familyCount, livingCount, lateCount, memberCount } = await buildExcelFile();
    tempFilePath = filePath;
    console.log(`\n========================================`);
    console.log(`Excel generated in temporary directory: ${filePath}`);
    console.log(`Families: ${familyCount}, Living: ${livingCount}, Late: ${lateCount}, Total: ${memberCount}`);
    console.log(`========================================\n`);

    // Optional CLI arguments for sending email:
    // node scripts/export-and-email-backup.js <smtpUser> <smtpPass> <recipientEmail>
    const args = process.argv.slice(2);
    const smtpUser = args[0] || env.BREVO_SMTP_USER || process.env.BREVO_SMTP_USER || null;
    const smtpPass = args[1] || env.BREVO_SMTP_KEY || process.env.BREVO_SMTP_KEY || null;
    const recipient = args[2] || env.BACKUP_RECIPIENT_EMAIL || process.env.BACKUP_RECIPIENT_EMAIL || null;

    if (smtpUser) {
      await sendEmailWithBackup(filePath, filename, familyCount, livingCount, lateCount, memberCount, smtpUser, smtpPass, recipient);
    } else {
      // Keep a local copy in project root
      const localDestination = path.join(__dirname, '..', filename);
      fs.copyFileSync(filePath, localDestination);
      keepLocalCopy = true;
      console.log(`Saved master directory Excel file to project folder:\n-> ${localDestination}\n`);
      console.log('To also send via email, run:');
      console.log('node scripts/export-and-email-backup.js <brevo_smtp_login_username> <brevo_smtp_key> <recipient_email>');
    }
  } catch (err) {
    console.error('Fatal backup error:', err);
    process.exit(1);
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log('Temporary cache file cleaned.');
      } catch (cleanErr) {
        // Ignored
      }
    }
  }
}

main();
