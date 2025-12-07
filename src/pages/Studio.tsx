import { useState } from 'react';
import { StudioLayout } from '@/components/studio/StudioLayout';
import { StudioProductInput } from '@/components/studio/StudioProductInput';
import { StudioAIProcessing } from '@/components/studio/StudioAIProcessing';
import { StudioAssetBuilder } from '@/components/studio/StudioAssetBuilder';

export type WorkflowLayer = 'input' | 'processing' | 'assets';

const Studio = () => {
  const [activeLayer, setActiveLayer] = useState<WorkflowLayer>('input');

  const renderLayerContent = () => {
    switch (activeLayer) {
      case 'input':
        return <StudioProductInput onNext={() => setActiveLayer('processing')} />;
      case 'processing':
        return <StudioAIProcessing onNext={() => setActiveLayer('assets')} />;
      case 'assets':
        return <StudioAssetBuilder />;
      default:
        return <StudioProductInput onNext={() => setActiveLayer('processing')} />;
    }
  };

  return (
    <StudioLayout activeLayer={activeLayer} onLayerChange={setActiveLayer}>
      {renderLayerContent()}
    </StudioLayout>
  );
};

export default Studio;