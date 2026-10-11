const items = document.querySelectorAll(".reveal");

const watcher = new IntersectionObserver(
  function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
      }
    });
  },
  { threshold: 0.2 },
);

items.forEach(function (item) {
  watcher.observe(item);
});

(function () {
  const nav = document.querySelector(".main-nav");
  if (!nav) return;

  const indicator = nav.querySelector(".nav-indicator");
  const items = Array.from(nav.querySelectorAll(".nav-item"));
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  // Что анимируем при смене страницы: всё, кроме шапки, видео и затемнения
  const SELECTOR =
    "body > :not(script):not(.header):not(.hero-section), " +
    ".hero-section > :not(.header):not(.bg-video):not(.overlay)";
  const targets = Array.from(document.querySelectorAll(SELECTOR));

  // ---------- Какая страница сейчас открыта ----------
  const fileOf = (url) =>
    new URL(url, location.href).pathname.split("/").pop() || "index.html";

  let current = items.findIndex(
    (a) => fileOf(a.href) === fileOf(location.href),
  );
  if (current < 0) current = 0;

  let shown = current; // на каком пункте сейчас стоит плашка
  let leaving = false;

  // ---------- Плашка и активный пункт ----------
  function setActive(i) {
    items.forEach((a, n) => {
      a.classList.toggle("active", n === i);
      if (n === i) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  function placeIndicator(i, animate) {
    const a = items[i];
    if (!animate) indicator.style.transition = "none";
    indicator.style.width = a.offsetWidth + "px";
    indicator.style.transform = "translateX(" + a.offsetLeft + "px)";
    if (!animate) {
      void indicator.offsetWidth; // применить без анимации
      indicator.style.transition = "";
    }
    // на телефоне прокрутить меню так, чтобы пункт был по центру
    if (nav.scrollWidth > nav.clientWidth) {
      nav.scrollTo({
        left: a.offsetLeft - (nav.clientWidth - a.offsetWidth) / 2,
        behavior: animate ? "smooth" : "auto",
      });
    }
    shown = i;
  }

  // ---------- Анимации контента ----------
  function playEnter(dir) {
    if (reduceMotion) return;
    targets.forEach((el, i) => {
      el.animate(
        [
          {
            opacity: 0,
            transform:
              "translate(" + dir * 40 + "px, " + (dir ? 0 : 24) + "px)",
          },
          { opacity: 1, transform: "none" },
        ],
        {
          duration: 520,
          delay: 80 + i * 70, // небольшая задержка между блоками
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "backwards",
        },
      );
    });
  }

  function playExit(dir) {
    if (reduceMotion) return;
    targets.forEach((el) => {
      el.animate(
        [
          { opacity: 1, transform: "none" },
          { opacity: 0, transform: "translateX(" + -dir * 30 + "px)" },
        ],
        { duration: 300, easing: "ease-in", fill: "forwards" },
      );
    });
  }

  // ---------- Старт страницы ----------
  const from = parseInt(sessionStorage.getItem("navFrom"), 10);
  const enterDir = parseInt(sessionStorage.getItem("navDir"), 10) || 0;
  sessionStorage.removeItem("navFrom");
  sessionStorage.removeItem("navDir");

  const startIndex =
    !reduceMotion && !isNaN(from) && from >= 0 && from < items.length
      ? from
      : current;

  setActive(startIndex);
  placeIndicator(startIndex, false);

  if (startIndex !== current) {
    // плашка доезжает от прошлого пункта до текущего
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setActive(current);
        placeIndicator(current, true);
      }),
    );
  }
  playEnter(enterDir);

  // ---------- Переход на другую страницу ----------
  function go(i) {
    if (leaving || i === current) return;
    leaving = true;
    const dir = i > current ? 1 : -1;

    sessionStorage.setItem("navFrom", current);
    sessionStorage.setItem("navDir", dir);

    setActive(i);
    placeIndicator(i, true);
    playExit(dir);

    setTimeout(
      () => {
        location.href = items[i].href;
      },
      reduceMotion ? 0 : 320,
    );
  }

  items.forEach((a, i) => {
    a.addEventListener("click", (e) => {
      // Ctrl/Cmd+клик и средняя кнопка работают как обычные ссылки
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)
        return;
      e.preventDefault();
      go(i);
    });
  });

  // ---------- Клавиатура: стрелки внутри меню ----------
  nav.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const idx = items.indexOf(document.activeElement);
    if (idx < 0) return;
    const step = e.key === "ArrowRight" ? 1 : -1;
    items[(idx + step + items.length) % items.length].focus();
    e.preventDefault();
  });

  // ---------- Свайп на телефоне ----------
  let sx = 0,
    sy = 0,
    tracking = false;

  document.addEventListener(
    "touchstart",
    (e) => {
      if (
        e.touches.length !== 1 ||
        e.target.closest("input, textarea, select, .main-nav, [data-no-swipe]")
      ) {
        tracking = false;
        return;
      }
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
      tracking = true;
    },
    { passive: true },
  );

  document.addEventListener(
    "touchend",
    (e) => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      // порог 70px, и жест должен быть явно горизонтальным
      if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      const next = dx < 0 ? current + 1 : current - 1;
      if (next >= 0 && next < items.length) go(next);
    },
    { passive: true },
  );

  // ---------- Пересчёт при ресайзе, шрифте и кнопке "Назад" ----------
  window.addEventListener("resize", () => placeIndicator(shown, false));
  if (document.fonts)
    document.fonts.ready.then(() => placeIndicator(shown, false));

  window.addEventListener("pageshow", (e) => {
    if (!e.persisted) return; // страница вернулась из кэша браузера
    leaving = false;
    targets.forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
    setActive(current);
    placeIndicator(current, false);
  });
})();

document.querySelectorAll(".race-table tbody tr").forEach(function (row, i) {
  row.style.animationDelay = 0.3 + i * 0.05 + "s";
});

(function () {
  const cols = document.querySelector(".drivers-cols");
  if (!cols) return;

  // Если у человека отключены анимации: ничего не делаем, карточки стоят списком
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const tracks = cols.querySelectorAll(".track");

  // 1. Дублируем карточки, чтобы круг был бесшовным.
  //    Копии скрыты от скринридеров (aria-hidden), чтобы не читать пилотов дважды.
  tracks.forEach(function (track) {
    Array.from(track.children).forEach(function (card) {
      const copy = card.cloneNode(true);
      copy.setAttribute("aria-hidden", "true");
      track.appendChild(copy);
    });
  });

  // 2. Включаем анимацию (CSS начинает двигать колонки)
  cols.classList.add("is-animated");

  // 3. Плавная остановка колонки при наведении на карточку
  tracks.forEach(function (track) {
    let rate = 1; // текущая скорость (1 = едет, 0 = стоит)
    let target = 1; // к чему стремимся
    let frame = null;

    function step() {
      rate += (target - rate) * 0.15;
      if (Math.abs(target - rate) < 0.01) rate = target;

      const anim = track.getAnimations()[0];
      if (anim) anim.updatePlaybackRate(rate);

      frame = rate === target ? null : requestAnimationFrame(step);
    }

    function setTarget(value) {
      target = value;
      if (!frame) frame = requestAnimationFrame(step);
    }

    track.querySelectorAll(".card").forEach(function (card) {
      card.addEventListener("mouseenter", function () {
        setTarget(0);
      });
      card.addEventListener("mouseleave", function () {
        setTarget(1);
      });
    });
  });
})();
