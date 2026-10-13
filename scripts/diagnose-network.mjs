#!/usr/bin/env node
/**
 * Diagnose why CalendarSite does not work on a given network — typically a campus one.
 *
 * Run this from the network that fails, and from one that works, and compare. It tests each
 * layer separately so the failing one is named rather than guessed at:
 *
 *   DNS  →  TCP to :443  →  TCP to :4000  →  TLS  →  HTTP  →  CORS preflight
 *
 *   node scripts/diagnose-network.mjs
 *   node scripts/diagnose-network.mjs --host example.org --port 4000
 *
 * No dependencies. Node 18 or newer, for fetch and AbortSignal.timeout.
 */
import dns from "node:dns/promises";
import net from "node:net";
import tls from "node:tls";

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const HOST = arg("host", "couchcollective.software");
const API_PORT = Number(arg("port", "4000"));
const SITE_PORT = Number(arg("site-port", "443"));

let failures = 0;
const ok = (label, detail = "") => console.log(`  \u001b[32mPASS\u001b[0m  ${label}${detail ? ` — ${detail}` : ""}`);
const bad = (label, detail = "") => {
  failures++;
  console.log(`  \u001b[31mFAIL\u001b[0m  ${label}${detail ? ` — ${detail}` : ""}`);
};
const info = (label, detail = "") => console.log(`  \u001b[90minfo\u001b[0m  ${label}${detail ? ` — ${detail}` : ""}`);
const section = (title) => console.log(`\n${title}`);

/** TCP connect with a timeout, reporting elapsed time so slowness is visible. */
function tcp(host, port, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const started = Date.now();
    const socket = net.connect({ host, port });
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => {
      socket.destroy();
      resolve({ ok: true, ms: Date.now() - started });
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve({ ok: false, error: `timed out after ${timeoutMs}ms` });
    });
    socket.once("error", (e) => {
      socket.destroy();
      resolve({ ok: false, error: e.code ?? e.message });
    });
  });
}

function tlsInfo(host, port, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const started = Date.now();
    const socket = tls.connect({ host, port, servername: host, rejectUnauthorized: false, timeout: timeoutMs }, () => {
      const cert = socket.getPeerCertificate();
      resolve({
        ok: true,
        ms: Date.now() - started,
        protocol: socket.getProtocol(),
        authorized: socket.authorized,
        authError: socket.authorizationError ? String(socket.authorizationError) : null,
        subject: cert.subject?.CN,
        issuer: cert.issuer?.CN ?? cert.issuer?.O,
        altNames: cert.subjectaltname ?? "",
      });
      socket.end();
    });
    socket.once("timeout", () => { socket.destroy(); resolve({ ok: false, error: "timed out" }); });
    socket.once("error", (e) => { socket.destroy(); resolve({ ok: false, error: e.code ?? e.message }); });
  });
}

async function http(url, options = {}) {
  const started = Date.now();
  try {
    const r = await fetch(url, { ...options, signal: AbortSignal.timeout(12000) });
    return { ok: true, status: r.status, ms: Date.now() - started, headers: r.headers, text: await r.text() };
  } catch (e) {
    return { ok: false, error: `${e.cause?.code ?? e.name}: ${e.message}`, ms: Date.now() - started };
  }
}

(async () => {
  console.log(`CalendarSite network diagnosis`);
  console.log(`host ${HOST}, site :${SITE_PORT}, api :${API_PORT}`);
  console.log(`from ${process.platform}, ${new Date().toISOString()}`);

  // -------------------------------------------------------------------------
  section("1. DNS");
  let addresses = [];
  try {
    const a = await dns.resolve4(HOST);
    addresses = a;
    ok(`${HOST} resolves`, a.join(", "));
  } catch (e) {
    bad(`${HOST} does not resolve`, e.code);
    console.log("\n  A resolver that cannot see this name is the whole problem. Compare with a");
    console.log("  public resolver: the address should be the same from every network.");
  }
  try {
    const ns = await dns.resolveNs(HOST);
    info("authoritative nameservers", ns.slice(0, 3).join(", "));
  } catch {
    info("nameservers", "could not read (not fatal)");
  }

  // A captive portal answers DNS for everything and intercepts HTTP. If the site hostname
  // resolves to something different from the public answer, that is the signature.
  if (addresses.length > 0) {
    info("compare this address with what a phone on mobile data sees");
  }

  // -------------------------------------------------------------------------
  section(`2. TCP to ${HOST}:${SITE_PORT} (the web app)`);
  const siteTcp = await tcp(HOST, SITE_PORT);
  if (siteTcp.ok) ok(`port ${SITE_PORT} reachable`, `${siteTcp.ms}ms`);
  else bad(`port ${SITE_PORT} unreachable`, siteTcp.error);

  // -------------------------------------------------------------------------
  section(`3. TCP to ${HOST}:${API_PORT} (the API — the usual culprit)`);
  const apiTcp = await tcp(HOST, API_PORT);
  if (apiTcp.ok) {
    ok(`port ${API_PORT} reachable`, `${apiTcp.ms}ms`);
  } else {
    bad(`port ${API_PORT} unreachable`, apiTcp.error);
    console.log("");
    console.log("  This is the failure that looks like \"the site is broken\". The page loads,");
    console.log(`  so the app appears up, but every request goes to port ${API_PORT}, which this`);
    console.log("  network will not route. Many campus and corporate networks allow 80 and 443");
    console.log("  and nothing else.");
    console.log("");
    console.log("  Confirm it is the port and not the host: if section 2 passed and this failed,");
    console.log("  the host is fine and the port is the problem.");
  }

  // -------------------------------------------------------------------------
  section("4. TLS");
  for (const [label, port] of [["site", SITE_PORT], ["api", API_PORT]]) {
    const t = await tlsInfo(HOST, port);
    if (!t.ok) {
      bad(`${label} TLS`, t.error);
      continue;
    }
    if (t.authorized) {
      ok(`${label} TLS trusted`, `${t.protocol}, ${t.ms}ms`);
    } else {
      // An intercepting middlebox presents its own certificate, which is exactly what a campus
      // TLS-inspection appliance does.
      bad(`${label} certificate not trusted`, t.authError);
      info("presented by", `${t.subject} issued by ${t.issuer}`);
      info("covers", t.altNames);
      console.log("");
      console.log("  A certificate issued by something other than a public CA usually means the");
      console.log("  network is intercepting TLS. If the issuer is unfamiliar and subject matches");
      console.log("  the host, that is an inspection appliance.");
    }
  }

  // -------------------------------------------------------------------------
  section("5. HTTP");
  const siteHttp = await http(`https://${HOST}/login`);
  if (siteHttp.ok && siteHttp.status === 200) ok("site serves the sign-in page", `200 in ${siteHttp.ms}ms`);
  else if (siteHttp.ok) bad("site returned an unexpected status", String(siteHttp.status));
  else bad("site request failed", siteHttp.error);

  const apiHttp = await http(`https://${HOST}:${API_PORT}/healthz`);
  if (apiHttp.ok && apiHttp.status === 200) ok("API answers on its port", `200 in ${apiHttp.ms}ms`);
  else if (apiHttp.ok) bad("API returned an unexpected status", String(apiHttp.status));
  else bad("API request failed", apiHttp.error);

  // A captive portal is the other classic: everything "succeeds" but the body is a login page.
  if (apiHttp.ok && apiHttp.text && !apiHttp.text.includes("status")) {
    info("API body did not look like the health response — a captive portal?");
    info("first 120 characters", apiHttp.text.slice(0, 120).replace(/\s+/g, " "));
  }

  // -------------------------------------------------------------------------
  section("6. CORS preflight");
  // CORS is decided by the Origin the browser sends, which does not change with the network — so
  // this failing would mean the deployment's allowlist is wrong, not that the wifi is.
  const pre = await http(`https://${HOST}:${API_PORT}/auth/login`, {
    method: "OPTIONS",
    headers: {
      Origin: `https://${HOST}`,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type",
    },
  });
  if (!pre.ok) {
    bad("preflight could not be sent", pre.error);
  } else {
    const allow = pre.headers.get("access-control-allow-origin");
    if (allow) ok("preflight allowed", `allow-origin: ${allow}`);
    else bad("preflight has no Access-Control-Allow-Origin", `HTTP ${pre.status}`);
    console.log("");
    console.log("  Note: this is decided by the Origin header, not the network. If it fails it");
    console.log("  fails everywhere, so it is not a campus-wifi problem.");
  }

  // -------------------------------------------------------------------------
  section("Result");
  if (siteTcp.ok && !apiTcp.ok) {
    console.log("  The web app is reachable and the API port is not. This is the expected");
    console.log(`  signature of a network that blocks port ${API_PORT}.`);
    console.log("");
    console.log("  Fixing it properly means serving the API on 443, behind the same hostname as");
    console.log("  the site, instead of on its own port. Then every network that can load the");
    console.log("  page can also call the API, and the two are same-origin so CORS stops");
    console.log("  mattering at all.");
  } else if (!siteTcp.ok && !apiTcp.ok) {
    console.log("  Neither port is reachable, so this network cannot reach the host at all.");
    console.log("  Check DNS against a public resolver, then look for a captive portal.");
  } else if (siteTcp.ok && apiTcp.ok && failures === 0) {
    console.log("  Everything this script checks works from here.");
  } else {
    console.log("  Mixed results — read the failures above in order; the first one is the cause");
    console.log("  and the rest are consequences.");
  }

  process.exitCode = failures === 0 ? 0 : 1;
})();
