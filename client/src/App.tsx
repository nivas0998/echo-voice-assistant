import { useState } from "react";
import Home from "./pages/Home";
import RoutineManager from "./components/RoutineManager";

export default function App() {
  const [page, setPage] = useState<"home" | "routines">("home");
  const [openRequest, setOpenRequest] = useState(0);

  function createRoutine() {
    setPage("routines");
    setOpenRequest((value) => value + 1);
  }

  return page === "home"
    ? <Home onOpenRoutines={() => setPage("routines")} onCreateRoutine={createRoutine} />
    : <main className="echo-shell"><div className="page-wrap"><RoutineManager openRequest={openRequest} onBack={() => setPage("home")} /></div></main>;
}
