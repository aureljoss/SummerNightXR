import * as THREE from "three";
import { extend, useFrame } from "@react-three/fiber";
import { useRef, useEffect, useState } from "react";
import { GUI } from "lil-gui";
import { useGLTF, useTexture } from "@react-three/drei";
import { useXR } from "@react-three/xr";

export default function XRExperience() {
  const [red, setRed] = useState(false);
  const [placedModels, setPlacedModels] = useState([]);
  const hitTestRef = useRef();
  const { isPresenting, session } = useXR();

  // Load model and textures
  const { nodes, scene } = useGLTF("./model/Lapinou.glb");
  const bakedTexture = useTexture("./model/Lapinou.jpg");
  bakedTexture.flipY = false;

  // Handle XR select (click) events
  useEffect(() => {
    if (!session) return;

    const handleSelect = (event) => {
      const inputSource = event.inputSource;

      // Perform hit test to find floor intersection
      const hitTestResults = session.requestHitTestResults(
        inputSource,
        hitTestRef.current
      );

      if (hitTestResults.length > 0) {
        // Get the pose of the first hit test result (closest intersection)
        const pose = hitTestResults[0].getPose(session.inputSpace);

        if (pose) {
          // Create a new model instance at the hit position
          const newModel = {
            id: Date.now(),
            position: [
              pose.transform.position.x,
              pose.transform.position.y,
              pose.transform.position.z,
            ],
          };
          setPlacedModels([...placedModels, newModel]);
        }
      }
    };

    session.addEventListener("select", handleSelect);

    return () => {
      session.removeEventListener("select", handleSelect);
    };
  }, [session, placedModels]);

  return (
    <>
      {/* Background scene */}
      <mesh geometry={nodes.baked.geometry} position={[0, 0, 0]}>
        <meshBasicMaterial map={bakedTexture} />
      </mesh>

      {/* Render each placed model */}
      {placedModels.map((model) => (
        <group key={model.id} position={model.position}>
          <mesh geometry={nodes.baked.geometry}>
            <meshBasicMaterial map={bakedTexture} />
          </mesh>
        </group>
      ))}
    </>
  );
}
