export const dimensionDef : string = `A dimension will contain categorical dimension values (attributes) that are qualitative and subjective to the user. This means there is no right answer for selecting a dimension value. The user should be able to select any dimension value depending on their preference. The dimensions must not be an evaluation of how good the writing is. All responses are assumed to be the best writing generated by you.\n\n`

export const dimensionConclusion : string = `Even though I encourage you to use some of these examples if best fitting, I highly recommend that I also get unique and orthogonal dimensions.\n\n`

export const nominalDimensionDef : string = dimensionDef + `A nominal dimension will contain dimension values that do not have a particular order and are up to the user's selection. Some nominal dimensions that I would want are Tone, Setting, Style, or Perspective. I do NOT want Length, Grammar, Quality, or Clarity.\n\n` + dimensionConclusion;

export const ordinalDimensionDef : string = dimensionDef + `An ordinal dimension will contain dimension values measured in an order (least, less, neutral, more, most). The type of dimensions I want are ones that are of a single key property that the user may want more of or less of depending on their preference. Some ordinal dimensions that I would want are Concreteness, Realism, or Subjectivity. I do NOT want Quality, Creativity, or Length.\n\n` + dimensionConclusion;
