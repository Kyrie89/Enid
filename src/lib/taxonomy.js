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

// Grouped loosely along the lines of the AIRS/211 Taxonomy of Human Services
// (the shared classification standard most 211 networks use), mainly so a
// 30+ tag picker reads as sections instead of one flat wall of buttons.
export const ISSUE_TAG_GROUPS = [
  { label: "Basic Needs", tags: ["Housing / rent", "Utilities", "Food", "Clothing", "Transportation"] },
  { label: "Health & Treatment", tags: ["Substance use", "Mental health", "Medical care", "Sober living / recovery housing", "Pregnancy / maternal health"] },
  { label: "Safety & Crisis", tags: ["Domestic violence", "Sexual assault", "Crisis / emergency", "Grief / loss support"] },
  { label: "Legal & Government", tags: ["Legal / court", "Government benefits", "ID & documents"] },
  { label: "Work & Money", tags: ["Employment", "Financial counseling / debt"] },
  { label: "Family & Youth", tags: ["Childcare", "Youth activities", "Teen programs", "Summer / seasonal programs", "Foster care / kinship care"] },
  {
    label: "Target Populations",
    tags: [
      "Autism / developmental disability", "Disability services", "Veterans services", "Senior / elderly services",
      "LGBTQ+", "Immigration status", "Native American / tribal services", "Reentry / justice-involved",
    ],
  },
];

export const ISSUE_TAGS = ISSUE_TAG_GROUPS.flatMap((g) => g.tags);

export const BARRIER_TAGS = [
  "No insurance needed", "Medicaid accepted", "Sliding scale", "Free",
  "No ID required", "Criminal record OK", "Walk-ins welcome",
  "Appointment required", "Transportation provided", "Interpreter available",
  "Telehealth available", "Confidential location", "24/7 availability",
  "Wheelchair accessible", "Spanish available",
];

// Small curated subset of BARRIER_TAGS surfaced as an always-visible
// "Important requirements" quick-filter row, so the most commonly-needed
// access questions don't require opening More Filters. Kept short (one
// row on a phone) on purpose — the full list, including these four, is
// always still one tap away under More Filters.
export const QUICK_REQUIREMENT_TAGS = [
  "Free", "Medicaid accepted", "Wheelchair accessible", "24/7 availability",
];

// Friendlier phrasing for a handful of tags that read as professional/clinical
// jargon — shown only in Client View. Staff still see the underlying tag name
// everywhere else (Edit form, filters, staff detail view), since these map
// 1:1 to the same stored values used for matching/filtering.
export const CLIENT_TAG_LABELS = {
  "Reentry / justice-involved": "Help after jail or with legal barriers",
  "Sober living / recovery housing": "A sober place to live",
  "Criminal record OK": "Criminal record accepted",
  "No insurance needed": "No insurance required",
};

export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const DAY_SHORT = { Sunday: "Sun", Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat" };

export const STALE_MONTHS = 6;
