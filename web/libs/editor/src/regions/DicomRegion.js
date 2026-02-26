import { types } from "mobx-state-tree";

import { guidGenerator } from "../core/Helpers";
import { AreaMixin } from "../mixins/AreaMixin";
import { AnnotationMixin } from "../mixins/AnnotationMixin";
import NormalizationMixin from "../mixins/Normalization";
import RegionsMixin from "../mixins/Regions";
import { DicomModel } from "../tags/object/Dicom/Dicom";

export const onlyProps = (props, obj) => {
  return Object.fromEntries(props.map((prop) => [prop, obj[prop]]));
};

/**
 * DicomRegion mixin for frame-aware annotation support
 * Each region can have a sequence of keyframes with interpolation between them
 * Default behavior: annotations stay on single frame
 */
const Model = types
  .model("DicomRegionModel", {
    id: types.optional(types.identifier, guidGenerator),
    pid: types.optional(types.string, guidGenerator),
    object: types.late(() => types.reference(DicomModel)),

    /**
     * Frame number where this region was created (1-based)
     * For single-frame annotations, this is the only frame where the region appears
     */
    frame: types.optional(types.number, 1),

    /**
     * Sequence of keyframes for multi-frame regions
     * Each keyframe contains: { frame, ...shapeProps, enabled }
     * Empty by default - regions are single-frame unless explicitly extended
     */
    sequence: types.frozen([]),

    /**
     * Whether this region spans multiple frames
     */
    isMultiFrame: types.optional(types.boolean, false),
  })
  .preProcessSnapshot((snapshot) => {
    // Handle legacy data or sequence-based data
    if (snapshot.sequence?.length > 0) {
      return { ...snapshot, isMultiFrame: true };
    }
    // Set frame from value if present
    if (snapshot.value?.frame !== undefined) {
      return { ...snapshot, frame: snapshot.value.frame };
    }
    return snapshot;
  })
  .volatile(() => ({
    hideable: true,
  }))
  .views((self) => ({
    get parent() {
      return self.object;
    },

    /**
     * Current frame from the parent DICOM object
     */
    get currentFrame() {
      return self.object?.frame ?? 1;
    },

    /**
     * Check if this region should be visible on the current frame
     */
    get isVisibleOnCurrentFrame() {
      if (!self.isMultiFrame) {
        // Single-frame region: only visible on its frame
        return self.frame === self.currentFrame;
      }
      // Multi-frame region: check lifespan
      return self.isInLifespan(self.currentFrame);
    },

    /**
     * Get shape properties for a specific frame
     * For single-frame regions, returns current props if on correct frame
     * For multi-frame regions, interpolates between keyframes
     */
    getShape(frame) {
      if (!self.isMultiFrame) {
        // Single-frame: return null if not on this frame
        if (frame !== self.frame) return null;
        return onlyProps(self.props, self);
      }

      // Multi-frame: find and interpolate
      let prev;
      let next;

      for (const item of self.sequence) {
        if (item.frame === frame) {
          return onlyProps(self.props, item);
        }

        if (item.frame > frame) {
          next = item;
          break;
        }
        prev = item;
      }

      if (!prev) return null;
      if (!next) return onlyProps(self.props, prev);

      // Interpolate between prev and next
      return self.interpolateShape(prev, next, frame);
    },

    /**
     * Linear interpolation between two keyframes
     */
    interpolateShape(prev, next, frame) {
      const t = (frame - prev.frame) / (next.frame - prev.frame);
      const result = {};

      for (const prop of self.props) {
        if (typeof prev[prop] === "number" && typeof next[prop] === "number") {
          // Handle rotation specially (shortest path)
          if (prop === "rotation") {
            result[prop] = self.interpolateRotation(prev[prop], next[prop], t);
          } else {
            result[prop] = prev[prop] + (next[prop] - prev[prop]) * t;
          }
        } else {
          result[prop] = prev[prop];
        }
      }

      return result;
    },

    /**
     * Interpolate rotation taking the shortest path
     */
    interpolateRotation(from, to, t) {
      let diff = to - from;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      return (from + diff * t + 360) % 360;
    },

    getVisibility() {
      return self.isVisibleOnCurrentFrame;
    },
  }))
  .actions((self) => ({
    /**
     * Update shape for a specific frame
     * For single-frame regions, updates the region props
     * For multi-frame regions, creates/updates a keyframe
     */
    updateShape(data, frame) {
      if (!self.isMultiFrame) {
        // Single-frame: just update props if on correct frame
        if (frame === self.frame) {
          Object.assign(self, data);
        }
        return;
      }

      // Multi-frame: update or create keyframe
      const newItem = {
        ...data,
        frame,
        enabled: true,
      };

      const kp = self.closestKeypoint(frame);
      const index = self.sequence.findIndex((item) => item.frame >= frame);

      if (index < 0) {
        self.sequence = [...self.sequence, newItem];
      } else {
        const keypoint = {
          ...(self.sequence[index] ?? {}),
          ...data,
          enabled: kp?.enabled ?? true,
          frame,
        };

        self.sequence = [
          ...self.sequence.slice(0, index),
          keypoint,
          ...self.sequence.slice(index + (self.sequence[index].frame === frame ? 1 : 0)),
        ];
      }
    },

    /**
     * Navigate to this region's frame in the viewer
     */
    onSelectInOutliner() {
      if (self.isMultiFrame && self.sequence.length > 0) {
        self.object.setFrame(self.sequence[0].frame);
      } else {
        self.object.setFrame(self.frame);
      }
    },

    /**
     * Serialize region with frame information
     */
    serialize() {
      const { frameCount } = self.object;

      const value = {
        frame: self.frame,
        framesCount: frameCount,
      };

      if (self.isMultiFrame) {
        value.sequence = self.sequence;
      }

      return { value };
    },

    /**
     * Toggle visibility at a specific frame (for multi-frame regions)
     */
    toggleLifespan(frame) {
      if (!self.isMultiFrame) return;

      const keypoint = self.closestKeypoint(frame, true);

      if (keypoint) {
        const index = self.sequence.indexOf(keypoint);

        self.sequence = [
          ...self.sequence.slice(0, index),
          { ...keypoint, enabled: !keypoint.enabled },
          ...self.sequence.slice(index + 1),
        ];
      }
    },

    /**
     * Add a keyframe at the specified frame
     */
    addKeypoint(frame) {
      if (!self.isMultiFrame) {
        // Convert to multi-frame region
        self.convertToMultiFrame();
      }

      const sequence = Array.from(self.sequence);
      const closestKeypoint = self.closestKeypoint(frame);
      const newKeypoint = {
        ...(self.getShape(frame) ??
          closestKeypoint ?? {
            x: self.x || 0,
            y: self.y || 0,
          }),
        enabled: closestKeypoint?.enabled ?? true,
        frame,
      };

      sequence.push(newKeypoint);
      sequence.sort((a, b) => a.frame - b.frame);

      self.sequence = sequence;
    },

    /**
     * Remove a keyframe at the specified frame
     */
    removeKeypoint(frame) {
      if (!self.isMultiFrame) return;
      self.sequence = self.sequence.filter((kp) => kp.frame !== frame);
    },

    /**
     * Check if region is visible at the target frame
     */
    isInLifespan(targetFrame) {
      if (!self.isMultiFrame) {
        return self.frame === targetFrame;
      }

      const closestKeypoint = self.closestKeypoint(targetFrame);

      if (closestKeypoint) {
        const { enabled, frame } = closestKeypoint;
        if (frame === targetFrame && !enabled) return true;
        return enabled;
      }
      return false;
    },

    /**
     * Find the closest keypoint at or before the target frame
     */
    closestKeypoint(targetFrame, onlyPrevious = false) {
      if (!self.isMultiFrame) return null;

      const seq = self.sequence;
      let result;

      const keypoints = seq.filter(({ frame }) => frame <= targetFrame);
      result = keypoints[keypoints.length - 1];

      if (!result && onlyPrevious !== true) {
        result = seq.find(({ frame }) => frame >= targetFrame);
      }

      return result;
    },

    /**
     * Convert a single-frame region to multi-frame
     */
    convertToMultiFrame() {
      if (self.isMultiFrame) return;

      const initialKeypoint = {
        ...onlyProps(self.props, self),
        frame: self.frame,
        enabled: true,
      };

      self.sequence = [initialKeypoint];
      self.isMultiFrame = true;
    },

    /**
     * Copy this region to a range of frames
     * Creates independent single-frame copies
     */
    copyToFrames(startFrame, endFrame) {
      const results = [];
      const shapeProps = onlyProps(self.props, self);

      for (let frame = startFrame; frame <= endFrame; frame++) {
        if (frame !== self.frame) {
          // This will be implemented by the parent annotation store
          // as it needs access to createResult
        }
      }

      return results;
    },

    /**
     * Set the frame for single-frame regions
     */
    setFrame(frame) {
      if (!self.isMultiFrame) {
        self.frame = frame;
      }
    },
  }));

const DicomRegion = types.compose(
  "DicomRegionModel",
  RegionsMixin,
  AreaMixin,
  AnnotationMixin,
  NormalizationMixin,
  Model,
);

export { DicomRegion };
