import { observer } from "mobx-react";
import { types } from "mobx-state-tree";

import LabelMixin from "../../mixins/LabelMixin";
import Registry from "../../core/Registry";
import SelectedModelMixin from "../../mixins/SelectedModel";
import Types from "../../core/Types";
import { PolygonModel } from "./Polygon";
import { HtxLabels, LabelsModel } from "./Labels/Labels";
import ControlBase from "./Base";

/**
 * The `DicomPolygonLabels` tag creates labeled polygon regions on DICOM medical images.
 * Ideal for outlining irregular structures like organs, tumors, and anatomical features.
 *
 * Use with the following data types: DICOM images
 * @example
 * <!--Basic DICOM polygon labeling configuration-->
 * <View>
 *   <DicomPolygonLabels name="labels" toName="dicom">
 *     <Label value="Liver" />
 *     <Label value="Kidney" />
 *     <Label value="Spleen" />
 *   </DicomPolygonLabels>
 *   <Dicom name="dicom" value="$dicom_url" />
 * </View>
 * @name DicomPolygonLabels
 * @regions DicomPolygonRegion
 * @meta_title DICOM Polygon Labels for Medical Image Annotation
 * @meta_description Create labeled polygon regions on DICOM medical images for detailed anatomical structure annotation.
 * @param {string} name                      - Name of the element
 * @param {string} toName                    - Name of the DICOM element to label
 * @param {single|multiple=} [choice=single] - Configure whether the labeler can select one or multiple labels
 * @param {number} [maxUsages]               - Maximum number of times a label can be used per task
 * @param {boolean} [showInline=true]        - Show labels in the same visual line
 * @param {number} [pointSize=8]             - Size of polygon points
 * @param {string} [pointStyle=rectangle]    - Style of polygon points (rectangle or circle)
 */

const Validation = types.model({
  controlledTags: Types.unionTag(["Dicom"]),
});

const ModelAttrs = types.model("DicomPolygonLabelsModel", {
  type: "dicompolygonlabels",
  children: Types.unionArray(["label", "header", "view", "hypertext"]),
});

const DicomPolygonLabelsModel = types.compose(
  "DicomPolygonLabelsModel",
  ControlBase,
  LabelsModel,
  ModelAttrs,
  PolygonModel,
  Validation,
  LabelMixin,
  SelectedModelMixin.props({ _child: "LabelModel" }),
);

const HtxDicomPolygonLabels = observer(({ item }) => {
  return <HtxLabels item={item} />;
});

Registry.addTag(
  "dicompolygonlabels",
  DicomPolygonLabelsModel,
  HtxDicomPolygonLabels,
);

export { HtxDicomPolygonLabels, DicomPolygonLabelsModel };
