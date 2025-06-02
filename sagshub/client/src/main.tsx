import { createRoot } from "react-dom/client";
import App from "./App";
// Importerer Tailwind CSS først
import "./index.css";
// Derefter basic styles for at tilsidesætte Tailwind hvis nødvendigt
import "./basic-styles.css";

createRoot(document.getElementById("root")!).render(<App />);
