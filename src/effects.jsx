import { EffectComposer, Bloom, N8AO, Vignette, SMAA, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

// The polish pass. AO grounds objects in their creases, bloom makes the lanterns
// and Sahloka glow, AgX tone-maps the HDR, SMAA cleans the edges.
// Phones skip the AO: it is the one pass a mobile GPU cannot hide.
const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches

export default function Effects() {
  return (
    <EffectComposer multisampling={0} disableNormalPass>
      {!coarse && <N8AO aoRadius={2.2} intensity={2.4} distanceFalloff={1.0} quality="medium" />}
      <Bloom mipmapBlur luminanceThreshold={0.55} luminanceSmoothing={0.25} intensity={1.45} levels={7} />
      <ToneMapping mode={ToneMappingMode.AGX} />
      <Vignette offset={0.22} darkness={0.62} eskil={false} />
      <SMAA />
    </EffectComposer>
  )
}
