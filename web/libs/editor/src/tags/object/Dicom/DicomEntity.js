import { types, getParent } from "mobx-state-tree";

/**
 * DicomEntity represents a single DICOM file or series with multiple frames
 * Handles frame-based navigation and DICOM-specific metadata
 */
export const DicomEntity = types
  .model("DicomEntity", {
    id: types.identifier,
    src: types.string,
    index: types.number,

    /**
     * Natural sizes of DICOM image
     */
    naturalWidth: types.optional(types.integer, 512),
    naturalHeight: types.optional(types.integer, 512),

    stageWidth: types.optional(types.number, 512),
    stageHeight: types.optional(types.number, 512),

    /**
     * Current frame index (1-based for consistency with Video tag)
     */
    currentFrame: types.optional(types.number, 1),

    /**
     * Total number of frames in the DICOM file/series
     */
    frameCount: types.optional(types.number, 1),

    /**
     * DICOM Window Center (for windowing/contrast)
     */
    windowCenter: types.optional(types.number, 40),

    /**
     * DICOM Window Width (for windowing/brightness)
     */
    windowWidth: types.optional(types.number, 400),

    /**
     * Brightness grade (0-200, 100 is default)
     */
    brightnessGrade: types.optional(types.number, 100),

    /**
     * Contrast grade (0-200, 100 is default)
     */
    contrastGrade: types.optional(types.number, 100),
  })
  .volatile(() => ({
    stageRatio: 1,
    containerWidth: 1,
    containerHeight: 1,

    /** Is DICOM file downloaded */
    downloaded: false,
    /** Is DICOM file being downloaded */
    downloading: false,
    /** If error happened during download */
    error: false,
    /** Download progress 0..1 */
    progress: 0,
    /** Is DICOM loaded and parsed */
    dicomLoaded: false,

    /** DICOM metadata extracted from tags */
    metadata: {},

    /** dwv App instance reference */
    dwvApp: null,

    /** Pixel data for current frame (for Konva rendering) */
    frameImageData: null,
  }))
  .views((self) => ({
    get parent() {
      return getParent(self, 2);
    },

    get isMultiFrame() {
      return self.frameCount > 1;
    },

    /**
     * Get DICOM metadata value by tag name
     */
    getMetadata(tagName) {
      return self.metadata[tagName] ?? null;
    },

    get patientId() {
      return self.metadata.PatientID ?? "";
    },

    get patientName() {
      return self.metadata.PatientName ?? "";
    },

    get studyDate() {
      return self.metadata.StudyDate ?? "";
    },

    get modality() {
      return self.metadata.Modality ?? "";
    },

    get seriesDescription() {
      return self.metadata.SeriesDescription ?? "";
    },
  }))
  .actions((self) => ({
    setNaturalWidth(value) {
      self.naturalWidth = value;
    },

    setNaturalHeight(value) {
      self.naturalHeight = value;
    },

    setStageWidth(value) {
      self.stageWidth = value;
    },

    setStageHeight(value) {
      self.stageHeight = value;
    },

    setStageRatio(value) {
      self.stageRatio = value;
    },

    setContainerWidth(value) {
      self.containerWidth = value;
    },

    setContainerHeight(value) {
      self.containerHeight = value;
    },

    setDownloaded(value) {
      self.downloaded = value;
    },

    setDownloading(value) {
      self.downloading = value;
    },

    setError(value) {
      self.error = value;
    },

    setProgress(value) {
      self.progress = value;
    },

    setDicomLoaded(value) {
      self.dicomLoaded = value;
    },

    setMetadata(metadata) {
      self.metadata = metadata;
    },

    setDwvApp(app) {
      self.dwvApp = app;
    },

    setFrameCount(count) {
      self.frameCount = count;
    },

    setCurrentFrame(frame) {
      const clampedFrame = Math.max(1, Math.min(frame, self.frameCount));
      self.currentFrame = clampedFrame;
    },

    setWindowCenter(value) {
      self.windowCenter = value;
    },

    setWindowWidth(value) {
      self.windowWidth = value;
    },

    setBrightnessGrade(value) {
      self.brightnessGrade = value;
    },

    setContrastGrade(value) {
      self.contrastGrade = value;
    },

    setFrameImageData(imageData) {
      self.frameImageData = imageData;
    },

    /**
     * Navigate to next frame
     */
    nextFrame() {
      if (self.currentFrame < self.frameCount) {
        self.setCurrentFrame(self.currentFrame + 1);
      }
    },

    /**
     * Navigate to previous frame
     */
    prevFrame() {
      if (self.currentFrame > 1) {
        self.setCurrentFrame(self.currentFrame - 1);
      }
    },

    /**
     * Apply windowing preset
     */
    applyWindowPreset(preset) {
      const presets = {
        // Common CT presets
        bone: { center: 300, width: 1500 },
        lung: { center: -600, width: 1500 },
        abdomen: { center: 40, width: 400 },
        brain: { center: 40, width: 80 },
        // Common MRI presets
        t1: { center: 500, width: 1000 },
        t2: { center: 400, width: 800 },
      };

      if (presets[preset]) {
        self.setWindowCenter(presets[preset].center);
        self.setWindowWidth(presets[preset].width);
      }
    },
  }));
