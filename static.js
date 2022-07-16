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
  ignoreParseHtml: [],
  customScriptFileExtensions: [".html"],
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
  if (!isSubdirectory(path, process.cwd() + config.subfolder)) {
    console.log(resolve(path), resolve(config.subfolder));
    res.status(403).send();
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
    let noParseFile = false;
    for (let i of config.ignoreParseHtml) {
      if (isSubdirectory(filePath, process.cwd() + config.subfolder + i))
        noParseFile = true;
    }
    if (
      config.customScriptFileExtensions.includes(extname(filePath)) &&
      !noParseFile
    ) {
      console.log("yep");
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
  let loaderInstance = loader;
  let file = await fs.readFile(filePath, "utf-8");
  let html = parse(file);
  let d = Dom(html);
  let additionalOptions = { req, res, data: {} };
  try {
    let serverId = d.getElementById("server");
    try {
      await runServerSideScript(serverId, d, additionalOptions);
    } catch (e) {
      console.log(e);
    }
    for (let server of d.getElementsByClassName("server")) {
      try {
        await runServerSideScript(server, d, additionalOptions);
      } catch (e) {
        console.log(e);
      }
    }
  } catch (e) {
    console.log(e);
  }
  loaderInstance = loaderInstance.replace(
    "$1",
    generateString(
      JSON.stringify(d.element.innerHTML, (key, value) => {
        if (key == "watcher") return undefined;
        return value;
      })
    )
  );

  try {
    loaderInstance = loaderInstance.replace(
      "$2",
      generateString(JSON.stringify(additionalOptions.data))
    );
  } catch (e) {
    loaderInstance.replace("$2", "{}");
    console.log(
      "Framework caught an error! Your data object cant be converted to a string: ",
      e
    );
  }

  return loaderInstance;
};

const generateString = (string) => {
  return replaceChar(replaceChar(string, "\\", "\\\\"), '"', '\\"');
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

const runServerSideScript = async (server, dom, additionalOptions) => {
  if (!server) return;
  server.parent.removeChild(server);
  let src = server.getAttribute("src");
  let exportName = server.getAttribute("export");
  exportName = exportName ? exportName : "server";
  if (!imports[src]) {
    imports[src] = await import("file://" + process.cwd() + "/" + src);
  }
  let module = imports[src];
  await module[exportName](dom, additionalOptions);
};

const isSubdirectory = (path, folder) => {
  return resolve(path).substring(0, resolve(folder).length) == resolve(folder);
};
