/**
 * Unified Generation System - Shared Types
 * ONE intelligence, MULTIPLE execution adapters
 */

export type ExecutionMode = 'agent' | 'n8n' | 'edge';

export interface UnifiedInput {
  product: {
    title: string;
    description: string;
    media: string[];
  };
  marketingAngles?: string[];
  promptId: string;
  locale: string;
  executionMode: ExecutionMode;
  webhookUrl?: string; // For n8n mode
}

export interface LandingPageSections {
  hero: {
    headline: string;
    subheadline: string;
    imageUrl?: string;
  };
  features: Array<{
    title: string;
    description: string;
    icon?: string;
  }>;
  benefits: string[];
  problemSolution: {
    problem: string;
    solution: string;
  };
  usage: string[];
  technicalDetails: string[];
  faq: Array<{
    question: string;
    answer: string;
  }>;
  reviews: Array<{
    name: string;
    rating: number;
    text: string;
    location?: string;
  }>;
  cta: {
    text: string;
    subtext?: string;
  };
}

export interface UnifiedOutput {
  status: 'success' | 'error';
  html: string;
  sections: LandingPageSections;
  marketingAngles: {
    painPoints: string[];
    desires: string[];
    emotionalHooks: string[];
    trustBuilders: string[];
  };
  meta: {
    engine: ExecutionMode;
    latencyMs: number;
    promptVersion: number;
    generatedAt: string;
  };
  error?: string;
}

export interface ExecutionResult {
  success: boolean;
  data?: UnifiedOutput;
  error?: string;
}
