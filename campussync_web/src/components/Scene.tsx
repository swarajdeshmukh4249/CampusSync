import AcademicOrbit from './3d/AcademicOrbit';

interface SceneProps {
  scrollProgress?: number;
  theme?: 'dark' | 'light';
}

export function Scene({ scrollProgress = 0, theme = 'dark' }: SceneProps) {
    return <AcademicOrbit scrollProgress={scrollProgress} theme={theme} />;
}
