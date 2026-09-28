"use client";

import { useEffect, useState } from "react";
import {
  persistPortalSsoFromHash,
  stripPortalSsoFromUrl,
} from "@/lib/sso";

/** Accepts a signed-in OM/BM/CM session before Hub auth redirects run. */
export default function HubSsoBootstrap() {
  const [didHandoff] = useState(() => persistPortalSsoFromHash());

  useEffect(() => {
    if (didHandoff) stripPortalSsoFromUrl();
  }, [didHandoff]);

  return null;
}
