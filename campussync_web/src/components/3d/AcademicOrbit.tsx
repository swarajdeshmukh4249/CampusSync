import { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, Float, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';

interface AcademicOrbitProps {
  scrollProgress?: number;
  theme?: 'dark' | 'light';
}

export default function AcademicOrbit({ scrollProgress = 0, theme = 'dark' }: AcademicOrbitProps) {
  const coreRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const { mouse } = useThree();
  const [hoveredObject, setHoveredObject] = useState<string | null>(null);

  // Academic objects data
  const academicObjects = [
    { id: 'assignment', position: [3, 2, 0], label: 'Assignment_04.pdf', subtitle: 'Due tomorrow', color: '#7C6CFF' },
    { id: 'deadline', position: [-4, 1, 2], label: '24H', subtitle: 'Time remaining', color: '#FFB84D' },
    { id: 'course', position: [2, -3, -1], label: 'DBMS', subtitle: 'In progress', color: '#00D9FF' },
    { id: 'people', position: [-3, -2, -2], label: '12', subtitle: 'Classmates', color: '#32D583' },
    { id: 'notification', position: [0, 4, -3], label: 'Synced', subtitle: 'Just now', color: '#FF5C7A' },
  ];

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    // Core animation
    if (coreRef.current) {
      coreRef.current.position.y = Math.sin(time * 0.5) * 0.3;
      coreRef.current.rotation.x = time * 0.1;
      coreRef.current.rotation.y = time * 0.15;
    }

    // Parallax effect based on mouse
    if (groupRef.current) {
      groupRef.current.rotation.x = mouse.y * 0.05;
      groupRef.current.rotation.y = mouse.x * 0.05;
    }

    // Scroll-based animation
    if (groupRef.current && scrollProgress > 0) {
      const scale = 1 + Math.sin(scrollProgress * Math.PI) * 0.2;
      groupRef.current.scale.setScalar(scale);
    }
  });

  const coreColor = theme === 'dark' ? '#05070B' : '#FFFFFF';
  const emissiveColor = theme === 'dark' ? '#6C63FF' : '#635BFF';

  return (
    <group ref={groupRef}>
      {/* Lighting */}
      <ambientLight intensity={theme === 'dark' ? 0.5 : 0.8} />
      <directionalLight position={[10, 10, 5]} intensity={1} color={theme === 'dark' ? '#6C63FF' : '#635BFF'} />
      <pointLight position={[-10, -10, -10]} intensity={1} color="#00D9FF" />
      
      {/* Atmospheric Stars */}
      <Stars 
        radius={100} 
        depth={50} 
        count={5000} 
        factor={4} 
        saturation={0} 
        fade 
        speed={1}
      />

      {/* CampusSync Core */}
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        <Sphere ref={coreRef} args={[1.5, 64, 64]} position={[0, 0, 0]}>
          <MeshDistortMaterial
            color={coreColor}
            attach="material"
            distort={0.4}
            speed={2}
            roughness={0.2}
            metalness={0.8}
            emissive={emissiveColor}
            emissiveIntensity={0.2}
            transmission={0.9}
            thickness={1}
            transparent
            opacity={0.9}
          />
        </Sphere>
        
        {/* Inner sync symbol */}
        <group position={[0, 0, 1.6]}>
          <SyncSymbol scale={0.5} />
        </group>
      </Float>

      {/* Orbit Rings */}
      <OrbitRing radius={2.5} rotation={[0, 0, 0]} color={theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
      <OrbitRing radius={3.5} rotation={[Math.PI / 3, 0, 0]} color={theme === 'dark' ? 'rgba(0,217,255,0.2)' : 'rgba(0,168,199,0.2)'} />
      <OrbitRing radius={4.5} rotation={[Math.PI / 6, Math.PI / 4, 0]} color={theme === 'dark' ? 'rgba(124,108,255,0.15)' : 'rgba(99,91,255,0.15)'} />

      {/* Academic Objects */}
      {academicObjects.map((obj, index) => (
        <AcademicObject
          key={obj.id}
          {...obj}
          index={index}
          onHover={setHoveredObject}
          isHovered={hoveredObject === obj.id}
          theme={theme}
        />
      ))}
    </group>
  );
}

function SyncSymbol({ scale = 1 }: { scale: number }) {
  return (
    <group scale={scale}>
      {/* Two rotating arcs */}
      <mesh rotation={[0, 0, 0]}>
        <torusGeometry args={[0.8, 0.08, 16, 32, Math.PI]} />
        <meshStandardMaterial color="#00D9FF" emissive="#00D9FF" emissiveIntensity={0.5} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.8, 0.08, 16, 32, Math.PI]} />
        <meshStandardMaterial color="#7C6CFF" emissive="#7C6CFF" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

function OrbitRing({ radius, rotation, color }: { radius: number; rotation: [number, number, number]; color: string }) {
  const ringRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.getElapsedTime() * 0.1;
    }
  });

  return (
    <mesh ref={ringRef} rotation={rotation}>
      <torusGeometry args={[radius, 0.02, 16, 100]} />
      <meshBasicMaterial color={color} transparent opacity={0.6} />
    </mesh>
  );
}

function AcademicObject({ 
  position, 
  label, 
  subtitle, 
  color, 
  index,
  onHover,
  isHovered,
  theme 
}: any) {
  const groupRef = useRef<THREE.Group>(null);
  const basePosition = position as [number, number, number];
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime() + index * 0.5;
    if (groupRef.current) {
      // Orbit animation
      const orbitSpeed = 0.3 + index * 0.1;
      const orbitRadius = Math.sqrt(basePosition[0] ** 2 + basePosition[2] ** 2);
      
      groupRef.current.position.x = Math.sin(time * orbitSpeed) * orbitRadius;
      groupRef.current.position.z = Math.cos(time * orbitSpeed) * orbitRadius;
      groupRef.current.position.y = Math.sin(time * orbitSpeed * 2) * 0.5 + basePosition[1];
      
      // Hover effect
      if (isHovered) {
        groupRef.current.position.y += 0.3;
        groupRef.current.scale.setScalar(1.2);
      } else {
        groupRef.current.scale.setScalar(1);
      }
    }
  });

  return (
    <group 
      ref={groupRef} 
      position={basePosition}
      onPointerOver={() => onHover(label)}
      onPointerOut={() => onHover(null)}
    >
      {/* Glowing sphere */}
      <Sphere args={[0.3, 32, 32]}>
        <meshStandardMaterial 
          color={color} 
          emissive={color} 
          emissiveIntensity={isHovered ? 0.8 : 0.3}
          transparent
          opacity={0.9}
        />
      </Sphere>
      
      {/* Label */}
      <Html 
        position={[0, 0.6, 0]} 
        center
        className="pointer-events-none"
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: isHovered ? 1 : 0.7, y: isHovered ? 0 : 10 }}
          className="bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] rounded-xl px-4 py-2 text-center"
          style={{
            color: theme === 'dark' ? '#fff' : '#101218',
            minWidth: '120px'
          }}
        >
          <div className="text-sm font-semibold">{label}</div>
          <div className="text-xs opacity-60">{subtitle}</div>
        </motion.div>
      </Html>
    </group>
  );
}