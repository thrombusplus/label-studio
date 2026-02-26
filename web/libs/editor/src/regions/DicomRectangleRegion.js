import { types } from "mobx-state-tree";

import NormalizationMixin from "../mixins/Normalization";
import RegionsMixin from "../mixins/Regions";
import Registry from "../core/Registry";
import { AreaMixin } from "../mixins/AreaMixin";
import { DicomRegion, onlyProps } from "./DicomRegion";

/**
 * DicomRectangleRegion - Rectangle region with DICOM frame support
 * Extends DicomRegion with rectangle-specific properties
 */
const Model = types
  .model("DicomRectangleRegionModel", {
    type: "dicomrectangleregion",

    // Rectangle properties
    x: types.optional(types.number, 0),
    y: types.optional(types.number, 0),
    width: types.optional(types.number, 0),
    height: types.optional(types.number, 0),
    rotation: types.optional(types.number, 0),
  })
  .volatile(() => ({
    props: ["x", "y", "width", "height", "rotation"],
  }))
  .views((self) => ({
    get bboxCoords() {
      const shape = self.isMultiFrame ? self.getShape(self.currentFrame) : self;
      if (!shape) return null;

      return {
        left: shape.x,
        top: shape.y,
        right: shape.x + shape.width,
        bottom: shape.y + shape.height,
      };
    },
  }))
  .actions((self) => ({
    setPosition(x, y, width, height, rotation) {
      self.x = x;
      self.y = y;
      self.width = width;
      self.height = height;
      self.rotation = (rotation + 360) % 360;

      if (self.isMultiFrame) {
        self.updateShape(
          { x, y, width, height, rotation: self.rotation },
          self.currentFrame,
        );
      }
    },

    setSize(width, height) {
      self.width = width;
      self.height = height;

      if (self.isMultiFrame) {
        self.updateShape({ width, height }, self.currentFrame);
      }
    },
  }));

const DicomRectangleRegionModel = types.compose(
  "DicomRectangleRegionModel",
  RegionsMixin,
  DicomRegion,
  AreaMixin,
  NormalizationMixin,
  Model,
);

Registry.addRegionType(DicomRectangleRegionModel, "dicom");

export { DicomRectangleRegionModel };
