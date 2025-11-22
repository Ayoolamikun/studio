
import { z } from "zod";

// This schema is used for server-side validation primarily.
// The file upload is handled separately in the server action.
export const loanApplicationSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phoneNumber: z.string().min(10, { message: "Please enter a valid phone number." }),
  typeOfService: z.enum(["Loan", "Investment", "Membership"]),
  amountRequested: z.number({ invalid_type_error: "Please enter a valid amount." }).positive({ message: "Amount requested must be greater than zero." }),
  employmentType: z.enum(["Civil Servant", "SME", "Individual"]),
  // The 'uploadedDocumentUrl' is handled in the server action and is not part of this initial data validation.
  uploadedDocumentUrl: z.any().optional(),
  preferredContactMethod: z.enum(["Phone", "Email"]),
});

export type LoanApplicationValues = z.infer<typeof loanApplicationSchema>;
