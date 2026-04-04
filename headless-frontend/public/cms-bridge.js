"use strict";

(function () {
  const CMS_CACHE_KEY = "frankies-cms-cache-v1";
  const CMS_CACHE_MAX_AGE_MS = 5 * 60 * 1000;
  const ROUTE_ALIASES = {
    "index.html": "/",
    "about.html": "/about",
    "locations.html": "/locations",
    "press.html": "/press",
    "agoura-hills.html": "/agoura-hills",
    "agoura-hillsmenu.html": "/agoura-hillsmenu",
    "agoura.html": "/agoura-hills",
    "mimo.html": "/agoura-hills",
    "miamimenu.html": "/agoura-hillsmenu",
  };
  const HOME_SKULL_IDS = ["comp-lz8p89zm", "comp-lz8psxby", "comp-lz8pt0qw", "comp-lz8pt7jf"];
  const HOME_TESTIMONIAL_IDS = [
    ["comp-ljvltvc712", "comp-ljvltvc612"],
    ["comp-ljvltn2r14", "comp-ljvltn2r"],
    ["comp-ljvlswmt", "comp-ljvlswms"],
  ];
  const FALLBACK_SKULL_URL =
    "https://static.wixstatic.com/media/da4e2b_88a856d8e39542a1aba400685cd3a2d0~mv2.png/v1/fill/w_55,h_77,al_c,q_85,usm_0.66_1.00_0.01,enc_auto/SKULL.png";
  let activeLogoImage = "";
  let activeLogoAlt = "Logo";
  let activeLogoReadyPromise = Promise.resolve();
  const STATIC_HOST_REWRITES = [
    ["../static.wixstatic.com/", "https://static.wixstatic.com/"],
    ["../static.parastorage.com/", "https://static.parastorage.com/"],
    ["../video.wixstatic.com/", "https://video.wixstatic.com/"],
    ["../viewer-assets.parastorage.com/", "https://viewer-assets.parastorage.com/"],
    ["../siteassets.parastorage.com/", "https://siteassets.parastorage.com/"],
    ["../pages.parastorage.com/", "https://pages.parastorage.com/"],
    ["../fallback.wix.com/", "https://fallback.wix.com/"],
    ["../browser.sentry-cdn.com/", "https://browser.sentry-cdn.com/"],
    ["../_files/", "/_files/"],
  ];

  function setLogoReadyState(isReady) {
    if (isReady) {
      document.documentElement.setAttribute("data-cms-logo-ready", "true");
      return;
    }

    document.documentElement.removeAttribute("data-cms-logo-ready");
  }

  function toParagraphHtml(text, pClass = "font_8 wixui-rich-text__text", spanClass = "wixui-rich-text__text") {
    return String(text || "")
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => `<p class="${pClass}"><span class="${spanClass}">${escapeHtml(line)}</span></p>`)
      .join("");
  }

  function decodeEntities(text) {
    const parser = document.createElement("textarea");
    parser.innerHTML = String(text || "");
    return parser.value;
  }

  function escapeHtml(text) {
    return decodeEntities(String(text))
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getAboutContent(settings) {
    const legacyParts = String(settings.about_copy || "")
      .split(/\n\n+|(?<=[.?!])\s+(?=[A-Z])/)
      .map((part) => decodeEntities(part).trim())
      .filter(Boolean);

    return {
      introLead: decodeEntities(settings.about_intro_lead || legacyParts[0] || ""),
      introFollowup: decodeEntities(settings.about_intro_followup || legacyParts[1] || ""),
      storyCopy: decodeEntities(
        settings.about_story_copy || legacyParts.slice(2).join(" ") || settings.about_copy || ""
      ),
    };
  }

  function normalizePath(value) {
    return value || "/";
  }

  function normalizeAssetUrl(url) {
    if (!url || typeof url !== "string") {
      return url;
    }

    let normalized = url.trim();

    STATIC_HOST_REWRITES.forEach(([from, to]) => {
      if (normalized.startsWith(from)) {
        normalized = `${to}${normalized.slice(from.length)}`;
      }
    });

    const localhostMatch = normalized.match(/^https?:\/\/localhost:8883(?=\/)/i);
    if (localhostMatch) {
      const currentHost = window.location.host || "";
      if (currentHost.toLowerCase() === "localhost:8883") {
        return normalized.slice(localhostMatch[0].length) || "/";
      }
      return normalized;
    }

    return normalized;
  }

  function normalizeSrcset(value) {
    if (!value || typeof value !== "string") {
      return value;
    }

    return value
      .split(",")
      .map((candidate) => {
        const trimmed = candidate.trim();
        if (!trimmed) {
          return trimmed;
        }

        const parts = trimmed.split(/\s+/);
        parts[0] = normalizeAssetUrl(parts[0]);
        return parts.join(" ");
      })
      .join(", ");
  }

  function normalizeDocumentAssetUrls(root = document) {
    root.querySelectorAll("img[src], source[srcset], video[src]").forEach((node) => {
      if (node.hasAttribute("src")) {
        const currentSrc = node.getAttribute("src");
        const normalizedSrc = normalizeAssetUrl(currentSrc);
        if (normalizedSrc && normalizedSrc !== currentSrc) {
          node.setAttribute("src", normalizedSrc);
        }
      }

      if (node.hasAttribute("srcset")) {
        const currentSrcset = node.getAttribute("srcset");
        const normalizedSrcset = normalizeSrcset(currentSrcset);
        if (normalizedSrcset && normalizedSrcset !== currentSrcset) {
          node.setAttribute("srcset", normalizedSrcset);
        }
      }
    });

    root.querySelectorAll("a[href], link[href], script[src]").forEach((node) => {
      const attributeName = node.hasAttribute("href") ? "href" : "src";
      const currentValue = node.getAttribute(attributeName);
      const normalizedValue = normalizeAssetUrl(currentValue);

      if (normalizedValue && normalizedValue !== currentValue) {
        node.setAttribute(attributeName, normalizedValue);
      }
    });
  }

  function setInnerHtml(id, html) {
    const node = document.getElementById(id);
    if (node) {
      node.innerHTML = html;
    }
  }

  function setTextEffectsMatrix(id, text) {
    const node = document.getElementById(id);
    if (!node || !text) {
      return;
    }
    const safe = escapeHtml(text);
    node.innerHTML = `<p data-testid="TextEffectsMatrix-container"><span class="RnSmmj YfwJR1 za31B4 HUb06w" data-testid="text-effects-shared-pattern-unit" data-text="${safe}"><span class="UsRQwP v7hKvY" data-testid="TextEffectsMatrix-text">${safe}</span></span></p>`;
  }

  function setTextBlock(id, text, tagName, className) {
    if (!text) {
      return;
    }
    setInnerHtml(
      id,
      `<${tagName} class="${className}"><span class="wixui-rich-text__text">${escapeHtml(text)}</span></${tagName}>`
    );
  }

  function setLinkTextBlock(id, text, href, tagName, className) {
    if (!text || !href) {
      return;
    }
    setInnerHtml(
      id,
      `<${tagName} class="${className}"><a href="${escapeHtml(href)}" target="_self" class="wixui-rich-text__text">${escapeHtml(text)}</a></${tagName}>`
    );
  }

  function setRichLink(id, label, href) {
    if (!label || !href) {
      return;
    }
    setInnerHtml(
      id,
      `<p class="font_7 wixui-rich-text__text"><span class="wixui-rich-text__text"><a href="${escapeHtml(
        href
      )}" target="_blank" rel="noreferrer noopener" class="wixui-rich-text__text">${escapeHtml(label)}</a></span></p>`
    );
  }

  function setAnchorHref(id, href, target) {
    const root = document.getElementById(id);
    if (!root || !href) {
      return;
    }

    const linkNode = root.matches("a, [data-testid='linkElement']")
      ? root
      : root.querySelector("a, [data-testid='linkElement']");

    if (!linkNode) {
      return;
    }

    if (linkNode.tagName === "A") {
      linkNode.href = href;
      if (target) {
        linkNode.target = target;
      }
      return;
    }

    linkNode.setAttribute("data-cms-href", href);
    linkNode.setAttribute("role", "link");
    if (target) {
      linkNode.setAttribute("data-cms-target", target);
    }
    if (!linkNode.hasAttribute("tabindex")) {
      linkNode.tabIndex = 0;
    }

    if (linkNode.dataset.cmsLinkBound === "true") {
      return;
    }

    const navigate = () => {
      const nextHref = linkNode.getAttribute("data-cms-href");
      const nextTarget = linkNode.getAttribute("data-cms-target");
      if (!nextHref) {
        return;
      }
      if (nextTarget && nextTarget !== "_self") {
        window.open(nextHref, nextTarget, "noopener");
        return;
      }
      window.location.assign(nextHref);
    };

    linkNode.addEventListener("click", navigate);
    linkNode.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        navigate();
      }
    });
    linkNode.dataset.cmsLinkBound = "true";
  }

  function forceVisible(node, display = "block") {
    if (!node) {
      return;
    }

    node.hidden = false;
    node.removeAttribute("hidden");
    node.style.display = display;
    node.style.visibility = "visible";
    node.style.opacity = "1";
  }

  function hideNodeById(id) {
    const node = document.getElementById(id);
    if (!node) {
      return;
    }

    node.style.display = "none";
    node.style.visibility = "hidden";
    node.style.opacity = "0";
  }

  function setButtonLabel(id, label) {
    const root = document.getElementById(id);
    const labelNode = root && root.querySelector(".w4Vxx6");
    if (labelNode && label) {
      labelNode.textContent = label;
    }
  }

  function setImage(id, src) {
    const root = document.getElementById(id);
    const img = root && root.querySelector("img");
    const wowImage = root && root.querySelector("wow-image");
    const normalizedSrc = normalizeAssetUrl(src);
    if (img && normalizedSrc) {
      if (wowImage) {
        wowImage.removeAttribute("data-image-info");
        wowImage.dataset.imageInfo = "";
      }
      root.querySelectorAll("source").forEach((source) => source.remove());

      img.src = normalizedSrc;
      img.srcset = "";
      img.removeAttribute("srcset");
      img.removeAttribute("srcSet");
      img.removeAttribute("sizes");
      img.setAttribute("data-load-done", "");
      img.style.opacity = "1";
      img.style.display = "block";

      root.style.opacity = "1";
      root.removeAttribute("hidden");
      if (wowImage && typeof wowImage.reLayout === "function") {
        requestAnimationFrame(() => wowImage.reLayout());
      }
    }
  }

  function setImages(ids, src) {
    (ids || []).forEach((id) => setImage(id, src));
  }

  function setImageWithFallback(id, src, fallbackSrc, altText) {
    const normalizedPrimarySrc = normalizeAssetUrl(src);
    const normalizedFallbackSrc = normalizeAssetUrl(fallbackSrc);

    setImage(id, normalizedPrimarySrc || normalizedFallbackSrc);

    const root = document.getElementById(id);
    const img = root && root.querySelector("img");
    if (!root || !img) {
      return;
    }

    forceVisible(root);
    forceVisible(root.closest(".wixui-box"));

    img.alt = altText || img.alt || "Skull icon";
    img.style.objectFit = "contain";
    img.style.objectPosition = "center center";
    img.style.filter = "brightness(0.18)";

    if (normalizedFallbackSrc) {
      img.addEventListener(
        "error",
        () => {
          if (img.src !== normalizedFallbackSrc) {
            img.src = normalizedFallbackSrc;
          }
        },
        { once: true }
      );
    }
  }

  function fitLogoImage(root, img, idSuffix) {
    if (!root || !img) {
      return;
    }

    const applyFit = () => {
      if (img.naturalWidth && img.naturalHeight) {
        root.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
      }

      root.style.overflow = "visible";
      root.style.maxWidth = "none";

      if (idSuffix === "comp-lx95h0im") {
        root.style.width = "11%";
        root.style.minWidth = "148px";
        root.style.maxWidth = "280px";
      } else if (idSuffix === "comp-lx99kw0l") {
        root.style.width = "18%";
        root.style.minWidth = "132px";
        root.style.maxWidth = "300px";
      }

      const link = root.querySelector("a");
      const wowImage = root.querySelector("wow-image");
      const picture = root.querySelector("picture");

      if (link) {
        link.style.display = "block";
        link.style.width = "100%";
        link.style.height = "100%";
      }

      if (wowImage) {
        wowImage.style.display = "block";
        wowImage.style.width = "100%";
        wowImage.style.height = "100%";
        wowImage.style.overflow = "visible";
      }

      if (picture) {
        picture.style.display = "block";
        picture.style.width = "100%";
        picture.style.height = "100%";
      }

      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "contain";
      img.style.objectPosition = "center center";
    };

    if (img.complete) {
      applyFit();
    } else {
      img.addEventListener("load", applyFit, { once: true });
    }
  }

  function setImagesBySuffix(idSuffix, src, altText) {
    const normalizedSrc = normalizeAssetUrl(src);
    if (!normalizedSrc) {
      return;
    }

    document.querySelectorAll(`[id$='${idSuffix}']`).forEach((root) => {
      const img = root.querySelector("img");
      if (!img) {
        return;
      }
      img.src = normalizedSrc;
      img.srcset = "";
      root.querySelectorAll("source").forEach((source) => {
        source.srcset = "";
        source.removeAttribute("srcset");
        source.removeAttribute("srcSet");
      });
      if (typeof altText === "string") {
        img.alt = altText;
      }
      img.setAttribute("data-cms-logo-src", normalizedSrc);
      fitLogoImage(root, img, idSuffix);
    });
  }

  function enforceLogoOverride() {
    if (!activeLogoImage) {
      return;
    }

    setImagesBySuffix("comp-lx95h0im", activeLogoImage, activeLogoAlt);
    setImagesBySuffix("comp-lx99kw0l", activeLogoImage, activeLogoAlt);
  }

  function scheduleLogoEnforcement() {
    [0, 120, 400, 1000].forEach((delay) => {
      window.setTimeout(enforceLogoOverride, delay);
    });
  }

  function buildMenuPageMarkup(pageTitle, brandTitle, locationLine, sections) {
    const sectionHtml = (sections || [])
      .map((section) => {
        const itemsHtml = (section.items || [])
          .map((item) => {
            const price = item.price
              ? `<span style="font-weight:700;white-space:nowrap;">${escapeHtml(item.price)}</span>`
              : "";
            const description = item.description
              ? `<p style="margin:6px 0 0;color:#5c4b43;line-height:1.6;">${escapeHtml(item.description)}</p>`
              : "";

            return `<article style="padding:14px 0;border-top:1px solid rgba(60,32,19,.12);"><div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;"><h3 style="margin:0;font-size:20px;letter-spacing:.04em;text-transform:uppercase;">${escapeHtml(item.name || "")}</h3>${price}</div>${description}</article>`;
          })
          .join("");

        return `<section style="margin-top:32px;"><h2 style="margin:0 0 12px;font-size:28px;letter-spacing:.06em;text-transform:uppercase;">${escapeHtml(section.title || "")}</h2>${itemsHtml}</section>`;
      })
      .join("");

    return `<section style="max-width:980px;margin:0 auto;padding:48px 24px 72px;color:#2f160f;"><p style="margin:0 0 12px;font-size:14px;letter-spacing:.22em;text-transform:uppercase;">${escapeHtml(brandTitle || "")}</p><h1 style="margin:0;font-size:52px;line-height:1;letter-spacing:.08em;text-transform:uppercase;">${escapeHtml(pageTitle || "")}</h1><p style="margin:16px 0 0;font-size:16px;line-height:1.7;color:#5c4b43;">${escapeHtml(locationLine || "")}</p>${sectionHtml}</section>`;
  }

  function buildAgouraMenuPageMarkup(pageTitle, brandTitle, locationLine, images, sections) {
    const imageMarkup = (images || [])
      .filter(Boolean)
      .map(
        (src, index) =>
          `<figure style="margin:0;"><img src="${escapeHtml(
            normalizeAssetUrl(src) || src
          )}" alt="Agoura Hills menu image ${index + 1}" style="display:block;width:100%;height:100%;min-height:220px;object-fit:cover;border-radius:18px;"></figure>`
      )
      .join("");

    const galleryMarkup = imageMarkup
      ? `<section style="margin-top:32px;display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;">${imageMarkup}</section>`
      : "";

    const sectionHtml = (sections || [])
      .map((section) => {
        const itemsHtml = (section.items || [])
          .map((item) => {
            const price = item.price
              ? `<span style="font-weight:700;white-space:nowrap;">${escapeHtml(item.price)}</span>`
              : "";
            const description = item.description
              ? `<p style="margin:6px 0 0;color:#5c4b43;line-height:1.6;">${escapeHtml(item.description)}</p>`
              : "";

            return `<article style="padding:14px 0;border-top:1px solid rgba(60,32,19,.12);"><div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;"><h3 style="margin:0;font-size:20px;letter-spacing:.04em;text-transform:uppercase;">${escapeHtml(
              item.name || ""
            )}</h3>${price}</div>${description}</article>`;
          })
          .join("");

        if (!itemsHtml) {
          return "";
        }

        return `<section style="margin-top:32px;"><h2 style="margin:0 0 12px;font-size:28px;letter-spacing:.06em;text-transform:uppercase;">${escapeHtml(
          section.title || ""
        )}</h2>${itemsHtml}</section>`;
      })
      .join("");

    return `<section style="max-width:1080px;margin:0 auto;padding:48px 24px 72px;color:#2f160f;"><p style="margin:0 0 12px;font-size:14px;letter-spacing:.22em;text-transform:uppercase;">${escapeHtml(
      brandTitle || ""
    )}</p><h1 style="margin:0;font-size:52px;line-height:1;letter-spacing:.08em;text-transform:uppercase;">${escapeHtml(
      pageTitle || ""
    )}</h1><p style="margin:16px 0 0;font-size:16px;line-height:1.7;color:#5c4b43;">${escapeHtml(
      locationLine || ""
    )}</p>${galleryMarkup}${sectionHtml}</section>`;
  }

  function rewriteInternalLinks() {
    document.querySelectorAll("a[href]").forEach((anchor) => {
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#")) {
        return;
      }
      const [pathPart, hash = ""] = href.split("#");
      const normalized = pathPart.replace(/^\.?\//, "");
      const localPath = ROUTE_ALIASES[normalized];
      if (!localPath) {
        return;
      }
      anchor.setAttribute("href", `${localPath}${hash ? `#${hash}` : ""}`);
    });

    normalizeDocumentAssetUrls();
  }

  function pruneHallandaleNavigation() {
    document.querySelectorAll(".wixui-vertical-menu__item, [data-testid='itemWrapper']").forEach((node) => {
      const text = (node.textContent || "").trim().toLowerCase();
      const link = node.querySelector("a[href]");
      const href = (link && link.getAttribute("href")) || "";

      if (text === "hallandale" || href.includes("hallandale")) {
        node.style.display = "none";
        node.style.visibility = "hidden";
        node.style.opacity = "0";
      }
    });
  }

  function applyRawMainMarkup(markup) {
    const main = document.querySelector("main[data-main-content-parent='true']");
    if (!main || !markup) {
      return false;
    }
    main.innerHTML = markup;
    rewriteInternalLinks();
    return true;
  }

  function buildHomeTestimonialsMarkup(testimonials) {
    const items = (testimonials || [])
      .slice(0, 3)
      .map((item) => {
        const quote = escapeHtml(item && item.quote ? item.quote : "");
        const author = escapeHtml(
          (item && (item.author || item.title)) ? item.author || item.title : ""
        );

        return `<article style="padding:20px 0;border-top:1px solid rgba(60,32,19,.12);"><p style="margin:0 0 10px;font-size:18px;line-height:1.75;color:#2f160f;">&quot;${quote}&quot;</p><p style="margin:0;font-size:14px;letter-spacing:.08em;text-transform:uppercase;color:#7a6257;">- ${author}</p></article>`;
      })
      .join("");

    if (!items) {
      return "";
    }

    return `<section data-cms-home-testimonials="true" style="max-width:980px;margin:0 auto;padding:48px 24px 72px;color:#2f160f;"><h2 style="margin:0 0 18px;font-size:32px;letter-spacing:.08em;text-transform:uppercase;">TABLE TALK</h2>${items}</section>`;
  }

  function buildReferenceSkullRowMarkup(skullSrc) {
    const normalizedSrc = normalizeAssetUrl(skullSrc || FALLBACK_SKULL_URL) || FALLBACK_SKULL_URL;
    return `<div data-cms-skull-row="true" style="display:flex;justify-content:center;align-items:center;gap:24px;flex-wrap:wrap;margin:18px 0 24px;">${new Array(4)
      .fill("")
      .map(
        () =>
          `<img src="${escapeHtml(normalizedSrc)}" alt="Skull icon" style="display:block;width:55px;height:77px;object-fit:contain;filter:brightness(.18);">`
      )
      .join("")}</div>`;
  }

  function mountReferenceSkullRow(skullSrc) {
    const container =
      document.querySelector("#comp-ljgxfu44 > .comp-ljgxfu44-container") ||
      document.querySelector("#comp-ljgxfu44 .comp-ljgxfu44-container");

    if (!container) {
      return;
    }

    HOME_SKULL_IDS.forEach((id) => {
      const node = document.getElementById(id);
      if (node) {
        node.style.display = "none";
        node.style.visibility = "hidden";
        node.style.opacity = "0";
      }
    });

    const existing = container.querySelector("[data-cms-skull-row='true']");
    const markup = buildReferenceSkullRowMarkup(skullSrc);

    if (existing) {
      existing.outerHTML = markup;
      return;
    }

    container.insertAdjacentHTML("afterbegin", markup);
  }

  function isRendered(node) {
    if (!node) {
      return false;
    }

    const styles = window.getComputedStyle(node);
    if (
      styles.display === "none" ||
      styles.visibility === "hidden" ||
      styles.opacity === "0"
    ) {
      return false;
    }

    const rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function ensureHomeTestimonialsVisible(testimonials) {
    const quoteNodes = HOME_TESTIMONIAL_IDS.map(([quoteId]) => document.getElementById(quoteId)).filter(Boolean);
    const anyRendered = quoteNodes.some((node) => isRendered(node));

    HOME_TESTIMONIAL_IDS.forEach(([quoteId, authorId]) => {
      const quoteNode = document.getElementById(quoteId);
      const authorNode = document.getElementById(authorId);

      [quoteNode, authorNode].forEach((node) => {
        if (!node) {
          return;
        }

        forceVisible(node);
        forceVisible(node.closest(".wixui-rich-text"));
        forceVisible(node.closest(".wixui-box"));
        node.style.color = node === quoteNode ? "#2f160f" : "#7a6257";
      });
    });

    if (!anyRendered) {
      ensureHomeTestimonialsFallback(testimonials);
    }
  }

  function ensureHomeTestimonialsFallback(testimonials) {
    const main = document.querySelector("main[data-main-content-parent='true']");
    if (!main || !testimonials || !testimonials.length) {
      return;
    }

    if (document.getElementById("comp-ljvltvc712")) {
      return;
    }

    const existingFallback = main.querySelector("[data-cms-home-testimonials='true']");
    const markup = buildHomeTestimonialsMarkup(testimonials);

    if (!markup) {
      return;
    }

    if (existingFallback) {
      existingFallback.outerHTML = markup;
      return;
    }

    main.insertAdjacentHTML("beforeend", markup);
  }

  function setMobileMenuOpenState(menuRoot, isOpen) {
    if (!menuRoot) {
      return;
    }

    const overlay = menuRoot.querySelector("[id^='overlay-']");
    const dialog = menuRoot.querySelector("[role='dialog']");
    const body = document.body;

    menuRoot.classList.toggle("axLCtp", isOpen);
    menuRoot.style.visibility = isOpen ? "visible" : "hidden";
    menuRoot.style.opacity = isOpen ? "1" : "0";
    menuRoot.style.pointerEvents = isOpen ? "auto" : "none";

    if (overlay) {
      overlay.style.opacity = isOpen ? "0.72" : "0";
      overlay.style.pointerEvents = isOpen ? "auto" : "none";
    }

    if (dialog) {
      dialog.setAttribute("aria-hidden", isOpen ? "false" : "true");
      if (isOpen) {
        dialog.focus();
      }
    }

    body.classList.toggle("siteScrollingBlocked", isOpen);
    body.style.overflow = isOpen ? "hidden" : "";
  }

  function initMobileMenuFallback() {
    const menuRoot = document.querySelector("[id$='_r_comp-kd5px9hr']");
    const openButton = document.querySelector("[id$='_r_comp-lk6o559c']");
    const closeButton = document.querySelector("[id$='_r_comp-kkmqi5tc']");
    const overlay = menuRoot && menuRoot.querySelector("[id^='overlay-']");

    if (!menuRoot || !openButton || !closeButton) {
      return;
    }

    if (menuRoot.dataset.cmsMenuBound === "true") {
      return;
    }

    menuRoot.dataset.cmsMenuBound = "true";
    setMobileMenuOpenState(menuRoot, false);

    openButton.setAttribute("role", "button");
    openButton.setAttribute("tabindex", "0");
    openButton.setAttribute("aria-label", "Open menu");
    closeButton.setAttribute("aria-label", "Close menu");

    const openMenu = (event) => {
      if (event) {
        event.preventDefault();
      }
      setMobileMenuOpenState(menuRoot, true);
    };

    const closeMenu = (event) => {
      if (event) {
        event.preventDefault();
      }
      setMobileMenuOpenState(menuRoot, false);
    };

    openButton.addEventListener("click", openMenu);
    openButton.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        openMenu(event);
      }
    });

    closeButton.addEventListener("click", closeMenu);

    if (overlay) {
      overlay.addEventListener("click", closeMenu);
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    });

    menuRoot.querySelectorAll("[data-testid='expandablemenu-toggle']").forEach((toggle) => {
      toggle.addEventListener("click", (event) => {
        event.preventDefault();
        const item = toggle.closest(".wixui-vertical-menu__item");
        if (!item) {
          return;
        }
        const expanded = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", expanded ? "false" : "true");
        item.classList.toggle("hGjOas", !expanded);
      });
    });

    menuRoot.querySelectorAll(".wixui-vertical-menu__item a[href]").forEach((anchor) => {
      anchor.addEventListener("click", () => {
        closeMenu();
      });
    });
  }

  function wireOrderLinks() {
    const settings = (window.__FRANKIES_CMS_DATA__ && window.__FRANKIES_CMS_DATA__.settings) || {};
    const orderUrl = settings.order_url;
    if (!orderUrl) {
      return;
    }
    document.querySelectorAll("[data-popupid='g3a9o']").forEach((link) => {
      link.setAttribute("href", orderUrl);
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noreferrer noopener");
      link.removeAttribute("data-popupid");
    });
  }

  function applyGlobalContent(settings) {
    const followLabel = settings.follow_label || "FOLLOW US";
    const instagramUrl = settings.instagram_url;
    const logoImage = settings.logo_image;
    const logoAlt = settings.brand_name || "Logo";
    setLogoReadyState(false);
    activeLogoImage = logoImage || "";
    activeLogoAlt = logoAlt;
    activeLogoReadyPromise = preloadImage(activeLogoImage);

    [
      "comp-ljvg4aik_r_comp-ljzp1jdl",
      "comp-ljvg4b3w_r_comp-ljzp1jdl",
      "comp-mcjbvjyz16_r_comp-ljzp1jdl",
      "comp-lz8qqwq5_r_comp-ljzp1jdl",
    ].forEach((id) => setRichLink(id, followLabel, instagramUrl));

    enforceLogoOverride();
    scheduleLogoEnforcement();
    pruneHallandaleNavigation();
  }

  function applyHomePage(data) {
    const settings = data.settings || {};
    const testimonials = data.testimonials || [];
    const galleryImages = settings.gallery_images || [];
    const skullImage = settings.skull_image || FALLBACK_SKULL_URL;

    const rawMarkupApplied = applyRawMainMarkup(settings.home_main_markup);

    setTextBlock("comp-lx994t9o", settings.hero_title, "h1", "font_4 wixui-rich-text__text");
    setInnerHtml("comp-lx99500p", toParagraphHtml(settings.hero_copy));
    setTextBlock("comp-ljgxg475", settings.secret_sauce_title, "h3", "font_3 wixui-rich-text__text");
    setInnerHtml("comp-ljgxgzui", toParagraphHtml(settings.secret_sauce_copy));

    setAnchorHref("comp-ljgxh07h", settings.menu_primary_url, "_self");
    hideNodeById("comp-mdp32mhg1");
    setImage("comp-lx95a8rh", settings.hero_left_image);
    setImage("comp-lx9904sy", settings.hero_center_image);
    setImage("comp-lz8sc600", settings.hero_right_image);
    HOME_SKULL_IDS.forEach((id) => {
      setImageWithFallback(id, skullImage, FALLBACK_SKULL_URL, "Skull icon");
    });

    [
      "comp-lx9cedqk",
      "comp-lx9cfg8h",
      "comp-lx9cf5si",
      "comp-lx9cg357",
    ].forEach((id, index) => {
      setImage(id, galleryImages[index] || "");
    });

    HOME_TESTIMONIAL_IDS.forEach(([quoteId, authorId], index) => {
      const item = testimonials[index];
      if (!item) {
        return;
      }
      setInnerHtml(
        quoteId,
        toParagraphHtml(`"${item.quote}"`, "font_8 wixui-rich-text__text")
      );
      setInnerHtml(
        authorId,
        toParagraphHtml(`- ${item.author || item.title || ""}`, "font_9 wixui-rich-text__text")
      );
    });

    mountReferenceSkullRow(skullImage);
    ensureHomeTestimonialsVisible(testimonials);

    if (rawMarkupApplied) {
      ensureHomeTestimonialsFallback(testimonials);
    }
  }

  function applyAboutPage(data) {
    const settings = data.settings || {};
    const about = getAboutContent(settings);
    applyRawMainMarkup(settings.about_main_markup);
    const intro = [about.introLead, about.introFollowup].filter(Boolean).join("\n\n");
    const body = about.storyCopy;

    setTextBlock("comp-lx9bcd2c", settings.about_title, "h1", "font_2 wixui-rich-text__text");
    setInnerHtml("comp-lx9bb9j9", toParagraphHtml(intro));
    setTextBlock("comp-lx9blw9o", settings.about_chef_label, "h2", "font_3 wixui-rich-text__text");
    setTextBlock("comp-lj5hsky9", settings.about_chef_heading, "h3", "font_6 wixui-rich-text__text");
    setInnerHtml("comp-lj5hskqm3", toParagraphHtml(settings.about_chef_bio));
    setInnerHtml("comp-lj5iibjh1", toParagraphHtml(body));
    setImage("comp-lx9gc85d", settings.about_banner_image);
    setImage("comp-ljwrefcu", settings.about_portrait_image);
    setImage("comp-lj5if00b", settings.about_secondary_image);
    setImage("comp-lz8qmq05", settings.about_primary_image);
  }

  function applyLocationsPage(data) {
    const settings = data.settings || {};
    applyRawMainMarkup(settings.locations_main_markup);
    const locations = data.locations || [];
    const miami = locations.find((item) => /agoura hills|miami|mimo/i.test(item.name || item.city || "")) || locations[0];

    setTextBlock("comp-mcjd4ms58__item1", settings.locations_title || "Locations", "h3", "font_3 wixui-rich-text__text");
    setImage("comp-mcjd4mru__item1", settings.locations_intro_image || "");

    if (miami) {
      setLinkTextBlock(
        "comp-mcjd4ms58__item-j9ples3e",
        settings.miami_label || (miami.city && /agoura hills|miami/i.test(miami.city) ? "Agoura Hills" : miami.name),
        "/agoura-hills",
        "h3",
        "font_3 wixui-rich-text__text"
      );
      setInnerHtml(
        "comp-mcjd4msb__item-j9ples3e",
        [
          `<p class="font_8 wixui-rich-text__text"><a href="/agoura-hills" target="_self" class="wixui-rich-text__text"><span style="font-weight:bold;" class="wixui-rich-text__text">${escapeHtml(
            miami.name
          )}</span></a></p>`,
          `<p class="font_8 wixui-rich-text__text" style="font-size:13px;"><a href="/agoura-hills" target="_self" class="wixui-rich-text__text"><span style="font-size:13px;" class="wixui-rich-text__text">${escapeHtml(
            `${miami.address}, ${miami.city}`
          )}</span></a></p>`,
        ].join("")
      );
      setAnchorHref("comp-mcjd4mru__item-j9ples3e", "/agoura-hills", "_self");
      setAnchorHref("comp-mddniarv__item-j9ples3e", "/agoura-hills", "_self");
      setImage("comp-mcjd4mru__item-j9ples3e", settings.locations_miami_image || miami.featured_image || "");
    }

    [
      "comp-mcjd4mrn__item-j9plerjk",
      "comp-mddniarv__item-j9plerjk",
      "comp-mcjd4ms58__item-j9plerjk",
      "comp-mcjd4msb__item-j9plerjk",
      "comp-mcjd4mru__item-j9plerjk",
    ].forEach(hideNodeById);
  }

  function applyPressPage(data) {
    const settings = data.settings || {};
    applyRawMainMarkup(settings.press_main_markup);
    const items = data.press_items || [];
    const ids = ["item1", "item-j9ples3e", "item-j9plerjk", "item-ljfbivf9"];

    setTextBlock("comp-lz8r7phl", settings.press_title || "PRESS", "h2", "font_5 wixui-rich-text__text");

    ids.forEach((suffix, index) => {
      const item = items[index];
      if (!item) {
        return;
      }
      const href = item.external_url || "/press";
      setAnchorHref(`comp-lz8r7pi34__${suffix}`, href, "_blank");
      setImage(`comp-lz8r7pi34__${suffix}`, item.featured_image || "");
      setInnerHtml(
        `comp-lz8r7pi44__${suffix}`,
        `<h3 class="font_6 wixui-rich-text__text"><a href="${escapeHtml(
          href
        )}" target="_blank" rel="noreferrer noopener" class="wixui-rich-text__text">${escapeHtml(
          item.outlet
        )}</a></h3>`
      );
      setInnerHtml(
        `comp-lz8rct0t__${suffix}`,
        `<h3 class="font_6 wixui-rich-text__text"><a href="${escapeHtml(
          href
        )}" target="_blank" rel="noreferrer noopener" class="wixui-rich-text__text">${escapeHtml(
          item.title
        )}</a></h3>`
      );
    });
  }

  function applyMimoPage(data) {
    const settings = data.settings || {};
    applyRawMainMarkup(settings.mimo_main_markup);
    const locations = data.locations || [];
    const miami = locations.find((item) => /agoura hills|miami|mimo/i.test(item.name || item.city || "")) || locations[0];
    if (!miami) {
      return;
    }

    setImage("comp-mackekk1", settings.mimo_hero_image || "");
    setTextEffectsMatrix("comp-mcjeiaz3", settings.miami_label || (miami.city && /agoura hills|miami/i.test(miami.city) ? "Agoura Hills" : miami.name));
    setInnerHtml("comp-macl6c0o", toParagraphHtml(settings.mimo_intro_copy || miami.copy || settings.locations_copy));
    setAnchorHref("comp-mdp2taz6", "/agoura-hillsmenu", "_self");
    setButtonLabel("comp-mdp2taz6", settings.menu_primary_label || "MENU");
    setTextBlock("comp-mcje1tq4", settings.hours_heading || "HOURS & LOCATION", "p", "font_8 wixui-rich-text__text");
    setInnerHtml("comp-mcje3w0c", toParagraphHtml(miami.hours || "Update in wp-admin"));
    setInnerHtml("comp-mcje52qw", toParagraphHtml(`${miami.address}, ${miami.city}`));
    setTextBlock("comp-mcjeaao8", settings.happy_hour_heading || "HAPPY HOUR", "p", "font_8 wixui-rich-text__text");
    setInnerHtml("comp-mcjeaanm", toParagraphHtml(settings.mimo_happy_hour_copy || "Monday-Friday\n4pm-7pm"));
  }

  function applyMiamiMenuPage(data) {
    const settings = data.settings || {};
    const locations = data.locations || [];
    const miami = locations.find((item) => /agoura hills|miami|mimo/i.test(item.name || item.city || "")) || locations[0];
    if (!miami) {
      return;
    }

    applyRawMainMarkup(
      buildAgouraMenuPageMarkup(
        settings.menu_page_title || "MENU",
        settings.menu_page_brand || "UPTOWN 66",
        `${miami.name} • ${miami.address}, ${miami.city}`,
        settings.agoura_menu_images || [
          settings.agoura_menu_image_1,
          settings.agoura_menu_image_2,
          settings.agoura_menu_image_3,
          settings.agoura_menu_image_4,
          settings.agoura_menu_image_5,
        ],
        settings.miami_menu_sections || []
      )
    );
  }

  function applyPageContent(data) {
    applyGlobalContent(data.settings || {});

    switch (normalizePath(window.location.pathname)) {
      case "/":
        applyHomePage(data);
        break;
      case "/about":
        applyAboutPage(data);
        break;
      case "/locations":
        applyLocationsPage(data);
        break;
      case "/press":
        applyPressPage(data);
        break;
      case "/agoura-hills":
      case "/mimo":
        applyMimoPage(data);
        break;
      case "/agoura-hillsmenu":
      case "/miamimenu":
        applyMiamiMenuPage(data);
        break;
      default:
        break;
    }
  }

  function applyMiamiMenuPageLegacyOverride(data) {
    const settings = data.settings || {};
    const locations = data.locations || [];
    const miami = locations.find((item) => /agoura hills|miami|mimo/i.test(item.name || item.city || "")) || locations[0];
    if (!miami) {
      return;
    }

    applyRawMainMarkup(
      buildAgouraMenuPageMarkup(
        settings.menu_page_title || "MENU",
        settings.menu_page_brand || "UPTOWN 66",
        `${miami.name} • ${miami.address}, ${miami.city}`,
        settings.agoura_menu_images || [
          settings.agoura_menu_image_1,
          settings.agoura_menu_image_2,
          settings.agoura_menu_image_3,
          settings.agoura_menu_image_4,
          settings.agoura_menu_image_5,
        ],
        settings.miami_menu_sections || []
      )
    );
  }

  function applyMiamiMenuPage(data) {
    const settings = data.settings || {};
    const locations = data.locations || [];
    const miami = locations.find((item) => /agoura hills|miami|mimo/i.test(item.name || item.city || "")) || locations[0];
    if (!miami) {
      return;
    }

    setTextBlock("comp-lxwb31ei", settings.menu_page_title || "MENU", "h1", "font_2 wixui-rich-text__text");
    setInnerHtml("comp-lxwb87gt", toParagraphHtml(`${miami.name} • ${miami.address}, ${miami.city}`));
    setTextBlock("comp-lxweux6y1", miami.name, "h1", "font_2 wixui-rich-text__text");
    setTextBlock("comp-lxwbz4d4", settings.menu_page_brand || "UPTOWN 66", "h1", "font_2 wixui-rich-text__text");
  }

  function clearPendingState() {
    document.documentElement.removeAttribute("data-cms-pending");
  }

  function preloadImage(src) {
    if (!src) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const image = new Image();
      const finish = () => resolve();
      image.addEventListener("load", finish, { once: true });
      image.addEventListener("error", finish, { once: true });
      image.src = src;
      if (image.complete) {
        resolve();
      }
    });
  }

  function clearPendingStateWhenReady() {
    activeLogoReadyPromise
      .catch(() => {})
      .then(() => {
        enforceLogoOverride();
        setLogoReadyState(true);
        clearPendingState();
      });
  }

  function readCachedCmsData() {
    try {
      const raw = sessionStorage.getItem(CMS_CACHE_KEY);
      if (!raw) {
        return null;
      }
      const cached = JSON.parse(raw);
      if (!cached || !cached.timestamp || !cached.data) {
        return null;
      }
      if (Date.now() - cached.timestamp > CMS_CACHE_MAX_AGE_MS) {
        sessionStorage.removeItem(CMS_CACHE_KEY);
        return null;
      }
      return cached.data;
    } catch (error) {
      return null;
    }
  }

  function writeCachedCmsData(data) {
    try {
      sessionStorage.setItem(
        CMS_CACHE_KEY,
        JSON.stringify({
          timestamp: Date.now(),
          data,
        })
      );
    } catch (error) {
      // Ignore storage failures.
    }
  }

  function renderCmsData(data) {
    window.__FRANKIES_CMS_DATA__ = data;
    applyPageContent(data);
    rewriteInternalLinks();
    normalizeDocumentAssetUrls();
    initMobileMenuFallback();
    clearPendingStateWhenReady();
  }

  function warmCmsRequest() {
    return fetch("/api/site", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`CMS request failed with ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        writeCachedCmsData(data);
        return data;
      });
  }

  function prefetchPage(url) {
    if (!url || url.origin !== window.location.origin) {
      return;
    }
    if (!Object.values(ROUTE_ALIASES).includes(url.pathname) || url.pathname === window.location.pathname) {
      return;
    }

    fetch(url.pathname, { method: "GET", cache: "force-cache" }).catch(() => {});
  }

  function initLinkPrefetch() {
    const seen = new Set();

    document.querySelectorAll("a[href]").forEach((anchor) => {
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#")) {
        return;
      }

      const url = new URL(anchor.href, window.location.origin);
      const key = url.pathname;

      const triggerPrefetch = () => {
        if (seen.has(key)) {
          return;
        }
        seen.add(key);
        warmCmsRequest().catch(() => {});
        prefetchPage(url);
      };

      anchor.addEventListener("mouseenter", triggerPrefetch, { passive: true });
      anchor.addEventListener("touchstart", triggerPrefetch, { passive: true, once: true });
      anchor.addEventListener("focus", triggerPrefetch, { passive: true });
    });
  }

  rewriteInternalLinks();
  normalizeDocumentAssetUrls();
  initMobileMenuFallback();
  wireOrderLinks();
  initLinkPrefetch();
  window.addEventListener("load", () => {
    normalizeDocumentAssetUrls();
    enforceLogoOverride();
  });
  window.addEventListener("pageshow", () => {
    normalizeDocumentAssetUrls();
    enforceLogoOverride();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      normalizeDocumentAssetUrls();
      enforceLogoOverride();
    }
  });

  const cachedData = readCachedCmsData();
  if (cachedData) {
    renderCmsData(cachedData);
  }

  window.setTimeout(() => {
    warmCmsRequest().catch(() => {});
  }, 50);

  window.setTimeout(() => {
    clearPendingState();
  }, 3000);

  warmCmsRequest()
    .then((data) => {
      writeCachedCmsData(data);
      renderCmsData(data);
      wireOrderLinks();
      initLinkPrefetch();
    })
    .catch((error) => {
      setLogoReadyState(true);
      clearPendingState();
      console.error("Failed to apply CMS bridge", error);
    });
})();
