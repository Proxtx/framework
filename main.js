import express from "express";
import { router } from "@proxtx/combine/serveRoute.js";

const app = express();

app.use(express.static("public"));
app.use("/api", router);

app.listen(3000);
