
import { z } from "zod";

export const loanApplicationSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phoneNumber: z.string().min(10, { message: "Please enter a valid phone number." }),
  typeOfService: z.enum(["Loan", "Investment", "Membership"]),
  amountRequested: z.number({ invalid_type_error: "Please enter a valid amount." }).positive({ message: "Amount requested must be greater than zero." }),
  employmentType: z.enum(["BYSG", "Private Individual"], { required_error: "Please select a customer type." }),
  uploadedDocumentUrl: z.any().optional(),
  preferredContactMethod: z.enum(["Phone", "Email"]),
  // Guarantor fields
  guarantorFullName: z.string().optional(),
  guarantorPhoneNumber: z.string().optional(),
  guarantorAddress: z.string().optional(),
  guarantorEmploymentPlace: z.string().optional(),
  guarantorRelationship: z.string().optional(),
  guarantorIdUrl: z.any().optional(),
}).refine(data => {
    if (data.employmentType === "Private Individual") {
        return !!data.guarantorFullName &&
               !!data.guarantorPhoneNumber &&
               !!data.guarantorAddress &&
               !!data.guarantorEmploymentPlace &&
               !!data.guarantorRelationship &&
               (data.guarantorIdUrl instanceof File && data.guarantorIdUrl.size > 0);
    }
    return true;
}, {
    message: "Guarantor details, including ID upload, are required for Private Individuals.",
    // This path can be improved to point to a specific field if your UI library supports it.
    // For now, it will be a general form error.
    path: ["guarantorFullName"], 
});

export type LoanApplicationValues = z.infer<typeof loanApplicationSchema>;
