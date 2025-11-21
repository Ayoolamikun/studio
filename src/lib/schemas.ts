
import { z } from "zod";

// This schema is used on the server and the client.
export const loanApplicationSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phoneNumber: z.string().min(10, { message: "Please enter a valid phone number." }),
  typeOfService: z.enum(["Loan", "Investment", "Membership"]),
  // Ensure amount is treated as a number for validation but comes from a string input
  amountRequested: z.preprocess(
    (val) => (typeof val === "string" ? parseFloat(val) : val),
    z
      .number({
        invalid_type_error: "Please enter a valid amount.",
      })
      .positive({ message: "Amount must be positive." })
  ),
  employmentType: z.enum(["Civil Servant", "SME", "Individual"]),
  // For the client-side, this will be a FileList object
  uploadedDocumentUrl: z.any().optional(),
  preferredContactMethod: z.enum(["Phone", "Email"]),
});

export type LoanApplicationValues = z.infer<typeof loanApplicationSchema>;
