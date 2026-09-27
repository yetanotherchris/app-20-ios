# Data Model

SettingsSnapshot: apiKey string and s3 object containing bucket, region, accessKeyId, secretAccessKey, endpoint strings. Empty strings denote absent/cleared fields.
SettingsPatch: optional apiKey and optional partial s3. Omitted fields preserve the draft. Supplied values must be strings and recognized keys.
ActiveSettings: complete protected snapshot serialized as TOML; S3 either complete or all-empty. Incomplete S3 draft never overwrites active S3.
Transitions: parse/validate → merge/validate → update masked draft → commit eligible groups in one protected write → notify active consumers. Failure retains draft and old active record. Manual edits save provider/S3 independently through the same serialized snapshot writer.
Migration: absent new record → read legacy records → serialize replacement → write replacement. Failed write keeps legacy values readable and retryable. Present new record is authoritative, including empty credentials.
