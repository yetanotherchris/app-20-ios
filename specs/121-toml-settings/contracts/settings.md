# Settings Contract

Import one .toml (primary), .json or .txt (legacy). UTF-8 only, optional BOM, maximum 1 MiB. Empty/comment-only documents, duplicate/unknown keys, invalid types/values and TOML 1.1 syntax fail without mutation. Syntax errors use fixed messages with no source excerpts.

Base TOML keys: apiKey string; s3 table with bucket, region, accessKeyId, secretAccessKey, endpoint strings. Tables, dotted keys, quoted keys and strings are accepted. Empty string clears; missing preserves. Nonempty bucket/region and HTTPS S3 endpoint must validate. Completeness is separate from validity.

SecretService.commitSettings(apiKey, s3?): one observable protected write. Omitted s3 retains saved destination, null clears it. readSettings/getProviderKey/getS3Config consume the same authoritative record. No new plaintext file or export.

UI: row reads “Import from TOML file”; cancellation and invalid input preserve draft; imported secrets remask; only committed complete import shows Saved. Incomplete S3 displays completion needed. Failed commit retains draft and Retry repeats the atomic import operation, including after close/reopen.
