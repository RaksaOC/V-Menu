import type { Request, Response } from "express";

// SEC-09 demo: a deliberately unsafe line, to show the code scan fails the PR. Removed in the next commit.
export const unsafeDemo = (req: Request, res: Response) => res.json(eval(req.body.x));
