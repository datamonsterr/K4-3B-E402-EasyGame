import { mkdir, copyFile, cp } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const app = new URL("../", import.meta.url);
await mkdir(new URL("public/mock/", app), { recursive: true });
await copyFile(
  new URL("../index.html", app),
  new URL("public/mock/index.html", app),
);
await cp(
  fileURLToPath(new URL("assets/", app)),
  fileURLToPath(new URL("public/mock/assets/", app)),
  { recursive: true },
);
console.log("Synced canonical root mock to public/mock/index.html");
