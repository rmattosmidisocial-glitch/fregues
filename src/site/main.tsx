import React from "react";
import ReactDOM from "react-dom/client";
import "../index.css";
import "../tema";
import { Site } from "./Site";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Site />
  </React.StrictMode>,
);
