// Abre e fecha o overlay de navegação. Os links existem no HTML mesmo sem JS
// (ver o <noscript> de cada página), então isto só controla a exibição.
(function () {
  "use strict";

  var toggle = document.getElementById("menu-toggle");
  var overlay = document.getElementById("menu-overlay");
  if (!toggle || !overlay) return;

  var focoAnterior = null;

  function aberto() {
    return overlay.classList.contains("aberto");
  }

  function abrir() {
    focoAnterior = document.activeElement;
    overlay.classList.add("aberto");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Fechar menu");
    document.body.style.overflow = "hidden";

    var primeiro = overlay.querySelector(".menu-link");
    if (primeiro) primeiro.focus();
  }

  function fechar() {
    overlay.classList.remove("aberto");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Abrir menu");
    document.body.style.overflow = "";

    if (focoAnterior && typeof focoAnterior.focus === "function") {
      focoAnterior.focus();
    }
  }

  toggle.addEventListener("click", function () {
    if (aberto()) fechar();
    else abrir();
  });

  // Esc fecha; Tab fica preso dentro do overlay enquanto ele estiver aberto.
  document.addEventListener("keydown", function (e) {
    if (!aberto()) return;

    if (e.key === "Escape") {
      fechar();
      return;
    }

    if (e.key !== "Tab") return;

    var focaveis = [toggle].concat(
      Array.prototype.slice.call(overlay.querySelectorAll(".menu-link"))
    );
    var primeiro = focaveis[0];
    var ultimo = focaveis[focaveis.length - 1];

    if (e.shiftKey && document.activeElement === primeiro) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primeiro.focus();
    }
  });

  // Clique no vazio do overlay fecha.
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) fechar();
  });
})();
