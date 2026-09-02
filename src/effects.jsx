import { EffectComposer, Bloom, N8AO, Vignette, SMAA, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

// The polish pass. AO grounds objects in their creases, bloom makes the lanterns
// and Sahloka glow, AgX tone-maps the HDR, SMAA cleans the edges.
// Phones skip the AO: it is the one pass a mobile GPU cannot hide.
const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches

export default function Effects() {
  return (
    <EffectComposer multisampling={0} disableNormalPass>
      {!coarse && <N8AO aoRadius={1.6} intensity={1.3} distanceFalloff={1.0} quality="medium" />}
      <Bloom mipmapBlur luminanceThreshold={0.72} luminanceSmoothing={0.2} intensity={1.1} levels={7} />
      <ToneMapping mode={ToneMappingMode.AGX} />
      <Vignette offset={0.25} darkness={0.4} eskil={false} />
      <SMAA />
    </EffectComposer>
  )
}
