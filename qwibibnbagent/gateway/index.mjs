import { randomUUID } from "node:crypto";
import {
  CognitoIdentityProviderClient,
  DescribeUserPoolClientCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import {
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";

const REQUIRED_ENV = [
  "AWS_REGION",
  "CLIENT_ID",
  "OAUTH_SCOPE",
  "RUNTIME_URL",
  "SESSION_TABLE",
  "TOKEN_URL",
  "USER_POOL_ID",
];

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
}

const cognito = new CognitoIdentityProviderClient({});
const dynamodb = new DynamoDBClient({});
let cachedToken;

const jsonResponse = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: { "content-type": "application/json", ...headers },
  body: JSON.stringify(body),
});

const header = (headers, name) => {
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers ?? {})) {
    if (key.toLowerCase() === target && typeof value === "string") return value;
  }
  return undefined;
};

async function accessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt > now + 60) return cachedToken.value;

  const result = await cognito.send(new DescribeUserPoolClientCommand({
    UserPoolId: process.env.USER_POOL_ID,
    ClientId: process.env.CLIENT_ID,
  }));
  const secret = result.UserPoolClient?.ClientSecret;
  if (!secret) throw new Error("Cognito client secret is unavailable");

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.CLIENT_ID,
    client_secret: secret,
    scope: process.env.OAUTH_SCOPE,
  });
  const response = await fetch(process.env.TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) throw new Error(`OAuth token request failed (${response.status})`);
  const token = await response.json();
  if (typeof token.access_token !== "string") throw new Error("OAuth response omitted access_token");
  cachedToken = {
    value: token.access_token,
    expiresAt: now + Math.max(60, Number(token.expires_in ?? 3600)),
  };
  return cachedToken.value;
}

async function outerSessionFor(innerSession) {
  const result = await dynamodb.send(new GetItemCommand({
    TableName: process.env.SESSION_TABLE,
    Key: { session_id: { S: innerSession } },
    ConsistentRead: true,
  }));
  return result.Item?.outer_session?.S;
}

async function saveSession(innerSession, outerSession) {
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  await dynamodb.send(new PutItemCommand({
    TableName: process.env.SESSION_TABLE,
    Item: {
      session_id: { S: innerSession },
      outer_session: { S: outerSession },
      expires_at: { N: String(expiresAt) },
    },
  }));
}

async function deleteSession(innerSession) {
  await dynamodb.send(new DeleteItemCommand({
    TableName: process.env.SESSION_TABLE,
    Key: { session_id: { S: innerSession } },
  }));
}

export async function handler(event) {
  try {
    const method = event.requestContext?.http?.method ?? "POST";
    if (method === "OPTIONS") return { statusCode: 204, body: "" };
    if (!['POST', 'DELETE'].includes(method)) {
      return jsonResponse(405, { error: "Method not allowed" }, { allow: "POST, DELETE, OPTIONS" });
    }

    const encodedInput = event.body ?? "";
    const requestBody = event.isBase64Encoded
      ? Buffer.from(encodedInput, "base64")
      : Buffer.from(encodedInput, "utf8");
    if (requestBody.byteLength > 1024 * 1024) {
      return jsonResponse(413, { error: "MCP request exceeds 1 MiB" });
    }

    const innerSession = header(event.headers, "mcp-session-id");
    let outerSession;
    if (innerSession) {
      outerSession = await outerSessionFor(innerSession);
      if (!outerSession) return jsonResponse(404, { error: "MCP session expired or unknown" });
    } else {
      if (method !== "POST") return jsonResponse(400, { error: "mcp-session-id is required" });
      let request;
      try { request = JSON.parse(requestBody.toString("utf8")); } catch { /* runtime returns protocol error */ }
      if (request?.method !== "initialize") {
        return jsonResponse(400, { error: "Initialize MCP before using this endpoint" });
      }
      outerSession = `qwibibnb-${randomUUID()}-mcp`;
    }

    const innerHeaders = {
      "content-type": header(event.headers, "content-type") ?? "application/json",
      accept: header(event.headers, "accept") ?? "application/json, text/event-stream",
    };
    if (innerSession) innerHeaders["mcp-session-id"] = innerSession;

    const envelope = {
      v: 1,
      method,
      path: "/mcp",
      headers: innerHeaders,
      body: requestBody.toString("base64"),
    };
    const token = await accessToken();
    const runtimeResponse = await fetch(process.env.RUNTIME_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "x-amzn-bedrock-agentcore-runtime-session-id": outerSession,
      },
      body: JSON.stringify(envelope),
    });
    if (!runtimeResponse.ok) {
      return jsonResponse(502, { error: `AgentCore invocation failed (${runtimeResponse.status})` });
    }
    const result = await runtimeResponse.json();
    if (result?.v !== 1 || typeof result.status !== "number" || typeof result.body !== "string") {
      return jsonResponse(502, { error: "AgentCore returned an invalid MCP envelope" });
    }

    const returnedSession = result.headers?.["mcp-session-id"];
    if (typeof returnedSession === "string" && !innerSession) {
      await saveSession(returnedSession, outerSession);
    }
    if (method === "DELETE" && innerSession && result.status < 400) {
      await deleteSession(innerSession);
    }

    const responseHeaders = {
      "content-type": result.headers?.["content-type"] ?? "application/json",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    };
    if (typeof returnedSession === "string") responseHeaders["mcp-session-id"] = returnedSession;
    return {
      statusCode: result.status,
      headers: responseHeaders,
      body: Buffer.from(result.body, "base64").toString("utf8"),
    };
  } catch (error) {
    console.error("gateway request failed", error instanceof Error ? error.message : String(error));
    return jsonResponse(500, { error: "Gateway request failed" });
  }
}
