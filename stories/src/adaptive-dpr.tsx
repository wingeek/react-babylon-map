import { memo, useEffect, useState } from "react";
import { useBabylonMap } from 'react-babylon-map';

/**
 * Adjusts the engine's hardware scaling level based on map movement.
 * Decreases resolution during map interaction for performance,
 * restores full resolution when stationary.
 */
export const AdaptiveDpr = memo(() => {
  const { engine, map } = useBabylonMap();
  const [initialDpr, setInitialDpr] = useState(1);

  useEffect(() => {
    if (!engine) return;
    setInitialDpr(engine.getHardwareScalingLevel());
  }, [engine]);

  useEffect(() => {
    if (!engine || !map) return;

    const decreaseDpr = () => engine.setHardwareScalingLevel(2);
    const increaseDpr = () => engine.setHardwareScalingLevel(initialDpr);

    map.on('movestart', decreaseDpr);
    map.on('moveend', increaseDpr);
    return () => {
      map.off('movestart', decreaseDpr);
      map.off('moveend', increaseDpr);
    };
  }, [engine, map, initialDpr]);

  return null;
});
AdaptiveDpr.displayName = 'AdaptiveDpr';
