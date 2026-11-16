// "General" section: interface language.

import { getLangPref, setLangPref } from "../../../core/storage.js";
import { $ } from "../../../ui/dom.js";

export function initGeneral() {
  getLangPref().then((lang) => { $("langSelect").value = lang; });
  $("langSelect").addEventListener("change", () => setLangPref($("langSelect").value));
}
