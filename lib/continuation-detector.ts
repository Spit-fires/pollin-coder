/**
 * Utilities for detecting incomplete LLM responses that need continuation
 */

/**
 * Check if a response appears to be incomplete and needs continuation
 * @param content - The full response content
 * @returns true if content appears incomplete
 */
export function isResponseIncomplete(content: string): boolean {
  const trimmed = content.trim();
  
  if (!trimmed) return false;

  // Check for unclosed code blocks
  const codeBlockMatches = trimmed.match(/```/g);
  if (codeBlockMatches && codeBlockMatches.length % 2 !== 0) {
    return true; // Odd number of ``` means unclosed code block
  }

  // Check for truncation indicators
  const truncationIndicators = [
    /\[\.\.\.$/,           // Ends with [...]
    /\(cont(?:inued|'d)?\)$/i, // Ends with (continued) or (cont'd)
    /…$/,                  // Ends with ellipsis character
    /\.{3,}$/,             // Ends with multiple dots
  ];
  
  if (truncationIndicators.some(pattern => pattern.test(trimmed))) {
    return true;
  }

  // Check if it ends abruptly mid-code (incomplete JSX/HTML tag)
  if (/<[a-zA-Z][^>]*$/.test(trimmed)) {
    return true; // Ends with incomplete open tag like "<div"
  }

  // Check for unbalanced brackets (but be forgiving - only flag if heavily unbalanced)
  const openBraces = (trimmed.match(/\{/g) || []).length;
  const closeBraces = (trimmed.match(/\}/g) || []).length;
  const openParens = (trimmed.match(/\(/g) || []).length;
  const closeParens = (trimmed.match(/\)/g) || []).length;
  const openBrackets = (trimmed.match(/\[/g) || []).length;
  const closeBrackets = (trimmed.match(/\]/g) || []).length;

  // Only flag if difference is > 3 (to avoid false positives from code examples)
  const braceDiff = Math.abs(openBraces - closeBraces);
  const parenDiff = Math.abs(openParens - closeParens);
  const bracketDiff = Math.abs(openBrackets - closeBrackets);

  if (braceDiff > 3 || parenDiff > 3 || bracketDiff > 3) {
    return true;
  }

  // Check if content is extremely long (>15000 chars) and doesn't end with clear completion marker
  // Raised from 7000 to reduce false positives — generated code often lacks typical prose endings
  if (trimmed.length > 15000) {
    const completionMarkers = [
      /\n```\s*$/,          // Ends with closed code block
      /\n\n(?:Hope|I hope|This|That|Let me know|Feel free|Happy to help)/i, // Common closing phrases
      /[.!?]\s*$/,          // Ends with sentence punctuation
      /export\s+default\s+/,// Has a default export (code is likely complete)
      /\);?\s*$/,           // Ends with closing paren/semicolon (common code ending)
      /\}\s*$/,             // Ends with closing brace
    ];
    
    const hasCompletionMarker = completionMarkers.some(pattern => pattern.test(trimmed));
    
    // If very long and no clear ending, likely truncated
    if (!hasCompletionMarker) {
      return true;
    }
  }

  return false;
}

/**
 * Get the appropriate continuation prompt based on content
 * @param content - The incomplete content
 * @returns Continuation prompt
 */
export function getContinuationPrompt(content: string): string {
  const trimmed = content.trim();
  
  // Check if it ends with unclosed code block
  const codeBlockMatches = trimmed.match(/```/g);
  if (codeBlockMatches && codeBlockMatches.length % 2 !== 0) {
    return "Please continue the code from where you left off.";
  }

  // Check if it's in the middle of code
  if (/<[a-zA-Z][^>]*$/.test(trimmed) || /\{[^}]*$/.test(trimmed)) {
    return "Continue from where you left off.";
  }

  // Default continuation prompt
  return "Please continue.";
}
