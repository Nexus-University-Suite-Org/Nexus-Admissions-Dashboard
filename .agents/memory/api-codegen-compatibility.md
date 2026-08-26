---
name: OpenAPI codegen compatibility
description: Compatibility constraint for this workspace's generated Zod validators.
---

The workspace's generated Zod validators currently target Zod 3 APIs. OpenAPI `format: email` and `type: integer` annotations can make Orval emit Zod 4-only `zod.email()` and `zod.int()` helpers, so use equivalent regex and numeric annotations when designing new contracts unless the validator dependency is upgraded.

**Why:** Code generation succeeds before the chained library typecheck, making this mismatch easy to miss until the generated package is compiled.

**How to apply:** After changing `lib/api-spec/openapi.yaml`, run codegen and the library typecheck before adding server routes or importing generated schemas.