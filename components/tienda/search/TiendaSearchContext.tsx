"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type TiendaSearchContextValue = {
  search: string;
  setSearch: (value: string) => void;
  clearSearch: () => void;
};

const TiendaSearchContext = createContext<TiendaSearchContextValue | null>(
  null
);

type TiendaSearchProviderProps = {
  children: ReactNode;
};

export function TiendaSearchProvider({ children }: TiendaSearchProviderProps) {
  const [search, setSearchState] = useState("");

  const setSearch = useCallback((value: string) => {
    setSearchState(value);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchState("");
  }, []);

  const value = useMemo(
    () => ({
      search,
      setSearch,
      clearSearch,
    }),
    [search, setSearch, clearSearch]
  );

  return (
    <TiendaSearchContext.Provider value={value}>
      {children}
    </TiendaSearchContext.Provider>
  );
}

export function useTiendaSearch() {
  const context = useContext(TiendaSearchContext);

  if (!context) {
    throw new Error(
      "useTiendaSearch debe usarse dentro de TiendaSearchProvider"
    );
  }

  return context;
}
