import { defineRoute, AppError, type BackonContext } from "@mednours/backon";
import * as service from "./cron.services";

function assertCronSecret(c: BackonContext) {
  const secret = process.env.CRON_SECRET;
  const authHeader = c.req.header("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    throw new AppError(401, "unauthorized", "Unauthorized");
  }
}

export const visitDigest = defineRoute({}, async (c) => {
  assertCronSecret(c);
  const result = await service.runVisitDigest();
  return c.json(result);
});
