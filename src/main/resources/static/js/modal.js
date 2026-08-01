// Program detail modal — opens a <dialog> populated from the clicked card.
(function () {
  const modal = document.getElementById("program-modal");
  if (!modal || typeof modal.showModal !== "function") return;

  const tag = document.getElementById("m-tag");
  const day = document.getElementById("m-day");
  const set = (id, text) => {
    document.getElementById(id).textContent = text || "";
  };

  function open(card) {
    const d = card.dataset;
    tag.textContent = d.category;
    tag.setAttribute("data-cat", d.category);
    if (d.day && d.day !== "0" && d.dayLabel) {
      day.textContent = d.dayLabel;
      day.hidden = false;
    } else {
      day.hidden = true;
    }
    set("m-title", d.title);
    set("m-time", d.time);
    set("m-place", d.place);
    set("m-desc", d.desc);
    modal.showModal();
  }

  document.querySelectorAll(".card[data-title], .mx-cell[data-title]").forEach((el) => {
    el.addEventListener("click", () => open(el));
  });

  modal.querySelector(".modal-close").addEventListener("click", () => modal.close());

  // Click on the backdrop (outside the dialog content) closes it.
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.close();
  });
})();
