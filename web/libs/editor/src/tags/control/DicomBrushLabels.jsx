import { observer } from "mobx-react";
import { types } from "mobx-state-tree";

import LabelMixin from "../../mixins/LabelMixin";
import Registry from "../../core/Registry";
import SelectedModelMixin from "../../mixins/SelectedModel";
import Types from "../../core/Types";
import { BrushModel } from "./Brush";
import { HtxLabels, LabelsModel } from "./Labels/Labels";
import ControlBase from "./Base";

/**
 * The `DicomBrushLabels` tag creates brush/segmentation labels for DICOM medical images.
 * Enables pixel-level segmentation with per-frame annotation support for multi-slice imaging.
 *
 * Use with the following data types: DICOM images
 * @example
 * <!--Basic DICOM segmentation configuration-->
 * <View>
 *   <DicomBrushLabels name="segmentation" toName="dicom">
 *     <Label value="Organ" />
 *     <Label value="Tumor" />
 *     <Label value="Background" />
 *   </DicomBrushLabels>
 *   <Dicom name="dicom" value="$dicom_url" />
 * </View>
 * @name DicomBrushLabels
 * @regions DicomBrushRegion
 * @meta_title DICOM Brush Labels for Medical Image Segmentation
 * @meta_description Create pixel-level segmentation masks on DICOM medical images for radiology and pathology annotation tasks.
 * @param {string} name                      - Name of the element
 * @param {string} toName                    - Name of the DICOM element to label
 * @param {single|multiple=} [choice=single] - Configure whether the labeler can select one or multiple labels
 * @param {number} [maxUsages]               - Maximum number of times a label can be used per task
 * @param {boolean} [showInline=true]        - Show labels in the same visual line
 */

const Validation = types.model({
  controlledTags: Types.unionTag(["Dicom"]),
});

const ModelAttrs = types.model("DicomBrushLabelsModel", {
  type: "dicombrushlabels",
  children: Types.unionArray(["label", "header", "view", "hypertext"]),
});

const DicomBrushLabelsModel = types.compose(
  "DicomBrushLabelsModel",
  ControlBase,
  LabelsModel,
  ModelAttrs,
  BrushModel,
  Validation,
  LabelMixin,
  SelectedModelMixin.props({ _child: "LabelModel" }),
);

const HtxDicomBrushLabels = observer(({ item }) => {
  return <HtxLabels item={item} />;
});

Registry.addTag("dicombrushlabels", DicomBrushLabelsModel, HtxDicomBrushLabels);

export { HtxDicomBrushLabels, DicomBrushLabelsModel };
