"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";

import { SearchDialog } from "./search-dialog";

export function SearchTrigger() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Site içi arama (Ctrl+K)"
        className="hidden h-9 w-9 place-items-center rounded-full border border-border text-muted hover:text-foreground md:grid"
      >
        <Search className="h-4 w-4" strokeWidth={2.2} />
      </button>
      <SearchDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
