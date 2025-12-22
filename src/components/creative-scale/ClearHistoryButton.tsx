/**
 * Clear History Button with Confirmation Modal
 * Resets Creative Scale session without affecting account or other projects
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { RotateCcw, Trash2 } from 'lucide-react';

interface ClearHistoryButtonProps {
  onClear: () => void;
  variant?: 'sidebar' | 'header';
}

export function ClearHistoryButton({ onClear, variant = 'sidebar' }: ClearHistoryButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClear = () => {
    onClear();
    setIsOpen(false);
  };

  if (variant === 'sidebar') {
    return (
      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Clear History
          </Button>
        </AlertDialogTrigger>
        <ClearHistoryDialog onConfirm={handleClear} />
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="text-muted-foreground hover:text-destructive hover:border-destructive"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Reset Session
        </Button>
      </AlertDialogTrigger>
      <ClearHistoryDialog onConfirm={handleClear} />
    </AlertDialog>
  );
}

function ClearHistoryDialog({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2">
          <RotateCcw className="w-5 h-5 text-destructive" />
          Clear Creative AI Editor Session?
        </AlertDialogTitle>
        <AlertDialogDescription className="space-y-3">
          <p>
            This will reset the entire Creative AI Editor pipeline and clear:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Uploaded videos</li>
            <li>Analysis results</li>
            <li>Detected segments</li>
            <li>Brain V2 strategy output</li>
            <li>Execution plans</li>
            <li>Generated results</li>
          </ul>
          <p className="font-medium text-foreground">
            This will NOT affect your account, other projects, or saved exports.
          </p>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction 
          onClick={onConfirm}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          Clear Session
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}
