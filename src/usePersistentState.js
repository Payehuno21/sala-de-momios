import { useState, useEffect } from "react";

// Hook genérico: igual que useState, pero lee/escribe en localStorage para
// que el valor sobreviva a recargas de página. Si localStorage no está
// disponible (por ejemplo, en algún modo de navegación privada estricto),
// cae de vuelta a comportamiento normal de useState sin romper la app.
export function usePersistentState(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // localStorage lleno o bloqueado — la app sigue funcionando,
      // solo no persiste entre recargas en ese caso.
    }
  }, [key, state]);

  return [state, setState];
}
