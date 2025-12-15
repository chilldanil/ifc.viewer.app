import { useBIM } from '../context/BIMContext';
import { ViewerAPI } from '../api/viewerApi';

export const useViewerApi = (): ViewerAPI => {
  const { api } = useBIM();
  return api;
};
