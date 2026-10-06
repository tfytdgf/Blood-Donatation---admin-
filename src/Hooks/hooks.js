import { useCallback, useEffect, useState } from 'react';

export function useAsync(load, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    load()
      .then((data) => live && setState({ data, loading: false, error: null }))
      .catch((error) => live && setState((s) => ({ ...s, loading: false, error })));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { ...state, reload };
}

export function useDebounce(value, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function useLiveReload(reload) {
  useEffect(() => {
    window.addEventListener('data:refresh', reload);
    return () => window.removeEventListener('data:refresh', reload);
  }, [reload]);
}

let unsaved = false;
export const hasUnsavedChanges = () => unsaved;

export function useUnsavedWarning(dirty) {
  useEffect(() => {
    unsaved = dirty;
    if (!dirty) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => {
      window.removeEventListener('beforeunload', warn);
      unsaved = false;
    };
  }, [dirty]);
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function useFocusTrap(ref) {
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const opener = document.activeElement;
    const items = () => [...node.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);

    (items()[0] || node).focus({ preventScroll: true });

    const onKey = (e) => {
      if (e.key !== 'Tab') return;
      const list = items();
      if (list.length === 0) return e.preventDefault();
      const [firstEl, lastEl] = [list[0], list[list.length - 1]];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    node.addEventListener('keydown', onKey);
    return () => {
      node.removeEventListener('keydown', onKey);
      const back = opener && document.contains(opener) ? opener : document.getElementById('main');
      if (back) back.focus({ preventScroll: true });
    };
  }, [ref]);
}

export function useConfirmClose(dirty, onClose) {
  return useCallback(() => {
    if (dirty && !window.confirm('You have unsaved changes. Discard them?')) return;
    onClose();
  }, [dirty, onClose]);
}
