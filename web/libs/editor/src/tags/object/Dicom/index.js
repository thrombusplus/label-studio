import { inject, observer } from "mobx-react";
import Registry from "../../../core/Registry";

import { HtxDicomView } from "./HtxDicom";
import { DicomModel } from "./Dicom";

const HtxDicom = inject("store")(observer(HtxDicomView));

Registry.addTag("dicom", DicomModel, HtxDicom);
Registry.addObjectType(DicomModel);

export { DicomModel, HtxDicom };
