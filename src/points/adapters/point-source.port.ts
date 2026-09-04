// Stub for spec step 5's points engine to implement; resolves a PointRule.sourceKey to a number.
export type PointSourcePeriod = 'monthly' | 'yearly' | 'once';

export interface PointSourceContext {
  clubId: string;
  ryYear: number;
  month?: Date;
}

export abstract class PointSourceAdapter {
  abstract resolve(sourceKey: string, context: PointSourceContext): Promise<number>;
}
