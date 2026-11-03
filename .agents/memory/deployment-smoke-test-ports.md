---
name: Deployment smoke-test ports
description: Automatic port mappings created during local production smoke tests
---

After stopping a temporary production smoke-test server, inspect and remove any automatically added exposed port mapping before finishing deployment configuration.

**Why:** Replit automatically added a mapping for a one-off test listener. Leaving temporary mappings behind can conflict with the single external web port used for Autoscale.

**How to apply:** Check the final `.replit` after the smoke server has stopped. Use the validated configuration replacement tool to remove temporary ports while preserving the real app's mapping.
