import { observer } from "mobx-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Layer, Stage, Rect } from "react-konva";

import { Block, Elem } from "../../../utils/bem";
import ObjectTag from "../../../components/Tags/Object";
import { ErrorMessage } from "../../../components/ErrorMessage/ErrorMessage";
import { Toolbar } from "../../../components/Toolbar/Toolbar";
import ResizeObserver from "../../../utils/resize-observer";
import { debounce } from "../../../utils/debounce";
import Tree from "../../../core/Tree";
import { LoadingOutlined } from "@ant-design/icons";

import "./Dicom.scss";

// Frame navigation controls component
const FrameControls = observer(({ item }) => {
  const handlePrevFrame = useCallback(() => {
    item.prevFrame();
  }, [item]);

  const handleNextFrame = useCallback(() => {
    item.nextFrame();
  }, [item]);

  const handleFrameChange = useCallback((e) => {
    const frame = parseInt(e.target.value, 10);
    if (!isNaN(frame)) {
      item.setFrame(frame);
    }
  }, [item]);

  if (!item.isMultiFrame) return null;

  return (
    <Elem name="frame-controls">
      <button
        className="dicom-viewer__frame-btn"
        onClick={handlePrevFrame}
        disabled={item.frame <= 1}
        title="Previous frame (←)"
      >
        ◀
      </button>
      <span className="dicom-viewer__frame-info">
        Frame{" "}
        <input
          type="number"
          min={1}
          max={item.length}
          value={item.frame}
          onChange={handleFrameChange}
          className="dicom-viewer__frame-input"
        />
        {" / "}{item.length}
      </span>
      <button
        className="dicom-viewer__frame-btn"
        onClick={handleNextFrame}
        disabled={item.frame >= item.length}
        title="Next frame (→)"
      >
        ▶
      </button>
    </Elem>
  );
});

// Window presets dropdown
const WindowPresets = observer(({ item }) => {
  const handlePresetChange = useCallback((e) => {
    const preset = e.target.value;
    if (preset) {
      item.applyWindowPreset(preset);
    }
  }, [item]);

  return (
    <Elem name="window-presets">
      <select onChange={handlePresetChange} defaultValue="">
        <option value="" disabled>Window Presets</option>
        <optgroup label="CT">
          <option value="bone">Bone</option>
          <option value="lung">Lung</option>
          <option value="abdomen">Abdomen</option>
          <option value="brain">Brain</option>
        </optgroup>
        <optgroup label="MRI">
          <option value="t1">T1</option>
          <option value="t2">T2</option>
        </optgroup>
      </select>
    </Elem>
  );
});

// DICOM metadata display
const DicomMetadata = observer(({ item }) => {
  const metadata = item.metadata || {};

  if (Object.keys(metadata).length === 0) return null;

  return (
    <Elem name="metadata">
      {metadata.PatientID && <span>Patient: {metadata.PatientID}</span>}
      {metadata.Modality && <span>Modality: {metadata.Modality}</span>}
      {metadata.StudyDate && <span>Study: {metadata.StudyDate}</span>}
    </Elem>
  );
});

// Region rendering for current frame
const DicomRegions = observer(({ item, width, height }) => {
  const regions = item.visibleRegions;

  return (
    <>
      {regions.map((region) => (
        <Tree.renderItem key={region.id} item={region} />
      ))}
    </>
  );
});

// Main DICOM viewer component
export const HtxDicomView = observer(({ item, store }) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dicomImage, setDicomImage] = useState(null);

  // Initialize dwv app
  const dwvAppRef = useRef(null);

  // Handle container resize
  const handleResize = useMemo(() => {
    return debounce((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
        item._updateDicomSize({ width, height });
      }
    }, 100);
  }, [item]);

  // Set up resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(handleResize);
    observer.observe(container);

    // Initial size
    const rect = container.getBoundingClientRect();
    setContainerSize({ width: rect.width, height: rect.height });
    item._updateDicomSize({ width: rect.width, height: rect.height });

    return () => observer.disconnect();
  }, [handleResize, item]);

  // Load DICOM file using dwv
  useEffect(() => {
    const loadDicom = async () => {
      const src = item.currentSrc;
      if (!src) return;

      setLoading(true);
      setError(null);

      try {
        // Dynamic import of dwv to handle potential loading issues
        const dwv = await import("dwv");

        // Initialize dwv application
        const app = new dwv.App();
        dwvAppRef.current = app;
        item.setDwvAppRef(app);

        // Configure dwv - disable tools we don't want
        app.init({
          dataViewConfigs: { "*": [{ divId: `dwv-container-${item.name}` }] },
          tools: {
            // Only enable draw tool for annotations, disable zoom/pan
            Draw: {},
          },
        });

        // Handle load events
        app.addEventListener("loadstart", () => {
          setLoading(true);
        });

        app.addEventListener("loadend", () => {
          setLoading(false);

          // Get image dimensions and metadata
          const image = app.getImage(0);
          if (image) {
            const geometry = image.getGeometry();
            const size = geometry.getSize();
            const width = size.get(0);
            const height = size.get(1);
            const frameCount = size.get(2) || 1;

            // Extract DICOM metadata
            const metaData = app.getMetaData(0);
            const metadata = {
              PatientID: metaData["00100020"]?.value?.[0] || "",
              PatientName: metaData["00100010"]?.value?.[0] || "",
              StudyDate: metaData["00080020"]?.value?.[0] || "",
              Modality: metaData["00080060"]?.value?.[0] || "",
              SeriesDescription: metaData["0008103E"]?.value?.[0] || "",
            };

            item.onDicomLoad({ width, height, frameCount, metadata });

            // Get rendered image data for Konva overlay
            updateCanvasImage(app);
          }
        });

        app.addEventListener("error", (event) => {
          setError(event.error || "Failed to load DICOM file");
          setLoading(false);
        });

        // Load the DICOM file
        app.loadURLs([src]);

      } catch (err) {
        console.error("Failed to load dwv:", err);
        setError("Failed to initialize DICOM viewer");
        setLoading(false);
      }
    };

    loadDicom();

    return () => {
      if (dwvAppRef.current) {
        dwvAppRef.current.reset();
        dwvAppRef.current = null;
      }
    };
  }, [item.currentSrc, item.name]);

  // Update canvas when frame changes
  useEffect(() => {
    if (dwvAppRef.current && item.dicomIsLoaded) {
      const app = dwvAppRef.current;
      // Set the frame in dwv
      if (item.isMultiFrame) {
        app.setFrameIndex?.(item.frame - 1); // dwv uses 0-based index
      }
      updateCanvasImage(app);
    }
  }, [item.frame, item.dicomIsLoaded]);

  // Update canvas when windowing changes
  useEffect(() => {
    if (dwvAppRef.current && item.dicomIsLoaded) {
      const app = dwvAppRef.current;
      // Apply windowing
      const wc = item.windowCenter;
      const ww = item.windowWidth;
      app.setWindowLevelPreset?.({ center: wc, width: ww });
      updateCanvasImage(app);
    }
  }, [item.windowCenter, item.windowWidth, item.dicomIsLoaded]);

  // Extract rendered image from dwv canvas
  const updateCanvasImage = useCallback((app) => {
    try {
      const layerGroup = app.getLayerGroupByDivId?.(`dwv-container-${item.name}`);
      if (layerGroup) {
        const viewLayer = layerGroup.getActiveViewLayer?.();
        if (viewLayer) {
          const canvas = viewLayer.getCanvas?.();
          if (canvas) {
            // Create image from canvas for Konva
            const imageObj = new Image();
            imageObj.src = canvas.toDataURL();
            imageObj.onload = () => {
              setDicomImage(imageObj);
            };
          }
        }
      }
    } catch (err) {
      console.warn("Failed to extract DICOM image:", err);
    }
  }, [item.name]);

  // Keyboard shortcuts for frame navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!item.isMultiFrame) return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          item.prevFrame();
          break;
        case "ArrowRight":
          e.preventDefault();
          item.nextFrame();
          break;
        case "Home":
          e.preventDefault();
          item.setFrame(1);
          break;
        case "End":
          e.preventDefault();
          item.setFrame(item.length);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [item]);

  // Set refs
  useEffect(() => {
    item.setContainerRef(containerRef.current);
    if (stageRef.current) {
      item.setStageRef(stageRef.current);
    }
  }, [item]);

  if (!item.currentSrc) {
    return <ErrorMessage message="No DICOM source specified" />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  const { width, height } = containerSize;
  const stageWidth = item.stageWidth || width;
  const stageHeight = item.stageHeight || height;

  return (
    <ObjectTag item={item}>
      <Block name="dicom-viewer">
        {/* Controls bar */}
        <Elem name="controls">
          <FrameControls item={item} />
          <WindowPresets item={item} />
          <DicomMetadata item={item} />
        </Elem>

        {/* Main viewer container */}
        <Elem
          name="container"
          ref={containerRef}
          style={{
            width: item.width,
            maxWidth: item.maxwidth,
            maxHeight: item.maxheight,
          }}
        >
          {loading && (
            <Elem name="loading">
              <LoadingOutlined />
              <span>Loading DICOM...</span>
            </Elem>
          )}

          {/* Hidden dwv container for DICOM parsing */}
          <div
            id={`dwv-container-${item.name}`}
            style={{ display: "none" }}
          />

          {/* Konva stage for annotations */}
          {!loading && item.dicomIsLoaded && (
            <Stage
              ref={stageRef}
              width={width}
              height={height}
              style={{ position: "absolute", top: 0, left: 0 }}
            >
              {/* Background layer with DICOM image */}
              <Layer>
                {dicomImage && (
                  <Rect
                    x={item.alignmentOffset.x}
                    y={item.alignmentOffset.y}
                    width={stageWidth}
                    height={stageHeight}
                    fillPatternImage={dicomImage}
                    fillPatternScale={{
                      x: stageWidth / item.naturalWidth,
                      y: stageHeight / item.naturalHeight,
                    }}
                  />
                )}
              </Layer>

              {/* Regions layer */}
              <Layer
                name="regions"
                {...item.layerZoomScalePosition}
              >
                <DicomRegions item={item} width={stageWidth} height={stageHeight} />
              </Layer>
            </Stage>
          )}

          {/* Toolbar */}
          {item.hasTools && (
            <Toolbar item={item} />
          )}
        </Elem>

        {/* Frame timeline for multi-frame DICOM */}
        {item.isMultiFrame && (
          <Elem name="timeline">
            <input
              type="range"
              min={1}
              max={item.length}
              value={item.frame}
              onChange={(e) => item.setFrame(parseInt(e.target.value, 10))}
              className="dicom-viewer__timeline-slider"
            />
          </Elem>
        )}
      </Block>
    </ObjectTag>
  );
});
