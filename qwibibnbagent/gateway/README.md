# QwibiBNB public MCP gateway

This Lambda adapts public MCP Streamable HTTP requests to the OAuth-protected AWS Bedrock AgentCore `envelope-v1` interface used by QwibiBNB mainnet.

Security boundaries:

- API Gateway permits only `POST /mcp`, `DELETE /mcp`, and CORS preflight.
- The default stage is throttled to 5 requests/second with a burst of 10.
- Request bodies are capped at 1 MiB.
- Only MCP-related request and response headers are forwarded.
- Cognito client credentials are retrieved in memory and are never returned or logged.
- MCP outer/inner session mappings expire from DynamoDB after one hour.
- The gateway exposes the seller's MCP tools; signing remains fixed inside the AgentCore runtime and is never delegated to the gateway.

Public endpoint:

`https://l6ipz8ltz1.execute-api.us-east-1.amazonaws.com/mcp`
