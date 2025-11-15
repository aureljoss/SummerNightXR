import * as THREE from "three";
import { extend, useFrame } from "@react-three/fiber";
import { useRef, useEffect, useState } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
import { useXR } from "@react-three/xr";

export default function XRExperience() {
  const [placedModels, setPlacedModels] = useState([]);
  const hitTestSourceRef = useRef(null);
  const { isPresenting, session } = useXR();

  // Load model and textures
  const { nodes } = useGLTF("./model/Lapinou.glb");
  const bakedTexture = useTexture("./model/Lapinou.jpg");
  bakedTexture.flipY = false;

  // Initialize hit test source when XR session starts
  useEffect(() => {
    if (!session) return;

    const initHitTest = async () => {
      // Request a hit test source for screen input (controller)
      const hitTestSource = await session.requestHitTestSource({
        space: session.inputSpace,
      });
      hitTestSourceRef.current = hitTestSource;
    };

    initHitTest().catch((err) => console.error("Hit test setup failed:", err));
  }, [session]);

  // Handle XR select (click) events
  useEffect(() => {
    if (!session || !hitTestSourceRef.current) return;

    const handleSelect = (event) => {
      // Get hit test results from the session
      const hitTestResults = session.requestHitTestResults(
        hitTestSourceRef.current,
        session.renderState.baseLayer.space
      );

      if (hitTestResults.length > 0) {
        // Get the pose of the first hit test result (closest intersection)
        const pose = hitTestResults[0].getPose(
          session.renderState.baseLayer.space
        );

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
          setPlacedModels((prev) => [...prev, newModel]);
        }
      }
    };

    session.addEventListener("select", handleSelect);

    return () => {
      session.removeEventListener("select", handleSelect);
    };
  }, [session]);

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
