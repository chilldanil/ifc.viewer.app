import {
  zip,
  unzip,
  zipSync,
  unzipSync,
  strToU8,
  strFromU8,
  type Zippable,
  type Unzipped,
  type AsyncZipOptions,
} from 'fflate';
import {
  PROJECT_FORMAT_VERSION,
  type ProjectBundle,
  type ProjectModelPayload,
  type ProjectRenderPayload,
  type ProjectState,
} from './projectTypes';

const PROJECT_JSON = 'project.json';

const zipAsync = async (files: Zippable, opts: AsyncZipOptions): Promise<Uint8Array> => {
  try {
    return await new Promise<Uint8Array>((resolve, reject) => {
      zip(files, opts, (err, data) => (err ? reject(err) : resolve(data)));
    });
  } catch {
    // Fall back to synchronous zipping if the async worker is unavailable
    // (e.g. a strict CSP blocking the inline worker).
    return zipSync(files, { level: opts.level });
  }
};

const unzipAsync = async (data: Uint8Array): Promise<Unzipped> => {
  try {
    return await new Promise<Unzipped>((resolve, reject) => {
      unzip(data, (err, unzipped) => (err ? reject(err) : resolve(unzipped)));
    });
  } catch {
    return unzipSync(data);
  }
};

/**
 * Pack an in-memory project into a .ifcproj zip: project.json at the root,
 * plus the embedded model and render files referenced by it.
 */
export const packProjectBundle = async (bundle: ProjectBundle): Promise<Uint8Array> => {
  const files: Zippable = {
    [PROJECT_JSON]: strToU8(JSON.stringify(bundle.state, null, 2)),
  };
  for (const model of bundle.models) {
    files[model.meta.path] = model.bytes;
  }
  for (const render of bundle.renders) {
    files[render.meta.path] = render.bytes;
  }
  // IFC is text and compresses well; level 6 balances size against time.
  return zipAsync(files, { level: 6 });
};

/** Unpack a .ifcproj zip back into an in-memory project. */
export const unpackProjectBundle = async (data: Uint8Array): Promise<ProjectBundle> => {
  const files = await unzipAsync(data);

  const json = files[PROJECT_JSON];
  if (!json) {
    throw new Error('Invalid project file: project.json is missing.');
  }

  let state: ProjectState;
  try {
    state = JSON.parse(strFromU8(json)) as ProjectState;
  } catch {
    throw new Error('Invalid project file: project.json could not be parsed.');
  }

  if (typeof state.formatVersion !== 'number' || state.formatVersion > PROJECT_FORMAT_VERSION) {
    throw new Error(
      `This project was made with a newer version of the app (format ${state.formatVersion}).`
    );
  }

  const models: ProjectModelPayload[] = (state.models ?? []).map((meta) => {
    const bytes = files[meta.path];
    if (!bytes) {
      throw new Error(`Invalid project file: model "${meta.name}" (${meta.path}) is missing.`);
    }
    return { meta, bytes };
  });

  const renders: ProjectRenderPayload[] = [];
  for (const meta of state.renders ?? []) {
    const bytes = files[meta.path];
    if (bytes) {
      renders.push({ meta, bytes });
    }
  }

  return { state, models, renders };
};
