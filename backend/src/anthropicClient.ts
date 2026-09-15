import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | undefined;

/**
 * Lazily constructed so the backend can boot and serve every other route
 * without ANTHROPIC_API_KEY set -- only /resume-versions generation needs it.
 */
export function getAnthropicClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}
