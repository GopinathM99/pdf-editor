import { useState, useCallback, useMemo } from 'react';
import { ZoomState, FitMode } from '../types';

const DEFAULT_MIN_SCALE = 0.25;
const DEFAULT_MAX_SCALE = 4;
const ZOOM_STEP = 0.25;

interface UseZoomOptions {
  initialScale?: number;
  minScale?: number;
  maxScale?: number;
  containerWidth?: number;
  containerHeight?: number;
  pageWidth?: number;
  pageHeight?: number;
}

interface UseZoomReturn {
  zoom: ZoomState;
  zoomIn: () => void;
  zoomOut: () => void;
  setScale: (scale: number) => void;
  fitToPage: () => void;
  fitToWidth: () => void;
  resetZoom: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
  scalePercentage: number;
}

export function useZoom(options: UseZoomOptions = {}): UseZoomReturn {
  const {
    initialScale = 1,
    minScale = DEFAULT_MIN_SCALE,
    maxScale = DEFAULT_MAX_SCALE,
    containerWidth = 0,
    containerHeight = 0,
    pageWidth = 612,
    pageHeight = 792,
  } = options;

  const [zoom, setZoom] = useState<ZoomState>({
    scale: initialScale,
    fitMode: 'custom',
    minScale,
    maxScale,
  });

  const clampScale = useCallback(
    (scale: number): number => {
      return Math.min(Math.max(scale, minScale), maxScale);
    },
    [minScale, maxScale]
  );

  const zoomIn = useCallback(() => {
    setZoom((prev) => ({
      ...prev,
      scale: clampScale(prev.scale + ZOOM_STEP),
      fitMode: 'custom',
    }));
  }, [clampScale]);

  const zoomOut = useCallback(() => {
    setZoom((prev) => ({
      ...prev,
      scale: clampScale(prev.scale - ZOOM_STEP),
      fitMode: 'custom',
    }));
  }, [clampScale]);

  const setScale = useCallback(
    (scale: number) => {
      setZoom((prev) => ({
        ...prev,
        scale: clampScale(scale),
        fitMode: 'custom',
      }));
    },
    [clampScale]
  );

  const fitToPage = useCallback(() => {
    if (containerWidth === 0 || containerHeight === 0) return;

    const padding = 40; // Padding around the page
    const availableWidth = containerWidth - padding * 2;
    const availableHeight = containerHeight - padding * 2;

    const scaleX = availableWidth / pageWidth;
    const scaleY = availableHeight / pageHeight;
    const scale = clampScale(Math.min(scaleX, scaleY));

    setZoom((prev) => ({
      ...prev,
      scale,
      fitMode: 'page',
    }));
  }, [containerWidth, containerHeight, pageWidth, pageHeight, clampScale]);

  const fitToWidth = useCallback(() => {
    if (containerWidth === 0) return;

    const padding = 40;
    const availableWidth = containerWidth - padding * 2;
    const scale = clampScale(availableWidth / pageWidth);

    setZoom((prev) => ({
      ...prev,
      scale,
      fitMode: 'width',
    }));
  }, [containerWidth, pageWidth, clampScale]);

  const resetZoom = useCallback(() => {
    setZoom((prev) => ({
      ...prev,
      scale: 1,
      fitMode: 'custom',
    }));
  }, []);

  const canZoomIn = zoom.scale < maxScale;
  const canZoomOut = zoom.scale > minScale;
  const scalePercentage = Math.round(zoom.scale * 100);

  return useMemo(
    () => ({
      zoom,
      zoomIn,
      zoomOut,
      setScale,
      fitToPage,
      fitToWidth,
      resetZoom,
      canZoomIn,
      canZoomOut,
      scalePercentage,
    }),
    [
      zoom,
      zoomIn,
      zoomOut,
      setScale,
      fitToPage,
      fitToWidth,
      resetZoom,
      canZoomIn,
      canZoomOut,
      scalePercentage,
    ]
  );
}

export default useZoom;
