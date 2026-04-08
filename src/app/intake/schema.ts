import { z } from "zod";

export const intakeSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  company: z.string().min(1, "Company name is required"),
  email: z.string().email("Please enter a valid email address"),
  website: z.string().optional(),
  serviceLane: z.enum(["Build", "Systems", "Growth", "Not sure yet"], {
    error: "Please select a service lane",
  }),
  projectType: z.enum(
    [
      "Website",
      "Landing page",
      "E-commerce",
      "Microsite",
      "Digital product",
      "Automation",
      "Internal system",
      "Growth support",
      "Other",
    ],
    { error: "Please select a project type" }
  ),
  budget: z.enum(
    [
      "Under €1,500",
      "€1,500-€3,500",
      "€3,500-€7,500",
      "€7,500-€15,000",
      "€15,000+",
    ],
    { error: "Please select a budget range" }
  ),
  timeline: z.enum(
    ["ASAP", "Within 2 weeks", "Within 1 month", "Within 2-3 months", "Flexible"],
    { error: "Please select a timeline" }
  ),
  details: z
    .string()
    .min(20, "Please tell us a bit more about your project (at least 20 characters)"),
});

export type IntakeFormData = z.infer<typeof intakeSchema>;
