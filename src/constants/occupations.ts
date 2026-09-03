export interface OccupationOption {
  code: string;
  label: string;
  gujaratiLabel: string;
  displayLabel: string;
  fields: {
    key: string;
    label: string;
    placeholder?: string;
    required?: boolean;
    type?: 'text' | 'number';
  }[];
}

export const OCCUPATIONS: OccupationOption[] = [
  {
    code: 'STUDENT',
    label: 'Student',
    gujaratiLabel: 'વિદ્યાર્થી',
    displayLabel: 'Student / વિદ્યાર્થી',
    fields: [
      { key: 'school_or_college', label: 'School / College / University Name', placeholder: 'e.g. Gujarat University', required: true },
      { key: 'current_year_or_std', label: 'Current Standard / Semester', placeholder: 'e.g. 3rd Year / 6th Sem' },
    ],
  },
  {
    code: 'EMPLOYEE',
    label: 'Private / Govt Job Employee',
    gujaratiLabel: 'નોકરી / કર્મચારી',
    displayLabel: 'Employee / નોકરી',
    fields: [
      { key: 'company_name', label: 'Company / Organization Name', placeholder: 'e.g. TCS / Gov Dept', required: true },
      { key: 'designation', label: 'Designation / Job Role', placeholder: 'e.g. Senior Accountant / Officer', required: true },
      { key: 'work_location', label: 'Work City / Location', placeholder: 'e.g. Ahmedabad / SG Highway' },
      { key: 'experience_years', label: 'Experience in Years', placeholder: 'e.g. 5', type: 'number' },
    ],
  },
  {
    code: 'BUSINESS_OWNER',
    label: 'Business Owner / Entrepreneur',
    gujaratiLabel: 'વેપાર / બિઝનેસ',
    displayLabel: 'Business Owner / વેપાર',
    fields: [
      { key: 'business_name', label: 'Business / Firm Name', placeholder: 'e.g. Dabgar Enterprise', required: true },
      { key: 'business_type', label: 'Type of Business / Industry', placeholder: 'e.g. Textile / Hardware / Manufacturing' },
      { key: 'business_location', label: 'Business Location / City', placeholder: 'e.g. Nikol, Ahmedabad' },
    ],
  },
  {
    code: 'SHOP_OWNER',
    label: 'Shop Owner / Retailer',
    gujaratiLabel: 'દુકાનદાર',
    displayLabel: 'Shop Owner / દુકાનદાર',
    fields: [
      { key: 'shop_name', label: 'Shop Name', placeholder: 'e.g. Shree Ram General Store', required: true },
      { key: 'shop_type', label: 'Shop Category / Goods', placeholder: 'e.g. Grocery / Clothes / Electronics' },
      { key: 'shop_location', label: 'Shop Address / Market', placeholder: 'e.g. Main Bazar, Nikol' },
    ],
  },
  {
    code: 'PROFESSIONAL',
    label: 'Professional (Doctor, CA, Lawyer, etc.)',
    gujaratiLabel: 'પ્રોફેશનલ (ડોક્ટર, વકીલ, CA વગેરે)',
    displayLabel: 'Professional / પ્રોફેશનલ',
    fields: [
      { key: 'profession', label: 'Profession', placeholder: 'e.g. Advocate / Chartered Accountant / Doctor', required: true },
      { key: 'practice_name', label: 'Firm / Clinic / Hospital Name', placeholder: 'e.g. Dabgar Legal Associates' },
      { key: 'work_location', label: 'City / Area', placeholder: 'e.g. Ashram Road, Ahmedabad' },
    ],
  },
  {
    code: 'SELF_EMPLOYED',
    label: 'Self Employed / Artisan',
    gujaratiLabel: 'સ્વરોજગાર / કારીગર',
    displayLabel: 'Self Employed / સ્વરોજગાર',
    fields: [
      { key: 'work_description', label: 'Nature of Work / Skill', placeholder: 'e.g. Electrician / Designer / Contractor', required: true },
      { key: 'work_location', label: 'Primary Area / City', placeholder: 'e.g. Ahmedabad' },
    ],
  },
  {
    code: 'FREELANCER',
    label: 'Freelancer / Consultant',
    gujaratiLabel: 'ફ્રીલાન્સર',
    displayLabel: 'Freelancer / ફ્રીલાન્સર',
    fields: [
      { key: 'specialization', label: 'Field / Specialization', placeholder: 'e.g. Software Dev / Graphic Design', required: true },
    ],
  },
  {
    code: 'FARMER',
    label: 'Farmer / Agriculture',
    gujaratiLabel: 'ખેતી / ખેડૂત',
    displayLabel: 'Farmer / ખેડૂત',
    fields: [
      { key: 'village_or_taluka', label: 'Village / Taluka Location', placeholder: 'e.g. Dholka' },
    ],
  },
  {
    code: 'HOMEMAKER',
    label: 'Homemaker / Housewife',
    gujaratiLabel: 'ગૃહિણી',
    displayLabel: 'Homemaker / ગૃહિણી',
    fields: [],
  },
  {
    code: 'RETIRED',
    label: 'Retired',
    gujaratiLabel: 'નિવૃત્ત',
    displayLabel: 'Retired / નિવૃત્ત',
    fields: [
      { key: 'previous_organization', label: 'Retired From (Organization / Sector)', placeholder: 'e.g. Gujarat Electricity Board' },
    ],
  },
  {
    code: 'UNEMPLOYED',
    label: 'Job Seeking / Unemployed',
    gujaratiLabel: 'નોકરીની શોધમાં',
    displayLabel: 'Job Seeking / નોકરીની શોધમાં',
    fields: [],
  },
  {
    code: 'OTHER',
    label: 'Other',
    gujaratiLabel: 'અન્ય',
    displayLabel: 'Other / અન્ય',
    fields: [
      { key: 'notes', label: 'Details', placeholder: 'Please specify' },
    ],
  },
];

export function getOccupationDisplay(code?: string | null): string {
  if (!code) return '';
  const found = OCCUPATIONS.find((o) => o.code === code);
  return found ? found.displayLabel : code;
}
