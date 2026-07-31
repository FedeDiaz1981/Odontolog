const menuButton = document.querySelector(".menu-button");
const menu = document.querySelector(".main-menu");
const menuLinks = [...document.querySelectorAll(".main-menu a")];
const clinicAddress = "Av. Rivadavia 9655, Villa Luro, CABA";

const routeOriginInput = document.getElementById("route-origin");
const routeButton = document.getElementById("route-button");
const useLocationButton = document.getElementById("use-location-button");
const routeStatus = document.getElementById("route-status");
const clinicMapEl = document.getElementById("clinic-map");
const testimonialsGrid = document.querySelector("[data-testimonials-grid]");
const turnoWhatsappUrl =
  "https://wa.me/5491166573488?text=Hola%20Odontolog%20Villa%20Luro%2C%20quisiera%20pedir%20un%20turno.%20%C2%BFMe%20pueden%20ayudar%3F";

const modalTriggers = [...document.querySelectorAll("[data-modal-open]")];
const modalForms = [...document.querySelectorAll("[data-modal-form]")];
let activeModal = null;
let lastFocusedElement = null;

function closeMenu() {
  menu?.classList.remove("open");
  document.body.classList.remove("menu-open");
  menuButton?.setAttribute("aria-expanded", "false");

  const icon = menuButton?.querySelector("i");
  icon?.classList.remove("fa-xmark");
  icon?.classList.add("fa-bars");
}

function setRouteStatus(message, kind = "info") {
  if (!routeStatus) return;

  routeStatus.textContent = message;
  routeStatus.dataset.kind = kind;
}

function openDirections(origin) {
  const cleanedOrigin = origin.trim();

  if (!cleanedOrigin) {
    setRouteStatus("Escribi un punto de partida o usa tu ubicacion actual.", "error");
    routeOriginInput?.focus();
    return;
  }

  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("origin", cleanedOrigin);
  url.searchParams.set("destination", clinicAddress);
  url.searchParams.set("travelmode", "driving");

  window.open(url.toString(), "_blank", "noopener,noreferrer");
  setRouteStatus(`Abriendo indicaciones desde ${cleanedOrigin}.`, "success");
}

function useCurrentLocation() {
  if (!navigator.geolocation) {
    setRouteStatus("Tu navegador no permite usar la ubicacion actual.", "error");
    return;
  }

  setRouteStatus("Buscando tu ubicacion actual...", "info");

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const origin = `${position.coords.latitude},${position.coords.longitude}`;

      if (routeOriginInput) {
        routeOriginInput.value = origin;
      }

      setRouteStatus(
        "Ubicacion detectada. Ahora tocá 'Como llegar' para abrir la ruta.",
        "success"
      );
    },
    () => {
      setRouteStatus(
        "No pudimos acceder a tu ubicacion. Proba escribiendo una direccion.",
        "error"
      );
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    }
  );
}

async function resolveClinicCoordinates() {
  const fallback = {
    lat: -34.6398,
    lng: -58.4978,
  };

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(
        `${clinicAddress}, Buenos Aires, Argentina`
      )}`
    );

    if (!response.ok) {
      return fallback;
    }

    const results = await response.json();
    const firstResult = results?.[0];

    if (!firstResult) {
      return fallback;
    }

    return {
      lat: Number(firstResult.lat),
      lng: Number(firstResult.lon),
    };
  } catch {
    return fallback;
  }
}

async function initClinicMap() {
  if (!clinicMapEl || !window.L) return;

  const coords = await resolveClinicCoordinates();
  const map = window.L.map(clinicMapEl, {
    scrollWheelZoom: false,
  }).setView([coords.lat, coords.lng], 16);

  window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map);

  window.L.marker([coords.lat, coords.lng])
    .addTo(map)
    .bindPopup(`<strong>Odontolog Villa Luro</strong><br>${clinicAddress}`);
}

function initClinicCarousel() {
  const carousel = document.querySelector("[data-clinic-carousel]");
  if (!carousel) return;

  const viewport = carousel.querySelector("[data-carousel-viewport]");
  const prevButton = carousel.querySelector("[data-carousel-prev]");
  const nextButton = carousel.querySelector("[data-carousel-next]");
  const dotsContainer = carousel.querySelector("[data-carousel-dots]");

  if (!viewport || !prevButton || !nextButton || !dotsContainer) return;

  const slides = [...carousel.querySelectorAll(".carousel-slide")];
  if (!slides.length) return;

  let activeIndex = 0;

  const dots = slides.map((_, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "carousel-dot";
    dot.setAttribute("aria-label", `Ver imagen ${index + 1}`);
    dot.addEventListener("click", () => goTo(index));
    dotsContainer.appendChild(dot);
    return dot;
  });

  function setActive(index) {
    activeIndex = index;
    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle("is-active", dotIndex === index);
    });
  }

  function goTo(index) {
    const nextIndex = Math.max(0, Math.min(index, slides.length - 1));
    slides[nextIndex].scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
    });
    setActive(nextIndex);
  }

  let scrollFrame = 0;
  function syncFromScroll() {
    const width = viewport.clientWidth || 1;
    const index = Math.max(0, Math.min(slides.length - 1, Math.round(viewport.scrollLeft / width)));
    setActive(index);
  }

  viewport.addEventListener(
    "scroll",
    () => {
      window.cancelAnimationFrame(scrollFrame);
      scrollFrame = window.requestAnimationFrame(syncFromScroll);
    },
    { passive: true }
  );

  prevButton.addEventListener("click", () => goTo(activeIndex - 1));
  nextButton.addEventListener("click", () => goTo(activeIndex + 1));

  viewport.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(activeIndex - 1);
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(activeIndex + 1);
    }
  });

  setActive(0);
}

function buildTestimonialCard(review) {
  const article = document.createElement("article");
  article.className = "testimonial-card reveal";

  const quote = document.createElement("span");
  quote.className = "quote";
  quote.textContent = "“";

  const quoteText = document.createElement("p");
  quoteText.textContent = review.text || "";

  const footer = document.createElement("footer");

  const author = document.createElement("strong");
  author.textContent = review.author || "Paciente";

  const signature = document.createElement("span");
  signature.className = "signature";
  signature.textContent = review.signature || "Google";

  footer.append(author, signature);
  article.append(quote, quoteText, footer);

  return article;
}

async function initTestimonials() {
  if (!testimonialsGrid) return;

  const fallbackReviews = [
    {
      author: "Car",
      signature: "Alexander",
      text: "Muy buena atencion, precios acomodados a la situacion actual, excelente profesional y muy recomendable.",
    },
    {
      author: "Miriam",
      signature: "Melina",
      text: "Muy buena atencion, resultados excelentes. Volvi a recuperar mi sonrisa y muy buen precio. Gracias por todo.",
    },
    {
      author: "Paola",
      signature: "Google",
      text: "Excelente trato, explican todo con claridad y te hacen sentir comoda desde el primer momento.",
    },
  ];

  let reviews = fallbackReviews;

  try {
    const response = await fetch("assets/data/reviews.json", { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length) {
        reviews = data;
      }
    }
  } catch {
    reviews = fallbackReviews;
  }

  testimonialsGrid.replaceChildren(...reviews.map(buildTestimonialCard));

  window.requestAnimationFrame(() => {
    testimonialsGrid.querySelectorAll(".reveal").forEach((element) => {
      element.classList.add("is-visible");
    });
  });
}

function initTurnoCtas() {
  document.querySelectorAll("[data-turno-cta]").forEach((element) => {
    if (element instanceof HTMLAnchorElement) {
      element.href = turnoWhatsappUrl;
      element.target = "_blank";
      element.rel = "noopener noreferrer";
      return;
    }

    element.addEventListener("click", () => {
      window.open(turnoWhatsappUrl, "_blank", "noopener,noreferrer");
    });
  });
}

function getModalByName(name) {
  return document.getElementById(`modal-${name}`);
}

function openModal(name) {
  const modal = getModalByName(name);
  if (!modal) return;

  lastFocusedElement = document.activeElement;
  activeModal = modal;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  const firstFocusable = modal.querySelector(
    "button, [href], input, textarea, select, [tabindex]:not([tabindex='-1'])"
  );
  firstFocusable?.focus();
}

function closeModal(modal = activeModal) {
  if (!modal) return;

  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");

  if (lastFocusedElement instanceof HTMLElement) {
    lastFocusedElement.focus();
  }

  activeModal = null;
}

if (menuButton && menu) {
  menuButton.addEventListener("click", () => {
    const willOpen = !menu.classList.contains("open");

    menu.classList.toggle("open", willOpen);
    document.body.classList.toggle("menu-open", willOpen);
    menuButton.setAttribute("aria-expanded", String(willOpen));

    const icon = menuButton.querySelector("i");
    icon?.classList.toggle("fa-bars", !willOpen);
    icon?.classList.toggle("fa-xmark", willOpen);
  });
}

menuLinks.forEach((link) => {
  link.addEventListener("click", closeMenu);
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 1100) {
    closeMenu();
  }
});

routeButton?.addEventListener("click", () => {
  const origin = routeOriginInput?.value ?? "";

  if (origin.trim()) {
    openDirections(origin);
    return;
  }

  useCurrentLocation();
});

useLocationButton?.addEventListener("click", useCurrentLocation);

routeOriginInput?.addEventListener("input", () => {
  setRouteStatus("Ingresa un punto de partida para ver como llegar.", "info");
});

modalTriggers.forEach((trigger) => {
  trigger.addEventListener("click", () => {
    const name = trigger.getAttribute("data-modal-open");
    if (name) openModal(name);
  });
});

document.querySelectorAll("[data-modal-close]").forEach((element) => {
  element.addEventListener("click", () => closeModal());
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && activeModal) {
    closeModal();
  }
});

document.addEventListener("click", (event) => {
  if (!activeModal) return;

  const target = event.target;
  if (!(target instanceof Element)) return;

  if (target.classList.contains("modal")) {
    closeModal();
  }
});

modalForms.forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const formType = form.getAttribute("data-modal-form") || "consulta";
    const data = new FormData(form);
    const fields = Object.fromEntries(data.entries());

    const subject =
      formType === "turno"
        ? "Solicitud de turno - Odontolog Villa Luro"
        : "Consulta - Odontolog Villa Luro";

    const bodyLines =
      formType === "turno"
        ? [
            `Nombre: ${fields.nombre || ""}`,
            `Telefono: ${fields.telefono || ""}`,
            `Email: ${fields.email || ""}`,
            `Fecha preferida: ${fields.fecha || ""}`,
            `Hora preferida: ${fields.hora || ""}`,
            `Motivo: ${fields.motivo || ""}`,
            "",
            `Comentario: ${fields.comentario || ""}`,
          ]
        : [
            `Nombre: ${fields.nombre || ""}`,
            `Email: ${fields.email || ""}`,
            `Asunto: ${fields.asunto || ""}`,
            "",
            `Consulta: ${fields.consulta || ""}`,
          ];

    const mailto = new URL("mailto:guidosantagada@gmail.com");
    mailto.searchParams.set("subject", subject);
    mailto.searchParams.set("body", bodyLines.join("\n"));

    closeModal();
    form.reset();
    window.location.href = mailto.toString();
  });
});

const sections = [...document.querySelectorAll("main section[id], main .nav-observe[id], header[id]")];

if ("IntersectionObserver" in window) {
  const navigationObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) return;

      menuLinks.forEach((link) => {
        link.classList.toggle(
          "active",
          link.getAttribute("href") === `#${visible.target.id}`
        );
      });
    },
    {
      rootMargin: "-35% 0px -55% 0px",
      threshold: [0.01, 0.25, 0.5],
    }
  );

  sections.forEach((section) => navigationObserver.observe(section));
} else {
  menuLinks.forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === "#inicio");
  });
}

const revealElements = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.12,
      rootMargin: "0px 0px -40px",
    }
  );

  revealElements.forEach((element) => revealObserver.observe(element));
} else {
  revealElements.forEach((element) => element.classList.add("is-visible"));
}

initClinicCarousel();
initClinicMap();
initTestimonials();
initTurnoCtas();
