import { useControls } from 'leva';
import { FC, PropsWithChildren, ReactNode } from "react";
import { CanvasProps } from 'react-babylon-map';
import { StoryMapbox } from './mapbox/story-mapbox';
import { StoryMaplibre } from './maplibre/story-maplibre';

export enum MapProvider {
  maplibre = "maplibre",
  mapbox = "mapbox",
}

export interface StoryMapProps extends PropsWithChildren {
  latitude: number,
  longitude: number,
  zoom?: number,
  pitch?: number,
  bearing?: number,
  canvas?: Partial<CanvasProps>,
  mapChildren?: ReactNode,
  mapboxChildren?: ReactNode,
  maplibreChildren?: ReactNode,
}

/** `<Map>` styled for stories */
export const StoryMap: FC<StoryMapProps> = (props) => {

  const { mapProvider, overlay } = useControls({
    mapProvider: {
      value: MapProvider.maplibre,
      options: MapProvider,
      label: 'map provider'
    },
    overlay: {
      value: false,
    }
  });

  const canvas = { overlay, ...props.canvas };

  return <div style={{ height: '100vh', position: 'relative' }}>
    {mapProvider === MapProvider.maplibre && <StoryMaplibre {...props} canvas={canvas} />}
    {mapProvider === MapProvider.mapbox && <StoryMapbox {...props} canvas={canvas} />}
  </div>
}
