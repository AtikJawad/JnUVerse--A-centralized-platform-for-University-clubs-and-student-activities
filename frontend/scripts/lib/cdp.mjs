/**
 * Minimal Chrome DevTools Protocol driver — Week 9 (no dependencies; Node ≥ 22 for global WebSocket).
 *
 * Launches the installed Google Chrome headless with a throwaway profile and exposes a few page
 * helpers used by the Week 9 test scripts (screenshots, DOM text, localStorage, viewport).
 */
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launchChrome({ port = 9333 } = {}) {
  const profile = mkdtempSync(join(tmpdir(), "jnuverse-cdp-"));
  const proc = spawn(
    CHROME,
    ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"],
    { stdio: "ignore" }
  );
  let targets = [];
  for (let i = 0; i < 50 && !targets.length; i++) {
    await sleep(200);
    try {
      targets = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).filter((t) => t.type === "page");
    } catch {
      /* Chrome still starting */
    }
  }
  if (!targets.length) throw new Error("Chrome did not start");
  const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      data.error ? reject(new Error(data.error.message)) : resolve(data.result);
    } else if (data.method) {
      listeners.forEach((fn) => fn(data));
    }
  };
  // Every command times out so a stuck page (e.g. a huge full-page screenshot) fails the step instead of hanging the run
  const send = (method, params = {}, timeoutMs = 60000) =>
    new Promise((resolve, reject) => {
      const msgId = ++id;
      const timer = setTimeout(() => {
        pending.delete(msgId);
        reject(new Error(`CDP ${method} timed out after ${timeoutMs} ms`));
      }, timeoutMs);
      const done = (fn) => (value) => {
        clearTimeout(timer);
        fn(value);
      };
      pending.set(msgId, { resolve: done(resolve), reject: done(reject) });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });

  await send("Page.enable");
  await send("Runtime.enable");

  const page = {
    send,
    /** Subscribe to raw CDP events (e.g. Runtime.exceptionThrown); returns an unsubscribe function. */
    on(fn) {
      listeners.push(fn);
      return () => listeners.splice(listeners.indexOf(fn), 1);
    },
    async setViewport(width, height = 900, mobile = width < 768) {
      await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
    },
    async goto(url, settleMs = 2500) {
      const loaded = new Promise((resolve) => {
        const fn = (e) => {
          if (e.method === "Page.loadEventFired") {
            listeners.splice(listeners.indexOf(fn), 1);
            resolve();
          }
        };
        listeners.push(fn);
      });
      await send("Page.navigate", { url });
      await Promise.race([loaded, sleep(15000)]);
      await sleep(settleMs); // let React fetch data and render
    },
    async eval(expression) {
      const res = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      return res.result?.value;
    },
    async setLocalStorage(entries) {
      for (const [k, v] of Object.entries(entries)) {
        await page.eval(`localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(v)})`);
      }
    },
    async clearStorage() {
      await page.eval("localStorage.clear(); sessionStorage.clear()");
    },
    async text() {
      return page.eval("document.body.innerText");
    },
    async path() {
      return page.eval("location.pathname + location.search");
    },
    async screenshot(file, fullPage = true) {
      let clip;
      if (fullPage) {
        const { cssContentSize } = await send("Page.getLayoutMetrics");
        clip = { x: 0, y: 0, width: cssContentSize.width, height: Math.min(cssContentSize.height, 6000), scale: 1 };
      }
      const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: fullPage, ...(clip ? { clip } : {}) });
      writeFileSync(file, Buffer.from(data, "base64"));
    },
  };

  const close = async () => {
    try {
      await send("Browser.close");
    } catch {
      /* already closed */
    }
    ws.close();
    proc.kill();
  };

  return { page, close };
}
