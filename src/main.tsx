

  import { createRoot } from "react-dom/client";
  import AppSimple from "./app/AppSimple.tsx";
  import "./styles/index.css";

  console.log('[main.tsx] Starting Pharmacy System...');
  const root = document.getElementById("root");
  if (!root) {
    console.error('[main.tsx] Root element not found!');
  } else {
    console.log('[main.tsx] Root element found, rendering app');
    createRoot(root).render(<AppSimple />);
  }
  
  