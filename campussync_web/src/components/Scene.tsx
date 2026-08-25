import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, Float, Html, Stars } from '@react-three/drei';
import * as THREE from 'three';

export function Scene() {
    const coreRef = useRef<THREE.Mesh>(null!);

    useFrame((state) => {
        // Subtle hover animation for the core
        const time = state.clock.getElapsedTime();
        if (coreRef.current) {
            coreRef.current.position.y = Math.sin(time) * 0.2;
            coreRef.current.rotation.x = time * 0.2;
            coreRef.current.rotation.y = time * 0.3;
        }
    });

    return (
        <>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} color="#6C63FF" />
            <pointLight position={[-10, -10, -10]} intensity={1} color="#00D9FF" />

            {/* Atmospheric Stars */}
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

            {/* CampusCampus Core */}
            <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
                <Sphere ref={coreRef} args={[1.5, 64, 64]} position={[0, 0, 0]}>
                    <MeshDistortMaterial
                        color="#05070B"
                        attach="material"
                        distort={0.4}
                        speed={2}
                        roughness={0.2}
                        metalness={0.8}
                        emissive="#6C63FF"
                        emissiveIntensity={0.2}
                        transmission={0.9}
                        thickness={1}
                    />
                </Sphere>
            </Float>

            {/* Orbiting Elements */}
            <FloatingItem position={[3, 2, 0]} label="Assignment_04.pdf" rotationSpeed={0.5} />
            <FloatingItem position={[-4, 1, 2]} label="Deadline: 02d 07h" rotationSpeed={-0.3} delay={1} />
            <FloatingItem position={[2, -3, -1]} label="DS Course" rotationSpeed={0.4} delay={2} />
            <FloatingItem position={[-3, -2, -2]} label="Swaraj Submitted" rotationSpeed={-0.6} delay={1.5} />
            <FloatingItem position={[0, 4, -3]} label="Synced" rotationSpeed={0.2} delay={0.5} />
        </>
    );
}

function FloatingItem({ position, label, rotationSpeed, delay = 0 }: { position: [number, number, number], label: string, rotationSpeed: number, delay?: number }) {
    const groupRef = useRef<THREE.Group>(null!);

    useFrame((state) => {
        const time = state.clock.getElapsedTime() + delay;
        if (groupRef.current) {
            // Orbit around the center (0,0,0)
            groupRef.current.position.x = Math.sin(time * rotationSpeed) * Math.abs(position[0]);
            groupRef.current.position.z = Math.cos(time * rotationSpeed) * Math.abs(position[0]);
            groupRef.current.position.y = Math.sin(time * rotationSpeed * 2) * 1 + position[1];
        }
    });

    return (
        <group ref={groupRef} position={position}>
            <Html center className="pointer-events-none">
                <div className="bg-glass backdrop-blur-md border border-[rgba(255,255,255,0.1)] rounded-2xl px-4 py-2 text-white/80 font-medium text-sm whitespace-nowrap shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
                    {label}
                </div>
            </Html>
        </group>
    );
}
