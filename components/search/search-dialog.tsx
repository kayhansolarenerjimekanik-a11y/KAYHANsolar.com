"use client";

import { Loader2, Search, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { SearchHit, SearchResults } from "@/lib/search";

interface Props {
  open: boolean;
  onClose: () => void;
}

const EMPTY: SearchResults = {
  query: "",
  products: [],
  categories: [],
  gallery: [],
  totalCount: 0,
};

const DEBOUNCE_MS = 220;

export function SearchDialog({ open, onClose }: Props) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQ("");
      setResults(EMPTY);
      setActiveIdx(0);
    }
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}`,
          { cache: "no-store" },
        );
        const data = (await res.json()) as SearchResults;
        setResults(data);
        setActiveIdx(0);
      } catch {
        setResults(EMPTY);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [q, open]);

  const flatHits = useMemo<SearchHit[]>(
    () => [...results.products, ...results.categories, ...results.gallery],
    [results.products, results.categories, results.gallery],
  );

  const navigate = useCallback(
    (hit: SearchHit) => {
      router.push(hit.href);
      onClose();
    },
    [router, onClose],
  );

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (flatHits.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(flatHits.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const hit = flatHits[activeIdx];
        if (hit) navigate(hit);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, flatHits, activeIdx, navigate, onClose]);

  if (!open) return null;

  let cursor = 0;
  const renderGroup = (title: string, hits: SearchHit[]) => {
    if (hits.length === 0) return null;
    return (
      <section key={title}>
        <h3 className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-subtle">
          {title}
        </h3>
        <ul>
          {hits.map((hit) => {
            const idx = cursor++;
            const isActive = idx === activeIdx;
            return (
              <li key={`${hit.kind}-${hit.id}`}>
                <button
                  type="button"
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => navigate(hit)}
                  className={`flex w-full items-center gap-3 px-4 py-2 text-left transition-colors ${
                    isActive
                      ? "bg-lime-primary/15 text-foreground"
                      : "text-foreground hover:bg-elevated"
                  }`}
                >
                  {"imageUrl" in hit && hit.imageUrl ? (
                    <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-elevated">
                      <Image
                        src={hit.imageUrl}
                        alt={hit.title}
                        fill
                        sizes="36px"
                        className="object-cover"
                      />
                    </span>
                  ) : (
                    <span className="h-9 w-9 shrink-0 rounded-lg bg-elevated" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {hit.title}
                    </span>
                    {hit.subtitle && (
                      <span className="block truncate text-xs text-muted">
                        {hit.subtitle}
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-subtle">
                    {hit.kind === "product"
                      ? "Ürün"
                      : hit.kind === "category"
                        ? "Kategori"
                        : "Galeri"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    );
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[10vh]">
      <button
        type="button"
        aria-label="Aramayı kapat"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 text-muted" strokeWidth={2.2} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ürün, kategori veya proje ara..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-subtle focus:outline-none"
          />
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted" strokeWidth={2.2} />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:text-foreground"
          >
            <X className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {q.trim().length < 2 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">
              Aramaya başlamak için en az 2 karakter yazın.
            </p>
          ) : results.totalCount === 0 && !loading ? (
            <p className="px-4 py-8 text-center text-sm text-muted">
              &quot;{q}&quot; için sonuç bulunamadı.
            </p>
          ) : (
            <div className="py-1">
              {renderGroup("Ürünler", results.products)}
              {renderGroup("Kategoriler", results.categories)}
              {renderGroup("Galeri", results.gallery)}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border bg-elevated px-4 py-2 text-[10px] text-subtle">
          <span>
            <kbd className="rounded bg-surface px-1 py-0.5 font-mono">↑↓</kbd>{" "}
            gez ·{" "}
            <kbd className="rounded bg-surface px-1 py-0.5 font-mono">Enter</kbd>{" "}
            seç ·{" "}
            <kbd className="rounded bg-surface px-1 py-0.5 font-mono">Esc</kbd>{" "}
            kapat
          </span>
          <span className="hidden sm:inline">{results.totalCount} sonuç</span>
        </div>
      </div>
    </div>
  );
}
