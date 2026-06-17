import { createRoot } from "react-dom/client";
import { queryClient } from "./lib/query-client";
import App from "./App";
import "./index.css";

export { queryClient };

createRoot(document.getElementById("root")!).render(<App />);
