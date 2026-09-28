"""Generate nonprivate fixtures for a disposable iOS acceptance installation."""
import argparse
import json
import tempfile
from pathlib import Path
from urllib.parse import urlsplit

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--provider-a', required=True)
parser.add_argument('--provider-b', required=True)
parser.add_argument('--output', type=Path)
args = parser.parse_args()

def endpoint(value):
    normalized = value.strip().rstrip('/')
    parsed = urlsplit(normalized)
    if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password or '?' in normalized or '#' in normalized:
        parser.error('Fixtures require credential-free HTTPS API base URLs.')
    return normalized

provider_a = endpoint(args.provider_a)
provider_b = endpoint(args.provider_b)
output = args.output or Path(tempfile.mkdtemp(prefix='spec122-native-fixtures-'))
output.mkdir(parents=True, exist_ok=True)
if any(output.iterdir()):
    parser.error('Use an empty output directory to preserve existing files.')
conversations = output / 'conversations'
conversations.mkdir()
entries = []
for identifier, title, model, provenance in [
    ('native122-provenance-a', 'Model provenance A', 'fixture/shared', {'endpoint': provider_a}),
    ('native122-legacy-auto', 'Legacy auto fixture', 'openrouter/auto', None),
    ('native122-legacy-manual', 'Legacy manual fixture', 'fixture/shared', None),
]:
    value = {'id': identifier, 'title': title, 'model': model, 'createdAt': '2026-09-28T00:00:00Z', 'updatedAt': '2026-09-28T00:00:00Z', 'draft': '', 'messages': [
        {'id': identifier + '-u', 'role': 'user', 'content': title + ' prompt', 'createdAt': '2026-09-28T00:00:00Z', 'status': 'complete'},
        {'id': identifier + '-a', 'role': 'assistant', 'content': title + ' preserved answer', 'createdAt': '2026-09-28T00:00:00Z', 'status': 'complete'},
    ]}
    if provenance is not None:
        value['selectionProvenance'] = provenance
    name = identifier + '.json'
    (conversations / name).write_text(json.dumps(value, indent=2) + '\n')
    entries.append({'id': identifier, 'fileName': name, 'title': title, 'model': model, 'updatedAt': value['updatedAt']})
(conversations / 'manifest.json').write_text(json.dumps({'version': 1, 'conversations': entries}, indent=2) + '\n')
for name, destination, key, models in [
    ('fixture-atomic.toml', provider_a, 'fixture-key', ['fixture/shared']),
    ('fixture-empty.toml', provider_b, 'fixture-key-b', []),
    ('fixture-reset.toml', '', 'fixture-key', ['openrouter/auto']),
    ('fixture-invalid.toml', 'http://invalid.example/v1', 'must-not-activate', ['bad']),
]:
    (output / name).write_text(f'endpoint = {json.dumps(destination)}\napiKey = {json.dumps(key)}\nenabledModels = {json.dumps(models)}\n')
print(output)
