import { useState } from 'react';
import { StudioLayout } from '@/components/studio/StudioLayout';
import { StudioProductInput } from '@/components/studio/StudioProductInput';
import { StudioHooksConfig } from '@/components/studio/StudioHooksConfig';
import { StudioApiKeys } from '@/components/studio/StudioApiKeys';
import { StudioGoogleSheet } from '@/components/studio/StudioGoogleSheet';
import { StudioGoogleDrive } from '@/components/studio/StudioGoogleDrive';
import { StudioPromptLayer } from '@/components/studio/StudioPromptLayer';
import { StudioAIProcessing } from '@/components/studio/StudioAIProcessing';
import { StudioAssetBuilder } from '@/components/studio/StudioAssetBuilder';

export type WorkflowLayer = 'input' | 'hooks' | 'apikeys' | 'googlesheet' | 'googledrive' | 'prompt1' | 'prompt2' | 'prompt3' | 'prompt4' | 'prompt5' | 'processing' | 'assets';

const Studio = () => {
  const [activeLayer, setActiveLayer] = useState<WorkflowLayer>('input');

  const renderLayerContent = () => {
    switch (activeLayer) {
      case 'input':
        return <StudioProductInput onNext={() => setActiveLayer('hooks')} />;
      case 'hooks':
        return <StudioHooksConfig onNext={() => setActiveLayer('apikeys')} />;
      case 'apikeys':
        return <StudioApiKeys onNext={() => setActiveLayer('googlesheet')} />;
      case 'googlesheet':
        return <StudioGoogleSheet onNext={() => setActiveLayer('googledrive')} />;
      case 'googledrive':
        return <StudioGoogleDrive onNext={() => setActiveLayer('prompt1')} />;
      case 'prompt1':
        return <StudioPromptLayer promptNumber={1} onNext={() => setActiveLayer('prompt2')} />;
      case 'prompt2':
        return <StudioPromptLayer promptNumber={2} onNext={() => setActiveLayer('prompt3')} />;
      case 'prompt3':
        return <StudioPromptLayer promptNumber={3} onNext={() => setActiveLayer('prompt4')} />;
      case 'prompt4':
        return <StudioPromptLayer promptNumber={4} onNext={() => setActiveLayer('prompt5')} />;
      case 'prompt5':
        return <StudioPromptLayer promptNumber={5} onNext={() => setActiveLayer('processing')} />;
      case 'processing':
        return <StudioAIProcessing onNext={() => setActiveLayer('assets')} />;
      case 'assets':
        return <StudioAssetBuilder />;
      default:
        return <StudioProductInput onNext={() => setActiveLayer('hooks')} />;
    }
  };

  return (
    <StudioLayout activeLayer={activeLayer} onLayerChange={setActiveLayer}>
      {renderLayerContent()}
    </StudioLayout>
  );
};

export default Studio;
