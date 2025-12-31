import { z } from "zod";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ACCEPTED_ID_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];

// Schema for a required file upload. It's robust for both client and server-side rendering.
const fileSchema = (acceptedTypes: string[], typeName: string) => z.custom<File>((val) => {
    // On the server, we cannot validate File objects, so we pass validation.
    if (typeof window === 'undefined') return true;
    return val instanceof File;
  }, {
    message: `A valid ${typeName} file is required.`,
  }).refine((file) => file?.size <= MAX_FILE_SIZE, {
    message: `Max file size is 5MB.`,
  }).refine((file) => acceptedTypes.includes(file?.type), {
    message: `Please select a valid file type for the ${typeName}.`,
  });


export const loanApplicationSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  phoneNumber: z.string().min(10, "Please enter a valid phone number."),
  placeOfEmployment: z.string().min(2, "Place of employment is required."),
  customerType: z.enum(["BYSG", "Private Individual"], { required_error: "Please select a customer type." }),
  bvn: z.string().length(11, "BVN must be 11 digits."),
  loanAmount: z.coerce.number({ invalid_type_error: "Please enter a valid amount." }).positive("Loan amount must be positive."),
  loanDuration: z.coerce.number({ invalid_type_error: "Please enter a valid duration." }).int().positive("Duration must be at least 1 month."),
  passportPhotoUrl: fileSchema(ACCEPTED_PHOTO_TYPES, "Passport Photo"),
  idUrl: fileSchema(ACCEPTED_ID_TYPES, "ID Document"),

  // Guarantor fields are optional at the top level
  guarantorFullName: z.string().optional(),
  guarantorPhoneNumber: z.string().optional(),
  guarantorAddress: z.string().optional(),
  guarantorRelationship: z.string().optional(),

}).superRefine((data, ctx) => {
    // Conditionally require guarantor fields if customerType is "Private Individual"
    if (data.customerType === "Private Individual") {
        if (!data.guarantorFullName || data.guarantorFullName.trim().length < 2) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Guarantor's full name is required.", path: ["guarantorFullName"] });
        }
        if (!data.guarantorPhoneNumber || data.guarantorPhoneNumber.trim().length < 10) {
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
