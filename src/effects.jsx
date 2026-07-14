import { EffectComposer, Bloom, N8AO, Vignette, SMAA, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

// The polish pass. AO grounds objects in their creases, bloom makes the lanterns
// and Sahloka glow, AgX tone-maps the HDR, SMAA cleans the edges.
export default function Effects() {
  return (
    <EffectComposer multisampling={0} disableNormalPass>
      <N8AO aoRadius={2.2} intensity={2.4} distanceFalloff={1.0} quality="medium" />
      <Bloom mipmapBlur luminanceThreshold={0.85} luminanceSmoothing={0.2} intensity={0.85} levels={7} />
      <ToneMapping mode={ToneMappingMode.AGX} />
      <Vignette offset={0.22} darkness={0.62} eskil={false} />
      <SMAA />
    </EffectComposer>
  )
}
