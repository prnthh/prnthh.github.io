import { Object3DType, DetailsView as Object3DDetailsView } from "./Object3D";
import { SpotLightType, DetailsView as SpotLightDetailsView } from "./SpotLight";
import { OrthoCameraType, DetailsView as OrthoCameraDetailsView } from "./OrthoCamera";

export const ObjectTypes = {
  object: { ...Object3DType, DetailsView: Object3DDetailsView },
  spotlight: { ...SpotLightType, DetailsView: SpotLightDetailsView },
  orthographicCamera: { ...OrthoCameraType, DetailsView: OrthoCameraDetailsView },
};
