import { publicIdentity } from "./public-identity";
import type {
  BusinessProfile,
  PublicBusinessProfile,
} from "@hitech/types/business";
export const confirmedBusiness: Readonly<BusinessProfile> = Object.freeze({
  legalName: "MOSAM VENKATA LAKSHMI",
  tradeName: publicIdentity.tradeName,
  gstin: "37DBHPM6856H1Z4",
  state: "Andhra Pradesh",
  stateCode: "37",
  addressLine1: "",
  addressLine2: "",
  city: "",
  district: "",
  pincode: "",
  phone1: "8143274589",
  phone2: "8019031114",
  email: "",
  whatsapp: "",
  website: publicIdentity.website,
  pan: "",
});
/** Explicit projection: legal/tax identifiers never leak through object spreading. */
export function publicBusiness(
  b: PublicBusinessProfile,
  includeContacts = true,
): PublicBusinessProfile {
  return {
    tradeName: b.tradeName,
    website: b.website,
    addressLine1: includeContacts ? b.addressLine1 : "",
    addressLine2: includeContacts ? b.addressLine2 : "",
    city: includeContacts ? b.city : "",
    district: includeContacts ? b.district : "",
    pincode: includeContacts ? b.pincode : "",
    phone1: includeContacts ? b.phone1 : "",
    phone2: includeContacts ? b.phone2 : "",
    email: includeContacts ? b.email : "",
    whatsapp: includeContacts ? b.whatsapp : "",
  };
}
