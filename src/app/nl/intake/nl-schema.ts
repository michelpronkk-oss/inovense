import { z } from "zod";

export const nlIntakeSchema = z.object({
  fullName: z.string().min(1, "Volledige naam is verplicht"),
  company: z.string().min(1, "Bedrijfsnaam is verplicht"),
  email: z.string().email("Voer een geldig e-mailadres in"),
  website: z.string().optional(),
  serviceLane: z.enum(["Build", "Systems", "Growth", "Not sure yet"], {
    error: "Selecteer een service",
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
    { error: "Selecteer een projecttype" }
  ),
  budget: z.enum(
    [
      "Under €1,500",
      "€1,500-€3,500",
      "€3,500-€7,500",
      "€7,500-€15,000",
      "€15,000+",
    ],
    { error: "Selecteer een budgetrange" }
  ),
  timeline: z.enum(
    ["ASAP", "Within 2 weeks", "Within 1 month", "Within 2-3 months", "Flexible"],
    { error: "Selecteer een tijdlijn" }
  ),
  details: z
    .string()
    .min(20, "Vertel ons iets meer over je project (minimaal 20 tekens)"),
});

export type NlIntakeFormData = z.infer<typeof nlIntakeSchema>;
