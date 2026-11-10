import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const hasExtension = /\.(?:json|ts|tsx|js|mjs|cjs|css)$/;

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const absolute = pathToFileURL(path.join(root, "src", `${specifier.slice(2)}.ts`)).href;
    return nextResolve(absolute, context);
  }
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !hasExtension.test(specifier)) {
    return nextResolve(`${specifier}.ts`, context);
  }
  return nextResolve(specifier, context);
}
