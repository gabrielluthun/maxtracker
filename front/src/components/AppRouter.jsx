import { useEffect, useState } from "react";
import Home from "@/pages/Home";
import About from "@/pages/About";
import { APP_VIEW, viewFromHash } from "@/lib/appView";

export default function AppRouter() {
  const [view, setView] = useState(viewFromHash);

  useEffect(() => {
    const onHashChange = () => setView(viewFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  if (view === APP_VIEW.ABOUT) return <About />;
  return <Home />;
}
