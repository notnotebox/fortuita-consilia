export type PainMetrics = {
  iterations: number;
  consumed: number;
  length: number;
  painScore: number;
  painRatio: number;
  ratioLabel: string;
  ratioDetails: string;
};

export const SHORT_MESSAGE_ID_REGEX = /^[A-Za-z0-9_-]{10,14}$/;

export function toPublicMessageId(shortId: string): string {
  return shortId;
}

export function fromPublicMessageId(publicId: string): string | null {
  return SHORT_MESSAGE_ID_REGEX.test(publicId) ? publicId : null;
}

export function buildPainMetrics(input: {
  iterations: number;
  consumed: number;
  length: number;
}): PainMetrics {
  const iterations = Math.max(0, Math.floor(input.iterations));
  const consumed = Math.max(0, Math.floor(input.consumed));
  const length = Math.max(1, Math.floor(input.length));

  // "Peine" grows with text length and interaction cost (ops + consumed chars).
  const painScore = length + iterations * 1.35 + consumed * 0.85;
  const painRatio = painScore / length;

  const ratioLabel = `${painRatio.toFixed(2)}`;
  const ratioDetails = `Pain ratio = (length ${length} + iterations ${iterations}*1.35 + consumed ${consumed}*0.85) / length ${length} = ${ratioLabel}`;

  return {
    iterations,
    consumed,
    length,
    painScore,
    painRatio,
    ratioLabel,
    ratioDetails,
  };
}
