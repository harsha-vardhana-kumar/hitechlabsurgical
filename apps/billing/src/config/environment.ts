export const environment = {
  mode: process.env.NEXT_PUBLIC_BILLING_MODE || "demo",
  apiUrl: process.env.NEXT_PUBLIC_BILLING_API_URL || "",
  currency: "INR",
  locale: "en-IN",
  timeZone: "Asia/Kolkata",
} as const;
