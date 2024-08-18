import { open } from '@tauri-apps/plugin-dialog';
import { readDir, copyFile } from '@tauri-apps/plugin-fs';
import { basename, join } from '@tauri-apps/api/path';
import { convertFileSrc } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getVersion } from "@tauri-apps/api/app";

getVersion().then(ver => {
  getCurrentWindow().setTitle(`写真コピー2 [v${ver}]`);
});

const source_folder_path_list = document.querySelector("#source_folder_path_list") as HTMLTextAreaElement;
const destination_folder_path = document.querySelector("#destination_folder_path") as HTMLInputElement;
const filename_entry_list = document.querySelector("#filename_entry_list") as HTMLTextAreaElement;
const ambiguous_path_list = document.querySelector("#ambiguous_path_list") as HTMLSelectElement;
const preview_img_wrapper = document.querySelector("#preview_img_wrapper") as HTMLDivElement;

window.addEventListener("DOMContentLoaded", () => {
  document.querySelector("#add_folder_button")?.addEventListener("click", async _e => {
    const selected = await open({
      multiple: true,
      directory: true,
    });
    if (selected === null) {
      return;
    }
    source_folder_path_list.value += selected.join("\n") + "\n";
  });
  document.querySelector("#select_folder_button")?.addEventListener("click", async _e => {
    const selected = await open({
      directory: true,
    });
    if (selected === null) {
      return;
    }
    destination_folder_path.value = selected;
  });
  let pending_ambiguous = (_v: string) => { };
  document.querySelector("#copy_start_button")?.addEventListener("click", async _e => {
    preview_img_wrapper.style.backgroundImage = "";
    preview_img_wrapper.classList.remove("active");
    ambiguous_path_list.textContent = "";
    const all_files = (await Promise.all(source_folder_path_list.value.split(/\r?\n/).filter(dir => dir !== "").map(dir => readDir(dir).then(files => Promise.all(files.filter(file => file.isFile).map(file => join(dir, file.name))))))).flat();
    const not_found_entries = [];
    for await (const entry of filename_entry_list.value.split(/\r?\n/).filter(dir => dir !== "")) {
      const hit_files = all_files.filter(path => path.includes(entry));
      if (hit_files.length == 0) {
        not_found_entries.push(entry);
        continue;
      }
      if (hit_files.length > 1) {
        ambiguous_path_list.textContent = "";
        ambiguous_path_list.insertAdjacentHTML("beforeend", hit_files.map(path =>/*html*/`<option class="ambiuous_file_option" value="${path}">${path}</option>`).join());
        (ambiguous_path_list.querySelector(".ambiuous_file_option") as HTMLOptionElement).selected = true;
        ambiguous_path_list.dispatchEvent(new Event("input"));
        hit_files[0] = await new Promise((res, _rej) => { pending_ambiguous = res; });
      }
      await copyFile(hit_files[0], await join(destination_folder_path.value, await basename(hit_files[0])));
    }
    filename_entry_list.value = not_found_entries.join("\n");
    preview_img_wrapper.style.backgroundImage = "";
    preview_img_wrapper.classList.remove("active");
    ambiguous_path_list.textContent = "";
  });
  ambiguous_path_list.addEventListener("input", async _e => {
    preview_img_wrapper.style.backgroundImage = `url(${convertFileSrc(ambiguous_path_list.value)})`;
    preview_img_wrapper.classList.add("active");
  });
  preview_img_wrapper.addEventListener("click", async _e => {
    pending_ambiguous(ambiguous_path_list.value);
  });
});
