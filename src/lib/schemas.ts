
import { z } from "zod";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ACCEPTED_ID_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];

// Check if running in a browser environment
const isBrowser = typeof window !== 'undefined';

export const loanApplicationSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  phoneNumber: z.string().min(10, "Please enter a valid phone number."),
  placeOfEmployment: z.string().min(2, "Place of employment is required."),
  customerType: z.enum(["BYSG", "Private Individual"], { required_error: "Please select a customer type." }),
  bvn: z.string().length(11, "BVN must be 11 digits."),
  loanAmount: z.coerce.number({ invalid_type_error: "Please enter a valid amount." }).positive("Loan amount must be positive."),
  loanDuration: z.coerce.number({ invalid_type_error: "Please enter a valid duration." }).int().positive("Duration must be at least 1 month."),
  
  // Define files as `any` type initially. Refinement will handle validation.
  passportPhotoUrl: z.any(),
  idUrl: z.any(),

  guarantorFullName: z.string().optional(),
  guarantorPhoneNumber: z.string().optional(),
  guarantorAddress: z.string().optional(),
  guarantorRelationship: z.string().optional(),

}).superRefine((data, ctx) => {
    // Only perform file validation in the browser
    if (!isBrowser) return;

    // --- Passport Photo Validation (always required) ---
    const passportFile = data.passportPhotoUrl;
    if (!passportFile || !(passportFile instanceof File)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Passport photograph is required.", path: ["passportPhotoUrl"] });
    } else {
        if (passportFile.size > MAX_FILE_SIZE) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Max file size is 5MB.`, path: ["passportPhotoUrl"] });
        }
        if (!ACCEPTED_PHOTO_TYPES.includes(passportFile.type)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Only image files are accepted.`, path: ["passportPhotoUrl"] });
        }
    }

    // --- ID Document Validation (always required) ---
    const idFile = data.idUrl;
    if (!idFile || !(idFile instanceof File)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "A valid ID document is required.", path: ["idUrl"] });
    } else {
        if (idFile.size > MAX_FILE_SIZE) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Max file size is 5MB.`, path: ["idUrl"] });
        }
        if (!ACCEPTED_ID_TYPES.includes(idFile.type)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Images and PDFs are accepted.`, path: ["idUrl"] });
        }
    }

    // --- Conditional Guarantor Validation ---
    if (data.customerType === "Private Individual") {
        if (!data.guarantorFullName || data.guarantorFullName.trim().length < 2) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Guarantor's full name is required.", path: ["guarantorFullName"] });
        }
        if (!data.guarantorPhoneNumber || !/^\d{10,}$/.test(data.guarantorPhoneNumber.trim())) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "A valid guarantor phone number is required.", path: ["guarantorPhoneNumber"] });
        }
        if (!data.guarantorAddress || data.guarantorAddress.trim().length < 5) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Guarantor's address is required.", path: ["guarantorAddress"] });
        }
        if (!data.guarantorRelationship || data.guarantorRelationship.trim().length < 2) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Relationship to guarantor is required.", path: ["guarantorRelationship"] });
        }
    }
});


export type LoanApplicationValues = z.infer<typeof loanApplicationSchema>;
