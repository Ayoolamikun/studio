
import { z } from "zod";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "application/pdf"];

const fileSchema = z
  .any()
  .refine((file) => file instanceof File, "File is required.")
  .refine((file) => file?.size <= MAX_FILE_SIZE, `File size must be less than 5MB.`)
  .refine(
    (file) => ALLOWED_FILE_TYPES.includes(file?.type),
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
  govIdFile: fileSchema,
  proofOfAddressFile: fileSchema,
  passportPhotoFile: fileSchema,

  referralCode: z.string().optional(),
  notes: z.string().optional(),

  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the Terms and Conditions." }),
  }),
  acceptPrivacy: z.literal(true, {
    errorMap: () => ({ message: "You must accept the Privacy Policy." }),
  }),
  acceptRisks: z.literal(true, {
    errorMap: () => ({ message: "You must acknowledge the risks." }),
  }),
});

export type InvestmentApplicationValues = z.infer<typeof InvestmentApplicationSchema>;
