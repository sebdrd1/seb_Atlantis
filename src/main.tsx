import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
// PWA disabled for now - causes React #185 error in production
// import "./registerSW";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);