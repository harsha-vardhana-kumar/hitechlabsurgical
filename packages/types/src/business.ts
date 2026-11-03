/** Only approved identity lives here. Blank values require business confirmation. */
export interface BusinessProfile {
  legalName: string; tradeName: string; gstin: string; state: string; stateCode: string;
  addressLine1: string; addressLine2: string; city: string; district: string; pincode: string;
  phone1: string; phone2: string; email: string; whatsapp: string; website: string; pan: string;
}
export type PublicBusinessProfile = Pick<BusinessProfile, 'tradeName' | 'addressLine1' | 'addressLine2' | 'city' | 'district' | 'pincode' | 'phone1' | 'phone2' | 'email' | 'whatsapp' | 'website'>;
