import React, { useCallback, useMemo } from 'react';
import { ShapeOverlay as ShapeOverlayType, ShapeType, Position, Size, defaultShapeStyle } from '../../types';
import { useDraggable } from '../../hooks/useDraggable';
import { useResizable } from '../../hooks/useResizable';

interface ShapeOverlayProps {
  overlay?: Partial<ShapeOverlayType>;
  isSelected?: boolean;
  scale?: number;
  onSelect?: () => void;
  onDeselect?: () => void;
  onPositionChange?: (position: Position) => void;
  onSizeChange?: (size: Size) => void;
  onShapeTypeChange?: (shapeType: ShapeType) => void;
  onStyleChange?: (style: Partial<ShapeOverlayType['style']>) => void;
  className?: string;
}

const defaultOverlay: Partial<ShapeOverlayType> = {
  position: { x: 50, y: 50 },
  size: { width: 150, height: 100 },
  shapeType: 'rectangle',
  style: defaultShapeStyle,
};

interface ShapeRendererProps {
  shapeType: ShapeType;
  width: number;
  height: number;
  style: ShapeOverlayType['style'];
  startPoint?: Position;
  endPoint?: Position;
}

const ShapeRenderer: React.FC<ShapeRendererProps> = ({
  shapeType,
  width,
  height,
  style,
  startPoint,
  endPoint,
}) => {
  const svgStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  };

  const commonProps = {
    fill: style.fill || 'transparent',
    stroke: style.stroke || '#000000',
    strokeWidth: style.strokeWidth || 2,
    opacity: style.opacity ?? 1,
  };

  switch (shapeType) {
    case 'line': {
      const x1 = startPoint?.x ?? 0;
      const y1 = startPoint?.y ?? 0;
      const x2 = endPoint?.x ?? width;
      const y2 = endPoint?.y ?? height;

      return (
        <svg style={svgStyle} viewBox={`0 0 ${width} ${height}`}>
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            {...commonProps}
          />
        </svg>
      );
    }

    case 'rectangle':
      return (
        <svg style={svgStyle} viewBox={`0 0 ${width} ${height}`}>
          <rect
            x={style.strokeWidth / 2}
            y={style.strokeWidth / 2}
            width={width - style.strokeWidth}
            height={height - style.strokeWidth}
            {...commonProps}
          />
        </svg>
      );

    case 'ellipse':
      return (
        <svg style={svgStyle} viewBox={`0 0 ${width} ${height}`}>
          <ellipse
            cx={width / 2}
            cy={height / 2}
            rx={(width - style.strokeWidth) / 2}
            ry={(height - style.strokeWidth) / 2}
            {...commonProps}
          />
        </svg>
      );

    default:
      return null;
  }
};

export const ShapeOverlay: React.FC<ShapeOverlayProps> = ({
  overlay: externalOverlay,
  isSelected = false,
  scale = 1,
  onSelect,
  onDeselect,
  onPositionChange,
  onSizeChange,
  onShapeTypeChange,
  onStyleChange,
  className = '',
}) => {
  const overlay = { ...defaultOverlay, ...externalOverlay };

  const {
    position,
    isDragging,
    dragHandleProps,
    setPosition,
  } = useDraggable({
    initialPosition: overlay.position,
    onDragEnd: (pos) => onPositionChange?.(pos),
  });

  const {
    size,
    isResizing,
    getHandleProps,
    setSize,
  } = useResizable({
    initialSize: overlay.size,
    minSize: { width: 20, height: 20 },
    onResize: (newSize, delta) => {
      if (delta.x !== 0 || delta.y !== 0) {
        setPosition({
          x: position.x + delta.x,
          y: position.y + delta.y,
        });
      }
    },
    onResizeEnd: (newSize) => {
      onSizeChange?.(newSize);
      onPositionChange?.(position);
    },
  });

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isSelected) {
        onSelect?.();
      }
    },
    [isSelected, onSelect]
  );

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: position.x * scale,
    top: position.y * scale,
    width: size.width * scale,
    height: size.height * scale,
    transform: `rotate(${overlay.rotation || 0}deg)`,
    zIndex: overlay.zIndex || 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  const shapeStyle = overlay.style || defaultShapeStyle;
  const scaledStyle = useMemo(() => ({
    ...shapeStyle,
    strokeWidth: shapeStyle.strokeWidth * scale,
  }), [shapeStyle, scale]);

  return (
    <div
      style={containerStyle}
      className={`
        ${isSelected ? 'ring-2 ring-pdf-primary ring-offset-1' : ''}
        ${isDragging || isResizing ? 'opacity-80' : ''}
        ${className}
      `}
      onClick={handleClick}
      role="img"
      aria-label={`${overlay.shapeType} shape`}
      aria-selected={isSelected}
    >
      {/* Drag handle */}
      <div
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        {...dragHandleProps}
      />

      {/* Shape rendering */}
      <ShapeRenderer
        shapeType={overlay.shapeType || 'rectangle'}
        width={size.width * scale}
        height={size.height * scale}
        style={scaledStyle}
        startPoint={overlay.startPoint}
        endPoint={overlay.endPoint}
      />

      {/* Resize handles (only when selected) */}
      {isSelected && (
        <>
          {/* Corner handles */}
          <div
            className="absolute -top-1 -left-1 w-3 h-3 bg-white border-2 border-pdf-primary cursor-nw-resize z-10"
            {...getHandleProps('topLeft')}
          />
          <div
            className="absolute -top-1 -right-1 w-3 h-3 bg-white border-2 border-pdf-primary cursor-ne-resize z-10"
            {...getHandleProps('topRight')}
          />
          <div
            className="absolute -bottom-1 -left-1 w-3 h-3 bg-white border-2 border-pdf-primary cursor-sw-resize z-10"
            {...getHandleProps('bottomLeft')}
          />
          <div
            className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border-2 border-pdf-primary cursor-se-resize z-10"
            {...getHandleProps('bottomRight')}
          />

          {/* Edge handles (not for lines) */}
          {overlay.shapeType !== 'line' && (
            <>
              <div
                className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-pdf-primary cursor-n-resize z-10"
                {...getHandleProps('top')}
              />
              <div
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-pdf-primary cursor-s-resize z-10"
                {...getHandleProps('bottom')}
              />
              <div
                className="absolute top-1/2 -left-1 -translate-y-1/2 w-3 h-3 bg-white border-2 border-pdf-primary cursor-w-resize z-10"
                {...getHandleProps('left')}
              />
              <div
                className="absolute top-1/2 -right-1 -translate-y-1/2 w-3 h-3 bg-white border-2 border-pdf-primary cursor-e-resize z-10"
                {...getHandleProps('right')}
              />
            </>
          )}
        </>
      )}
    </div>
  );
};

// Shape type selector component for toolbar use
interface ShapeTypeSelectorProps {
  selectedType: ShapeType;
  onTypeChange: (type: ShapeType) => void;
  disabled?: boolean;
  className?: string;
}

export const ShapeTypeSelector: React.FC<ShapeTypeSelectorProps> = ({
  selectedType,
  onTypeChange,
  disabled = false,
  className = '',
}) => {
  const shapeTypes: { type: ShapeType; label: string; icon: React.ReactNode }[] = [
    {
      type: 'line',
      label: 'Line',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <line x1="4" y1="20" x2="20" y2="4" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      type: 'rectangle',
      label: 'Rectangle',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3" y="5" width="18" height="14" strokeWidth="2" />
        </svg>
      ),
    },
    {
      type: 'ellipse',
      label: 'Ellipse',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <ellipse cx="12" cy="12" rx="9" ry="6" strokeWidth="2" />
        </svg>
      ),
    },
  ];

  return (
    <div className={`flex items-center gap-1 ${className}`} role="radiogroup" aria-label="Shape type">
      {shapeTypes.map(({ type, label, icon }) => (
        <button
          key={type}
          onClick={() => onTypeChange(type)}
          disabled={disabled}
          className={`
            p-2 rounded hover:bg-pdf-hover disabled:opacity-50
            ${selectedType === type ? 'bg-pdf-active' : ''}
          `}
          role="radio"
          aria-checked={selectedType === type}
          aria-label={label}
          title={label}
        >
          {icon}
        </button>
      ))}
    </div>
  );
};

export default ShapeOverlay;
