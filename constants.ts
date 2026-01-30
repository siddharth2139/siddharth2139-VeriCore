
import { VerificationRecord, DocBucket } from './types';

// Mock images for the dashboard simulation
const MOCK_SELFIE = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&q=80";
const MOCK_ID = "https://images.unsplash.com/photo-1626264290769-614044a83944?w=600&h=400&fit=crop&q=80";

export const INITIAL_RECORDS: VerificationRecord[] = [
  {
    id: 'KYC-88291',
    timestamp: '2024-05-20, 10:42 AM',
    customerName: 'Rahul V.',
    status: 'Approved',
    riskScore: 'Low',
    faceMatchScore: 98,
    pinMatch: true,
    documents: { 'PAN Card': { type: 'PAN Card', number: 'ABCDE1234F' } },
    idImages: { 'PAN Card': { front: MOCK_ID } },
    selfieImage: MOCK_SELFIE,
    pin: '1234',
    bucketsSatisfied: ['Tax'],
    assignee: 'Sarah L.',
    activity: [
      { action: 'Agent extracted data', time: '10:42 AM' },
      { action: 'Sarah L. claimed task', time: '10:45 AM' },
      { action: 'Sarah L. approved case', time: '10:50 AM' }
    ],
    comments: [
      { user: 'Sarah L.', text: 'Perfect Match. Verified against local database.', time: '10:50 AM' }
    ]
  },
  {
    id: 'KYC-88292',
    timestamp: '2024-05-20, 11:15 AM',
    customerName: 'Sneha K.',
    status: 'Flagged',
    riskScore: 'High',
    faceMatchScore: 45,
    pinMatch: true,
    documents: { 'Passport': { type: 'Passport', number: 'Z1234567' } },
    idImages: { 'Passport': { front: MOCK_ID } },
    selfieImage: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&q=80",
    pin: '5678',
    bucketsSatisfied: ['Identity', 'Address'],
    mismatches: ['Face mismatch detected (Selfie vs ID)'],
    assignee: 'John D.',
    activity: [
      { action: 'Agent flagged case', time: '11:15 AM' },
      { action: 'John D. claimed task', time: '11:20 AM' }
    ],
    comments: [
      { user: 'John D.', text: '@SeniorReviewer, image is clear but features differ significantly. Please advise.', time: '11:25 AM' }
    ]
  },
  {
    id: 'KYC-88293',
    timestamp: '2024-05-20, 01:30 PM',
    customerName: 'Arjun M.',
    status: 'Rejected',
    riskScore: 'High',
    faceMatchScore: 10,
    pinMatch: false,
    documents: { 'Driving License': { type: 'Driving License', number: 'DL-2012000' } },
    idImages: { 'Driving License': { front: MOCK_ID } },
    selfieImage: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&q=80",
    pin: '9012',
    bucketsSatisfied: ['Identity'],
    mismatches: ['Document Expired (2019)'],
    activity: [
      { action: 'Agent rejected case automatically', time: '01:30 PM' }
    ],
    comments: [
      { user: 'System', text: 'Auto-rejection triggered: Expiry Date validation failed.', time: '01:30 PM' }
    ]
  },
  {
    id: 'KYC-88294',
    timestamp: '2024-05-21, 09:12 AM',
    customerName: 'Priya S.',
    status: 'Approved',
    riskScore: 'Low',
    faceMatchScore: 92,
    pinMatch: true,
    documents: { 'Aadhaar Card': { type: 'Aadhaar Card', number: '1234 5678 9012' } },
    idImages: { 'Aadhaar Card': { front: MOCK_ID } },
    selfieImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&q=80",
    pin: '4421',
    bucketsSatisfied: ['Address'],
    assignee: 'Sarah L.',
    activity: [
      { action: 'Agent extracted data', time: '09:12 AM' },
      { action: 'Sarah L. claimed task', time: '09:15 AM' }
    ],
    comments: [
      { user: 'Sarah L.', text: '@Admin, this ID looks washed out, but the data matches. Overruling agent.', time: '09:20 AM' }
    ]
  },
  {
    id: 'KYC-88295',
    timestamp: '2024-05-21, 10:05 AM',
    customerName: 'Vikram R.',
    status: 'Approved',
    riskScore: 'Med',
    faceMatchScore: 86,
    pinMatch: true,
    documents: { 'Passport': { type: 'Passport', number: 'P990021' } },
    idImages: { 'Passport': { front: MOCK_ID } },
    selfieImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&q=80",
    pin: '8812',
    bucketsSatisfied: ['Identity', 'Address'],
    assignee: 'John D.',
    activity: [
      { action: 'Agent extracted data', time: '10:05 AM' },
      { action: 'John D. claimed task', time: '10:10 AM' }
    ]
  }
];

export interface DocRequirement {
  buckets: DocBucket[];
  needsBack: boolean;
}

export const DOC_CONFIG: Record<string, DocRequirement> = {
  'PAN Card': { buckets: ['Tax'], needsBack: false },
  'Passport': { buckets: ['Identity', 'Address'], needsBack: true },
  'Aadhaar Card': { buckets: ['Address'], needsBack: true },
  'Driving License': { buckets: ['Identity'], needsBack: false }
};

export const DOC_BUCKET_MAP: Record<string, DocBucket[]> = Object.fromEntries(
  Object.entries(DOC_CONFIG).map(([k, v]) => [k, v.buckets])
);

export const AVAILABLE_DOCS = Object.keys(DOC_CONFIG);
