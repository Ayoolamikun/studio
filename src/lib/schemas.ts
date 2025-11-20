
import { z } from "zod";

export const loanApplicationSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phoneNumber: z.string().min(10, { message: "Please enter a valid phone number." }),
  typeOfService: z.enum(["Loan", "Investment", "Membership"]),
  amountRequested: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Please enter a valid amount.",
  }),
  employmentType: z.enum(["Civil Servant", "SME", "Individual"]),
  uploadedDocumentUrl: z
    .any()
    .optional(),
  preferredContactMethod: z.enum(["Phone", "Email"]),
});

export type LoanApplicationValues = z.infer<typeof loanApplicationSchema>;
