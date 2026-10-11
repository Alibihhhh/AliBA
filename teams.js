(function () {
  const grid = document.querySelector(".teams-grid");
  if (!grid) return;

  // Если анимации отключены или браузер старый: показываем карточки сразу
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !("IntersectionObserver" in window)) return;

  // Включаем стартовое "скрытое" состояние карточек
  grid.classList.add("is-animated");

  // Следим, когда карточка попадает в экран
  const watcher = new IntersectionObserver(
    function (entries) {
      let k = 0; // номер карточки в этой пачке
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        // Карточки, появившиеся одновременно, идут по очереди (0.1 с между ними)
        entry.target.style.setProperty("--d", k * 0.1 + "s");
        entry.target.classList.add("in");
        watcher.unobserve(entry.target); // показываем один раз
        k++;
      });
    },
    { threshold: 0.2, rootMargin: "0px 0px -40px 0px" },
  );
});
