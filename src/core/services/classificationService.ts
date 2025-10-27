import * as OBC from '@thatopen/components';
import * as OBF from '@thatopen/fragments';
import * as WEBIFC from 'web-ifc';

export interface VisibilityContext {
  indexer: OBC.IfcRelationsIndexer;
  classifier: OBC.Classifier;
  hider: OBC.Hider;
}

export const classifyModel = async (components: OBC.Components, model: OBF.FragmentsGroup) => {
  const indexer = components.get(OBC.IfcRelationsIndexer);
  const classifier = components.get(OBC.Classifier);
  await indexer.process(model);
  classifier.byEntity(model);
  await classifier.bySpatialStructure(model, { isolate: new Set([WEBIFC.IFCBUILDINGSTOREY]) });
  return { indexer, classifier } as const;
};

export const createVisibilityContext = (components: OBC.Components) => {
  const indexer = components.get(OBC.IfcRelationsIndexer);
  const classifier = components.get(OBC.Classifier);
  const hider = components.get(OBC.Hider);
  return { indexer, classifier, hider } as VisibilityContext;
};


