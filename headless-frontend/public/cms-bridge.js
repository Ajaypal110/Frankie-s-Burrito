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
  let hasRenderedCmsData = false;
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

  function rewriteLegacyMenuLabels() {
    document.querySelectorAll(".wixui-vertical-menu__item-label, [data-testid='linkElement']").forEach((node) => {
      const text = (node.textContent || "").trim();
      if (/^mimo$/i.test(text)) {
        node.textContent = "Agoura Hills";
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

  function fitAgouraHeroTitle(text) {
    const node = document.getElementById("comp-mcjeiaz3");
    if (!node) {
      return;
    }

    const normalized = String(text || "").trim();
    if (!normalized) {
      return;
    }

    if (normalized.length >= 12) {
      node.style.width = "32%";
      node.style.maxWidth = "520px";
      node.style.marginLeft = "auto";
      node.style.marginRight = "auto";
      node.style.setProperty("--letter-spacing", "-0.06em");
      node.style.setProperty("--font", "normal normal 700 max(0.5px, 0.048 * (var(--scaling-factor) - var(--scrollbar-width)))/1.1em wix-madefor-display-v2,sans-serif");
    } else {
      node.style.width = "";
      node.style.maxWidth = "";
      node.style.marginLeft = "";
      node.style.marginRight = "";
      node.style.removeProperty("--letter-spacing");
      node.style.removeProperty("--font");
    }
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

  function formatRichTextContent(text) {
    return escapeHtml(String(text || "")).replace(/\r?\n/g, '<br class="wixui-rich-text__text">');
  }

  function setRichTextBlock(id, text, tagName = "h1", className = "font_2 wixui-rich-text__text") {
    if (!text) {
      return;
    }

    setInnerHtml(
      id,
      `<${tagName} class="${className}"><span class="wixui-rich-text__text">${formatRichTextContent(text)}</span></${tagName}>`
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

  function setMenuImage(id, src) {
    if (!src) {
      return;
    }

    setImage(id, src);

    const root = document.getElementById(id);
    if (!root) {
      return;
    }

    forceVisible(root);
    forceVisible(root.closest(".wixui-box"));

    if (id === "comp-m2ujhnhk") {
      root.style.transform = "translateY(100px)";
      root.style.transformOrigin = "top center";
      root.style.zIndex = "1";
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

  function getMenuSlotNode(id) {
    const node = document.getElementById(id);
    if (!node) {
      return null;
    }

    return node.parentElement && node.parentElement.id ? node.parentElement : node;
  }

  function stripNodeIds(root) {
    if (!root || root.nodeType !== 1) {
      return;
    }

    root.removeAttribute("id");
    root.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
  }

  function setRichTextCloneContent(root, text) {
    if (!root) {
      return;
    }

    const richTextNode =
      root.matches(".wixui-rich-text, [data-testid='richTextElement']")
        ? root
        : root.querySelector(".wixui-rich-text, [data-testid='richTextElement']");

    if (!richTextNode) {
      return;
    }

    const contentNode = richTextNode.querySelector("h1, h2, h3, p") || richTextNode.firstElementChild;
    const tagName = contentNode && contentNode.tagName ? contentNode.tagName.toLowerCase() : "p";
    const className = contentNode && contentNode.className ? contentNode.className : "font_8 wixui-rich-text__text";

    richTextNode.innerHTML = `<${tagName} class="${className}"><span class="wixui-rich-text__text">${formatRichTextContent(
      text
    )}</span></${tagName}>`;
  }

  function appendOverflowMenuPairs(slotPairs, items, formatter) {
    if (!Array.isArray(slotPairs) || !Array.isArray(items) || items.length <= slotPairs.length) {
      return;
    }

    const lastPair = slotPairs[slotPairs.length - 1];
    const templateNameNode = getMenuSlotNode(lastPair.nameId);
    const templateDetailNode = getMenuSlotNode(lastPair.detailId);
    if (!templateNameNode || !templateDetailNode || !templateDetailNode.parentElement) {
      return;
    }

    const parent = templateDetailNode.parentElement;
    parent
      .querySelectorAll("[data-cms-clone='menu-overflow']")
      .forEach((node) => node.parentElement && node.parentElement.removeChild(node));

    let cursor = templateDetailNode;

    items.slice(slotPairs.length).forEach((item) => {
      const nameClone = templateNameNode.cloneNode(true);
      const detailClone = templateDetailNode.cloneNode(true);

      stripNodeIds(nameClone);
      stripNodeIds(detailClone);
      nameClone.setAttribute("data-cms-clone", "menu-overflow");
      detailClone.setAttribute("data-cms-clone", "menu-overflow");

      setRichTextCloneContent(nameClone, item.name || "");
      setRichTextCloneContent(detailClone, formatter(item));

      parent.insertBefore(nameClone, cursor.nextSibling);
      parent.insertBefore(detailClone, nameClone.nextSibling);
      cursor = detailClone;
    });
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
    return `<div data-cms-skull-row="true" style="display:flex;justify-content:center;align-items:center;gap:24px;flex-wrap:wrap;margin:70px 64px;padding:0 32px;">${new Array(4)
      .fill("")
      .map(
        () =>
          `<img src="${escapeHtml(normalizedSrc)}" alt="Skull icon" style="display:block;width:138px;height:190px;max-width:100%;object-fit:contain;filter:none;">`
      )
      .join("")}</div>`;
  }

  function ensureHomeSkullLayoutStyles() {
    if (document.getElementById("cms-home-skull-layout-styles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "cms-home-skull-layout-styles";
    style.textContent = `
      #comp-ljgxfk3f{
        min-height:350px !important;
        height:auto !important;
        overflow:hidden !important;
      }
      #comp-ljgxfk3f .comp-ljgxfk3f-container{
        min-height:350px !important;
        grid-template-rows:minmax(220px, auto) minmax(180px, auto) !important;
        padding-bottom:0 !important;
        overflow:hidden !important;
      }
      #comp-ljgxfu44 .comp-ljgxfu44-container{
        display:flex !important;
        justify-content:center !important;
        align-items:center !important;
        gap:24px !important;
        flex-wrap:wrap !important;
      }
      #comp-ljgxfu6r,
      #comp-ljgxfzoz{
        align-self:start !important;
        margin-top:12px !important;
      }
      #comp-ljgxfu6r .comp-ljgxfu6r-container,
      #comp-ljgxfzoz .comp-ljgxfzoz-container,
      #comp-lkefjdmi .comp-lkefjdmi-container{
        height:auto !important;
      }
      #comp-ljgxfu44 [data-cms-skull-row="true"]{
        display:flex !important;
        justify-content:center !important;
        align-items:center !important;
        flex-wrap:wrap !important;
      }
      ${HOME_SKULL_IDS.map(
        (id) => `
      #${id}{
        display:none !important;
        width:0 !important;
        height:0 !important;
        min-width:0 !important;
        max-width:0 !important;
        margin:0 !important;
        overflow:hidden !important;
        transform:none !important;
        animation:none !important;
        transition:none !important;
        opacity:0 !important;
        visibility:hidden !important;
        pointer-events:none !important;
      }
      #${id} wow-image,
      #${id} picture,
      #${id} img{
        width:100% !important;
        height:100% !important;
        animation:none !important;
        transition:none !important;
        transform:none !important;
      }`
      ).join("")}
      @media screen and (max-width: 750px){
        #comp-ljgxfk3f{
          min-height:200px !important;
        }
        #comp-ljgxfk3f .comp-ljgxfk3f-container{
          min-height:200px !important;
          grid-template-rows:minmax(120px, auto) minmax(60px, auto) minmax(120px, auto) !important;
        }
        #comp-ljgxfu44 .comp-ljgxfu44-container{
          gap:18px !important;
        }
        ${HOME_SKULL_IDS.map(
          (id) => `
        #${id}{
          width:92px !important;
          height:126px !important;
          min-width:92px !important;
          max-width:92px !important;
        }`
        ).join("")}
      }
    `;
    document.head.appendChild(style);
  }

  function mountReferenceSkullRow(skullSrc) {
    const container =
      document.querySelector("#comp-ljgxfu44 > .comp-ljgxfu44-container") ||
      document.querySelector("#comp-ljgxfu44 .comp-ljgxfu44-container");

    if (!container) {
      return;
    }

    ensureHomeSkullLayoutStyles();

    HOME_SKULL_IDS.forEach((id) => {
      const node = document.getElementById(id);
      if (node) {
        node.style.setProperty("display", "none", "important");
        node.style.setProperty("width", "0", "important");
        node.style.setProperty("height", "0", "important");
        node.style.setProperty("min-width", "0", "important");
        node.style.setProperty("max-width", "0", "important");
        node.style.setProperty("margin", "0", "important");
        node.style.setProperty("transform", "none", "important");
        node.style.setProperty("animation", "none", "important");
        node.style.setProperty("transition", "none", "important");
        node.style.setProperty("opacity", "0", "important");
        node.style.setProperty("visibility", "hidden", "important");
        node.style.setProperty("pointer-events", "none", "important");
      }
    });

    const existing = container.querySelector("[data-cms-skull-row='true']");
    if (existing) {
      existing.outerHTML = buildReferenceSkullRowMarkup(skullSrc);
      return;
    }

    container.insertAdjacentHTML("afterbegin", buildReferenceSkullRowMarkup(skullSrc));
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

  function buildAgouraGalleryMarkup(images) {
    const slides = (images || [])
      .filter(Boolean)
      .map(
        (src, index) => `
          <article style="flex:0 0 min(76vw, 360px);scroll-snap-align:center;">
            <img
              src="${escapeHtml(normalizeAssetUrl(src) || src)}"
              alt="Agoura Hills gallery image ${index + 1}"
              style="display:block;width:100%;height:420px;object-fit:cover;border-radius:20px;"
            />
          </article>
        `
      )
      .join("");

    if (!slides) {
      return "";
    }

    return `
      <section style="max-width:1200px;margin:0 auto;padding:24px 24px 40px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:18px;">
          <h2 style="margin:0;font-size:28px;letter-spacing:.08em;text-transform:uppercase;color:#2f160f;">Gallery</h2>
          <p style="margin:0;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#7a6257;">Swipe or scroll</p>
        </div>
        <div style="display:flex;gap:18px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:12px;-webkit-overflow-scrolling:touch;">
          ${slides}
        </div>
      </section>
    `;
  }

  function renderAgouraGallery(images) {
    const galleryRoot = document.getElementById("comp-mad1tvzg");
    const gallerySection = document.getElementById("comp-maclwrb2");
    const markup = buildAgouraGalleryMarkup(images);

    if (!galleryRoot || !gallerySection || !markup) {
      return;
    }

    galleryRoot.innerHTML = markup;
    forceVisible(galleryRoot, "block");
    forceVisible(gallerySection, "flex");
    galleryRoot.style.width = "100%";
    galleryRoot.style.maxWidth = "100%";
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

  function resolveMobileMenuHref(label, parentLabel) {
    const normalizedLabel = String(label || "").trim().toLowerCase();
    const normalizedParentLabel = String(parentLabel || "").trim().toLowerCase();

    if (normalizedParentLabel === "locations") {
      if (normalizedLabel === "mimo" || normalizedLabel === "agoura hills") {
        return "/agoura-hills";
      }
    }

    if (normalizedParentLabel === "menus") {
      if (normalizedLabel === "mimo" || normalizedLabel === "agoura hills") {
        return "/agoura-hillsmenu";
      }
    }

    return "";
  }

  function bindMobileMenuVirtualLinks(menuRoot, closeMenu) {
    if (!menuRoot) {
      return;
    }

    menuRoot.querySelectorAll(".wixui-vertical-menu__submenu .wixui-vertical-menu__item").forEach((item) => {
      const labelNode = item.querySelector("[data-testid='linkElement']");
      const wrapperNode = item.querySelector("[data-testid='itemWrapper']");
      const clickableNode = wrapperNode || labelNode;

      if (!labelNode || !clickableNode || labelNode.tagName === "A" || clickableNode.dataset.cmsLinkBound === "true") {
        return;
      }

      const submenu = item && item.closest(".wixui-vertical-menu__submenu");
      const parentItem = submenu && submenu.closest(".wixui-vertical-menu__item");
      const parentLabelNode =
        parentItem &&
        parentItem.querySelector(":scope > [data-testid='itemWrapper'] [data-testid='linkElement']");
      const href = resolveMobileMenuHref(labelNode.textContent, parentLabelNode && parentLabelNode.textContent);

      if (!href) {
        return;
      }

      clickableNode.setAttribute("data-cms-href", href);
      clickableNode.setAttribute("role", "link");
      clickableNode.tabIndex = 0;
      clickableNode.style.cursor = "pointer";

      const navigate = (event) => {
        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }
        closeMenu();
        window.location.assign(href);
      };

      clickableNode.addEventListener("click", navigate);
      clickableNode.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          navigate(event);
        }
      });
      clickableNode.dataset.cmsLinkBound = "true";
    });
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

    const toggleExpandableItem = (toggle, event) => {
      if (event) {
        event.preventDefault();
      }
      const item = toggle.closest(".wixui-vertical-menu__item");
      if (!item) {
        return;
      }
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", expanded ? "false" : "true");
      item.classList.toggle("hGjOas", !expanded);
    };

    menuRoot.querySelectorAll("[data-testid='expandablemenu-toggle']").forEach((toggle) => {
      toggle.addEventListener("click", (event) => {
        toggleExpandableItem(toggle, event);
      });

      const item = toggle.closest(".wixui-vertical-menu__item");
      const wrapper = item && item.querySelector(":scope > [data-testid='itemWrapper']");
      const labelNode = wrapper && wrapper.querySelector("[data-testid='linkElement']");

      if (wrapper && labelNode && labelNode.tagName !== "A" && wrapper.dataset.cmsToggleBound !== "true") {
        wrapper.style.cursor = "pointer";
        wrapper.setAttribute("role", "button");
        wrapper.tabIndex = 0;
        wrapper.addEventListener("click", (event) => {
          toggleExpandableItem(toggle, event);
        });
        wrapper.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            toggleExpandableItem(toggle, event);
          }
        });
        wrapper.dataset.cmsToggleBound = "true";
      }
    });

    bindMobileMenuVirtualLinks(menuRoot, closeMenu);

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
    setImage("comp-mackdwkx14", settings.mimo_bottom_image || "");
    const heroLabel = settings.miami_label || (miami.city && /agoura hills|miami/i.test(miami.city) ? "Agoura Hills" : miami.name);
    setTextEffectsMatrix("comp-mcjeiaz3", heroLabel);
    fitAgouraHeroTitle(heroLabel);
    setInnerHtml("comp-macl6c0o", toParagraphHtml(settings.mimo_intro_copy || miami.copy || settings.locations_copy));
    setAnchorHref("comp-mdp2taz6", "/agoura-hillsmenu", "_self");
    setButtonLabel("comp-mdp2taz6", settings.menu_primary_label || "MENU");
    setTextBlock("comp-mcje1tq4", settings.hours_heading || "HOURS & LOCATION", "p", "font_8 wixui-rich-text__text");
    setInnerHtml("comp-mcje3w0c", toParagraphHtml(miami.hours || "Update in wp-admin"));
    setInnerHtml("comp-mcje52qw", toParagraphHtml(`${miami.address}, ${miami.city}`));
    setTextBlock("comp-mcjeaao8", settings.happy_hour_heading || "HAPPY HOUR", "p", "font_8 wixui-rich-text__text");
    setInnerHtml("comp-mcjeaanm", toParagraphHtml(settings.mimo_happy_hour_copy || "Monday-Friday\n4pm-7pm"));
    renderAgouraGallery(settings.mimo_gallery_images || []);
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
        applyAgouraMenuHtmlPage(data);
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

  function applyAgouraMenuHtmlPage(data) {
    const settings = data.settings || {};
    const locations = data.locations || [];
    const miami = locations.find((item) => /agoura hills|miami|mimo/i.test(item.name || item.city || "")) || locations[0];
    if (!miami) {
      return;
    }

    const locationLine =
      settings.agoura_menu_location_line || `${miami.name} • ${miami.address}, ${miami.city}`;
    const menuImages = (settings.agoura_menu_images || []).length
      ? settings.agoura_menu_images
      : [
          settings.agoura_menu_image_1,
          settings.agoura_menu_image_2,
          settings.agoura_menu_image_3,
          settings.agoura_menu_image_4,
          settings.agoura_menu_image_5,
        ].filter(Boolean);

    const readSectionItems = (sections) =>
      (sections || []).flatMap((section) => (section && Array.isArray(section.items) ? section.items : []));
    const itemLine = (item) => {
      if (!item) {
        return "";
      }

      const parts = [item.description, item.price].filter(Boolean);
      return parts.join(item.description && item.price ? "\n" : "");
    };
    const inlineItem = (item) => {
      if (!item) {
        return "";
      }

      return [item.name, item.price].filter(Boolean).join(" ");
    };

    const appetizers = readSectionItems(settings.agoura_menu_appetizers);
    const happyHourItems = readSectionItems(settings.agoura_menu_happy_hour_items);
    const beverages = readSectionItems(settings.agoura_menu_beverages);
    const tacos = readSectionItems(settings.agoura_menu_tacos);
    const specialties = readSectionItems(settings.agoura_menu_specialties);
    const burritos = readSectionItems(settings.agoura_menu_burritos);
    const desserts = readSectionItems(settings.agoura_menu_desserts);

    setRichTextBlock("comp-lxwb31ei", settings.menu_page_title || "MENU");
    setInnerHtml("comp-lxwb87gt", toParagraphHtml(locationLine));
    setRichTextBlock("comp-lxweux6y1", settings.agoura_menu_oysters_title || "Oysters");
    setRichTextBlock("comp-lxwb316u", settings.agoura_menu_oysters_half_price || "1/2.......20", "p", "font_8 wixui-rich-text__text");
    setRichTextBlock("comp-lxwb6asu", settings.agoura_menu_oysters_dozen_price || "DOZEN.....39", "p", "font_8 wixui-rich-text__text");
    setRichTextBlock("comp-lxwbd5a3", settings.agoura_menu_featured_primary_title || "CRISPY CALAMARI");
    setRichTextBlock(
      "comp-lxwbd56q",
      settings.agoura_menu_featured_primary_copy || "Horseradish Crema, Pickled Onion, Pickled Jalapeños 17"
    );
    setRichTextBlock("comp-lxwbhjv3", settings.agoura_menu_featured_secondary_title || "FRIED PINEAPPLE");
    setRichTextBlock(
      "comp-lxwbhjqq",
      settings.agoura_menu_featured_secondary_copy || "Sofrito Butter Sauce, Horseradish, Crema, Lemon 17"
    );
    setRichTextBlock(
      "comp-lxwbz4d4",
      settings.agoura_menu_market_note || "*Prices subject to change based on market."
    );

    setRichTextBlock("comp-m2uhm65r", settings.agoura_menu_happy_hour_title || "HAPPY HOUR");
    setRichTextBlock("comp-m2uhoids", settings.agoura_menu_happy_hour_subtitle || "MONDAY-FRIDAY 4-7PM");
    setRichTextBlock("comp-m2uhp22f", happyHourItems[0]?.name || "$4 TACOS");
    setRichTextBlock("comp-m2uhqkwh", happyHourItems[1]?.name || "$5 CHIPS & SALSA");
    setRichTextBlock("comp-m2uhr0io", happyHourItems[2]?.name || "$1 OYSTERS");
    setRichTextBlock("comp-m2uhq0ry", happyHourItems[2]?.description || "(1/2 DOZEN.....DOZEN)");

    const beveragesSection = document.getElementById("comp-lxwfenel");
    if (beveragesSection) {
      beveragesSection.style.transform = "translateY(36px)";
      beveragesSection.style.transformOrigin = "top center";
    }

    setRichTextBlock("comp-lxwfenen3", settings.agoura_menu_beverages_title || "Beverages");
    setRichTextBlock("comp-lxwfenep10", inlineItem(beverages[0]) || "MEXICAN COKE 3.75");
    setRichTextBlock("comp-lxwfener", inlineItem(beverages[1]) || "DIET COKE 3.75");
    setRichTextBlock("comp-lxwfenes5", inlineItem(beverages[2]) || "JARRITOS 3.75");
    setRichTextBlock("comp-lxwfenes18", beverages[2]?.description || "Tamarind\nPineapple");
    setRichTextBlock("comp-lxwfenet11", inlineItem(beverages[3]) || "TOPO CHICO 3.75");
    setRichTextBlock("comp-lxwfhtbb", inlineItem(beverages[4]) || "WATER 2");

    setRichTextBlock("comp-lxwc0cot", appetizers[0]?.name || "GUACAMOLE & CHIPS");
    setRichTextBlock("comp-lxwc0c97", itemLine(appetizers[0]) || "Cilantro, Cotija, Lime\n11");
    setRichTextBlock("comp-mdoy3tn7", appetizers[1]?.name || "CHIPS & SALSA");
    setRichTextBlock("comp-mdoy3thq", itemLine(appetizers[1]) || "Tomato, Chipotle, Lime,\nCilantro, Onion\n7");
    setRichTextBlock("comp-lxwc1scf", appetizers[2]?.name || "ELOTE");
    setRichTextBlock("comp-lxwc1s51", itemLine(appetizers[2]) || "Mexican Street Corn, Mayo,\nCotija, Cilantro, Lime\n7");
    setRichTextBlock("comp-lxwc362u", appetizers[3]?.name || "UPTOWN NACHOS");
    setRichTextBlock(
      "comp-lxwc35mi",
      appetizers[3]?.description || "Melted Queso Mixto, Roasted Corn, Pickled Jalapeño, Radish, Spring Onion"
    );
    setRichTextBlock("comp-lxwc6yjd", appetizers[3]?.price || "Pollo 15 | Steak 17 | Shrimp 17");
    setRichTextBlock("comp-lxwc8me7", appetizers[4]?.name || "CLASSIC CAESAR SALAD");
    setRichTextBlock("comp-lxwc8m07", appetizers[4]?.description || "Baby Romaine, House Croutons,\nCotija, Egg");
    setRichTextBlock("comp-lxwc8lna", appetizers[4]?.price || "Pollo 15 | Steak 17 | Shrimp 17");

    setRichTextBlock("comp-lxwcokch", tacos[0]?.name || "POLLO ASADO");
    setRichTextBlock("comp-lxwcokv9", itemLine(tacos[0]) || "Chicken, Crema, Cotija, Pickled Carrots\n5");
    setRichTextBlock("comp-lxwd1lj7", tacos[1]?.name || "HONGOS");
    setRichTextBlock("comp-lxwd1l3c", itemLine(tacos[1]) || "Wild Mushrooms Guiso, Caramelized Pear, Red Onion\n6");
    setRichTextBlock("comp-lxwcr9as", tacos[2]?.name || "BARBACOA");
    setRichTextBlock("comp-lxwcw03g", itemLine(tacos[2]) || "Oxtail, Beef Cheek, Short Rib, Pickled Onion\n6");
    setRichTextBlock("comp-lxwd4kr4", tacos[3]?.name || "AL PASTOR");
    setRichTextBlock("comp-lxwd4ke8", itemLine(tacos[3]) || "Pork Shoulder, Pineapple, Onion\n5");

    setRichTextBlock("comp-lxwdbarn", settings.agoura_menu_specials_price_line || "2 PER ORDER..........13");
    setRichTextBlock("comp-lxwd7s8m", specialties[0]?.name || "FLAUTAS");
    setRichTextBlock("comp-lxwd7t3u", itemLine(specialties[0]) || "Braised Beef Queso Mixto, Consommé");
    setRichTextBlock("comp-lxwd7sny", specialties[1]?.name || "BIRRIA");
    setRichTextBlock("comp-lxwd7rpr", itemLine(specialties[1]) || "Pollo, Queso, Crema, Cilantro");

    setRichTextBlock("comp-lxwdhgm5", burritos[0]?.name || "STEAK BURRITO");
    setRichTextBlock("comp-lxwdhgs2", itemLine(burritos[0]) || "Crispy Potatoes, Queso Mixto, Chipotle Crema, Pico,\nGuacamole\n15");
    setRichTextBlock("comp-lxwdjk9z", burritos[1]?.name || "CHICKEN BURRITO");
    setRichTextBlock("comp-lxwdjk51", itemLine(burritos[1]) || "Crispy Potatoes, Queso Mixto, Chipotle Crema, Pico, Guacamole\n15");
    setRichTextBlock("comp-m1gnvxlc", burritos[2]?.name || "SHRIMP BURRITO");
    setRichTextBlock("comp-m1gnvxiz", itemLine(burritos[2]) || "Red Rice, Cilantro Crema, Pico, Guacamole\n16");
    appendOverflowMenuPairs(
      [
        { nameId: "comp-lxwdhgm5", detailId: "comp-lxwdhgs2" },
        { nameId: "comp-lxwdjk9z", detailId: "comp-lxwdjk51" },
        { nameId: "comp-m1gnvxlc", detailId: "comp-m1gnvxiz" },
      ],
      burritos,
      itemLine
    );

    setRichTextBlock("comp-lxwfb3bd", settings.agoura_menu_horchata_label || "HOMEMADE");
    setRichTextBlock("comp-lxwfcxhy", settings.agoura_menu_horchata_price || "6");

    setRichTextBlock("comp-lxwezuc2", settings.agoura_menu_desserts_title || "Dulces");
    setRichTextBlock("comp-lxwdwmlc5", desserts[0]?.name || "CHURROS");
    setRichTextBlock("comp-lxwdwmld6", itemLine(desserts[0]) || "Chocolate\nGanache\n8");
    setRichTextBlock("comp-lxwdwmlg4", desserts[1]?.name || "TRES LECHES");
    setRichTextBlock("comp-lxwdwmlg17", itemLine(desserts[1]) || "Chantilly, Chocolate Pearls\n7");
    setRichTextBlock("comp-lxwdwmle5", desserts[2]?.name || "VANILLA BEAN FLAN");
    setRichTextBlock("comp-lxwdwmle18", itemLine(desserts[2]) || "Carmelo\n7");

    setMenuImage("comp-lx9h59lt", menuImages[0]);
    setMenuImage("comp-lxwbbbn0", menuImages[1]);
    setMenuImage("comp-lxwdg80k", menuImages[2]);
    setMenuImage("comp-lxwfa3qt", menuImages[3]);
    setMenuImage("comp-m2ujhnhk", menuImages[4]);
  }

  function clearPendingState() {
    document.documentElement.removeAttribute("data-cms-pending");
  }

  function showCmsUnavailableFallback() {
    const body = document.body;
    if (!body) {
      clearPendingState();
      return;
    }

    body.innerHTML = `
      <main style="min-height:100vh;display:grid;place-items:center;padding:32px;background:#f7efd7;color:#17120d;font-family:'Courier New',Courier,monospace;">
        <section style="max-width:34rem;text-align:center;">
          <p style="margin:0 0 12px;font-size:12px;letter-spacing:.28em;text-transform:uppercase;">Frankie's Burrito</p>
          <h1 style="margin:0 0 16px;font:700 clamp(2.2rem,6vw,4rem)/.95 Arial,Helvetica,sans-serif;letter-spacing:.06em;text-transform:uppercase;">Frontend Connected, CMS Unavailable</h1>
          <p style="margin:0;line-height:1.8;">The page could not load fresh content from the WordPress backend. Retry in a moment or check <code>/api/site</code> and <code>/healthz</code>.</p>
        </section>
      </main>
    `;
    setLogoReadyState(true);
    clearPendingState();
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
    hasRenderedCmsData = true;
    applyPageContent(data);
    rewriteInternalLinks();
    rewriteLegacyMenuLabels();
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
    if (!hasRenderedCmsData) {
      showCmsUnavailableFallback();
    }
  }, 3000);

  warmCmsRequest()
    .then((data) => {
      writeCachedCmsData(data);
      renderCmsData(data);
      wireOrderLinks();
      initLinkPrefetch();
    })
    .catch((error) => {
      if (!hasRenderedCmsData) {
        showCmsUnavailableFallback();
      }
      console.error("Failed to apply CMS bridge", error);
    });
})();
