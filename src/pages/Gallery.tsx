import { ProjectGallery } from '@/components/ProjectGallery';

export default function Gallery() {
  return (
    <div className="container mx-auto p-6 lg:p-8 animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Asset Gallery</h1>
        <p className="text-muted-foreground mt-1">
          Browse all generated assets organized by project
        </p>
      </div>

      <ProjectGallery />
    </div>
  );
}
