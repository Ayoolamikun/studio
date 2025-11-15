"use client";

import { z } from "zod";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ACCEPTED_DOC_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];

export const loanApplicationSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  phoneNumber: z.string().min(10, { message: "Please enter a valid phone number." }),
  employmentPlace: z.string().min(2, { message: "Place of employment is required." }),
  bvn: z.string().length(11, { message: "BVN must be 11 digits." }),
  homeAddress: z.string().min(5, { message: "Home address is required." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  loanAmount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 10000, { message: "Please enter a valid amount (min ₦10,000)."}),
  loanDuration: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) > 0, { message: "Please enter a valid duration in months." }),
  passportPhoto: z.any()
    .refine((file) => file, "Passport photograph is required.")
    .refine((file) => file?.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (file) => ACCEPTED_PHOTO_TYPES.includes(file?.type),
      "Only .jpg, .jpeg, .png and .webp formats are supported for photos."
    ),
  idDocument: z.any()
    .refine((file) => file, "ID document is required.")
    .refine((file) => file?.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (file) => ACCEPTED_DOC_TYPES.includes(file?.type),
      "Only .jpg, .jpeg, .png, .webp and .pdf formats are supported for documents."
    ),
});

export type LoanApplicationValues = z.infer<typeof loanApplicationSchema>;


export const contactSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  message: z.string().min(10, { message: "Message must be at least 10 characters." }),
});

export type ContactValues = z.infer<typeof contactSchema>;