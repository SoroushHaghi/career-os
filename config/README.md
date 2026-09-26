# Configuration

Public schemas, defaults and examples only.

Real user values, account mappings and secrets must remain outside the public repository.

Configuration layers:
1. public schema/defaults in career-os;
2. private non-secret runtime/user config outside public Git;
3. secrets in approved runtime secret storage;
4. mutable per-run state in runtime storage.