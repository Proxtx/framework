import express from "express";
import {
  router as combineRouter,
  addModule,
} from "@proxtx/combine/serveRoute.js";
import process from "process";
import fs from "fs/promises";
import { router as staticRouter } from "./static.js";

export const listen = async (port) => {
  const app = express();
  await setup(app);
  app.listen(port);
};

export const setup = async (app) => {
  app.use(express.json());
  app.use("/api", combineRouter);
  app.use("/", staticRouter);

  app.get("/combine.js", (req, res) => {
    res
      .status(200)
      .sendFile(process.cwd() + "/node_modules/@proxtx/combine/combine.js");
  });

  app.get("/compare.js", (req, res) => {
    res
      .status(200)
      .sendFile(process.cwd() + "/node_modules/@proxtx/compare/main.js");
  });

  app.get("/sync.js", (req, res) => {
    res
      .status(200)
      .sendFile(process.cwd() + "/node_modules/@proxtx/combinesync/client.js");
  });

  app.get("/build.js", (req, res) => {
    res
      .status(200)
      .sendFile(process.cwd() + "/node_modules/@proxtx/html/build.js");
  });

  await addServerStructure();
};

export const addServerStructure = async (folder = "server") => {
  const files = await fs.readdir(process.cwd() + "/" + folder);
  for (let i of files) {
    let loc = folder + "/" + i;
    if (await (await fs.lstat(process.cwd() + "/" + loc)).isDirectory()) {
      addServerStructure(loc);
    } else {
      await addModule(loc, loc);
    }
  }
};
