import { isAlive, types } from "mobx-state-tree";
import { DicomEntity } from "./DicomEntity";

/**
 * Mixin that provides DicomEntity management for the Dicom tag
 * Handles multiple DICOM files (series) and entity lifecycle
 */
export const DicomEntityMixin = types
  .model({
    currentDicomEntity: types.maybeNull(types.reference(DicomEntity)),
    dicomEntities: types.optional(types.array(DicomEntity), []),
  })
  .actions((self) => ({
    beforeDestroy() {
      self.currentDicomEntity = null;
    },
  }))
  .views((self) => ({
    get maxItemIndex() {
      return self.dicomEntities.length - 1;
    },

    get dicomIsLoaded() {
      const entity = self.currentDicomEntity;
      return !entity?.downloading && !entity?.error && entity?.downloaded && entity?.dicomLoaded;
    },

    get naturalWidth() {
      return self.currentDicomEntity?.naturalWidth;
    },
    set naturalWidth(value) {
      self.currentDicomEntity?.setNaturalWidth(value);
    },

    get naturalHeight() {
      return self.currentDicomEntity?.naturalHeight;
    },
    set naturalHeight(value) {
      self.currentDicomEntity?.setNaturalHeight(value);
    },

    get stageWidth() {
      return self.currentDicomEntity?.stageWidth;
    },
    set stageWidth(value) {
      self.currentDicomEntity?.setStageWidth(value);
    },

    get stageHeight() {
      return self.currentDicomEntity?.stageHeight;
    },
    set stageHeight(value) {
      self.currentDicomEntity?.setStageHeight(value);
    },

    get stageRatio() {
      return self.currentDicomEntity?.stageRatio;
    },
    set stageRatio(value) {
      self.currentDicomEntity?.setStageRatio(value);
    },

    get containerWidth() {
      return self.currentDicomEntity?.containerWidth;
    },
    set containerWidth(value) {
      self.currentDicomEntity?.setContainerWidth(value);
    },

    get containerHeight() {
      return self.currentDicomEntity?.containerHeight;
    },
    set containerHeight(value) {
      self.currentDicomEntity?.setContainerHeight(value);
    },

    get currentFrame() {
      return self.currentDicomEntity?.currentFrame ?? 1;
    },

    get frameCount() {
      return self.currentDicomEntity?.frameCount ?? 1;
    },

    get isMultiFrame() {
      return self.frameCount > 1;
    },

    get windowCenter() {
      return self.currentDicomEntity?.windowCenter ?? 40;
    },

    get windowWidth() {
      return self.currentDicomEntity?.windowWidth ?? 400;
    },

    get brightnessGrade() {
      return self.currentDicomEntity?.brightnessGrade ?? 100;
    },

    get contrastGrade() {
      return self.currentDicomEntity?.contrastGrade ?? 100;
    },

    get metadata() {
      return self.currentDicomEntity?.metadata ?? {};
    },

    /**
     * Get frame-specific data for export to task data
     */
    get dicomDataForTask() {
      if (!isAlive(self) || !self.currentDicomEntity) return {};

      const entity = self.currentDicomEntity;
      return {
        dicom_patient_id: entity.patientId,
        dicom_patient_name: entity.patientName,
        dicom_study_date: entity.studyDate,
        dicom_modality: entity.modality,
        dicom_series_description: entity.seriesDescription,
        dicom_frame_count: entity.frameCount,
        dicom_current_frame: entity.currentFrame,
      };
    },
  }))
  .actions((self) => ({
    findDicomEntity(index) {
      return self.dicomEntities.find((entity) => entity.index === index);
    },

    setCurrentDicomEntity(index) {
      self.currentDicomEntity = self.findDicomEntity(index);
    },

    setFrame(frame) {
      self.currentDicomEntity?.setCurrentFrame(frame);
    },

    nextFrame() {
      self.currentDicomEntity?.nextFrame();
    },

    prevFrame() {
      self.currentDicomEntity?.prevFrame();
    },

    setWindowCenter(value) {
      self.currentDicomEntity?.setWindowCenter(value);
    },

    setWindowWidth(value) {
      self.currentDicomEntity?.setWindowWidth(value);
    },

    setBrightnessGrade(value) {
      self.currentDicomEntity?.setBrightnessGrade(value);
    },

    setContrastGrade(value) {
      self.currentDicomEntity?.setContrastGrade(value);
    },

    applyWindowPreset(preset) {
      self.currentDicomEntity?.applyWindowPreset(preset);
    },
  }));
