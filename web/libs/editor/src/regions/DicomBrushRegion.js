import { types } from "mobx-state-tree";

import NormalizationMixin from "../mixins/Normalization";
import RegionsMixin from "../mixins/Regions";
import Registry from "../core/Registry";
import { AreaMixin } from "../mixins/AreaMixin";
import { DicomRegion, onlyProps } from "./DicomRegion";

/**
 * DicomBrushRegion - Brush/segmentation region with DICOM frame support
 * Stores brush strokes per frame
 */
const Model = types
  .model("DicomBrushRegionModel", {
    type: "dicombrushregion",

    // Brush data (RLE encoded or raw)
    rle: types.maybeNull(types.frozen()),
    touches: types.maybeNull(types.frozen()),

    // Brush properties
    strokeWidth: types.optional(types.number, 15),
    opacity: types.optional(types.number, 1),
  })
  .volatile(() => ({
    props: ["rle", "touches", "strokeWidth", "opacity"],
    // Canvas for brush rendering
    canvas: null,
    imageData: null,
  }))
  .views((self) => ({
    get bboxCoords() {
      // For brush regions, we need to calculate from the mask
      if (!self.rle && !self.touches) return null;
      // This would be calculated from the actual brush data
      return null;
    },

    /**
     * Check if this brush region has any data
     */
    get hasData() {
      return !!(self.rle || self.touches);
    },
  }))
  .actions((self) => ({
    setCanvas(canvas) {
      self.canvas = canvas;
    },

    setRle(rle) {
      self.rle = rle;

      if (self.isMultiFrame) {
        self.updateShape({ rle }, self.currentFrame);
      }
    },

    setTouches(touches) {
      self.touches = touches;

      if (self.isMultiFrame) {
        self.updateShape({ touches }, self.currentFrame);
      }
    },

    setStrokeWidth(width) {
      self.strokeWidth = width;
    },

    setOpacity(opacity) {
      self.opacity = opacity;
    },

    /**
     * Add a brush stroke point
     */
    addStrokePoint(point) {
      const touches = self.touches ? [...self.touches] : [];
      touches.push(point);
      self.setTouches(touches);
    },

    /**
     * Clear the brush data
     */
    clear() {
      self.rle = null;
      self.touches = null;
      self.imageData = null;
    },
  }));

const DicomBrushRegionModel = types.compose(
  "DicomBrushRegionModel",
  RegionsMixin,
  DicomRegion,
  AreaMixin,
  NormalizationMixin,
  Model,
);

Registry.addRegionType(DicomBrushRegionModel, "dicom");

export { DicomBrushRegionModel };
