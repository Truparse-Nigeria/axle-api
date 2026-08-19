import { HttpsProxyAgent } from "https-proxy-agent";
import { ENVIRONMENT } from "./environment";
import { logger } from "../utils/logger";
import { IS_DEVELOPMENT } from "../utils/helper";

const proxyUrl = ENVIRONMENT.PROXY.QUOTA_GUARD_URL;

export const outboundHttpsAgent =
  IS_DEVELOPMENT && proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

if (IS_DEVELOPMENT) {
  logger.info(
    outboundHttpsAgent
      ? "Outbound requests routed through QuotaGuard static proxy"
      : "QuotaGuard proxy not configured (QUOTAGUARDSTATIC_URL missing) — outbound requests go direct",
  );
}

export const outboundProxyConfig = outboundHttpsAgent
  ? { httpsAgent: outboundHttpsAgent, proxy: false as const }
  : {};
