
import { z } from "zod";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png"];
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "application/pdf"];

const fileSchema = (types: string[]) => z
  .any()
  .refine((files) => files?.length == 1, "File is required.")
  .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
  .refine(
    (files) => types.includes(files?.[0]?.type),
    "Only .jpg, .png, and .pdf formats are supported."
  );

export const InvestmentApplicationSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters."),
  email: z.string().email("Please enter a valid email address."),
  phoneNumber: z.string().min(10, "Please enter a valid phone number."),
  country: z.string().min(2, "Please select your country."),
  
  investmentPlan: z.enum(["Gold", "Platinum"], { required_error: "Please select an investment plan." }),
  investmentAmount: z.coerce.number().min(1000, "Investment amount must be at least ₦1,000."),
  currency: z.enum(["NGN", "USD"], { required_error: "Please select a currency." }),
  expectedDuration: z.string().min(1, "Please select an expected duration."),

  govIdType: z.string().min(2, "Please select a Government ID type."),
  govIdFile: fileSchema(ALLOWED_FILE_TYPES),
  proofOfAddressFile: fileSchema(ALLOWED_FILE_TYPES),
  passportPhotoFile: fileSchema(ALLOWED_IMAGE_TYPES),

  referralCode: z.string().optional(),
  notes: z.string().optional(),

  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the Terms and Conditions." }),
  }),
  acceptPrivacy: z.literal(true, {
    errorMap: () => ({ message: "You must accept the Privacy Policy." }),
  }),
  acceptRisks: z.literal(true, {
    errorMap: () => ({ message: "You must acknowledge the investment risks." }),
  }),
});

export type InvestmentApplicationValues = z.infer<typeof InvestmentApplicationSchema>;

export const LoanApplicationSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters."),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().min(10, "Please enter a valid phone number."),
  dateOfBirth: z.string().refine((dob) => new Date(dob).toString() !== 'Invalid Date' && new Date(dob) < new Date(), { message: 'Please enter a valid date of birth.'}),
  residentialAddress: z.string().min(5, "Please enter your full residential address."),
  city: z.string().min(2, "Please enter your city."),
  country: z.string().min(2, "Please enter your country."),
  loanAmount: z.coerce.number().min(10000, "Loan amount must be at least ₦10,000."),
  loanPurpose: z.enum(["business", "education", "medical", "home", "personal", "other"], { required_error: "Please select a loan purpose." }),
  repaymentDuration: z.enum(["3", "6", "12", "18", "24"], { required_error: "Please select a repayment duration." }),
  
  // Files
  governmentIdFile: fileSchema(ALLOWED_FILE_TYPES),
  proofOfAddressFile: fileSchema(ALLOWED_FILE_TYPES),
  selfieFile: fileSchema(ALLOWED_IMAGE_TYPES),

  // Declarations
  accurateInfo: z.literal(true, {
    errorMap: () => ({ message: "You must confirm the information is accurate." }),
  }),
  termsAndConditions: z.literal(true, {
    errorMap: () => ({ message: "You must accept the Terms & Conditions." }),
  }),
  identityVerification: z.literal(true, {
    errorMap: () => ({ message: "You must consent to identity verification." }),
  }),
});

export type LoanApplicationValues = z.infer<typeof LoanApplicationSchema>;
