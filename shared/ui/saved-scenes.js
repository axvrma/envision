import { prepareDialog } from "./dialog.js";
import { SceneRepository } from "../persistence.js";
import { composition, exportScene, importScene } from "../scene-state.js";
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export function mountSceneManager(
  host,
  { getObjects, onLoad, notify = () => {} },
) {
  const repository = new SceneRepository();
  const dialog = document.createElement("dialog");
  dialog.className = "saved-scenes-dialog";
  dialog.setAttribute("aria-labelledby", "saved-scene-title");
  dialog.innerHTML = `<div class="sheet-heading"><div><span class="sheet-kicker">ON THIS BROWSER</span><h2 id="saved-scene-title">Your playgrounds</h2></div><button type="button" data-close aria-label="Close saved scenes">×</button></div><p class="storage-note">Save a virtual composition. Reopening in AR requires a new tracked origin. Physical anchors are never saved. Scenes stay on this browser and origin.</p><form class="scene-save-form"><label>Scene name<input name="name" required maxlength="80" value="My playground" autocomplete="off"></label><button class="primary" type="submit">Save scene</button></form><p class="storage-feedback" role="status"></p><div class="saved-list"></div><div class="scene-file-actions"><button type="button" data-export>Export scene JSON</button><label class="file-button">Import scene JSON<input type="file" accept="application/json,.json" data-import></label></div>`;
  host.appendChild(dialog);
  prepareDialog(dialog);
  const list = dialog.querySelector(".saved-list"),
    feedback = dialog.querySelector(".storage-feedback");
  const report = (message) => {
    feedback.textContent = message;
    notify(message);
  };
  const run = async (fn) => {
    try {
      await fn();
    } catch (error) {
      report(error.message);
    }
  };
  async function refresh() {
    const rows = await repository.list();
    list.replaceChildren();
    if (!rows.length) {
      const p = document.createElement("p");
      p.textContent = "No saved playgrounds yet. Make something worth keeping.";
      list.appendChild(p);
    }
    for (const row of rows) {
      const article = document.createElement("article");
      article.className = "saved-scene";
      const heading = document.createElement("strong");
      heading.textContent = row.scene.name;
      article.appendChild(heading);
      const meta = document.createElement("small");
      meta.textContent = `${row.scene.objects.length} objects · ${new Date(row.updatedAt).toLocaleDateString()}`;
      article.appendChild(meta);
      const input = document.createElement("input");
      input.value = row.scene.name;
      input.maxLength = 80;
      input.setAttribute("aria-label", `Rename ${row.scene.name}`);
      article.appendChild(input);
      const actions = document.createElement("div");
      for (const [label, action] of [
        [
          "Open",
          async () => {
            const scene = await repository.load(row.id);
            if (
              getObjects().length &&
              !window.confirm(
                "Replace the current composition? You can undo after opening.",
              )
            )
              return;
            onLoad(scene);
            dialog.close();
          },
        ],
        [
          "Rename",
          async () => {
            await repository.rename(row.id, input.value);
            await refresh();
            report("Scene renamed.");
          },
        ],
        [
          "Duplicate",
          async () => {
            await repository.duplicate(row.id);
            await refresh();
            report("Saved scene duplicated.");
          },
        ],
        [
          "Delete",
          async () => {
            if (!window.confirm("Delete this saved scene from this browser?"))
              return;
            await repository.remove(row.id);
            await refresh();
            report("Saved scene deleted.");
          },
        ],
        [
          "Export",
          async () => {
            downloadBlob(
              new Blob([exportScene(await repository.load(row.id))], {
                type: "application/json",
              }),
              "envision-scene.json",
            );
            report("Scene JSON exported.");
          },
        ],
      ]) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.setAttribute("aria-label", `${label} ${row.scene.name}`);
        button.onclick = () => run(action);
        actions.appendChild(button);
      }
      article.appendChild(actions);
      list.appendChild(article);
    }
  }
  dialog.querySelector("[data-close]").onclick = () => dialog.close();
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        dialog.close();
    }
  });
  dialog.querySelector("form").onsubmit = (event) => {
    event.preventDefault();
    run(async () => {
      await repository.save(
        composition(getObjects(), dialog.querySelector("[name=name]").value),
      );
      await refresh();
      report("Scene saved in this browser.");
    });
  };
  dialog.querySelector("[data-export]").onclick = () =>
    run(async () => {
      downloadBlob(
        new Blob(
          [
            exportScene(
              composition(
                getObjects(),
                dialog.querySelector("[name=name]").value,
              ),
            ),
          ],
          { type: "application/json" },
        ),
        "envision-scene.json",
      );
      report("Scene JSON exported.");
    });
  dialog.querySelector("[data-import]").onchange = (event) =>
    run(async () => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      if (file.size > 100000)
        throw new Error("Scene JSON must be smaller than 100 KB.");
      const scene = importScene(await file.text());
      await repository.save(scene);
      await refresh();
      report("Imported and saved. Open it to restore its composition.");
    });
  return {
    open: () => {
      feedback.textContent = "";
      dialog.showModal();
      run(refresh);
    },
    destroy: () => {
      dialog.remove();
      repository.close().catch(() => {});
    },
  };
}
