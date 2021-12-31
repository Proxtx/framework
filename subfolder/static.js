import { Router } from "express";
import { resolve } from "path";
import process from "process";
import fs from "fs/promises";
export const router = Router();

const subfolder = "/public";

router.get("/*", async (req, res) => {
  let path = process.cwd() + subfolder + req.path;
  if (
    !resolve(path).substring(0, (process.cwd() + subfolder).length) ==
    process.cwd() + subfolder
  ) {
    res.status(403);
    return;
  }
  try {
    let filePath = "";
    if (await (await fs.lstat(path)).isDirectory()) {
      if (await fs.lstat(path + "/index.html")) {
        filePath = path + "/index.html";
      }
    } else {
      filePath = path;
    }
    res.status(200).sendFile(filePath);
  } catch (e) {
    res.status(404).send();
  }
});
