// Lista de projetos em split-screen: a coluna esquerda espelha o
// .projeto-detalhe do item sob o cursor. O painel é montado a partir da própria
// lista, então cada projeto continua declarado num lugar só no HTML.
(function () {
  "use strict";

  var lista = document.querySelector(".projetos-lista");
  var visual = document.querySelector(".projetos-visual");
  if (!lista || !visual) return;

  var itens = Array.prototype.slice.call(
    lista.querySelectorAll(".projeto-item")
  );
  if (!itens.length) return;

  // Marca que o painel existe: só então o CSS esconde o detalhe embutido no
  // desktop. Sem JS a página continua sendo a lista empilhada de sempre.
  document.documentElement.classList.add("js-projetos");

  var paineis = itens.map(function (li, i) {
    var detalhe = li.querySelector(".projeto-detalhe");
    var painel = document.createElement("div");
    painel.className = "visual-item";
    painel.setAttribute("data-index", String(i));

    if (detalhe) {
      var copia = detalhe.cloneNode(true);
      copia.className = "visual-conteudo";
      // O clone é decorativo; a versão acessível é a que fica na lista.
      copia.removeAttribute("id");

      // Projeto sem imagem ganha uma capa com o próprio nome.
      if (!copia.querySelector(".projeto-imagem")) {
        var nomeEl = li.querySelector(".projeto-nome");
        var capa = document.createElement("div");
        capa.className = "projeto-imagem projeto-imagem-vazia";
        var rotulo = document.createElement("span");
        rotulo.className = "capa-nome";
        rotulo.textContent = nomeEl ? nomeEl.textContent.trim() : "";
        capa.appendChild(rotulo);
        copia.insertBefore(capa, copia.firstChild);
      }

      painel.appendChild(copia);
    }

    visual.appendChild(painel);
    return painel;
  });

  var ativo = -1;

  function ativar(i) {
    if (i === ativo) return;
    ativo = i;

    lista.classList.add("tem-hover");

    itens.forEach(function (li, n) {
      li.classList.toggle("ativo", n === i);
    });
    paineis.forEach(function (p, n) {
      p.classList.toggle("ativo", n === i);
    });
  }

  function limpar() {
    ativo = -1;
    lista.classList.remove("tem-hover");
    itens.forEach(function (li) {
      li.classList.remove("ativo");
    });
    paineis.forEach(function (p) {
      p.classList.remove("ativo");
    });
  }

  itens.forEach(function (li, i) {
    li.addEventListener("mouseenter", function () {
      ativar(i);
    });
    // Teclado: o item com link recebe foco e mostra o mesmo painel.
    li.addEventListener("focusin", function () {
      ativar(i);
    });
  });

  lista.addEventListener("mouseleave", limpar);
  lista.addEventListener("focusout", function (e) {
    if (!lista.contains(e.relatedTarget)) limpar();
  });
})();
