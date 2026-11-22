export type PlanetType = 'terrestrial' | 'gas-giant' | 'unknown';

export interface Exoplanet {
  id: string;
  name: string;
  hostStar: string;
  kepid?: string | null;
  planetType: PlanetType;
  disposition?: string | null;

  // Core planetary parameters
  radiusEarth: number | null;
  equilibriumTempK: number | null;
  stellarFluxEarth: number | null;
  distanceLightYears: number | null;
  orbitalPeriodDays?: number | null;
  semiMajorAxisAU?: number | null;
  transitDepthPpm?: number | null;
  transitDurationHours?: number | null;
  impactParameter?: number | null;
  massEarth?: number | null;

  // Stellar parameters
  stellarTempK?: number | null;
  stellarRadiusSolar?: number | null;
  stellarMassSolar?: number | null;
  stellarLogg?: number | null;
  stellarMetallicity?: number | null;
  keplerMagnitude?: number | null;

  // Candidate screening score (original method)
  candidateScore?: number | null;
  priority?: string | null;

  // Kopparapu Habitable Zone
  hzClassification?: string | null;
  hzClassificationFull?: string | null;
  hzClassificationOptimistic?: string | null;
  inConservativeHz?: boolean | null;
  inOptimisticHz?: boolean | null;
  hzInnerFluxConservative?: number | null;
  hzOuterFluxConservative?: number | null;
  hzInnerFluxOptimistic?: number | null;
  hzOuterFluxOptimistic?: number | null;
  hzInnerAU?: number | null;
  hzOuterAU?: number | null;
  hzInnerAUOptimistic?: number | null;
  hzOuterAUOptimistic?: number | null;
  stellarLuminositySolar?: number | null;

  // Earth Similarity Index
  esi?: number | null;
  esiRadius?: number | null;
  esiDensity?: number | null;
  esiEscapeVelocity?: number | null;
  esiTemperature?: number | null;
  esiComponentsUsed?: string[] | null;
  esiMissingInputs?: string[] | null;
  esiInterpretation?: string | null;

  // Physical parameters
  bulkDensityGcm3?: number | null;
  surfaceGravityMs2?: number | null;
  escapeVelocityMs?: number | null;
  compositionEstimate?: string | null;

  // Stellar intelligence
  stellarSpectralClass?: string | null;
  stellarSpectralDesc?: string | null;
  stellarLumClass?: string | null;
  stellarHzNote?: string | null;

  // HITE (Barnes, Meadows & Evans 2015)
  hiteScore?: number | null;
  hiteScorePrime?: number | null;
  hiteCalcType?: string | null;
  hiteRockyProbability?: number | null;
  hiteStatus?: string | null;
  hiteDataCompleteness?: number | null;
  hiteEMin?: number | null;
  hiteFMin?: number | null;
  hiteFMax?: number | null;

  // ML classification
  mlPredictedClass?: string | null;
  mlClassProbabilities?: Record<string, number> | null;
  mlFeatureContributions?: Array<{
    feature: string;
    label: string;
    value: number | null;
    contribution: number;
    direction: string;
    missing: boolean;
  }> | null;
  mlExplanationMethod?: string | null;
  mlLimitations?: string | null;
}
