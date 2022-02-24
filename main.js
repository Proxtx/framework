import express from "express";
import process from "process";
import fs from "fs/promises";
import cookieParser from "cookie-parser";
import { router as staticRouter } from "./static.js";
import { CombineHandler } from "@proxtx/combine-ws";
import {
  router as combineRouter,
  server as combineServer,
} from "@proxtx/combine-rest";
import { genModule } from "@proxtx/combine/combine.js";

export const listen = async (port) => {
  const app = express();
  let result = await setup(app);
  result.server = app.listen(port);
  return result;
};

export const setup = async (app, apiFolder = "public") => {
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api", combineRouter);
  app.use("/modules", express.static("node_modules/@proxtx"));
  app.use("/", staticRouter);
  await addServerStructure(apiFolder);

  return {
    combineHandler: async (server) => {
      return await new CombineHandler(server, genModule);
    },
  };
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
