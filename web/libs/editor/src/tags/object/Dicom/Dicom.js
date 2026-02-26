import { getRoot, getType, types } from "mobx-state-tree";
import React from "react";

import Registry from "../../../core/Registry";
import { AnnotationMixin } from "../../../mixins/AnnotationMixin";
import IsReadyMixin from "../../../mixins/IsReadyMixin";
import { BrushRegionModel } from "../../../regions/BrushRegion";
import { RectRegionModel } from "../../../regions/RectRegion";
import { PolygonRegionModel } from "../../../regions/PolygonRegion";
import { EllipseRegionModel } from "../../../regions/EllipseRegion";
import { KeyPointRegionModel } from "../../../regions/KeyPointRegion";
import * as Tools from "../../../tools";
import ToolsManager from "../../../tools/Manager";
import { parseValue } from "../../../utils/data";
import { guidGenerator } from "../../../utils/unique";
import { clamp, isDefined } from "../../../utils/utilities";
import ObjectBase from "../Base";
import { DicomEntityMixin } from "./DicomEntityMixin";

// Constants for DICOM viewer
const RELATIVE_STAGE_WIDTH = 100;
const RELATIVE_STAGE_HEIGHT = 100;

/**
 * The `Dicom` tag displays DICOM medical images on the labeling interface.
 * Supports multi-frame DICOM files (CT, MRI slices) with frame navigation.
 * Zoom and pan are disabled by default to preserve annotation coordinate accuracy.
 *
 * Use with the following data types: DICOM images (.dcm, .dicom)
 *
 * Annotations are saved as percentages of the original image size (0-100) with frame information.
 *
 * @example
 * <!--Basic DICOM labeling configuration-->
 * <View>
 *   <Dicom name="dicom" value="$dicom_url" />
 *   <RectangleLabels name="labels" toName="dicom">
 *     <Label value="Tumor" />
 *     <Label value="Lesion" />
 *   </RectangleLabels>
 * </View>
 *
 * @example
 * <!--Multi-file DICOM series labeling-->
 * <View>
 *   <Dicom name="dicom" valueList="$dicom_series" />
 *   <BrushLabels name="segmentation" toName="dicom">
 *     <Label value="Organ" />
 *     <Label value="Anomaly" />
 *   </BrushLabels>
 * </View>
 *
 * @name Dicom
 * @meta_title DICOM Tag for Medical Image Labeling
 * @meta_description Customize Label Studio with the DICOM tag for medical image annotation including CT, MRI, X-ray and other DICOM formats.
 * @param {string} name                       - Name of the element
 * @param {string} value                      - Data field containing a path or URL to the DICOM file
 * @param {string} [valueList]                - References a variable that holds a list of DICOM file URLs for series
 * @param {string=} [width=100%]              - Viewer width
 * @param {string=} [maxWidth=750px]          - Maximum viewer width
 * @param {boolean=} [zoom=false]             - Enable zooming (disabled by default for coordinate accuracy)
 * @param {boolean} [zoomControl=false]       - Show zoom controls in toolbar (disabled for DICOM)
 * @param {boolean} [brightnessControl=true]  - Show brightness/window level control in toolbar
 * @param {boolean} [contrastControl=true]    - Show contrast/window width control in toolbar
 * @param {boolean} [crosshair=false]         - Show crosshair cursor
 * @param {number} [defaultWindowCenter=40]   - Default DICOM window center value
 * @param {number} [defaultWindowWidth=400]   - Default DICOM window width value
 */
const TagAttrs = types.model({
  value: types.maybeNull(types.string),
  valuelist: types.maybeNull(types.string),
  width: types.optional(types.string, "100%"),
  maxwidth: types.optional(types.string, "100%"),
  maxheight: types.optional(types.string, "calc(100vh - 194px)"),

  // Zoom/pan disabled by default for coordinate accuracy
  zoom: types.optional(types.boolean, false),
  zoomcontrol: types.optional(types.boolean, false),

  // Windowing controls enabled by default for DICOM
  brightnesscontrol: types.optional(types.boolean, true),
  contrastcontrol: types.optional(types.boolean, true),

  crosshair: types.optional(types.boolean, false),
  selectioncontrol: types.optional(types.boolean, true),

  // Default DICOM windowing values
  defaultwindowcenter: types.optional(types.string, "40"),
  defaultwindowwidth: types.optional(types.string, "400"),

  // Alignment
  horizontalalignment: types.optional(types.enumeration(["left", "center", "right"]), "center"),
  verticalalignment: types.optional(types.enumeration(["top", "center", "bottom"]), "center"),
});

const DICOM_CONSTANTS = {
  rectangleModel: "RectangleModel",
  rectangleLabelsModel: "RectangleLabelsModel",
  brushLabelsModel: "BrushLabelsModel",
  rectanglelabels: "rectanglelabels",
  polygonlabels: "polygonlabels",
  brushlabels: "brushlabels",
  ellipselabels: "ellipselabels",
  keypointlabels: "keypointlabels",
};

const Model = types
  .model({
    type: "dicom",

    sizeUpdated: types.optional(types.boolean, false),

    /**
     * Cursor coordinates
     */
    cursorPositionX: types.optional(types.number, 0),
    cursorPositionY: types.optional(types.number, 0),

    brushControl: types.optional(types.string, "brush"),
    brushStrokeWidth: types.optional(types.number, 15),

    /**
     * Mode: drawing, viewing, brush, eraser
     */
    mode: types.optional(types.enumeration(["drawing", "viewing", "brush", "eraser"]), "viewing"),

    /**
     * Regions on this DICOM image
     * Each region includes frame information for multi-frame support
     */
    regions: types.array(
      types.union(
        BrushRegionModel,
        RectRegionModel,
        EllipseRegionModel,
        PolygonRegionModel,
        KeyPointRegionModel,
      ),
      [],
    ),
  })
  .volatile(() => ({
    currentDicom: 0,
    supportSuggestions: true,
    // Zoom is fixed at 1 for DICOM to preserve coordinates
    zoomScale: 1,
    zoomingPositionX: 0,
    zoomingPositionY: 0,
    stageZoom: 1,
    stageZoomX: 1,
    stageZoomY: 1,
    currentZoom: 1,
    // Store reference to dwv app
    dwvAppRef: null,
    // Container refs
    containerRef: null,
    stageRef: null,
  }))
  .views((self) => ({
    get store() {
      return getRoot(self);
    },

    /**
     * Current frame number (1-based)
     */
    get frame() {
      return self.currentDicomEntity?.currentFrame ?? 1;
    },

    /**
     * Total frame count
     */
    get length() {
      return self.currentDicomEntity?.frameCount ?? 1;
    },

    get multiDicom() {
      return !!self.isMultiItem;
    },

    get currentItemIndex() {
      return self.currentDicom;
    },

    get parsedValue() {
      return parseValue(self.value, self.store.task.dataObj);
    },

    get parsedValueList() {
      return parseValue(self.valuelist, self.store.task.dataObj);
    },

    get currentSrc() {
      return self.currentDicomEntity?.src;
    },

    get usedValue() {
      return self.multiDicom ? self.valuelist : self.value;
    },

    get dicoms() {
      const value = self.parsedValue;
      if (!value) return [];
      if (Array.isArray(value)) return value;
      return [value];
    },

    get hasStates() {
      const states = self.states();
      return states && states.length > 0;
    },

    /**
     * Get regions visible on the current frame
     */
    get visibleRegions() {
      return self.regs.filter((region) => {
        // If region has frame info, check if it matches current frame
        if (region.frame !== undefined) {
          return region.frame === self.frame;
        }
        // Legacy regions without frame info are always visible
        return true;
      });
    },

    get selectedRegions() {
      return self.regs.filter((region) => region.inSelection);
    },

    get selectedShape() {
      return self.regs.find((r) => r.selected);
    },

    get suggestions() {
      return self.annotation?.regionStore.suggestions.filter((r) => r.object === self) || [];
    },

    /**
     * States/labels attached to this DICOM
     */
    states() {
      return self.annotation.toNames.get(self.name);
    },

    activeStates() {
      const states = self.states();
      return states && states.filter((s) => s.isSelected && s.type.includes("labels"));
    },

    controlButton() {
      const names = self.states();
      if (!names || names.length === 0) return;

      let returnedControl = names[0];
      names.forEach((item) => {
        if (
          item.type === DICOM_CONSTANTS.rectanglelabels ||
          item.type === DICOM_CONSTANTS.brushlabels ||
          item.type === DICOM_CONSTANTS.ellipselabels
        ) {
          returnedControl = item;
        }
      });

      return returnedControl;
    },

    get controlButtonType() {
      const name = self.controlButton();
      return getType(name).name;
    },

    get stageComponentSize() {
      return {
        width: self.stageWidth,
        height: self.stageHeight,
      };
    },

    get canvasSize() {
      return {
        width: self.naturalWidth * self.stageZoomX,
        height: self.naturalHeight * self.stageZoomY,
      };
    },

    get alignmentOffset() {
      const offset = { x: 0, y: 0 };

      switch (self.horizontalalignment) {
        case "center": {
          offset.x = (self.containerWidth - self.canvasSize.width) / 2;
          break;
        }
        case "right": {
          offset.x = self.containerWidth - self.canvasSize.width;
          break;
        }
      }
      switch (self.verticalalignment) {
        case "center": {
          offset.y = (self.containerHeight - self.canvasSize.height) / 2;
          break;
        }
        case "bottom": {
          offset.y = self.containerHeight - self.canvasSize.height;
          break;
        }
      }

      return offset;
    },

    get maxScale() {
      return Math.min(
        self.containerWidth / self.naturalWidth,
        self.containerHeight / self.naturalHeight
      );
    },

    /**
     * Layer position for Konva
     */
    get layerZoomScalePosition() {
      return {
        scaleX: self.zoomScale,
        scaleY: self.zoomScale,
        x: self.zoomingPositionX + self.alignmentOffset.x,
        y: self.zoomingPositionY + self.alignmentOffset.y,
      };
    },

    get hasTools() {
      return !!self.getToolsManager().allTools()?.length;
    },

    /**
     * Frame range for timeline
     */
    get fullFrameRange() {
      return { start: 1, end: self.length };
    },
  }))
  .volatile(() => ({
    manager: null,
  }))
  .actions((self) => {
    const manager = ToolsManager.getInstance({ name: self.name });
    const env = { manager, control: self, object: self };

    function createDicomEntities() {
      if (!self.store.task) return;

      self.dicomEntities.clear();

      const parsedValue = self.multiDicom ? self.parsedValueList : self.parsedValue;
      const idPostfix = self.annotation ? `@${self.annotation.id}` : "";

      if (Array.isArray(parsedValue)) {
        parsedValue.forEach((src, index) => {
          self.dicomEntities.push({
            id: `${self.name}#${index}${idPostfix}`,
            src,
            index,
            windowCenter: Number(self.defaultwindowcenter) || 40,
            windowWidth: Number(self.defaultwindowwidth) || 400,
          });
        });
      } else if (parsedValue) {
        self.dicomEntities.push({
          id: `${self.name}#0${idPostfix}`,
          src: parsedValue,
          index: 0,
          windowCenter: Number(self.defaultwindowcenter) || 40,
          windowWidth: Number(self.defaultwindowwidth) || 400,
        });
      }

      self.setCurrentDicomEntity(0);
    }

    function afterAttach() {
      if (!self.annotation) return;

      if (self.selectioncontrol) {
        manager.addTool("MoveTool", Tools.Selection.create({}, env), "MoveTool");
      }

      // Only add zoom tool if explicitly enabled
      if (self.zoomcontrol && self.zoom) {
        manager.addTool("ZoomPanTool", Tools.Zoom.create({}, env), "ZoomPanTool");
      }

      if (self.brightnesscontrol) {
        manager.addTool("BrightnessTool", Tools.Brightness.create({}, env), "BrightnessTool");
      }

      if (self.contrastcontrol) {
        manager.addTool("ContrastTool", Tools.Contrast.create({}, env), "ContrastTool");
      }

      createDicomEntities();
    }

    function getToolsManager() {
      return manager;
    }

    return {
      afterAttach,
      getToolsManager,
    };
  })
  .actions((self) => ({
    setCurrentItem(index = 0) {
      self.setCurrentDicom(index);
    },

    setCurrentDicom(index = 0) {
      index = index ?? 0;
      if (index === self.currentDicom) return;

      self.currentDicom = index;
      self.currentDicomEntity = self.findDicomEntity(index);
    },

    /**
     * Set frame number (1-based)
     */
    setFrame(frame) {
      self.currentDicomEntity?.setCurrentFrame(frame);
    },

    /**
     * Navigate to next frame
     */
    nextFrame() {
      self.currentDicomEntity?.nextFrame();
    },

    /**
     * Navigate to previous frame
     */
    prevFrame() {
      self.currentDicomEntity?.prevFrame();
    },

    setPointerPosition({ x, y }) {
      self.freezeHistory();
      self.cursorPositionX = x;
      self.cursorPositionY = y;
    },

    setBrightnessGrade(value) {
      self.currentDicomEntity?.setBrightnessGrade(value);
    },

    setContrastGrade(value) {
      self.currentDicomEntity?.setContrastGrade(value);
    },

    setWindowCenter(value) {
      self.currentDicomEntity?.setWindowCenter(value);
    },

    setWindowWidth(value) {
      self.currentDicomEntity?.setWindowWidth(value);
    },

    applyWindowPreset(preset) {
      self.currentDicomEntity?.applyWindowPreset(preset);
    },

    updateBrushControl(arg) {
      self.brushControl = arg;
    },

    updateBrushStrokeWidth(arg) {
      self.brushStrokeWidth = arg;
    },

    setMode(mode) {
      self.mode = mode;
    },

    setContainerRef(ref) {
      self.containerRef = ref;
    },

    setStageRef(ref) {
      self.stageRef = ref;
      const currentTool = self.getToolsManager().findSelectedTool();
      currentTool?.updateCursor?.();
    },

    setDwvAppRef(ref) {
      self.dwvAppRef = ref;
    },

    /**
     * Called when DICOM is loaded to set dimensions
     */
    onDicomLoad({ width, height, frameCount, metadata }) {
      const entity = self.currentDicomEntity;
      if (!entity) return;

      entity.setNaturalWidth(width);
      entity.setNaturalHeight(height);
      entity.setFrameCount(frameCount);
      entity.setMetadata(metadata);
      entity.setDicomLoaded(true);
      entity.setDownloaded(true);

      self._recalculateDicomParams();
    },

    _recalculateDicomParams() {
      self.stageWidth = self.naturalWidth * self.stageZoom;
      self.stageHeight = self.naturalHeight * self.stageZoom;
    },

    _updateDicomSize({ width, height }) {
      if (self.naturalWidth === undefined) return;

      if (width > 1 && height > 1) {
        self.containerWidth = width;
        self.containerHeight = height;

        const scale = self.maxScale;
        self.stageZoom = scale;
        self.stageZoomX = scale;
        self.stageZoomY = scale;

        self._recalculateDicomParams();
      }

      self.sizeUpdated = true;
    },

    /**
     * Create region with frame information
     */
    createRegionWithFrame(regionData) {
      return {
        ...regionData,
        frame: self.frame,
      };
    },

    /**
     * Copy region to adjacent frames
     */
    copyRegionToFrames(region, startFrame, endFrame) {
      const results = [];
      for (let frame = startFrame; frame <= endFrame; frame++) {
        if (frame !== region.frame) {
          const newRegion = self.annotation.createResult(
            { ...region.serialize().value, frame },
            region.labeling,
            region.from_name,
            self
          );
          results.push(newRegion);
        }
      }
      return results;
    },
  }));

// Coordinate calculations for DICOM (fixed 1:1 mapping, no zoom transforms)
const DicomCoordsCalculations = types.model({}).views((self) => ({
  canvasToInternalX(n) {
    const { naturalWidth, stageWidth } = self;
    return (n / stageWidth) * RELATIVE_STAGE_WIDTH;
  },

  canvasToInternalY(n) {
    const { naturalHeight, stageHeight } = self;
    return (n / stageHeight) * RELATIVE_STAGE_HEIGHT;
  },

  internalToCanvasX(n) {
    const { stageWidth } = self;
    return (n / RELATIVE_STAGE_WIDTH) * stageWidth;
  },

  internalToCanvasY(n) {
    const { stageHeight } = self;
    return (n / RELATIVE_STAGE_HEIGHT) * stageHeight;
  },

  internalToImageX(n) {
    const { naturalWidth } = self;
    return (n / RELATIVE_STAGE_WIDTH) * naturalWidth;
  },

  internalToImageY(n) {
    const { naturalHeight } = self;
    return (n / RELATIVE_STAGE_HEIGHT) * naturalHeight;
  },

  imageToInternalX(n) {
    const { naturalWidth } = self;
    return (n / naturalWidth) * RELATIVE_STAGE_WIDTH;
  },

  imageToInternalY(n) {
    const { naturalHeight } = self;
    return (n / naturalHeight) * RELATIVE_STAGE_HEIGHT;
  },
}));

const DicomModel = types.compose(
  "DicomModel",
  TagAttrs,
  ObjectBase,
  AnnotationMixin,
  DicomEntityMixin,
  Model,
  DicomCoordsCalculations,
  IsReadyMixin,
);

export { DicomModel, RELATIVE_STAGE_WIDTH, RELATIVE_STAGE_HEIGHT };
