
export type TabType = 'verification' | 'dashboard' | 'config';

export type VerificationStatus = 'Pending' | 'Approved' | 'Flagged' | 'Rejected';
export type RiskLevel = 'Low' | 'Med' | 'High';

export type DocBucket = 'Tax' | 'Identity' | 'Address';

export interface DocumentInfo {
  type: string;
  number: string;
  issueDate?: string;
  expiryDate?: string;
  // Store all fields extracted by the agent for this specific document
  rawExtractedData?: Record<string, string>;
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
  // Global Aggregated Profile (Best match across all docs)
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
  gestureMatch: boolean;
  faceMatchScore: number;
  status: VerificationStatus;
  selfieImage: string;
  performedGesture: string;
  rejectionReason?: string;
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
  requireLivenessGesture: boolean;
  strictFaceMatch: boolean;
  autoRejectExpired: boolean;
  requiredBuckets: DocBucket[];
  requiredFields: RequiredField[];
}
