
export type TabType = 'verification' | 'dashboard' | 'config';

export type VerificationStatus = 'Pending' | 'Approved' | 'Flagged' | 'Rejected';
export type RiskLevel = 'Low' | 'Med' | 'High';

export type DocBucket = 'Tax' | 'Identity' | 'Address';

export interface DocumentInfo {
  type: string;
  number: string;
  issueDate?: string;
  expiryDate?: string;
}

export interface ActivityLog {
  action: string;
  time: string;
}

export interface Comment {
  user: string;
  text: string;
  time: string;
}

export interface VerificationRecord {
  id: string;
  timestamp: string;
  // Global Profile (Must match across all documents)
  customerName: string;
  dob?: string;
  address?: string;
  fatherName?: string;
  motherName?: string;
  gender?: string;
  nationality?: string;
  
  // Per-Document Details
  documents: Record<string, DocumentInfo>;
  idImages: Record<string, { front: string; back?: string }>;
  
  riskScore: RiskLevel;
  pinMatch: boolean;
  faceMatchScore: number;
  status: VerificationStatus;
  selfieImage: string;
  pin: string;
  bucketsSatisfied?: DocBucket[];
  mismatches?: string[];

  // Workflow fields
  assignee?: string;
  activity?: ActivityLog[];
  comments?: Comment[];
}

export type RequiredField = 
  | 'name' 
  | 'dob' 
  | 'address' 
  | 'fatherName' 
  | 'motherName' 
  | 'gender' 
  | 'nationality' 
  | 'issueDate' 
  | 'expiryDate';

export interface PlatformSettings {
  requirePin: boolean;
  strictFaceMatch: boolean;
  autoRejectExpired: boolean;
  requiredBuckets: DocBucket[];
  requiredFields: RequiredField[];
}
