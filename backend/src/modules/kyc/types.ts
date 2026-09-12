export type KycState =
  | 'NOT_STARTED'
  | 'AADHAAR_PENDING'
  | 'AADHAAR_VERIFIED'
  | 'SELFIE_PENDING'
  | 'PAN_PENDING'
  | 'KYC_COMPLETED'
  | 'VERIFICATION_FAILED'
  | 'VERIFICATION_REVIEW';

export interface AadhaarVerifiedAddress {
  fullAddress: string;
  house?: string;
  street?: string;
  locality?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface AadhaarVerifiedData {
  referenceId: string;
  name: string;
  aadhaarNumberMasked?: string;
  dob?: string;
  gender?: string;
  address?: AadhaarVerifiedAddress;
  verifiedAt: string;
}

export interface PanVerifiedData {
  referenceId: string;
  panNumberMasked: string;
  nameMatched: boolean;
  verifiedAt: string;
}

export interface KycRecord {
  userId: string;
  state: KycState;
  aadhaarNumberMasked?: string;
  mobileNumberMasked?: string;
  aadhaarReferenceId?: string;
  aadhaar?: AadhaarVerifiedData;
  selfieUrl?: string;
  selfieUploadedAt?: string;
  pan?: PanVerifiedData;
  panSkipped?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InitiateAadhaarInput {
  aadhaarNumber?: string;
  mobileNumber?: string;
}

export interface VerifyAadhaarInput {
  referenceId: string;
  otp?: string;
}


export interface RegisterSelfieInput {
  selfieUrl: string;
}

export interface VerifyPanInput {
  panNumber: string;
  fullName?: string;
}
