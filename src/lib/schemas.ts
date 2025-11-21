
import { z } from "zod";

const MAX_FILE_SIZE = 5000000; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];

// This schema is used on the server and the client.
export const loanApplicationSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phoneNumber: z.string().min(10, { message: "Please enter a valid phone number." }),
  typeOfService: z.enum(["Loan", "Investment", "Membership"]),
  amountRequested: z.number({ invalid_type_error: "Please enter a valid amount." }).gt(0, { message: "Amount requested must be greater than zero." }),
  employmentType: z.enum(["Civil Servant", "SME", "Individual"]),
  // For the client-side, this will be a FileList object
  uploadedDocumentUrl: z
    .any()
    .refine((files) => files?.length >= 1 ? files?.[0] : true, "Document is required.")
    .refine((files) => files?.length >= 1 ? files?.[0]?.size <= MAX_FILE_SIZE : true, `Max file size is 5MB.`)
    .refine(
      (files) => files?.length >= 1 ? ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type) : true,
      ".jpg, .jpeg, .png, .webp and .pdf files are accepted."
    ).optional(),
  preferredContactMethod: z.enum(["Phone", "Email"]),
});

export type LoanApplicationValues = z.infer<typeof loanApplicationSchema>;
