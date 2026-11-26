import { setupServer } from "msw/node";

// The mock API. Tests add their own handlers with server.use(...); none are shared, so each
// test states exactly which calls it expects.
export const server = setupServer();
