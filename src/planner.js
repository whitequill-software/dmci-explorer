export function makeBrief(values) {
  return [
    "DMCI EXPLORER — MY FAMILY HOME PLAN",
    "",
    `Home size: ${values.bedrooms}`,
    `Preferred location: ${values.location.trim() || "Still exploring"}`,
    `Family priorities: ${values.priorities.join(", ") || "To be decided"}`,
    `Comfortable budget: ${values.budget.trim() || "To be discussed"}`,
    "",
    "Questions and notes:",
    values.notes.trim() || "None yet.",
    "",
    "Planning brief only. Not a reservation, inquiry submission, price quote, or financing offer.",
    "Verify project details, availability, prices, and terms with an authorized representative.",
  ].join("\n");
}
