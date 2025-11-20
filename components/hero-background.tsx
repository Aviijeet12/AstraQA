"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { Stars, Sparkles, Float } from "@react-three/drei"
import { useRef } from "react"
import type * as THREE from "three"

function ParticleField() {
  const meshRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.05
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.02
    }
  })

  return (
    <group ref={meshRef}>
      <Sparkles count={200} scale={12} size={2} speed={0.4} opacity={0.5} color="#4f46e5" />
      <Sparkles count={200} scale={10} size={1.5} speed={0.3} opacity={0.5} color="#a855f7" />
      <Sparkles count={200} scale={8} size={1} speed={0.2} opacity={0.5} color="#ffffff" />
    </group>
  )
}

export default function HeroBackground() {
  return (
    <div className="absolute inset-0 -z-10 h-full w-full overflow-hidden bg-black">
      <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
        <color attach="background" args={["#000000"]} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
          <ParticleField />
        </Float>
      </Canvas>
      {/* Gradient overlay to ensure text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
    </div>
  )
}
