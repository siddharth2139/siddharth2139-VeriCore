
import { VerificationRecord, DocBucket } from './types';

// Mock images for the dashboard simulation
const MOCK_SELFIE_1 = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&q=80";
const MOCK_SELFIE_2 = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&q=80";
const MOCK_SELFIE_3 = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&q=80";
const MOCK_ID_PAN = "https://images.unsplash.com/photo-1626264290769-614044a83944?w=600&h=400&fit=crop&q=80";
const MOCK_ID_PASS = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&h=400&fit=crop&q=80";

export const INITIAL_RECORDS: VerificationRecord[] = [
  {
    id: 'KYC-88291',
    timestamp: '2024-05-20, 10:42 AM',
    customerName: 'RAHUL VERMA',
    dob: '12/05/1988',
    gender: 'MALE',
    fatherName: 'SURESH VERMA',
    motherName: 'LATA VERMA',
    nationality: 'INDIAN',
    address: 'H-42, SECTOR 15, GURGAON, HARYANA - 122001',
    status: 'Approved',
    riskScore: 'Low',
    faceMatchScore: 98,
    pinMatch: true,
    documents: { 
      'PAN Card': { 
        type: 'PAN Card', 
        number: 'ABCDE1234F',
        issueDate: '10/10/2015',
        expiryDate: 'N/A'
      } 
    },
    idImages: { 'PAN Card': { front: MOCK_ID_PAN } },
    selfieImage: MOCK_SELFIE_1,
    pin: '1234',
    bucketsSatisfied: ['Tax'],
    assignee: 'Sarah L.',
    activity: [
      { action: 'Agent session initialized', time: '10:42 AM' },
      { action: 'Biometric score: 98% (Match)', time: '10:43 AM' },
      { action: 'Auto-Approved (90%+ Threshold)', time: '10:44 AM' }
    ]
  },
  {
    id: 'KYC-88292',
    timestamp: '2024-05-20, 11:15 AM',
    customerName: 'SNEHA KAPOOR',
    dob: '24/09/1995',
    gender: 'FEMALE',
    fatherName: 'RAJESH KAPOOR',
    motherName: 'ANITA KAPOOR',
    nationality: 'INDIAN',
    address: 'FLAT 302, GREEN PARK APTS, SOUTH DELHI, PIN: 110016',
    status: 'Flagged',
    riskScore: 'Med',
    faceMatchScore: 82,
    pinMatch: true,
    documents: { 
      'Passport': { 
        type: 'Passport', 
        number: 'Z1234567',
        issueDate: '01/01/2020',
        expiryDate: '01/01/2030'
      } 
    },
    idImages: { 'Passport': { front: MOCK_ID_PASS } },
    selfieImage: MOCK_SELFIE_2,
    pin: '5678',
    bucketsSatisfied: ['Identity', 'Address'],
    mismatches: ['Manual Review Required: Face match in 70-90% range'],
    activity: [
      { action: 'Agent session initialized', time: '11:15 AM' },
      { action: 'Biometric score: 82%', time: '11:16 AM' },
      { action: 'Escalated to Human (70-90% range)', time: '11:17 AM' }
    ]
  },
  {
    id: 'KYC-88293',
    timestamp: '2024-05-21, 09:10 AM',
    customerName: 'VIKRAM MALHOTRA',
    dob: '15/07/1991',
    gender: 'MALE',
    fatherName: 'ANIL MALHOTRA',
    motherName: 'SUNITA MALHOTRA',
    nationality: 'INDIAN',
    address: 'C-12, ASHOK VIHAR, PHASE 1, DELHI - 110052',
    status: 'Flagged',
    riskScore: 'Med',
    faceMatchScore: 78,
    pinMatch: true,
    documents: { 
      'PAN Card': { 
        type: 'PAN Card', 
        number: 'BOPPP6290D',
        issueDate: '15/04/2011',
        expiryDate: 'N/A'
      } 
    },
    idImages: { 'PAN Card': { front: MOCK_ID_PAN } },
    selfieImage: MOCK_SELFIE_3,
    pin: '9021',
    bucketsSatisfied: ['Tax'],
    activity: [
      { action: 'Agent session initialized', time: '09:10 AM' },
      { action: 'Biometric score: 78%', time: '09:11 AM' },
      { action: 'Escalated: Manual decision required', time: '09:12 AM' }
    ]
  }
];

export interface DocRequirement {
  buckets: DocBucket[];
  needsBack: boolean;
  expectedFields: string[];
}

export const DOC_CONFIG: Record<string, DocRequirement> = {
  'PAN Card': { 
    buckets: ['Tax'], 
    needsBack: false, 
    expectedFields: ['Name', 'Father\'s Name', 'DOB', 'PAN Number'] 
  },
  'Passport': { 
    buckets: ['Identity', 'Address'], 
    needsBack: true, 
    expectedFields: ['Name', 'Passport Number', 'DOB', 'Gender', 'Address', 'Nationality'] 
  },
  'Aadhaar Card': { 
    buckets: ['Identity', 'Address'], 
    needsBack: true, 
    expectedFields: ['Name', 'Aadhaar Number', 'DOB', 'Gender', 'Address'] 
  },
  'Driving License': { 
    buckets: ['Identity', 'Address'], 
    needsBack: false, 
    expectedFields: ['Name', 'DL Number', 'DOB', 'Address'] 
  }
};

export const DOC_BUCKET_MAP: Record<string, DocBucket[]> = Object.fromEntries(
  Object.entries(DOC_CONFIG).map(([k, v]) => [k, v.buckets])
);

export const AVAILABLE_DOCS = Object.keys(DOC_CONFIG);
