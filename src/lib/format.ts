function capWord(w: string): string {
  let result = "";
  let capped = false;
  for (const ch of w) {
    if (!capped && /[a-zA-Z]/.test(ch)) {
      result += ch.toUpperCase();
      capped = true;
    } else if (/[a-zA-Z]/.test(ch)) {
      result += ch.toLowerCase();
    } else {
      result += ch;
    }
  }
  return result;
}

/** Title-case a display string. Handles hyphens and leading punctuation. */
export function tc(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .split(" ")
    .map(word =>
      word.includes("-")
        ? word.split("-").map(capWord).join("-")
        : capWord(word)
    )
    .join(" ");
}
