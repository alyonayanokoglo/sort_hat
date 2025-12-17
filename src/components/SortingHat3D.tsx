import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

interface HatMeshProps {
  isThinking: boolean;
  revealColor?: string;
}

function HatMesh({ isThinking, revealColor }: HatMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  
  const targetColor = useMemo(() => {
    return revealColor ? new THREE.Color(revealColor) : new THREE.Color('#2d1b0e');
  }, [revealColor]);

  useFrame((state) => {
    if (!groupRef.current) return;
    
    // Покачивание при размышлении
    if (isThinking) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.15;
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.5) * 0.08;
    } else {
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, 0, 0.05);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, 0.05);
    }

    // Плавная смена цвета при reveal
    if (materialRef.current && revealColor) {
      materialRef.current.color.lerp(targetColor, 0.03);
      materialRef.current.emissive.lerp(targetColor, 0.02);
      materialRef.current.emissiveIntensity = THREE.MathUtils.lerp(
        materialRef.current.emissiveIntensity,
        0.3,
        0.02
      );
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
      <group ref={groupRef} position={[0, -0.5, 0]}>
        {/* Основание шляпы (тулья) */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.6, 0.8, 0.4, 32]} />
          <meshStandardMaterial
            ref={materialRef}
            color="#2d1b0e"
            roughness={0.8}
            metalness={0.1}
            emissive="#2d1b0e"
            emissiveIntensity={0}
          />
        </mesh>
        
        {/* Поля шляпы */}
        <mesh position={[0, -0.15, 0]}>
          <cylinderGeometry args={[1.3, 1.4, 0.1, 32]} />
          <meshStandardMaterial color="#2d1b0e" roughness={0.9} metalness={0.05} />
        </mesh>
        
        {/* Верхняя часть (конус) */}
        <mesh position={[0, 0.7, 0]}>
          <coneGeometry args={[0.6, 1.2, 32]} />
          <meshStandardMaterial color="#3d2b1e" roughness={0.85} metalness={0.1} />
        </mesh>
        
        {/* Загнутый кончик */}
        <mesh position={[0.2, 1.2, 0.1]} rotation={[0.3, 0, 0.5]}>
          <coneGeometry args={[0.15, 0.4, 16]} />
          <meshStandardMaterial color="#4d3b2e" roughness={0.9} metalness={0.05} />
        </mesh>
        
        {/* Лента/ободок */}
        <mesh position={[0, 0.1, 0]}>
          <torusGeometry args={[0.65, 0.05, 8, 32]} />
          <meshStandardMaterial color="#8b7355" roughness={0.6} metalness={0.3} />
        </mesh>
        
        {/* Пряжка */}
        <mesh position={[0, 0.1, 0.68]} rotation={[0.1, 0, 0]}>
          <boxGeometry args={[0.15, 0.12, 0.02]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.8} />
        </mesh>

        {/* Глаза (складки) - левый */}
        <mesh position={[-0.25, 0.05, 0.75]} rotation={[0.2, -0.2, -0.3]}>
          <boxGeometry args={[0.2, 0.03, 0.05]} />
          <meshStandardMaterial color="#1a0f08" roughness={1} />
        </mesh>
        
        {/* Глаза (складки) - правый */}
        <mesh position={[0.25, 0.05, 0.75]} rotation={[0.2, 0.2, 0.3]}>
          <boxGeometry args={[0.2, 0.03, 0.05]} />
          <meshStandardMaterial color="#1a0f08" roughness={1} />
        </mesh>

        {/* Рот (складка) */}
        <mesh position={[0, -0.08, 0.78]} rotation={[0.1, 0, 0]}>
          <boxGeometry args={[0.35, 0.02, 0.04]} />
          <meshStandardMaterial color="#1a0f08" roughness={1} />
        </mesh>
      </group>
    </Float>
  );
}

function HatFallback() {
  return (
    <div style={{
      width: '100%',
      height: '280px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '4rem'
    }}>
      🎩
    </div>
  );
}

interface SortingHat3DProps {
  isThinking?: boolean;
  revealColor?: string;
}

export default function SortingHat3D({ isThinking = false, revealColor }: SortingHat3DProps) {
  return (
    <div style={{ width: '100%', height: '280px' }}>
      <Suspense fallback={<HatFallback />}>
        <Canvas
          camera={{ position: [0, 0.5, 3.5], fov: 45 }}
          style={{ background: 'transparent' }}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <directionalLight position={[-5, 3, -5]} intensity={0.4} color="#ffeedd" />
          <pointLight position={[0, 2, 2]} intensity={0.6} color="#ffcc88" />
          
          <HatMesh isThinking={isThinking} revealColor={revealColor} />
        </Canvas>
      </Suspense>
    </div>
  );
}
