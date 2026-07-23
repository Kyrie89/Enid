import {
  Pill, HeartHandshake, Building2, Home, Scale, Briefcase, Stethoscope, Siren, Sparkles,
} from "lucide-react";

export const CATEGORY_META = {
  treatment: { label: "Treatment", icon: Pill, color: "#2f6f5e" },
  support: { label: "Support Groups", icon: HeartHandshake, color: "#a8632a" },
  sober_living: { label: "Sober Living", icon: Building2, color: "#5c7a52" },
  housing: { label: "Housing & Basic Needs", icon: Home, color: "#4a5a8a" },
  legal: { label: "Legal", icon: Scale, color: "#7a4a8a" },
  employment: { label: "Employment & Benefits", icon: Briefcase, color: "#8a6a2a" },
  medical: { label: "Medical", icon: Stethoscope, color: "#2a7a8a" },
  crisis: { label: "Crisis & Safety", icon: Siren, color: "#b3413a" },
  youth_community: { label: "Youth & Community", icon: Sparkles, color: "#c24f7a" },
};

export const ISSUE_TAGS = [
  "Substance use", "Mental health", "Housing / rent", "Utilities", "Food",
  "Clothing", "Domestic violence", "Sexual assault", "Legal / court",
  "Employment", "Government benefits", "ID & documents", "Medical care",
  "Transportation", "Childcare", "Crisis / emergency", "Sober living / recovery housing",
  "Autism / developmental disability", "Youth activities", "Teen programs", "Summer / seasonal programs", "Veterans services",
  "Senior / elderly services", "Disability services", "LGBTQ+", "Immigration status",
  "Financial counseling / debt", "Pregnancy / maternal health", "Native American / tribal services",
  "Grief / loss support", "Reentry / justice-involved", "Foster care / kinship care",
];

export const BARRIER_TAGS = [
  "No insurance needed", "Medicaid accepted", "Sliding scale", "Free",
  "No ID required", "Criminal record OK", "Walk-ins welcome",
  "Appointment required", "Transportation provided", "Interpreter available",
  "Telehealth available", "Confidential location", "24/7 availability",
];

export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const DAY_SHORT = { Sunday: "Sun", Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat" };

export const STALE_MONTHS = 6;
