export interface EducationLevelOption {
  value: string;
  label: string;
}

export const EDUCATION_LEVELS: EducationLevelOption[] = [
  { value: 'NotSchoolAge', label: 'Infant / Too Young for School (શાળા શરૂ નથી થઈ - ૦ થી ૩ વર્ષ)' },
  { value: 'School', label: 'School (ધોરણ ૧ - ૧૨ / KG)' },
  { value: 'Undergraduate', label: 'Under-Graduate / College (સ્નાતક)' },
  { value: 'Postgraduate', label: 'Post-Graduate / Master (અનુસ્નાતક)' },
  { value: 'Diploma', label: 'Diploma / પોલિટેકનિક' },
  { value: 'ITI', label: 'ITI / વ્યવસાયિક તાલીમ' },
  { value: 'Doctorate', label: 'Doctorate / PhD' },
  { value: 'Other', label: 'Other / અન્ય' },
];

export const SCHOOL_STANDARDS = [
  'Infant / At Home (ઘરે છે / શાળા શરૂ નથી થઈ)',
  'Playgroup / Nursery',
  'Junior KG (KG 1 / LKG)',
  'Senior KG (KG 2 / UKG)',
  'Standard 1',
  'Standard 2',
  'Standard 3',
  'Standard 4',
  'Standard 5',
  'Standard 6',
  'Standard 7',
  'Standard 8',
  'Standard 9',
  'Standard 10 (SSC)',
  'Standard 11',
  'Standard 12 (HSC)',
  'Other',
];

export const UNDERGRADUATE_COURSES = [
  'BCA',
  'B.Com',
  'BBA',
  'B.Tech / B.E.',
  'B.Sc.',
  'B.A.',
  'MBBS',
  'BDS',
  'BHMS / BAMS',
  'B.Pharm',
  'LLB (Bachelor of Law)',
  'B.Ed',
  'B.Des',
  'B.Arch',
  'Other (Specify below)',
];

export const POSTGRADUATE_COURSES = [
  'MCA',
  'M.Com',
  'MBA',
  'M.Tech / M.E.',
  'M.Sc.',
  'M.A.',
  'MD / MS',
  'M.Pharm',
  'LLM (Master of Law)',
  'M.Ed',
  'M.Des',
  'CA (Chartered Accountant)',
  'CS (Company Secretary)',
  'ICWA',
  'Other (Specify below)',
];

export const DIPLOMA_COURSES = [
  'Diploma in Computer Engineering',
  'Diploma in Mechanical',
  'Diploma in Electrical',
  'Diploma in Civil',
  'Diploma in IT',
  'Diploma in Pharmacy',
  'Other (Specify below)',
];

export const ITI_COURSES = [
  'ITI Electrician',
  'ITI Fitter',
  'ITI Computer Operator (COPA)',
  'ITI Wireman',
  'ITI Welder',
  'Other (Specify below)',
];

export const DOCTORATE_COURSES = [
  'PhD in Science',
  'PhD in Engineering',
  'PhD in Commerce / Management',
  'PhD in Arts / Literature',
  'Other (Specify below)',
];

export function getCoursesForLevel(level: string): string[] {
  switch (level) {
    case 'NotSchoolAge':
      return ['Infant / At Home (ઘરે છે - શાળાએ જવાનું શરૂ નથી કર્યું)'];
    case 'School':
      return SCHOOL_STANDARDS;
    case 'Undergraduate':
      return UNDERGRADUATE_COURSES;
    case 'Postgraduate':
      return POSTGRADUATE_COURSES;
    case 'Diploma':
      return DIPLOMA_COURSES;
    case 'ITI':
      return ITI_COURSES;
    case 'Doctorate':
      return DOCTORATE_COURSES;
    default:
      return ['Other (Specify below)'];
  }
}

export const EDUCATION_STATUSES = [
  { value: 'Studying', label: 'Currently Studying / અભ્યાસ ચાલુ' },
  { value: 'Completed', label: 'Completed / પૂર્ણ' },
  { value: 'Discontinued', label: 'Discontinued / અધૂરો' },
  { value: 'NotApplicable', label: 'Not Applicable / લાગુ નથી (Infant / બાળક)' },
];
