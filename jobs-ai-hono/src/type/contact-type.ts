import { z } from "zod";
import {
    contactStatusEnum,
    createContactMessageSchema,
    updateContactStatusSchema,
    contactMessageSchema,
} from "../schema/contact-schema";

export type ContactStatus = z.infer<typeof contactStatusEnum>;
export type CreateContactMessageRequest = z.infer<typeof createContactMessageSchema>;
export type UpdateContactStatusRequest = z.infer<typeof updateContactStatusSchema>;
export type ContactMessage = z.infer<typeof contactMessageSchema>;
