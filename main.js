import express from "express";
import process from "process";
import fs from "fs/promises";
import cookieParser from "cookie-parser";
import { router as staticRouter } from "./static.js";
import {
  router as combineRouter,
  server as combineServer,
} from "@proxtx/combine-rest";

export const listen = async (port) => {
  const app = express();
  await setup(app);
  app.listen(port);
};

export const setup = async (app, apiFolder = "public") => {
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api", combineRouter);

  app.get("/combine.js", (req, res) => {
    res
      .status(200)
      .sendFile(process.cwd() + "/node_modules/@proxtx/combine/combine.js");
  });

  app.get("/server.js", (req, res) => {
    res
      .status(200)
      .sendFile(process.cwd() + "/node_modules/@proxtx/combine/server.js");
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

  app.get("/builder.js", (req, res) => {
    res
      .status(200)
      .sendFile(process.cwd() + "/node_modules/@proxtx/html/builder.js");
  });

  app.get("/request.js", (req, res) => {
    res
      .status(200)
      .sendFile(
        process.cwd() + "/node_modules/@proxtx/combine-rest/request.js"
      );
  });

  app.get("/iframe.js", (req, res) => {
    res
      .status(200)
      .sendFile(process.cwd() + "/node_modules/@proxtx/combine-iframe/main.js");
  });

  app.get("/cookie.js", (req, res) => {
    res
      .status(200)
      .sendFile(process.cwd() + "/node_modules/@proxtx/cookie-parser/main.js");
  });

  app.use("/", staticRouter);

  await addServerStructure(apiFolder);
};

export const addServerStructure = async (folder = "public") => {
  const files = await fs.readdir(process.cwd() + "/" + folder);
  for (let i of files) {
    let loc = folder + "/" + i;
    if (await (await fs.lstat(process.cwd() + "/" + loc)).isDirectory()) {
      addServerStructure(loc);
    } else {
      await combineServer.addModule(
        await import("file://" + process.cwd() + "/" + loc),
        loc
      );
    }
  }
};
