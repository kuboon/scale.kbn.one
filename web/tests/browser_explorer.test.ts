import { assert } from "@std/assert";
import puppeteer from "puppeteer-core";
import { lightpanda } from "@lightpanda/browser";

import router from "../server/router.tsx";

function findFreePort(): number {
  const listener = Deno.listen({ port: 0, hostname: "127.0.0.1" });
  const { port } = listener.addr as Deno.NetAddr;
  listener.close();
  return port;
}

async function waitForCdp(cdpPort: number, timeoutMs = 5000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${cdpPort}/json/version`);
      if (res.ok) {
        const json = await res.json();
        return json.webSocketDebuggerUrl as string;
      }
      await res.body?.cancel();
    } catch (err) {
      lastError = err;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(
    `lightpanda CDP :${cdpPort} didn't become ready: ${lastError}`,
  );
}

/**
 * `@lightpanda/browser` downloads its binary on first use and leaves it without the executable bit
 * on some hosts (GitHub's runners among them), so the first spawn fails with `EACCES`. Mark it
 * executable and spawn again.
 */
async function serveLightpanda(port: number) {
  try {
    return await lightpanda.serve({ host: "127.0.0.1", port });
  } catch (error) {
    if (!String(error).includes("EACCES")) throw error;
    const home = Deno.env.get("HOME") ?? "";
    await Deno.chmod(`${home}/.cache/lightpanda-node/lightpanda`, 0o755);
    return await lightpanda.serve({ host: "127.0.0.1", port });
  }
}

Deno.test({
  name: "lightpanda: /history の explorer が hydrate され、ズームボタンが効く",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const cdpPort = findFreePort();
    const appPort = findFreePort();

    const lpProc = await serveLightpanda(cdpPort);

    const app = Deno.serve(
      { port: appPort, hostname: "127.0.0.1", onListen: () => {} },
      (req) => router.fetch(req),
    );

    try {
      const wsUrl = await waitForCdp(cdpPort);

      const browser = await puppeteer.connect({ browserWSEndpoint: wsUrl });
      try {
        const context = await browser.createBrowserContext();
        const page = await context.newPage();

        await page.goto(`http://127.0.0.1:${appPort}/history`);
        await page.waitForFunction("globalThis.__rmxReady === true", {
          timeout: 10_000,
        });
        await page.waitForSelector("[data-ready]", { timeout: 5_000 });

        const decade = () =>
          page.$eval(
            "[style*='--decade']",
            (el) => (el as HTMLElement).style.getPropertyValue("--decade"),
          );
        const before = await decade();
        assert(before.endsWith("px"), `--decade is set by script: ${before}`);

        await page.$eval(
          'button[data-zoom="2"]',
          (el) => (el as HTMLButtonElement).click(),
        );
        await page.waitForFunction(
          (prev: string) =>
            (document.querySelector("[style*='--decade']") as HTMLElement)
              .style.getPropertyValue("--decade") !== prev,
          { timeout: 5_000 },
          before,
        );

        const readout = await page.$eval(
          "output",
          (el) => el.textContent?.trim() ?? "",
        );
        assert(readout.endsWith("年前"), `readout: ${readout}`);

        await page.close();
        await context.close();
      } finally {
        await browser.disconnect();
      }
    } finally {
      try {
        lpProc.kill("SIGTERM");
      } catch { /* already gone */ }
      await app.shutdown();
    }
  },
});
