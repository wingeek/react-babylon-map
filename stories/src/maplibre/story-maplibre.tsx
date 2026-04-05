import { ThemeState, useLadleContext } from '@ladle/react';
import { useControls } from 'leva';
import 'maplibre-gl/dist/maplibre-gl.css';
import { FC, memo } from "react";
import Map from 'react-map-gl/maplibre';
import { Canvas } from 'react-babylon-map/maplibre';
import { StoryMapProps } from '../story-map';

/** `<Map>` styled for stories */
export const StoryMaplibre: FC<Omit<StoryMapProps, 'mapboxChildren'>> = ({
  latitude, longitude, canvas, children, mapChildren, maplibreChildren, ...rest
}) => {

  const theme = useLadleContext().globalState.theme;

  const mapStyle = theme === ThemeState.Dark
    ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
    : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

  return <div style={{ height: '100vh', position: 'relative' }}>
    <Map
      canvasContextAttributes={{
        antialias: true,
      }}
      initialViewState={{ latitude, longitude, ...rest }}
      maxPitch={rest.pitch ? Math.min(rest.pitch, 85) : undefined}
      mapStyle={mapStyle}
    >
      {mapChildren}
      {maplibreChildren}
      <Canvas latitude={latitude} longitude={longitude} {...canvas}>
        {children}
      </Canvas>
    </Map>
  </div>
}
