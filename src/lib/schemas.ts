"use client";

import { z } from "zod";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];

export const applicationSchema = z.object({
      fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
      email: z.string().email({ message: "Please enter a valid email address." }),
      phoneNumber: z.string().min(10, { message: "Please enter a valid phone number." }),
      typeOfService: z.enum(["Loan", "Investment", "Membership"], { required_error: "Please select a service type." }),
      amount: z.string().optional(),
      employmentType: z.enum(["Civil Servant", "SME", "Individual"]).optional(),
      document: z.any()
        .refine((file) => file?.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
        .refine(
          (file) => ACCEPTED_IMAGE_TYPES.includes(file?.type),
          "Only .jpg, .jpeg, .png, .webp and .pdf formats are supported."
        ).optional(),
      contactMethod: z.enum(["Phone", "Email"], { required_error: "Please select a preferred contact method." }),
    });

export type ApplicationValues = z.infer<typeof applicationSchema>;

export const contactSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  message: z.string().min(10, { message: "Message must be at least 10 characters." }),
});

export type ContactValues = z.infer<typeof contactSchema>;
