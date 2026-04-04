const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const WP_API_URL =
  process.env.WP_API_URL ||
  "http://localhost:8883/wp-json/frankies-headless/v1/site";
const WP_ORIGIN = new URL(WP_API_URL).origin;
const PUBLIC_DIR = path.join(__dirname, "public");
const API_CACHE_TTL_MS = 5000;
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

  const response = await fetch(WP_API_URL);
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

function rewriteMirroredHtml(html, initialLogoUrl = "", routePath = "", filePath = "") {
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
    const canonicalFile = currentRoute === "/" ? "index.html" : `${currentRoute.replace(/^\//, "")}.html`;
    const absoluteRouteUrl = `https://www.uptown66.miami${currentRoute}`;

    localized = localized
      .replace(/<link rel="canonical" href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${canonicalFile}"/>`)
      .replace(/<meta property="og:url" content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${absoluteRouteUrl}"/>`)
      .replace(/"requestUrl":"https:\\\/\\\/www\.uptown66\.miami\\\/[^"]*"/g, `"requestUrl":"${absoluteRouteUrl.replace(/\//g, "\\/")}"`)
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

async function sendFile(filePath, res, routePath = "") {
  try {
    const data = await fs.promises.readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const isHtml = extension === ".html" || extension === ".htm";
    const headers = {
      "Content-Type": contentTypes[extension] || "application/octet-stream",
    };

    if (isHtml || path.basename(filePath).toLowerCase() === "cms-bridge.js") {
      headers["Cache-Control"] = "no-store";
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
      body = rewriteMirroredHtml(data.toString("utf8"), initialLogoUrl, routePath, filePath);
    }

    res.writeHead(200, headers);
    res.end(body);
  } catch (error) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

async function proxyWordPressAsset(url, res) {
  try {
    const upstreamUrl = new URL(url.pathname + url.search, WP_ORIGIN);
    const upstreamResponse = await fetch(upstreamUrl);
    const headers = {};
    const contentType = upstreamResponse.headers.get("content-type");
    const cacheControl = upstreamResponse.headers.get("cache-control");

    if (contentType) {
      headers["Content-Type"] = contentType;
    }

    if (cacheControl) {
      headers["Cache-Control"] = cacheControl;
    }

    const body = Buffer.from(await upstreamResponse.arrayBuffer());
    res.writeHead(upstreamResponse.status, headers);
    res.end(body);
  } catch (error) {
    res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Unable to load WordPress asset");
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (
    proxiedWordPressPrefixes.some((prefix) => url.pathname.startsWith(prefix)) ||
    url.pathname === "/favicon.ico"
  ) {
    await proxyWordPressAsset(url, res);
    return;
  }

  if (url.pathname === "/api/site") {
    try {
      const payload = await getSitePayload();
      res.writeHead(payload.status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
      });
      res.end(payload.body);
    } catch (error) {
      res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
      res.end(
        JSON.stringify({
          error: "Unable to reach WordPress API.",
          detail: error.message,
        })
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
    await sendFile(absolutePath, res, url.pathname);
    return;
  }
  if (htmlRoutes[url.pathname] || !path.extname(url.pathname)) {
    await sendFile(path.join(PUBLIC_DIR, "index.html"), res, url.pathname);
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`Frankies frontend running at http://localhost:${PORT}`);
  console.log(`Proxying WordPress API from ${WP_API_URL}`);
});
