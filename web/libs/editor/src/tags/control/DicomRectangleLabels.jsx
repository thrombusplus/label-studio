import { observer } from "mobx-react";
import { types } from "mobx-state-tree";

import LabelMixin from "../../mixins/LabelMixin";
import Registry from "../../core/Registry";
import SelectedModelMixin from "../../mixins/SelectedModel";
import Types from "../../core/Types";
import { RectangleModel } from "./Rectangle";
import { HtxLabels, LabelsModel } from "./Labels/Labels";
import ControlBase from "./Base";

/**
 * The `DicomRectangleLabels` tag creates labeled rectangle regions on DICOM medical images.
 * Supports multi-frame DICOM files with per-frame annotations.
 *
 * Use with the following data types: DICOM images
 * @example
 * <!--Basic DICOM rectangle labeling configuration-->
 * <View>
 *   <DicomRectangleLabels name="labels" toName="dicom">
 *     <Label value="Tumor" />
 *     <Label value="Lesion" />
 *     <Label value="Nodule" />
 *   </DicomRectangleLabels>
 *   <Dicom name="dicom" value="$dicom_url" />
 * </View>
 * @name DicomRectangleLabels
 * @regions DicomRectangleRegion
 * @meta_title DICOM Rectangle Labels for Medical Image Annotation
 * @meta_description Create labeled rectangle regions on DICOM medical images for radiology and medical imaging annotation tasks.
 * @param {string} name                      - Name of the element
 * @param {string} toName                    - Name of the DICOM element to label
 * @param {single|multiple=} [choice=single] - Configure whether the labeler can select one or multiple labels
 * @param {number} [maxUsages]               - Maximum number of times a label can be used per task
 * @param {boolean} [showInline=true]        - Show labels in the same visual line
 */

const Validation = types.model({
  controlledTags: Types.unionTag(["Dicom"]),
});

const ModelAttrs = types.model("DicomRectangleLabelsModel", {
  type: "dicomrectanglelabels",
  children: Types.unionArray(["label", "header", "view", "hypertext"]),
});

const DicomRectangleLabelsModel = types.compose(
  "DicomRectangleLabelsModel",
  ControlBase,
  LabelsModel,
  ModelAttrs,
  RectangleModel,
  Validation,
  LabelMixin,
  SelectedModelMixin.props({ _child: "LabelModel" }),
);

const HtxDicomRectangleLabels = observer(({ item }) => {
  return <HtxLabels item={item} />;
});

Registry.addTag(
  "dicomrectanglelabels",
  DicomRectangleLabelsModel,
  HtxDicomRectangleLabels,
);

export { HtxDicomRectangleLabels, DicomRectangleLabelsModel };
