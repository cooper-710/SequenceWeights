
  import { createRoot } from "react-dom/client";
  import { injectSpeedInsights } from "@vercel/speed-insights";
  import App from "./App.tsx";
  import "./index.css";
  import "./styles/globals.css";

  // Initialize Vercel Speed Insights for performance monitoring
  injectSpeedInsights();

  createRoot(document.getElementById("root")!).render(<App />);
  