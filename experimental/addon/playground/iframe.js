// Paste into the Code Playground "Iframe JS" tab (Add-on Mode).
// Import and proxy name follow the Playground's own Add-on template (October 8, 2026).
import addOnUISdk from "https://new.express.adobe.com/static/add-on-sdk/sdk.js";

const $ = (id) => document.getElementById(id);

function show(value) {
  $("out").textContent = JSON.stringify(value, null, 2);
}

addOnUISdk.ready.then(async () => {
  const sandbox = await addOnUISdk.instance.runtime.apiProxy("documentSandbox");
  const buttons = [...document.querySelectorAll("button")];

  // One request at a time, so a double click cannot become a second write.
  async function run(call) {
    buttons.forEach((b) => (b.disabled = true));
    $("status").textContent = "Working…";
    try {
      show(await call());
      $("status").textContent = "Done";
    } catch (error) {
      show({ error: String(error) });
      $("status").textContent = "Failed";
    } finally {
      buttons.forEach((b) => (b.disabled = false));
    }
  }

  $("create").onclick = () => run(() => sandbox.createProbe("Reflow probe JH-01"));
  $("snapshot").onclick = () => run(() => sandbox.snapshot($("label").value.trim()));
  $("move").onclick = () => run(() => sandbox.applyMove($("op").value.trim()));
  $("copy").onclick = async () => {
    try {
      await navigator.clipboard.writeText($("out").textContent);
      $("status").textContent = "Copied";
    } catch {
      $("status").textContent = "Copy blocked: select the JSON and copy it by hand";
    }
  };
  $("status").textContent = "Ready";
});
