
import { z } from "zod";

const MAX_FILE_SIZE = 5000000; // 5MB
const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];

// Schema for a single file upload, checks for a FileList with at least one file.
const fileSchema = z
  .instanceof(FileList)
  .refine((files) => files?.length > 0, "A file is required.")
  .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
  .refine(
    (files) => ACCEPTED_FILE_TYPES.includes(files?.[0]?.type),
    ".jpg, .jpeg, .png, .webp and .pdf files are accepted."
  );

// Schema for an optional file upload
const optionalFileSchema = z
  .instanceof(FileList)
  .optional()
  .refine((files) => !files || files.length === 0 || (files?.[0]?.size <= MAX_FILE_SIZE), `Max file size is 5MB.`)
  .refine(
    (files) => !files || files.length === 0 || ACCEPTED_FILE_TYPES.includes(files?.[0]?.type),
    ".jpg, .jpeg, .png, .webp and .pdf files are accepted."
  );


export const loanApplicationSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phoneNumber: z.string().min(10, { message: "Please enter a valid phone number." }),
  typeOfService: z.enum(["Loan", "Investment"]),
  amountRequested: z.coerce.number({ invalid_type_error: "Please enter a valid amount." }).positive({ message: "Amount requested must be greater than zero." }),
  employmentType: z.enum(["BYSG", "Private Individual"], { required_error: "Please select a customer type." }),
  uploadedDocumentUrl: fileSchema,
  preferredContactMethod: z.enum(["Phone", "Email"]),
  // Guarantor fields
  guarantorFullName: z.string().optional(),
  guarantorPhoneNumber: z.string().optional(),
  guarantorAddress: z.string().optional(),
  guarantorEmploymentPlace: z.string().optional(),
  guarantorRelationship: z.string().optional(),
  guarantorIdUrl: optionalFileSchema,
}).superRefine((data, ctx) => {
    if (data.employmentType === "Private Individual") {
        if (!data.guarantorFullName || data.guarantorFullName.trim().length < 2) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Guarantor's full name is required.", path: ["guarantorFullName"] });
        }
        if (!data.guarantorPhoneNumber || data.guarantorPhoneNumber.trim().length < 10) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "A valid guarantor phone number is required.", path: ["guarantorPhoneNumber"] });
        }
        if (!data.guarantorAddress || data.guarantorAddress.trim().length < 5) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Guarantor's address is required.", path: ["guarantorAddress"] });
        }
        if (!data.guarantorEmploymentPlace || data.guarantorEmploymentPlace.trim().length < 2) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Guarantor's place of employment is required.", path: ["guarantorEmploymentPlace"] });
        }
        if (!data.guarantorRelationship || data.guarantorRelationship.trim().length < 2) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Relationship to guarantor is required.", path: ["guarantorRelationship"] });
        }
        // Validate guarantorIdUrl specifically for Private Individual
        const fileResult = fileSchema.safeParse(data.guarantorIdUrl);
        if (!fileResult.success) {
             ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Guarantor's ID card is required.", path: ["guarantorIdUrl"] });
        }
    }
});


export type LoanApplicationValues = z.infer<typeof loanApplicationSchema>;

    