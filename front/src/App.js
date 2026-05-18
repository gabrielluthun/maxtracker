import "@/App.css";
import { Toaster } from "sonner";
import Home from "@/pages/Home";

function App() {
  return (
    <div className="App">
      <Home />
      <Toaster position="top-center" richColors />
    </div>
  );
}

export default App;
