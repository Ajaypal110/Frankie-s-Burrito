const http = require("http");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

loadEnvFile(path.join(__dirname, "..", ".env"));

const PORT = process.env.PORT || 3000;
const WP_API_URL = getEnv(
  "WP_API_URL",
  "http://localhost:8883/wp-json/frankies-headless/v1/site"
);
const PUBLIC_SITE_URL = getEnv("PUBLIC_SITE_URL", "");
const WP_ORIGIN = getValidatedUrl("WP_API_URL", WP_API_URL).origin;
const PUBLIC_DIR = path.join(__dirname, "public");
const API_CACHE_TTL_MS = Number.parseInt(process.env.API_CACHE_TTL_MS || "5000", 10);
const UPSTREAM_TIMEOUT_MS = Number.parseInt(process.env.UPSTREAM_TIMEOUT_MS || "10000", 10);
const STATIC_CACHE_CONTROL = "public, max-age=31536000, immutable";
const HTML_CACHE_CONTROL = "no-store, max-age=0";
let apiCache = null;
const htmlRoutes = {
  "/": "index.html",
  "/about": "about.html",
  "/locations": "locations.html",
  "/press": "press.html",
  "/agoura-hills": "agoura-hills.html",
  "/agoura-hillsmenu": "agoura-hillsmenu.html",
  "/agoura-hills.html": "agoura-hills.html",
  "/agoura-hillsmenu.html": "agoura-hillsmenu.html",
  "/agoura.html": "agoura-hills.html",
  "/mimo": "agoura-hills.html",
  "/miamimenu": "agoura-hillsmenu.html",
  "/mimo.html": "agoura-hills.html",
  "/miamimenu.html": "agoura-hillsmenu.html",
};

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".avif": "image/avif",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

const localRouteMap = new Map([
  ["index.html", "/"],
  ["about.html", "/about"],
  ["locations.html", "/locations"],
  ["press.html", "/press"],
  ["agoura-hills.html", "/agoura-hills"],
  ["agoura-hillsmenu.html", "/agoura-hillsmenu"],
  ["agoura.html", "/agoura-hills"],
  ["mimo.html", "/agoura-hills"],
  ["miamimenu.html", "/agoura-hillsmenu"],
  ["hallandale.html", "/agoura-hills"],
  ["hallandalemenu.html", "/agoura-hillsmenu"],
]);
const TRANSPARENT_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
const proxiedWordPressPrefixes = [
  "/wp-content/",
  "/wp-includes/",
  "/wp-admin/",
];
const encoderByName = {
  br: (buffer) => zlib.brotliCompressSync(buffer),
  gzip: (buffer) => zlib.gzipSync(buffer),
};

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const envContents = fs.readFileSync(filePath, "utf8");
  for (const rawLine of envContents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1);
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function getEnv(name, fallback) {
  return process.env[name] || fallback;
}

function getValidatedUrl(name, value) {
  try {
    return new URL(value);
  } catch (error) {
    throw new Error(`${name} must be a valid absolute URL. Received: ${value}`);
  }
}

function getRequestProtocol(req) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (typeof forwardedProto === "string" && forwardedProto) {
    return forwardedProto.split(",")[0].trim();
  }

  return "http";
}

function getPublicOrigin(req) {
  if (PUBLIC_SITE_URL) {
    return getValidatedUrl("PUBLIC_SITE_URL", PUBLIC_SITE_URL).origin;
  }

  const host = req.headers["x-forwarded-host"] || req.headers.host || `localhost:${PORT}`;
  return `${getRequestProtocol(req)}://${host}`;
}

function getAbsoluteRouteUrl(routePath, req) {
  const normalizedPath = routePath && routePath !== "/" ? routePath : "/";
  return `${getPublicOrigin(req)}${normalizedPath}`;
}

function securityHeaders() {
  return {
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cross-Origin-Resource-Policy": "same-site",
  };
}

function chooseEncoding(req) {
  const acceptEncoding = String(req.headers["accept-encoding"] || "");
  if (acceptEncoding.includes("br")) {
    return "br";
  }
  if (acceptEncoding.includes("gzip")) {
    return "gzip";
  }
  return "";
}

function maybeCompress(body, req, headers) {
  const encoding = chooseEncoding(req);
  if (!encoding || body.length < 1024) {
    return body;
  }

  headers["Content-Encoding"] = encoding;
  headers.Vary = "Accept-Encoding";
  return encoderByName[encoding](body);
}

async function fetchWithTimeout(resource) {
  return fetch(resource, {
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
}

async function checkUpstreamHealth() {
  try {
    const response = await fetchWithTimeout(WP_API_URL);
    return {
      ok: response.ok,
      status: response.status,
    };
  } catch (error) {
    return {
      ok: false,
      status: 502,
      error: error.message,
    };
  }
}

function sendJson(res, statusCode, payload, extraHeaders = {}, req = null) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    ...securityHeaders(),
    ...extraHeaders,
  };
  const body = Buffer.from(JSON.stringify(payload));
  const finalBody = req ? maybeCompress(body, req, headers) : body;
  res.writeHead(statusCode, headers);
  res.end(finalBody);
}

function sendText(res, statusCode, body, extraHeaders = {}, req = null) {
  const headers = {
    "Content-Type": "text/plain; charset=utf-8",
    ...securityHeaders(),
    ...extraHeaders,
  };
  const buffer = Buffer.from(body, "utf8");
  const finalBody = req ? maybeCompress(buffer, req, headers) : buffer;
  res.writeHead(statusCode, headers);
  res.end(finalBody);
}

function notFoundHtml(routePath) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Page Not Found</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        background: #f7efd7;
        color: #17120d;
        font-family: "Courier New", Courier, monospace;
      }
      main {
        max-width: 32rem;
      }
      h1 {
        margin: 0 0 12px;
        font: 700 clamp(2.5rem, 6vw, 4rem)/0.95 Arial, Helvetica, sans-serif;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      p {
        margin: 0 0 16px;
        line-height: 1.7;
      }
      a {
        color: inherit;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>404</h1>
      <p>The page <code>${routePath}</code> was not found.</p>
      <p><a href="/">Return home</a></p>
    </main>
  </body>
</html>`;
}

function toFrontendAssetUrl(value) {
  if (typeof value !== "string" || !value) {
    return value;
  }

  if (value.startsWith(WP_ORIGIN + "/")) {
    return value.slice(WP_ORIGIN.length);
  }

  return value;
}

function rewritePayloadAssetUrls(value) {
  if (Array.isArray(value)) {
    return value.map(rewritePayloadAssetUrls);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [
        key,
        rewritePayloadAssetUrls(entryValue),
      ])
    );
  }

  return toFrontendAssetUrl(value);
}

async function getSitePayload() {
  const now = Date.now();
  if (apiCache && now - apiCache.timestamp < API_CACHE_TTL_MS) {
    return apiCache;
  }

  const response = await fetchWithTimeout(WP_API_URL);
  const body = await response.text();
  let normalizedBody = body;

  try {
    normalizedBody = JSON.stringify(
      rewritePayloadAssetUrls(JSON.parse(body))
    );
  } catch (error) {
    normalizedBody = body;
  }

  apiCache = {
    timestamp: now,
    status: response.status,
    body: normalizedBody,
  };
  return apiCache;
}

function rewriteMirroredHtml(html, initialLogoUrl = "", routePath = "", filePath = "", absoluteRouteUrl = "") {
  const cmsPendingMarkup =
    "<script>document.documentElement.setAttribute('data-cms-pending','true');</script>" +
    "<style>html[data-cms-pending='true'] main[data-main-content-parent='true']{visibility:hidden;} html[data-cms-pending='true'] body{background:#fff;} html:not([data-cms-logo-ready='true']) [id$='comp-lx95h0im'],html:not([data-cms-logo-ready='true']) [id$='comp-lx99kw0l']{visibility:hidden !important;opacity:0 !important;}#comp-ljgxfu44,#comp-ljvlssha,#comp-ljvlw6zo,#comp-ljvltvbx,#comp-ljvltn2g,#comp-ljvlswm8{display:block !important;visibility:visible !important;opacity:1 !important;height:auto !important;min-height:fit-content !important;}#comp-lz8p89zm,#comp-lz8psxby,#comp-lz8pt0qw,#comp-lz8pt7jf{display:inline-block !important;visibility:visible !important;opacity:1 !important;width:55px !important;height:77px !important;min-width:55px !important;min-height:77px !important;margin:0 12px 0 0 !important;vertical-align:middle !important;}#comp-lz8p89zm img,#comp-lz8psxby img,#comp-lz8pt0qw img,#comp-lz8pt7jf img{display:block !important;visibility:visible !important;opacity:1 !important;width:100% !important;height:100% !important;object-fit:contain !important;filter:brightness(.18) !important;}#comp-ljvltvc712,#comp-ljvltvc612,#comp-ljvltn2r14,#comp-ljvltn2r,#comp-ljvlswmt,#comp-ljvlswms{display:block !important;visibility:visible !important;opacity:1 !important;height:auto !important;min-height:fit-content !important;}#comp-ljvltvc712 p,#comp-ljvltvc612 p,#comp-ljvltn2r14 p,#comp-ljvltn2r p,#comp-ljvlswmt p,#comp-ljvlswms p{display:block !important;color:#2f160f !important;}#comp-ljvltvc612 p,#comp-ljvltn2r p,#comp-ljvlswms p{color:#7a6257 !important;}@media screen and (max-width:750px){#comp-lz8p89zm,#comp-lz8psxby,#comp-lz8pt0qw,#comp-lz8pt7jf{width:44px !important;height:62px !important;min-width:44px !important;min-height:62px !important;margin-right:8px !important;}}</style>";

  const withPendingState = html.includes("data-cms-pending")
    ? html
    : html.replace(/<\/head>/i, `${cmsPendingMarkup}</head>`);

  const rewritten = withPendingState
    .replace(
      /\.\.\/(static\.wixstatic\.com|static\.parastorage\.com|video\.wixstatic\.com|viewer-assets\.parastorage\.com|siteassets\.parastorage\.com|pages\.parastorage\.com|fallback\.wix\.com|browser\.sentry-cdn\.com)\//g,
      "https://$1/"
    )
    .replace(/http:\/\/static\.parastorage\.com/g, "https://static.parastorage.com")
    .replace(/http:\/\/static\.wixstatic\.com/g, "https://static.wixstatic.com")
    .replace(/http:\/\/video\.wixstatic\.com/g, "https://video.wixstatic.com")
    .replace(/http:\/\/browser\.sentry-cdn\.com/g, "https://browser.sentry-cdn.com");

  const logoSrc = initialLogoUrl || TRANSPARENT_PIXEL;
  const withoutInitialLogoAssets = rewritten.replace(
    /(<wow-image id="img-[^"]*(?:comp-lx95h0im|comp-lx99kw0l)"[\s\S]*?<picture>)([\s\S]*?)(<\/picture>[\s\S]*?<\/wow-image>)/gi,
    (full, start, middle, end) => {
      const cleanedStart = start
        .replace(/data-image-info="[^"]*"/gi, 'data-image-info=""')
        .replace(/data-has-ssr-src="[^"]*"/gi, 'data-has-ssr-src="false"');
      const cleared = middle
        .replace(/<source\b[^>]*srcSet="[^"]*"[^>]*>/gi, "")
        .replace(/src="[^"]*"/gi, `src="${logoSrc}"`)
        .replace(/srcSet="[^"]*"/gi, `srcSet="${logoSrc}"`);
      return `${cleanedStart}${cleared}${end}`;
    }
  );

  const wordpressLocalized = withoutInitialLogoAssets.replace(
    new RegExp(WP_ORIGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
    ""
  );

  let localized = wordpressLocalized.replace(
    /(href|src)=["']([^"']+?\.html)(#[^"']*)?["']/gi,
    (full, attr, fileName, hash = "") => {
      const cleanFileName = fileName.replace(/^\.?\//, "");
      const localPath = localRouteMap.get(cleanFileName);
      if (!localPath) {
        return full;
      }
      return `${attr}="${localPath}${hash}"`;
    }
  );

  const currentRoute =
    routePath ||
    localRouteMap.get(path.basename(filePath).toLowerCase()) ||
    "/";

  if (currentRoute) {
    const absoluteUrl = typeof absoluteRouteUrl === "string" ? absoluteRouteUrl : "";
    const canonicalUrl = absoluteUrl || currentRoute;

    localized = localized
      .replace(/<link rel="canonical" href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${canonicalUrl}"/>`)
      .replace(/<meta property="og:url" content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${canonicalUrl}"/>`)
      .replace(/"requestUrl":"https:\\\/\\\/www\.uptown66\.miami\\\/[^"]*"/g, `"requestUrl":"${canonicalUrl.replace(/\//g, "\\/")}"`)
      .replace(/"href_matches":"\/[^"]*"/g, `"href_matches":"${currentRoute}"`);
  }

  if (localized.includes("/cms-bridge.js")) {
    return localized;
  }

  return localized.replace(
    /<\/body>/i,
    '<script src="/cms-bridge.js" defer></script></body>'
  );
}

async function sendFile(filePath, req, res, routePath = "", statusCode = 200) {
  try {
    const data = await fs.promises.readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const isHtml = extension === ".html" || extension === ".htm";
    const headers = {
      "Content-Type": contentTypes[extension] || "application/octet-stream",
      ...securityHeaders(),
    };

    if (isHtml || path.basename(filePath).toLowerCase() === "cms-bridge.js") {
      headers["Cache-Control"] = HTML_CACHE_CONTROL;
    } else {
      headers["Cache-Control"] = STATIC_CACHE_CONTROL;
    }

    let body = data;
    if (isHtml) {
      let initialLogoUrl = "";
      try {
        const payload = await getSitePayload();
        const parsed = JSON.parse(payload.body);
        initialLogoUrl = parsed && parsed.settings && parsed.settings.logo_image ? parsed.settings.logo_image : "";
      } catch (error) {
        initialLogoUrl = "";
      }
      body = Buffer.from(
        rewriteMirroredHtml(
          data.toString("utf8"),
          initialLogoUrl,
          routePath,
          filePath,
          getAbsoluteRouteUrl(routePath || localRouteMap.get(path.basename(filePath).toLowerCase()) || "/", req)
        ),
        "utf8"
      );
    }

    const finalBody = maybeCompress(Buffer.isBuffer(body) ? body : Buffer.from(body), req, headers);
    res.writeHead(statusCode, headers);
    res.end(finalBody);
  } catch (error) {
    sendText(res, 404, "Not found", {}, req);
  }
}

async function proxyWordPressAsset(url, req, res) {
  try {
    const upstreamUrl = new URL(url.pathname + url.search, WP_ORIGIN);
    const upstreamResponse = await fetchWithTimeout(upstreamUrl);
    const headers = {
      ...securityHeaders(),
    };
    const contentType = upstreamResponse.headers.get("content-type");
    const cacheControl = upstreamResponse.headers.get("cache-control");

    if (contentType) {
      headers["Content-Type"] = contentType;
    }

    if (cacheControl) {
      headers["Cache-Control"] = cacheControl;
    } else {
      headers["Cache-Control"] = STATIC_CACHE_CONTROL;
    }

    const body = maybeCompress(
      Buffer.from(await upstreamResponse.arrayBuffer()),
      req,
      headers
    );
    res.writeHead(upstreamResponse.status, headers);
    res.end(body);
  } catch (error) {
    sendText(res, 502, "Unable to load WordPress asset", {}, req);
  }
}

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (
    proxiedWordPressPrefixes.some((prefix) => url.pathname.startsWith(prefix)) ||
    url.pathname === "/favicon.ico"
  ) {
    await proxyWordPressAsset(url, req, res);
    return;
  }

  if (url.pathname === "/healthz") {
    const upstream = await checkUpstreamHealth();
    const statusCode = upstream.ok ? 200 : 503;
    sendJson(
      res,
      statusCode,
      {
        ok: upstream.ok,
        service: "frankies-headless-frontend",
        publicOrigin: getPublicOrigin(req),
        wpOrigin: WP_ORIGIN,
        upstream,
      },
      { "Cache-Control": "no-store, max-age=0" },
      req
    );
    return;
  }

  if (url.pathname === "/api/site") {
    try {
      const payload = await getSitePayload();
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
        ...securityHeaders(),
      };
      const body = maybeCompress(Buffer.from(payload.body), req, headers);
      res.writeHead(payload.status, headers);
      res.end(body);
    } catch (error) {
      sendJson(
        res,
        502,
        {
          error: "Unable to reach WordPress API.",
          detail: error.message,
        },
        { "Cache-Control": "no-store, max-age=0" },
        req
      );
    }
    return;
  }

  const requestedPath = htmlRoutes[url.pathname]
    ? `/${htmlRoutes[url.pathname]}`
    : url.pathname === "/"
      ? "/index.html"
      : url.pathname;
  const safePath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const absolutePath = path.join(PUBLIC_DIR, safePath);

  if (
    absolutePath.startsWith(PUBLIC_DIR) &&
    fs.existsSync(absolutePath) &&
    fs.statSync(absolutePath).isFile()
  ) {
    await sendFile(absolutePath, req, res, url.pathname);
    return;
  }

  if (htmlRoutes[url.pathname]) {
    await sendFile(path.join(PUBLIC_DIR, htmlRoutes[url.pathname]), req, res, url.pathname);
    return;
  }

  if (!path.extname(url.pathname)) {
    const headers = {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": HTML_CACHE_CONTROL,
      ...securityHeaders(),
    };
    const body = maybeCompress(Buffer.from(notFoundHtml(url.pathname), "utf8"), req, headers);
    res.writeHead(404, headers);
    res.end(body);
    return;
  }

  sendText(res, 404, "Not found", {}, req);
}

if (require.main === module) {
  const server = http.createServer(handleRequest);
  server.listen(PORT, () => {
    console.log(`Frankies frontend running at http://localhost:${PORT}`);
    console.log(`Proxying WordPress API from ${WP_API_URL}`);
    if (!PUBLIC_SITE_URL) {
      console.log("PUBLIC_SITE_URL is not set; canonical URLs will be derived from the incoming request host.");
    }
  });
}

module.exports = {
  handleRequest,
};
