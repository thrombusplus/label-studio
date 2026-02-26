import { types } from "mobx-state-tree";

import NormalizationMixin from "../mixins/Normalization";
import RegionsMixin from "../mixins/Regions";
import Registry from "../core/Registry";
import { AreaMixin } from "../mixins/AreaMixin";
import { DicomRegion, onlyProps } from "./DicomRegion";

/**
 * DicomPolygonRegion - Polygon region with DICOM frame support
 * Stores polygon points per frame for multi-frame interpolation
 */
const Model = types
  .model("DicomPolygonRegionModel", {
    type: "dicompolygonregion",

    // Polygon points as array of {x, y}
    points: types.optional(types.frozen([]), []),

    // Whether the polygon is closed
    closed: types.optional(types.boolean, true),
  })
  .volatile(() => ({
    props: ["points", "closed"],
  }))
  .views((self) => ({
    get bboxCoords() {
      const pts = self.isMultiFrame
        ? self.getShape(self.currentFrame)?.points
        : self.points;

      if (!pts || pts.length === 0) return null;

      let minX = Infinity,
        minY = Infinity;
      let maxX = -Infinity,
        maxY = -Infinity;

      for (const pt of pts) {
        minX = Math.min(minX, pt.x);
        minY = Math.min(minY, pt.y);
        maxX = Math.max(maxX, pt.x);
        maxY = Math.max(maxY, pt.y);
      }

      return {
        left: minX,
        top: minY,
        right: maxX,
        bottom: maxY,
      };
    },

    get pointsArray() {
      const pts = self.isMultiFrame
        ? self.getShape(self.currentFrame)?.points
        : self.points;
      return pts || [];
    },

    get flatPoints() {
      const pts = self.pointsArray;
      const flat = [];
      for (const pt of pts) {
        flat.push(pt.x, pt.y);
      }
      return flat;
    },
  }))
  .actions((self) => ({
    setPoints(points) {
      self.points = points;

      if (self.isMultiFrame) {
        self.updateShape({ points }, self.currentFrame);
      }
    },

    addPoint(point) {
      const points = [...self.points, point];
      self.setPoints(points);
    },

    removePoint(index) {
      const points = self.points.filter((_, i) => i !== index);
      self.setPoints(points);
    },

    updatePoint(index, point) {
      const points = self.points.map((p, i) => (i === index ? point : p));
      self.setPoints(points);
    },

    setClosed(closed) {
      self.closed = closed;

      if (self.isMultiFrame) {
        self.updateShape({ closed }, self.currentFrame);
      }
    },

    /**
     * Move the entire polygon by offset
     */
    moveBy(dx, dy) {
      const points = self.points.map((pt) => ({
        x: pt.x + dx,
        y: pt.y + dy,
      }));
      self.setPoints(points);
    },
  }));

const DicomPolygonRegionModel = types.compose(
  "DicomPolygonRegionModel",
  RegionsMixin,
  DicomRegion,
  AreaMixin,
  NormalizationMixin,
  Model,
);

Registry.addRegionType(DicomPolygonRegionModel, "dicom");

export { DicomPolygonRegionModel };
