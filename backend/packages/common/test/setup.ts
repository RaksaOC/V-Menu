import { setSessionLookup } from "../src/index.js";

// SEC-03: these tests sign tokens for people who have no membership, so every session counts as
// current here. The real check is tested in packages/common and restaurant-service.
setSessionLookup(async (_req, user) => user.tv ?? 0);
