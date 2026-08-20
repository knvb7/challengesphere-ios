import React, {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';

interface OverlayEntry {
  id: number;
  content: React.ReactNode;
}

interface AppOverlayPortalContextValue {
  mount: (id: number, content: React.ReactNode) => void;
  unmount: (id: number) => void;
}

const AppOverlayPortalContext = createContext<AppOverlayPortalContextValue | null>(null);

let nextOverlayId = 1;

export function AppOverlayPortalProvider({ children }: React.PropsWithChildren) {
  const [overlays, setOverlays] = useState<OverlayEntry[]>([]);

  const mount = useCallback((id: number, content: React.ReactNode) => {
    setOverlays((current) => [
      ...current.filter((overlay) => overlay.id !== id),
      { id, content },
    ]);
  }, []);

  const unmount = useCallback((id: number) => {
    setOverlays((current) => current.filter((overlay) => overlay.id !== id));
  }, []);

  const value = useMemo(() => ({ mount, unmount }), [mount, unmount]);

  return (
    <AppOverlayPortalContext.Provider value={value}>
      {children}
      {overlays.length > 0 ? (
        <View pointerEvents="box-none" style={styles.host}>
          {overlays.map((overlay) => (
            <React.Fragment key={overlay.id}>{overlay.content}</React.Fragment>
          ))}
        </View>
      ) : null}
    </AppOverlayPortalContext.Provider>
  );
}

export function AppOverlayPortal({ children }: React.PropsWithChildren) {
  const portal = useContext(AppOverlayPortalContext);
  const id = useRef(nextOverlayId++).current;

  useLayoutEffect(() => {
    portal?.mount(id, children);
  }, [children, id, portal]);

  useLayoutEffect(() => () => {
    portal?.unmount(id);
  }, [id, portal]);

  if (!portal) {
    return <>{children}</>;
  }

  return null;
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20000,
    elevation: 20000,
  },
});
