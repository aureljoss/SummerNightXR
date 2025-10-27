import {
  OrbitControls,
  useGLTF,
  useTexture,
  Center,
  Sparkles,
  shaderMaterial,
} from "@react-three/drei";
import portalVertexShader from "./shaders/portal/vertex.glsl";
import portalFragmentShader from "./shaders/portal/fragment.glsl";
import * as THREE from "three";
import { extend, useFrame } from "@react-three/fiber";
import { useRef, useEffect, useState } from "react";
import { GUI } from "lil-gui";

const PortalMaterial = shaderMaterial(
  {
    uTime: 0,
    uColorStart: new THREE.Color("#ffffff"),
    uColorEnd: new THREE.Color("#000000"),
  },
  portalVertexShader,
  portalFragmentShader
);

extend({ PortalMaterial });

export default function Experience() {
  const { nodes } = useGLTF("./model/Winter-portal-FINAL.glb");
  const bakedTexture = useTexture("./model/baked-final.jpg");
  bakedTexture.flipY = false;

  const sparklesRef = useRef();
  const [sparklesParams, setSparklesParams] = useState({
    size: 8,
    position: [0.5, 1.4, 0],
    count: 40,
  });

  useEffect(() => {
    const gui = new GUI();

    // Portal colors folder
    const portalFolder = gui.addFolder("Portal Colors");
    portalFolder.addColor(portalMaterial.current, "uColorStart");
    portalFolder.addColor(portalMaterial.current, "uColorEnd");

    // Sparkles folder
    const sparklesFolder = gui.addFolder("Fireflies");
    sparklesFolder
      .add(sparklesParams, "size", 1, 40, 0.1)
      .onChange((value) =>
        setSparklesParams((prev) => ({ ...prev, size: value }))
      );

    sparklesFolder
      .add(sparklesParams.position, "0", -5, 5, 0.1)
      .name("position x")
      .onChange((value) =>
        setSparklesParams((prev) => ({
          ...prev,
          position: [value, prev.position[1], prev.position[2]],
        }))
      );
    sparklesFolder
      .add(sparklesParams.position, "1", -5, 5, 0.1)
      .name("position y")
      .onChange((value) =>
        setSparklesParams((prev) => ({
          ...prev,
          position: [prev.position[0], value, prev.position[2]],
        }))
      );
    sparklesFolder
      .add(sparklesParams.position, "2", -5, 5, 0.1)
      .name("position z")
      .onChange((value) =>
        setSparklesParams((prev) => ({
          ...prev,
          position: [prev.position[0], prev.position[1], value],
        }))
      );

    return () => {
      gui.destroy();
    };
  }, []);

  // const { foxNodes } = useGLTF("./model/Fox.glb");
  // const foxTexture = useTexture("./model/Fox-Texture.png");
  // foxTexture.flipY = false;

  const portalMaterial = useRef();
  useFrame((state, delta) => {
    portalMaterial.current.uTime += delta;
  });

  return (
    <>
      <color args={["#030202"]} attach="background" />

      <OrbitControls makeDefault />
      <Center>
        <mesh geometry={nodes.baked.geometry} position={nodes.baked.position}>
          <meshBasicMaterial map={bakedTexture} />
        </mesh>
        <mesh
          geometry={nodes.poleLightA.geometry}
          position={[0.27, 0.86, 0.42]}
        >
          <meshBasicMaterial color="#ffffe5" />
        </mesh>
        <mesh
          geometry={nodes.poleLightB.geometry}
          position={nodes.poleLightB.position}
        >
          <meshBasicMaterial color="#ffffe5" />
        </mesh>
        <mesh
          geometry={nodes.portalLight.geometry}
          position={nodes.portalLight.position}
          rotation={nodes.portalLight.rotation}
        >
          <portalMaterial ref={portalMaterial} />{" "}
        </mesh>
        <Sparkles
          ref={sparklesRef}
          size={sparklesParams.size}
          scale={[5, 2, 4]}
          position={sparklesParams.position}
          speed={0.8}
          count={40}
        />
      </Center>
    </>
  );
}
