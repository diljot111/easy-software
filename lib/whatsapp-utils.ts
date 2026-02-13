/**
 * Counts the unique variables (e.g., {{1}}, {{2}}) in a WhatsApp template.
 * @param components The JSON components array from the template.
 * @returns An object containing counts for header, body, and total variables.
 */
export function getTemplateVariableCounts(components: any[]) {
  let headerVars = 0;
  let bodyVars = 0;

  // Regex to find patterns like {{1}}, {{2}}
  const regex = /{{(\d+)}}/g;

  if (!Array.isArray(components)) {
    return { headerVars: 0, bodyVars: 0, total: 0 };
  }

  components.forEach((comp) => {
    if (comp.text) {
      // Find all matches in the text string
      const matches = comp.text.match(regex);
      
      if (matches) {
        // Use a Set so if {{1}} appears twice, it only counts as 1 variable
        const uniqueVars = new Set(matches).size;

        if (comp.type === "HEADER") {
          headerVars = uniqueVars;
        } else if (comp.type === "BODY") {
          bodyVars = uniqueVars;
        }
      }
    }
  });

  return {
    headerVars,
    bodyVars,
    total: headerVars + bodyVars,
  };
}