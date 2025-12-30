
import { z } from "zod";

const MAX_FILE_SIZE = 5000000; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];

const fileSchema = z
  .any()
  .refine((files) => files?.length == 1, "A file is required.")
  .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
  .refine(
    (files) => ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type),
    ".jpg, .jpeg, .png, .webp and .pdf files are accepted."
  );

export const loanApplicationSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phoneNumber: z.string().min(10, { message: "Please enter a valid phone number." }),
  typeOfService: z.enum(["Loan", "Investment"]),
  amountRequested: z.number({ invalid_type_error: "Please enter a valid amount." }).positive({ message: "Amount requested must be greater than zero." }),
  employmentType: z.enum(["BYSG", "Private Individual"], { required_error: "Please select a customer type." }),
  uploadedDocumentUrl: fileSchema,
  preferredContactMethod: z.enum(["Phone", "Email"]),
  // Guarantor fields
  guarantorFullName: z.string().optional(),
  guarantorPhoneNumber: z.string().optional(),
  guarantorAddress: z.string().optional(),
  guarantorEmploymentPlace: z.string().optional(),
  guarantorRelationship: z.string().optional(),
  guarantorIdUrl: z.any().optional(), // Keep this optional initially
}).refine(data => {
    if (data.employmentType === "Private Individual") {
        // If employment type is Private Individual, all guarantor fields become required
        return !!data.guarantorFullName &&
               !!data.guarantorPhoneNumber &&
               !!data.guarantorAddress &&
               !!data.guarantorEmploymentPlace &&
               !!data.guarantorRelationship &&
               !!data.guarantorIdUrl; // Check if the file field has a value
    }
    return true;
}, {
    message: "All guarantor details, including ID upload, are required for Private Individuals.",
    // Point error to a relevant field if refinement fails
    path: ["guarantorFullName"], 
}).refine(data => {
    if (data.employmentType === 'Private Individual') {
        return fileSchema.safeParse(data.guarantorIdUrl).success;
    }
    return true;
}, {
    message: "Guarantor's ID is required and must be a valid file.",
    path: ['guarantorIdUrl'],
});


export type LoanApplicationValues = z.infer<typeof loanApplicationSchema>;
