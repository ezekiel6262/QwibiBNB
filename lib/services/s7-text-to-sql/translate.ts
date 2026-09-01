import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-6";

function textOf(message: Anthropic.Message): string {
  const block = message.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}

export async function translateQuestionToSql(
  question: string,
  schemaDescription: string
): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    system:
      "You translate a natural language question into a single read-only PostgreSQL query " +
      "against the given schema. Respond with SQL only - no markdown fences, no explanation, " +
      "no semicolon-separated statements. The query must start with SELECT or WITH. Include " +
      "a LIMIT clause (200 or fewer rows) unless the query is a single aggregate row. Never " +
      "write INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, GRANT, CREATE, or any other " +
      "statement that modifies data or schema.",
    messages: [
      { role: "user", content: `Schema:\n${schemaDescription}\n\nQuestion: ${question}` },
    ],
  });
  return textOf(message).trim();
}
