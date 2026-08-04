import React from "react";
import { createRoot } from "react-dom/client";
import { CardCatalog } from "./app/CardCatalog";
import "./app/globals.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CardCatalog />
  </React.StrictMode>,
);
