function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function decodeEntities(value) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = String(value ?? "");
  return textarea.value;
}

function navMarkup(navItems, pathname) {
  return navItems
    .map((item) => {
      const isActive = pathname === item.slug || (item.slug === "/" && pathname === "/");
      return `<a href="${item.slug}" class="${isActive ? "active" : ""}">${escapeHtml(item.label)}</a>`;
    })
    .join("");
}

function siteFooterMarkup(settings) {
  return `
    <div class="footer-stack">
      <a href="/">HOME</a>
      <a href="/about">ABOUT</a>
      <a href="/locations">LOCATIONS</a>
      <a href="${escapeHtml(settings.menu_primary_url)}" target="_blank" rel="noreferrer">MiMo</a>
      <a href="${escapeHtml(settings.menu_secondary_url)}" target="_blank" rel="noreferrer">HALLANDALE</a>
      <span>MENUS</span>
      <a href="${escapeHtml(settings.menu_primary_url)}" target="_blank" rel="noreferrer">MiMo</a>
      <a href="${escapeHtml(settings.menu_secondary_url)}" target="_blank" rel="noreferrer">HALLANDALE</a>
      <a href="/press">PRESS</a>
      <a href="${escapeHtml(settings.menu_primary_url)}" target="_blank" rel="noreferrer">ORDER</a>
    </div>
  `;
}

function heroTemplate(settings) {
  return `
    <section class="hero">
      <div class="hero-images">
        <div><img src="${escapeHtml(settings.hero_left_image)}" alt="${escapeHtml(settings.brand_name)} left image"></div>
        <div class="main-image"><img src="${escapeHtml(settings.hero_center_image)}" alt="${escapeHtml(settings.brand_name)} main image"></div>
        <div><img src="${escapeHtml(settings.hero_right_image)}" alt="${escapeHtml(settings.brand_name)} right image"></div>
      </div>
      <h1 class="hero-title">${escapeHtml(settings.hero_title)}</h1>
      <p class="hero-copy">${escapeHtml(settings.hero_copy)}</p>
    </section>
  `;
}

function homepageTemplate(data) {
  const { settings, testimonials } = data;
  const galleryImages = settings.gallery_images || [];
  const fallbackSkull = "https://static.wixstatic.com/media/da4e2b_88a856d8e39542a1aba400685cd3a2d0~mv2.png/v1/fill/w_48,h_67,al_c,q_85,usm_0.66_1.00_0.01,blur_2,enc_avif,quality_auto/SKULL.avif";
  const skullSrc = settings.skull_image && String(settings.skull_image).trim() !== "" ? settings.skull_image : fallbackSkull;
  const skulls = new Array(4).fill(skullSrc);

  return `
    ${heroTemplate(settings)}
    <section class="section">
      <div class="skull-row">
        ${skulls.map((src) => `<img src="${escapeHtml(src)}" alt="Skull icon">`).join("")}
      </div>
      <h2 class="section-title">${escapeHtml(settings.secret_sauce_title)}</h2>
      <p class="plain-copy">${escapeHtml(settings.secret_sauce_copy)}</p>
      <div class="cta-row" style="margin-top:18px">
        <a class="pill-link" href="${escapeHtml(settings.menu_primary_url)}" target="_blank" rel="noreferrer">${escapeHtml(settings.menu_primary_label)}</a>
      </div>
    </section>
    <section class="section">
      <h2 class="section-title">TABLE TALK</h2>
      <div class="testimonials">
        ${testimonials
          .map(
            (item) => `
              <article class="testimonial">
                <p>"${escapeHtml(decodeEntities(item.quote))}"</p>
                <h3>- ${escapeHtml(item.author || item.title)}</h3>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
    <section class="section">
      <div class="gallery-grid">
        ${galleryImages.map((src) => `<img src="${escapeHtml(src)}" alt="${escapeHtml(settings.brand_name)} gallery image">`).join("")}
      </div>
    </section>
  `;
}

function aboutTemplate(data) {
  const { settings } = data;
  return `
    <section class="page-block">
      <div class="eyebrow">ABOUT</div>
      <div class="about-layout">
        <div>
          <h1 class="page-title">${escapeHtml(settings.about_title)}</h1>
          <p class="plain-copy">${escapeHtml(settings.about_copy)}</p>
        </div>
        <div class="about-visual">
          <img class="about-secondary" src="${escapeHtml(settings.about_secondary_image)}" alt="${escapeHtml(settings.brand_name)} secondary image">
        </div>
      </div>
      <div style="margin-top:24px">
        <img class="about-primary" src="${escapeHtml(settings.about_primary_image)}" alt="${escapeHtml(settings.brand_name)} primary image">
      </div>
    </section>
  `;
}

function locationsTemplate(data) {
  const { settings, locations } = data;
  return `
    <section class="page-block">
      <div class="eyebrow">LOCATIONS</div>
      <h1 class="page-title">${escapeHtml(settings.locations_title)}</h1>
      <p class="plain-copy">${escapeHtml(settings.locations_copy)}</p>
      <div class="locations-list" style="margin-top:20px">
        ${locations
          .map(
            (item) => `
              <article class="location-item">
                <h3>${escapeHtml(item.name)}</h3>
                <p>${escapeHtml(item.address)}, ${escapeHtml(item.city)}</p>
                <p>${escapeHtml(item.copy)}</p>
                <div class="cta-row" style="justify-content:flex-start; margin-top:12px">
                  <a class="pill-link" href="${escapeHtml(item.menu_url)}" target="_blank" rel="noreferrer">MENU</a>
                  <a class="pill-link" href="${escapeHtml(item.order_url)}" target="_blank" rel="noreferrer">ORDER</a>
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function pressTemplate(data) {
  const { settings, press_items } = data;
  return `
    <section class="page-block">
      <div class="eyebrow">PRESS</div>
      <h1 class="page-title">${escapeHtml(settings.press_title)}</h1>
      <p class="press-copy">${escapeHtml(settings.press_copy)}</p>
      <div class="press-list" style="margin-top:20px">
        ${press_items
          .map(
            (item) => `
              <article class="press-item">
                <div class="press-outlet">${escapeHtml(item.outlet)}</div>
                <h3>${escapeHtml(item.title)}</h3>
                <p>${escapeHtml(item.excerpt)}</p>
                <div class="cta-row" style="justify-content:flex-start; margin-top:12px">
                  <a class="pill-link" href="${escapeHtml(item.external_url)}" target="_blank" rel="noreferrer">READ MORE</a>
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function pageContent(pathname, data) {
  switch (pathname) {
    case "/about":
      return aboutTemplate(data);
    case "/locations":
      return locationsTemplate(data);
    case "/press":
      return pressTemplate(data);
    default:
      return homepageTemplate(data);
  }
}

async function render() {
  const root = document.getElementById("app");

  try {
    const response = await fetch("/api/site");
    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    const data = await response.json();
    const pathname = window.location.pathname;
    const { settings } = data;

    root.innerHTML = `
      <div class="site-shell">
        <header class="topbar">
          <a href="/" class="brand">${escapeHtml(settings.brand_name)}</a>
        </header>
        <main>${pageContent(pathname, data)}</main>
        <footer class="footer">
          <div class="footer-nav">
            <a class="follow-link" href="${escapeHtml(settings.instagram_url)}" target="_blank" rel="noreferrer">${escapeHtml(settings.follow_label)}</a>
          </div>
          ${siteFooterMarkup(settings)}
        </footer>
      </div>
    `;
  } catch (error) {
    root.innerHTML = `
      <div class="error-shell">
        <div>
          <h1>Frontend error</h1>
          <p>${escapeHtml(error.message)}</p>
        </div>
      </div>
    `;
  }
}

render();
