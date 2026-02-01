"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { Environment, Icosahedron, Float } from "@react-three/drei";

function Flashlight() {
    const lightRef = useRef<THREE.SpotLight>(null);
    const { viewport } = useThree();

    useFrame((state) => {
        if (!lightRef.current) return;
        // Calculate position based on mouse (-1 to 1) mapped to viewport
        const x = (state.pointer.x * viewport.width) / 2;
        const y = (state.pointer.y * viewport.height) / 2;

        // Smoothly interpolate light position
        lightRef.current.position.lerp(new THREE.Vector3(x, y, 6), 0.1);
        lightRef.current.target.position.lerp(new THREE.Vector3(x / 2, y / 2, 0), 0.1);
        lightRef.current.target.updateMatrixWorld();
    });

    return (
        <spotLight
            ref={lightRef}
            intensity={100}
            angle={0.4}
            penumbra={1}
            distance={20}
            color="#a855f7" // Purple tint for "Cyber" feel
            castShadow
        />
    );
}

function HeroObject() {
    const meshRef = useRef<THREE.Mesh>(null);
    useFrame((state) => {
        if (!meshRef.current) return;
        meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.2;
        meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.3;
    });

    return (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <Icosahedron args={[2, 0]} ref={meshRef}>
                <meshStandardMaterial
                    color="#1c1917" // Dark Stone
                    roughness={0.1}
                    metalness={0.8}
                    wireframe={false}
                />
            </Icosahedron>
            {/* Wireframe Overlay */}
            <Icosahedron args={[2.1, 0]}>
                <meshBasicMaterial color="#3b82f6" wireframe={true} transparent opacity={0.1} />
            </Icosahedron>
        </Float>
    )
}

export function SpotlightScene() {
    return (
        <div className="absolute inset-0 z-0">
            <Canvas shadows camera={{ position: [0, 0, 10], fov: 45 }}>
                <ambientLight intensity={0.2} />
                <Flashlight />
                {/* Secondary blue rim light */}
                <pointLight position={[-5, 5, -5]} intensity={10} color="#3b82f6" />

                <HeroObject />

                <Environment preset="city" />
            </Canvas>
        </div>
    );
}
