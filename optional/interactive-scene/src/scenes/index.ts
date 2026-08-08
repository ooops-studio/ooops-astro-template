import {registerInteractiveScenes} from '@ooopsstudio/scene-astro/runtime'

import {referenceScene, referenceSceneWebgl2} from './reference-scene'

registerInteractiveScenes({
  'reference-scene': referenceScene,
  'reference-scene-webgl2': referenceSceneWebgl2
})
