import "@/App.css";
import { Toaster } from "sonner";
import AppRouter from "@/components/AppRouter";

function App() {
  return (
    <div className="App">
      <AppRouter />
      <Toaster position="top-center" richColors />
    </div>
  );
}

export default App;
