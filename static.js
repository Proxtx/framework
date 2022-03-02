import { Router } from "express";
import { resolve, extname } from "path";
import process from "process";
import fs from "fs/promises";
import { Dom } from "@proxtx/dom";
import { parse } from "@proxtx/html";
export const router = Router();

let config = {
  logs: true,
  subfolder: "/static",
  parseHtml: true,
};

let loader;
try {
  loader = await fs.readFile(
    process.cwd() + "/node_modules/@proxtx/framework/loader.html",
    "utf-8"
  );
} catch (e) {
  loader = await fs.readFile(process.cwd() + "/loader.html", "utf-8"); //for development
}

router.get("/*", async (req, res) => {
  let path = process.cwd() + config.subfolder + req.path;
  if (
    !resolve(path).substring(0, (process.cwd() + config.subfolder).length) ==
    process.cwd() + config.subfolder
  ) {
    res.status(403);
    return;
  }
  try {
    res.status(200);
    let filePath = "";
    if (await (await fs.lstat(path)).isDirectory()) {
      if (req.path[req.path.length - 1] != "/") {
        console.log(302, "redirect", req.path + "/");
        res.redirect(req.path + "/");
        return;
      }
      if (await fs.lstat(path + "/index.html")) {
        filePath = path + "/index.html";
      }
    } else {
      filePath = path;
    }
    if (extname(filePath) == ".html" && config.parseHtml) {
      res.send(await htmlFile(filePath, req, res));
      if (config.logs) console.log(200, "html", filePath);
      return;
    }
    res.sendFile(filePath);
    if (config.logs) console.log(200, filePath);
  } catch (e) {
    res.status(404).send();
    if (config.logs) console.log(404, req.path, e);
  }
});

let imports = {};

const htmlFile = async (filePath, req, res) => {
  let file = await fs.readFile(filePath, "utf-8");
  let html = parse(file);
  let d = Dom(html);
  try {
    let serverId = d.getElementById("server");
    try {
      await runServerSideScript(serverId, d, req, res);
    } catch (e) {
      console.log(e);
    }
    for (let server of d.getElementsByClassName("server")) {
      try {
        await runServerSideScript(server, d, req, res);
      } catch (e) {
        console.log(e);
      }
    }
  } catch (e) {
    console.log(e);
  }
  return loader.replace(
    "$1",
    replaceChar(
      replaceChar(
        JSON.stringify(d.element.innerHTML, (key, value) => {
          if (key == "watcher") return undefined;
          return value;
        }),
        "\\",
        "\\\\"
      ),
      '"',
      '\\"'
    )
  );
};

const replaceChar = (text, char, replace) => {
  let result = "";
  for (let i of text) {
    if (i == char) result += replace;
    else result += i;
  }
  return result;
};

export const setConfig = (newConfig) => {
  config = { ...config, ...newConfig };
};

const runServerSideScript = async (server, dom, req, res) => {
  if (!server) return;
  server.parent.removeChild(server);
  let src = server.getAttribute("src");
  let exportName = server.getAttribute("export");
  exportName = exportName ? exportName : "server";
  if (!imports[src]) {
    imports[src] = await import("file://" + process.cwd() + "/" + src);
  }
  let module = imports[src];
  await module[exportName](dom, req, res);
};
