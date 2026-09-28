# Provider Endpoint Contract

Settings displays API base URL with OpenRouter effective default and reset action. Normalize surrounding whitespace and trailing slashes while preserving prefixes. Accept absolute HTTPS host URLs without credentials/query/fragment; reject complete /models and /chat/completions routes with actionable errors. Append routes exactly once. Use saved key at that destination; help text makes credential reuse explicit. S3 endpoint stays separate.

Invalid edits and failed commits retain the active destination. An endpoint/key/model import activates atomically; manual endpoint change activates that endpoint's saved list. Capture key and URL per request; reject redirects before authentication can leave the destination. Scope catalog results to saved endpoint/key, cancel obsolete discovery.
