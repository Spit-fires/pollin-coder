// Model type definition
export interface Model {
  label: string;
  value: string;
}

// Fallback models used when Pollinations API is unavailable
// These are the most reliable core models
export const FALLBACK_MODELS: Model[] = [
  { label: "OpenAI GPT-4.1 (Large)", value: "openai-large" },
  { label: "OpenAI GPT-4.1 (Standard)", value: "openai" },
  { label: "OpenAI GPT-4.1 (Fast)", value: "openai-fast" },
  { label: "Claude Sonnet 4.5", value: "claude" },
  { label: "Mistral Small 3.1", value: "mistral" },
];

// Default model when no user preference is stored
export const DEFAULT_MODEL_FALLBACK = "openai";

// Task-specific models for server-side operations
// These can be adjusted based on model performance for specific tasks
export const TASK_MODELS = {
  titleGeneration: "openai-fast", // Fast model for quick title generation
  exampleMatching: "openai-fast", // Fast model for example matching
  screenshotAnalysis: "openai", // Standard model for screenshot description
  softwareArchitecture: "qwen-coder", // Specialized model for high-quality code architecture
} as const;

export const SUGGESTED_PROMPTS = [
  {
    title: "AI chat and image generation",
    description:
      "Create a modern 3D interactive website that includes an AI chat interface and image generation capabilities. The site should have a dynamic 3D background, interactive elements, and seamless integration of AI features for both text conversations and image creation.",
  },
  {
    title: "SaaS Landing page",
    description:
      "A landing page for a SaaS business that includes a clear value proposition in a prominent hero section, concise feature overviews, testimonials, pricing, and a clear call-to-action button leading to a free trial or demo.",
  },
  {
    title: "Flashcard app",
    description:
      "Build me a flashcard app about llamas. Have some flash cards and also have the ability for users to add their own. Show one side of a card at first and reveal the answer on button click, keeping track of correct guesses to measure progress.",
  },
  {
    title: "AI Story Generator",
    description:
      "Create an app that generates a short story based on a user-provided theme or opening sentence. Include illustrations using placeholder images and allow users to save their favorite stories.",
  },
  {
    title: "Mood Tracker Dashboard",
    description:
      "Design a mood tracker where users can log their mood each day, see trends on a graph, and get motivational quotes based on their mood history.",
  },
  {
    title: "Recipe Randomizer",
    description:
      "Make a recipe app that suggests a random recipe from a curated list each time the user clicks a button. Include a shopping list generator for the selected recipe.",
  },
];
